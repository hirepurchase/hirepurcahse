"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, FlaskConical, Info, Landmark, Loader2, PlugZap, XCircle } from "lucide-react";
import api from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Which gateway sends Mobile Money prompts for payments started on the web or
 * in the app. Super admins only. The short code always uses Hubtel, and a
 * payment already waiting finishes on the gateway it started on.
 */

type Gateway = "HUBTEL" | "PAYSTACK";

interface Counts {
  total: number;
  waiting: number;
  byGateway: Record<string, number>;
}

interface Settings {
  customerGateway: Gateway;
  agentDepositGateway: Gateway;
  updatedAt: string | null;
  updatedBy: string | null;
  paystack: {
    configured: boolean;
    mode: "TEST" | "LIVE" | "UNKNOWN" | null;
    webhookUrl: string;
    lastEventAt: string | null;
  };
  today: { customer: Counts; agentDeposit: Counts };
}

const SECTIONS: Array<{ key: "customerGateway" | "agentDepositGateway"; counts: "customer" | "agentDeposit"; title: string; who: string }> = [
  {
    key: "customerGateway",
    counts: "customer",
    title: "Customer payments (web and app)",
    who: "Instalment payments on the customer portal and in the app, and paid unlocks from the app.",
  },
  {
    key: "agentDepositGateway",
    counts: "agentDeposit",
    title: "Agent deposits (web)",
    who: "Agents paying in deposits from the Deposits page.",
  },
];

const NAMES: Record<Gateway, string> = { HUBTEL: "Hubtel", PAYSTACK: "Paystack" };

export default function PaymentGatewayPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isSuperAdmin = (user as { role?: string } | null)?.role === "SUPER_ADMIN";

  const [data, setData] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<{ customerGateway: Gateway; agentDepositGateway: Gateway } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [checking, setChecking] = useState(false);
  const [connection, setConnection] = useState<{ ok: boolean; message: string } | null>(null);

  const apply = (s: Settings) => {
    setData(s);
    setDraft({ customerGateway: s.customerGateway, agentDepositGateway: s.agentDepositGateway });
  };

  const load = useCallback(async () => {
    try {
      const res = await api.get("/settings/payment-gateway");
      apply(res.data);
      setError(null);
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to load the payment gateway settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) void load();
    else setLoading(false);
  }, [isSuperAdmin, load]);

  const changes = data && draft
    ? SECTIONS.filter((s) => draft[s.key] !== data[s.key])
    : [];

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const body = Object.fromEntries(changes.map((s) => [s.key, draft[s.key]]));
      const res = await api.put("/settings/payment-gateway", body);
      apply(res.data);
      toast({ title: "Saved", description: "New payments will use the gateway you chose." });
    } catch (e: any) {
      toast({ title: "Not saved", description: e.response?.data?.error || "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  };

  const checkConnection = async () => {
    setChecking(true);
    try {
      const res = await api.post("/settings/payment-gateway/check");
      setConnection(res.data);
    } catch (e: any) {
      setConnection({ ok: false, message: e.response?.data?.error || "Could not reach the server" });
    } finally {
      setChecking(false);
    }
  };

  const copyWebhook = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.paystack.webhookUrl);
      toast({ title: "Copied", description: "Paste it into Paystack: Settings → API Keys & Webhooks." });
    } catch {
      toast({ title: "Copy failed", description: "Select the address and copy it by hand.", variant: "destructive" });
    }
  };

  if (!isSuperAdmin && !loading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-slate-600">Only super admins can change the payment gateway.</CardContent>
      </Card>
    );
  }
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (error || !data || !draft) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-red-600">{error || "Failed to load"}</CardContent>
      </Card>
    );
  }

  const ps = data.paystack;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900">
            <Landmark className="h-6 w-6 text-primary" aria-hidden="true" /> Payment gateway
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Choose which gateway sends Mobile Money prompts for payments made on the web or in the app.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/settings/payment-gateway/test">
            <FlaskConical className="mr-1.5 h-4 w-4" /> Test Paystack
          </Link>
        </Button>
      </div>

      {/* Paystack connection */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Paystack connection</h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                {ps.configured ? (
                  <>
                    <Badge variant="success">Key set</Badge>
                    <Badge variant={ps.mode === "LIVE" ? "default" : "warning"}>{ps.mode === "LIVE" ? "LIVE key" : ps.mode === "TEST" ? "TEST key" : "Key type unknown"}</Badge>
                  </>
                ) : (
                  <Badge variant="destructive">No key on the server</Badge>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={checkConnection} disabled={!ps.configured || checking}>
              {checking ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <PlugZap className="mr-1.5 h-4 w-4" />}
              Check connection
            </Button>
          </div>

          {connection && (
            <p className={`flex items-center gap-1.5 text-sm ${connection.ok ? "text-emerald-700" : "text-red-600"}`}>
              {connection.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {connection.message}
            </p>
          )}

          {!ps.configured && (
            <p className="text-sm text-slate-600">
              Add <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">PAYSTACK_SECRET_KEY</code> to the backend&apos;s
              environment settings on DigitalOcean, then restart it. Paystack can&apos;t be chosen until then.
            </p>
          )}

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Webhook URL</p>
            <p className="mt-0.5 text-xs text-slate-500">Paste this into the Paystack dashboard, under Settings → API Keys &amp; Webhooks.</p>
            <div className="mt-2 flex items-stretch gap-2">
              <code className="min-w-0 flex-1 break-all rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                {ps.webhookUrl}
              </code>
              <Button variant="outline" size="sm" onClick={copyWebhook} aria-label="Copy webhook URL">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <p className="text-sm text-slate-600">
            Last notification from Paystack:{" "}
            <span className="font-medium text-slate-900">{ps.lastEventAt ? formatDateTime(ps.lastEventAt) : "never"}</span>
            {!ps.lastEventAt && (
              <span className="block text-xs text-slate-500">
                Until the webhook is set up, Paystack payments are confirmed by the screen the payer is on, or by the check that runs every 10 minutes.
              </span>
            )}
          </p>
        </CardContent>
      </Card>

      {/* The two switches */}
      {SECTIONS.map((section) => {
        const counts = data.today[section.counts];
        return (
          <Card key={section.key}>
            <CardContent className="space-y-3 p-5">
              <div>
                <h2 className="text-base font-semibold text-slate-900">{section.title}</h2>
                <p className="mt-0.5 text-sm text-slate-500">{section.who}</p>
              </div>
              <div role="radiogroup" aria-label={section.title} className="grid grid-cols-2 gap-2 sm:max-w-sm">
                {(["HUBTEL", "PAYSTACK"] as Gateway[]).map((g) => {
                  const disabled = g === "PAYSTACK" && !ps.configured;
                  const selected = draft[section.key] === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={disabled}
                      title={disabled ? "Add the Paystack key on the server first" : undefined}
                      onClick={() => setDraft({ ...draft, [section.key]: g })}
                      className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                        selected
                          ? "border-primary bg-blue-50 text-primary"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      {NAMES[g]}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500">
                Today: {counts.total} payment{counts.total === 1 ? "" : "s"} · Hubtel {counts.byGateway.HUBTEL ?? 0} · Paystack {counts.byGateway.PAYSTACK ?? 0}
                {counts.waiting > 0 && <> · <span className="font-medium text-amber-700">{counts.waiting} waiting</span></>}
              </p>
            </CardContent>
          </Card>
        );
      })}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="flex gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> Short code payments always use Hubtel.</p>
        <p className="mt-1.5 flex gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> Older app versions always use Hubtel, because Paystack can ask payers for a one-time code that those versions can&apos;t ask for.</p>
        <p className="mt-1.5 flex gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> Payments already waiting finish on the gateway they started on.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {data.updatedAt ? <>Last changed{data.updatedBy ? ` by ${data.updatedBy}` : ""}, {formatDateTime(data.updatedAt)}</> : "Never changed: both use Hubtel."}
        </p>
        <Button onClick={() => setConfirming(true)} disabled={changes.length === 0 || saving}>
          {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Save
        </Button>
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change the payment gateway?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {changes.map((s) => (
                  <p key={s.key}>
                    New {s.key === "customerGateway" ? "customer payments from the web and app" : "agent deposits from the web"} will go through{" "}
                    <strong>{NAMES[draft[s.key]]}</strong>.
                  </p>
                ))}
                <p>Payments already waiting are not affected.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); void save(); }} disabled={saving}>
              {saving ? "Saving…" : "Change gateway"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
