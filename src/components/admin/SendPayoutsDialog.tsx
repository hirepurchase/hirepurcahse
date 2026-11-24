'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Send, XCircle } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/useToast';

type Kind = 'AGENT_COMPLETION' | 'CLUSTER_LEADER';

interface Line {
  payoutId: string;
  recipientId: string;
  name: string;
  amount: number;
  payoutStatus: 'PENDING' | 'PAID';
  payout: { number: string; network: string | null; registeredName: string | null; check: string | null } | null;
  block: string | null;
  needsConfirm: boolean;
  transfer: { id: string; status: string; gateway: string; reference: string; failureReason: string | null } | null;
}

interface Payable {
  gateway: 'PAYSTACK' | 'HUBTEL';
  gatewayBlock: string | null;
  approved: boolean;
  balance: number | null;
  total: number;
  lines: Line[];
}

const ghs = (n: number) => `GHS ${n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const NET: Record<string, string> = { MTN: 'MTN', TELECEL: 'Telecel', AIRTELTIGO: 'AirtelTigo' };
const GATEWAY: Record<string, string> = { PAYSTACK: 'Paystack', HUBTEL: 'Hubtel' };
const IN_FLIGHT = ['QUEUED', 'SENDING', 'PENDING'];

function StatusLine({ line }: { line: Line }) {
  const t = line.transfer;
  if (line.payoutStatus === 'PAID') {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Paid</span>;
  }
  if (t && IN_FLIGHT.includes(t.status)) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        {t.status === 'PENDING' ? `Waiting for ${GATEWAY[t.gateway] ?? t.gateway}` : 'Sending…'}
      </span>
    );
  }
  if (t && (t.status === 'FAILED' || t.status === 'REVERSED')) {
    return (
      <span className="inline-flex items-start gap-1 text-xs text-red-700">
        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {t.status === 'REVERSED' ? 'Reversed' : 'Failed'}{t.failureReason ? `: ${t.failureReason}` : ''}
      </span>
    );
  }
  return null;
}

/**
 * Pays an approved month's commission into each person's MoMo wallet through
 * the payout gateway. Super admins only; password needed. People with no
 * payout number are listed but cannot be selected; a wallet in another name
 * is only paid when ticked.
 */
export default function SendPayoutsDialog({ kind, month, monthLabel, open, onClose, onChanged }: {
  kind: Kind;
  month: string;
  monthLabel: string;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [data, setData] = useState<Payable | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [password, setPassword] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async (resetPicks: boolean) => {
    try {
      const { data } = await api.get(`/commission-payouts/${kind}/${month}`);
      setData(data);
      setError(null);
      if (resetPicks) {
        const p: Record<string, boolean> = {};
        for (const l of data.lines as Line[]) p[l.payoutId] = !l.block && !l.needsConfirm;
        setPicked(p);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not load the payments.');
    }
  }, [kind, month]);

  useEffect(() => {
    if (!open) return;
    setData(null);
    setPassword('');
    void load(true);
  }, [open, load]);

  // Follow progress while anything is on its way.
  const inFlight = !!data?.lines.some((l) => l.transfer && IN_FLIGHT.includes(l.transfer.status) && l.payoutStatus !== 'PAID');
  useEffect(() => {
    if (!open || !inFlight) return;
    const t = setInterval(() => { void load(false); onChanged(); }, 4000);
    return () => clearInterval(t);
  }, [open, inFlight, load, onChanged]);

  const chosen = useMemo(() => (data?.lines ?? []).filter((l) => !l.block && picked[l.payoutId]), [data, picked]);
  const total = chosen.reduce((s, l) => s + l.amount, 0);
  const short = data?.balance != null && data.balance + 0.005 < total;

  const send = async () => {
    setSending(true);
    try {
      const { data: r } = await api.post(`/commission-payouts/${kind}/${month}/send`, {
        password,
        items: chosen.map((l) => ({ payoutId: l.payoutId, confirmMismatch: l.needsConfirm })),
      });
      toast({
        title: `Sending ${ghs(r.total)} to ${r.queued} ${r.queued === 1 ? 'person' : 'people'}`,
        description: r.skipped?.length ? `${r.skipped.length} skipped: ${r.skipped.map((s: any) => s.reason).join('; ')}` : 'Each one is marked paid as it goes through.',
      });
      setPassword('');
      await load(true);
      onChanged();
    } catch (err: any) {
      toast({ title: 'Not sent', description: err?.response?.data?.error || 'Please try again.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !sending && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send payments — {monthLabel}</DialogTitle>
        </DialogHeader>
        {error ? (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : !data ? (
          <div className="flex min-h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
              <span>Paid through <strong>{GATEWAY[data.gateway]}</strong> to each person&apos;s MoMo wallet</span>
              {data.balance != null && <span className={short ? 'font-semibold text-red-700' : 'text-slate-600'}>Balance {ghs(data.balance)}</span>}
            </div>
            {data.gatewayBlock && <p role="alert" className="rounded-md bg-red-50 p-3 text-red-800">{data.gatewayBlock}</p>}
            {!data.approved && <p role="alert" className="rounded-md bg-amber-50 p-3 text-amber-900">Approve the month before sending payments.</p>}

            {data.lines.length === 0 ? (
              <p className="py-6 text-center text-slate-600">Nobody is owed anything for this month.</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {data.lines.map((l) => {
                  const selectable = !l.block;
                  const warn = l.needsConfirm;
                  return (
                    <li key={l.payoutId} className="flex items-start gap-3 px-3 py-2.5">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4"
                        aria-label={`Pay ${l.name}`}
                        disabled={!selectable}
                        checked={selectable && !!picked[l.payoutId]}
                        onChange={(e) => setPicked({ ...picked, [l.payoutId]: e.target.checked })}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">{l.name}</p>
                        {l.payout ? (
                          <p className={`text-xs ${warn ? 'text-amber-800' : 'text-slate-600'}`}>
                            <span className="tabular-nums">{l.payout.number}</span> {NET[l.payout.network || ''] ?? l.payout.network}
                            {l.payout.registeredName && <> · registered to {l.payout.registeredName}</>}
                            {warn && (
                              <span className="mt-0.5 flex items-center gap-1 font-semibold">
                                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                                {l.payout.check === 'NOT_REGISTERED' ? 'Not registered on the network' : 'Wallet in a different name'} — tick only if you have confirmed it
                              </span>
                            )}
                          </p>
                        ) : (
                          <p className="text-xs font-medium text-amber-800">No payout number yet — ask them to add it in their portal</p>
                        )}
                        {l.block && l.block !== 'No payout number' && l.payoutStatus !== 'PAID' && !l.transfer && <p className="text-xs text-slate-500">{l.block}</p>}
                        <StatusLine line={l} />
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums text-slate-900">{ghs(l.amount)}</span>
                    </li>
                  );
                })}
              </ul>
            )}

            {data.approved && !data.gatewayBlock && chosen.length > 0 && (
              <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
                <p className="font-semibold text-slate-900">
                  {ghs(total)} to {chosen.length} {chosen.length === 1 ? 'person' : 'people'}
                </p>
                {short && <p role="alert" className="text-red-700">Not enough in the {GATEWAY[data.gateway]} balance. Top it up first.</p>}
                <div className="space-y-1.5">
                  <Label htmlFor="payout-password">Your password, to confirm</Label>
                  <Input id="payout-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <p className="text-xs text-slate-600">Money leaves the {GATEWAY[data.gateway]} balance straight away. Each person is marked paid when their payment goes through.</p>
                <Button className="w-full bg-emerald-600 text-white hover:bg-emerald-700" disabled={sending || !password || short} onClick={() => void send()}>
                  {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send {ghs(total)}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
