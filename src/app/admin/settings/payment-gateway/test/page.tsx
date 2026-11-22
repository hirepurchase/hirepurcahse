"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, FlaskConical, Loader2, PlugZap, RotateCcw, Send, TriangleAlert, XCircle } from "lucide-react";
import api from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Paystack test page (super admins). Sends a small real charge tied to no
 * contract, then shows each check in turn: prompt sent, SMS code (Telecel),
 * Paystack says paid, right amount, webhook arrived, refund and its webhook.
 * Nothing on this page credits a contract or a ledger.
 */

type CheckState = "ok" | "fail" | "wait" | "skip";

interface GatewayInfo {
  paystack: { configured: boolean; mode: "TEST" | "LIVE" | "UNKNOWN" | null; webhookUrl: string; lastEventAt: string | null };
}

interface TestEvent {
  at: string;
  event: string;
  status: string | null;
  amount: number | null;
  requested_amount: number | null;
  fees: number | null;
  currency: string | null;
  transaction_reference: string | null;
  fields: string[];
  transactionFields: string[];
}

interface TestDetail {
  reference: string;
  asked: { amount: number; network: string; phone: string; keyMode: string; at: string };
  paystack: { status: string | null; amount: number | null; requested_amount: number | null; fees: number | null; currency: string | null; gateway_response: string | null; paid_at: string | null } | null;
  lookupError: string | null;
  amountMatches: boolean | null;
  events: TestEvent[];
  refunds: Array<{ at: string; ok: boolean; status: string | null; message: string }>;
  /** Paystack's answers to the charge and to the code, as the server kept them. */
  answers?: Array<{ at: string; step: string; state: string; message: string }>;
}

interface RecentTest {
  reference: string;
  at: string;
  by: string | null;
  amount: number;
  network: string;
  phone: string;
  keyMode: string;
  webhooks: number;
}

const NETWORKS = [
  { value: "MTN", label: "MTN MoMo" },
  { value: "VODAFONE", label: "Telecel Cash" },
  { value: "AIRTELTIGO", label: "AirtelTigo Money" },
];

const POLL_MS = 5000;
const POLL_FOR_MS = 10 * 60_000;

const ghs = (pesewas: number | null | undefined) => (pesewas == null ? "—" : `GHS ${(Number(pesewas) / 100).toFixed(2)}`);
const errorText = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback;

function Check({ state, title, children }: { state: CheckState; title: string; children?: React.ReactNode }) {
  const icon =
    state === "ok" ? <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" /> :
    state === "fail" ? <XCircle className="h-5 w-5 text-red-600" aria-hidden="true" /> :
    state === "wait" ? <Loader2 className="h-5 w-5 animate-spin text-blue-600" aria-hidden="true" /> :
    <Circle className="h-5 w-5 text-slate-300" aria-hidden="true" />;
  const label = { ok: "Passed", fail: "Failed", wait: "Waiting", skip: "Not needed" }[state];
  return (
    <li className="flex gap-3 py-3">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">
          {title} <span className="sr-only">({label})</span>
        </p>
        {children && <div className="mt-0.5 text-sm text-slate-600">{children}</div>}
      </div>
    </li>
  );
}

export default function PaystackTestPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isSuperAdmin = (user as { role?: string } | null)?.role === "SUPER_ADMIN";

  const [info, setInfo] = useState<GatewayInfo | null>(null);
  const [connection, setConnection] = useState<{ ok: boolean; message: string; codes?: Record<string, string> } | null>(null);
  const [checking, setChecking] = useState(false);

  const [phone, setPhone] = useState("");
  const [network, setNetwork] = useState("MTN");
  const [amount, setAmount] = useState("1.00");
  const [sending, setSending] = useState(false);

  // The test being watched.
  const [reference, setReference] = useState<string | null>(null);
  const [startState, setStartState] = useState<{ state: string; message: string } | null>(null);
  const [otp, setOtp] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpDone, setOtpDone] = useState(false);
  const [detail, setDetail] = useState<TestDetail | null>(null);
  const [refunding, setRefunding] = useState(false);
  const [recent, setRecent] = useState<RecentTest[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollUntil = useRef(0);

  const loadInfo = useCallback(async () => {
    try {
      const res = await api.get("/settings/payment-gateway");
      setInfo(res.data);
    } catch {
      /* shown as not configured */
    }
  }, []);

  const loadRecent = useCallback(async () => {
    try {
      const res = await api.get("/settings/payment-gateway/test");
      setRecent(res.data.tests || []);
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    void loadInfo();
    void loadRecent();
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [isSuperAdmin, loadInfo, loadRecent]);

  const poll = useCallback(async (ref: string) => {
    if (timer.current) clearTimeout(timer.current);
    try {
      const res = await api.get(`/settings/payment-gateway/test/${ref}`);
      setDetail(res.data);
      const d: TestDetail = res.data;
      const refundSeen = d.events.some((e) => e.event.startsWith("refund."));
      const settled = d.paystack?.status === "failed" || d.paystack?.status === "reversed" || refundSeen;
      if (settled) { void loadInfo(); void loadRecent(); return; }
    } catch {
      /* keep trying */
    }
    if (Date.now() < pollUntil.current) timer.current = setTimeout(() => void poll(ref), POLL_MS);
  }, [loadInfo, loadRecent]);

  const watch = (ref: string) => {
    setReference(ref);
    setDetail(null);
    pollUntil.current = Date.now() + POLL_FOR_MS;
    void poll(ref);
  };

  const checkConnection = async () => {
    setChecking(true);
    try {
      const res = await api.post("/settings/payment-gateway/check");
      setConnection(res.data);
    } catch (e) {
      setConnection({ ok: false, message: errorText(e, "Could not reach the server") });
    } finally {
      setChecking(false);
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setStartState(null);
    setOtp("");
    setOtpDone(false);
    try {
      const res = await api.post("/settings/payment-gateway/test/charge", { amount: Number(amount), phoneNumber: phone, network });
      setStartState({ state: res.data.state, message: res.data.message });
      watch(res.data.reference);
      void loadRecent();
    } catch (err) {
      toast({ title: "Not sent", description: errorText(err, "Could not start the test payment"), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reference) return;
    setOtpBusy(true);
    try {
      const res = await api.post(`/settings/payment-gateway/test/${reference}/otp`, { otp });
      if (res.data.state === "OTP_REQUIRED") {
        setStartState({ state: "OTP_REQUIRED", message: res.data.message || "That code was not accepted. Try again." });
      } else {
        setOtpDone(true);
        setStartState({ state: res.data.state, message: res.data.message });
      }
    } catch (err) {
      toast({ title: "Code not sent", description: errorText(err, "Could not reach Paystack"), variant: "destructive" });
    } finally {
      setOtpBusy(false);
    }
  };

  const refund = async () => {
    if (!reference) return;
    setRefunding(true);
    try {
      const res = await api.post(`/settings/payment-gateway/test/${reference}/refund`);
      toast({ title: "Refund requested", description: res.data.message || "Paystack will confirm it shortly." });
      pollUntil.current = Date.now() + POLL_FOR_MS;
      void poll(reference);
    } catch (err) {
      toast({ title: "Refund not requested", description: errorText(err, "Paystack refused the refund"), variant: "destructive" });
    } finally {
      setRefunding(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-slate-600">Only super admins can test Paystack.</CardContent>
      </Card>
    );
  }

  const ps = info?.paystack;
  const live = ps?.mode === "LIVE";

  // ── The checks for the test being watched ──
  // Paystack may ask any payer for a one-time code first (Telecel always,
  // live MTN for a number it hasn't seen), so this follows what it asked.
  const otpAsked = startState?.state === "OTP_REQUIRED" || otpDone || !!detail?.answers?.some((a) => a.state === "OTP_REQUIRED");
  const needsOtp = startState?.state === "OTP_REQUIRED";
  const promptState: CheckState = !startState ? "wait" : startState.state === "FAILED" ? "fail" : "ok";
  const otpState: CheckState = !otpAsked ? "skip" : otpDone ? "ok" : needsOtp ? "wait" : "ok";
  const psStatus = detail?.paystack?.status ?? null;
  const paidState: CheckState = psStatus === "success" || psStatus === "reversed" ? "ok" : psStatus === "failed" ? "fail" : promptState === "fail" ? "skip" : "wait";
  const amountState: CheckState = detail?.amountMatches === true ? "ok" : detail?.amountMatches === false ? "fail" : paidState === "fail" || paidState === "skip" ? "skip" : "wait";
  const chargeEvent = detail?.events.find((e) => e.event === "charge.success");
  const webhookState: CheckState = chargeEvent ? "ok" : paidState === "ok" ? "wait" : "skip";
  const refundEvent = detail?.events.find((e) => e.event.startsWith("refund."));
  const refundAsked = (detail?.refunds.length ?? 0) > 0;
  const refundFailed = detail?.refunds.some((r) => !r.ok);
  const refundState: CheckState = refundEvent ? "ok" : refundFailed ? "fail" : refundAsked ? "wait" : "skip";

  return (
    <div className="mx-auto min-w-0 max-w-3xl space-y-6">
      <div className="workspace-heading workspace-heading--settings">
        <Link href="/admin/settings/payment-gateway" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" /> Payment gateway
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900">
          <FlaskConical className="h-6 w-6 text-primary" aria-hidden="true" /> Test Paystack
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Send a small payment to your own phone and watch each step. It is not linked to any contract, customer or agent, so nothing is credited.
        </p>
      </div>

      {live && (
        <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>
            The server has a <strong>LIVE</strong> key: this takes real money. Use your own number and a small amount, then refund it at the end.
            Paystack may keep its fee on a refunded payment.
          </p>
        </div>
      )}

      {/* 1. Connection */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">1. Connection</h2>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {ps?.configured ? (
                  <>
                    <Badge variant="success">Key set</Badge>
                    <Badge variant={live ? "default" : "warning"}>{live ? "LIVE key" : ps.mode === "TEST" ? "TEST key" : "Key type unknown"}</Badge>
                  </>
                ) : (
                  <Badge variant="destructive">No key on the server</Badge>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={checkConnection} disabled={!ps?.configured || checking}>
              {checking ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <PlugZap className="mr-1.5 h-4 w-4" />}
              Check connection
            </Button>
          </div>
          {connection && (
            <div className={`text-sm ${connection.ok ? "text-emerald-700" : "text-red-600"}`}>
              <p className="flex items-center gap-1.5">
                {connection.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />} {connection.message}
              </p>
              {connection.codes && (
                <p className="mt-1 text-slate-600">
                  Network codes from Paystack:{" "}
                  {Object.entries(connection.codes).map(([k, v]) => (
                    <span key={k} className="mr-3 whitespace-nowrap">
                      {k === "VODAFONE" ? "Telecel" : k} <code className="rounded bg-slate-100 px-1 text-xs">{v}</code>
                    </span>
                  ))}
                </p>
              )}
            </div>
          )}
          {ps && (
            <p className="text-sm text-slate-600">
              Last notification from Paystack:{" "}
              <span className="font-medium text-slate-900">{ps.lastEventAt ? formatDateTime(ps.lastEventAt) : "never"}</span>
              <span className="block break-all text-xs text-slate-500">Webhook URL in the Paystack dashboard must be {ps.webhookUrl}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* 2. Send */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="text-base font-semibold text-slate-900">2. Send a test payment</h2>
          <form onSubmit={send} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="test-phone">Mobile Money number</Label>
              <Input id="test-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0244123456" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="test-network">Network</Label>
              <select
                id="test-network"
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {NETWORKS.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="test-amount">Amount (GHS)</Label>
              <Input id="test-amount" type="number" min="0.10" max="5" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="sm:col-span-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">GHS 0.10 to GHS 5.00. Paystack may ask for a one-time code first (Telecel always asks for a voucher from *110#).</p>
              <Button type="submit" disabled={sending || !ps?.configured}>
                {sending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
                Send test prompt
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 3. Checks */}
      {reference && (
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-slate-900">3. Results</h2>
                <p className="font-mono text-xs text-slate-500">{reference}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => { pollUntil.current = Date.now() + POLL_FOR_MS; void poll(reference); }}>
                <RotateCcw className="mr-1.5 h-4 w-4" /> Check again
              </Button>
            </div>

            <ul className="mt-2 divide-y divide-slate-100">
              <Check state={promptState} title="Prompt sent">
                {startState ? startState.message : "Sending…"}
              </Check>

              <Check state={otpState} title="Code step (when Paystack asks)">
                {needsOtp ? (
                  <form onSubmit={sendOtp} className="mt-2 flex flex-wrap gap-2">
                    <Input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="Code"
                      aria-label="Code from the SMS"
                      className="max-w-[9rem] tracking-widest"
                    />
                    <Button type="submit" size="sm" disabled={otpBusy || otp.length < 4}>{otpBusy ? "Sending…" : "Send code"}</Button>
                  </form>
                ) : otpAsked ? "Code accepted." : "Paystack didn't ask for a code."}
              </Check>

              <Check state={paidState} title="Paystack says paid">
                {detail?.paystack
                  ? <>Paystack status: <strong>{detail.paystack.status}</strong>{detail.paystack.gateway_response ? ` · ${detail.paystack.gateway_response}` : ""}</>
                  : detail?.lookupError ? `Couldn't ask Paystack: ${detail.lookupError}` : "Approve the prompt on the phone."}
              </Check>

              <Check state={amountState} title="Right amount">
                {detail?.paystack && detail.paystack.status === "success" ? (
                  <>
                    Asked {ghs(Math.round(detail.asked.amount * 100))} · Paystack: requested {ghs(detail.paystack.requested_amount ?? detail.paystack.amount)}, charged {ghs(detail.paystack.amount)}, fee {ghs(detail.paystack.fees)} ({detail.paystack.currency})
                  </>
                ) : null}
              </Check>

              <Check state={webhookState} title="Paystack's notification reached the server">
                {chargeEvent
                  ? `Received ${formatDateTime(chargeEvent.at)}, with a valid signature.`
                  : paidState === "ok"
                    ? "Waiting. If this stays waiting for more than a minute, check the webhook URL in the Paystack dashboard."
                    : null}
              </Check>

              <Check state={refundState} title="Refund, and its notification">
                {refundEvent ? (
                  `Paystack sent "${refundEvent.event}" (${formatDateTime(refundEvent.at)}). Refunds of real payments will be flagged on the payment.`
                ) : refundAsked ? (
                  detail?.refunds[detail.refunds.length - 1]?.ok
                    ? "Refund requested. Paystack's notice can take a few minutes; press Check again."
                    : `Refund refused: ${detail?.refunds[detail.refunds.length - 1]?.message}`
                ) : (
                  <span className="flex flex-wrap items-center gap-2">
                    Give the money back once it&apos;s paid.
                    <Button size="sm" variant="outline" onClick={refund} disabled={refunding || psStatus !== "success"}>
                      {refunding ? "Requesting…" : "Refund this test"}
                    </Button>
                  </span>
                )}
              </Check>
            </ul>

            {detail && detail.events.length > 0 && (
              <details className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                <summary className="cursor-pointer font-medium text-slate-700">What Paystack sent ({detail.events.length})</summary>
                <div className="mt-2 space-y-2">
                  {detail.events.map((e, i) => (
                    <div key={i} className="break-words">
                      <p className="font-medium text-slate-800">{e.event} · {formatDateTime(e.at)}</p>
                      <p>status {e.status ?? "—"} · amount {ghs(e.amount)}{e.fees != null ? ` · fee ${ghs(e.fees)}` : ""}{e.transaction_reference ? ` · for ${e.transaction_reference}` : ""}</p>
                      <p className="font-mono text-[11px] text-slate-500">fields: {e.fields.join(", ")}{e.transactionFields.length ? ` · transaction: ${e.transactionFields.join(", ")}` : ""}</p>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      )}

      {/* 4. Recent */}
      {recent.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h2 className="text-base font-semibold text-slate-900">Recent tests</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-3 font-medium">When</th>
                    <th className="py-2 pr-3 font-medium">Amount</th>
                    <th className="py-2 pr-3 font-medium">Network</th>
                    <th className="hidden py-2 pr-3 font-medium sm:table-cell">Key</th>
                    <th className="hidden py-2 pr-3 font-medium sm:table-cell">Notices</th>
                    <th className="py-2 font-medium"><span className="sr-only">Open</span></th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((t) => (
                    <tr key={t.reference} className="border-b last:border-0">
                      <td className="py-2 pr-3 whitespace-nowrap">{formatDateTime(t.at)}<span className="block text-xs text-slate-500">{t.by}</span></td>
                      <td className="py-2 pr-3">GHS {Number(t.amount).toFixed(2)}</td>
                      <td className="py-2 pr-3">{NETWORKS.find((n) => n.value === t.network)?.label ?? t.network}<span className="block text-xs text-slate-500">{t.phone}</span></td>
                      <td className="hidden py-2 pr-3 sm:table-cell">{t.keyMode}</td>
                      <td className="hidden py-2 pr-3 sm:table-cell">{t.webhooks}</td>
                      <td className="py-2 text-right">
                        <Button variant="ghost" size="sm" onClick={() => { setStartState({ state: "PENDING", message: "Sent earlier." }); setOtpDone(false); watch(t.reference); }}>Open</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. Then the real flows */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-800">When every check passes, try the real flows</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Switch customer payments to Paystack on the <Link href="/admin/settings/payment-gateway" className="text-primary underline-offset-2 hover:underline">Payment gateway</Link> page.</li>
          <li>Sign in to the customer portal as a test customer and pay GHS 1. It should show as <strong>PAYSTACK MOMO</strong> in that contract&apos;s Payment History.</li>
          <li>As an agent, pay a small deposit from the Deposits page with the agent switch on Paystack.</li>
          <li>Refund one of them in the Paystack dashboard, check it shows &ldquo;Refund reported by Paystack&rdquo;, then Reverse it on the contract page.</li>
          <li>If anything looks wrong, switch back to Hubtel: payments already waiting still finish.</li>
        </ol>
      </div>
    </div>
  );
}
