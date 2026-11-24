'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarClock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';

export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface RescheduleQuote {
  balance: number;
  lateCharges: number;
  principal: number;
  monthlyRate: number;
  termMonths: number;
  interest: number;
  newTotal: number;
  frequency: Frequency;
  installments: number;
  installmentAmount: number;
  firstDueDate: string;
  newEndDate: string;
  schedule?: Array<{ installmentNo: number; dueDate: string; amount: number }>;
}

export interface RescheduleRow extends Omit<RescheduleQuote, 'schedule'> {
  id: string;
  contractId: string;
  status: 'PENDING' | 'APPLIED' | 'REJECTED' | 'CANCELLED';
  source: 'MANUAL' | 'AUTO';
  oldEndDate: string;
  note: string | null;
  requestedById: string | null;
  requestedBy: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  rejectReason: string | null;
  createdAt: string;
  oldSchedule?: Array<{ installmentNo: number; dueDate: string; amount: number; paidAmount: number; status: string }> | null;
  contract?: { id: string; contractNumber: string; outstandingBalance?: number; customer?: { firstName: string; lastName: string } };
}

export const FREQUENCY_LABEL: Record<Frequency, { adj: string; plural: string }> = {
  DAILY: { adj: 'daily', plural: 'days' },
  WEEKLY: { adj: 'weekly', plural: 'weeks' },
  MONTHLY: { adj: 'monthly', plural: 'months' },
};

export const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Waiting for approval', className: 'border-amber-300 bg-amber-50 text-amber-900' },
  APPLIED: { label: 'Applied', className: 'border-green-300 bg-green-50 text-green-800' },
  REJECTED: { label: 'Turned down', className: 'border-slate-300 bg-slate-50 text-slate-700' },
  CANCELLED: { label: 'Cancelled', className: 'border-slate-300 bg-slate-50 text-slate-700' },
};

function errorText(error: any, fallback: string): string {
  return error?.response?.data?.error || fallback;
}

/** The figures, laid out the same way everywhere they are shown. */
export function QuoteFigures({ quote }: { quote: RescheduleQuote }) {
  const f = FREQUENCY_LABEL[quote.frequency];
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-sm">
      <dt className="text-slate-600">Balance on the contract</dt>
      <dd className="text-right tabular-nums">{formatCurrency(quote.balance)}</dd>
      <dt className="text-slate-600">Unpaid late charges added</dt>
      <dd className="text-right tabular-nums">{formatCurrency(quote.lateCharges)}</dd>
      <dt className="text-slate-600">
        Interest <span className="text-xs">({quote.monthlyRate}% × {quote.termMonths} months)</span>
      </dt>
      <dd className="text-right tabular-nums">{formatCurrency(quote.interest)}</dd>
      <dt className="border-t pt-1.5 font-semibold text-slate-900">New balance</dt>
      <dd className="border-t pt-1.5 text-right font-semibold tabular-nums text-slate-900">{formatCurrency(quote.newTotal)}</dd>
      <dt className="text-slate-600">Payments</dt>
      <dd className="text-right tabular-nums">
        {quote.installments} {f.adj} × {formatCurrency(quote.installmentAmount)}
      </dd>
      <dt className="text-slate-600">First due · last due</dt>
      <dd className="text-right tabular-nums">
        {formatDate(quote.firstDueDate)} · {formatDate(quote.newEndDate)}
      </dd>
    </dl>
  );
}

/**
 * Approve or turn down a waiting request. Shows the figures as they would be
 * applied now, which differ from the request's if the customer paid since.
 */
export function RescheduleDecisionDialog({ id, onClose, onDecided }: { id: string | null; onClose: () => void; onDecided: () => void }) {
  const { toast } = useToast();
  const [data, setData] = useState<{ reschedule: RescheduleRow; current: RescheduleQuote | null; currentError: string | null; canDecide: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  // Kept in a ref so a new function from the parent on each render does not reload.
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!id) return;
    let live = true;
    setData(null);
    setRejecting(false);
    setReason('');
    setLoading(true);
    api.get(`/reschedules/${id}`)
      .then((res) => { if (live) setData(res.data); })
      .catch((error) => { if (live) { toast({ title: 'Could not load the request', description: errorText(error, 'Please try again.'), variant: 'destructive' }); closeRef.current(); } })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [id, toast]);

  const decide = async (kind: 'approve' | 'reject') => {
    if (!id) return;
    setBusy(kind);
    try {
      await api.post(`/reschedules/${id}/${kind}`, kind === 'reject' ? { reason } : {});
      toast({
        title: kind === 'approve' ? 'Reschedule applied' : 'Reschedule turned down',
        description: kind === 'approve' ? 'The new schedule is in place and the customer has been sent an SMS.' : undefined,
      });
      onDecided();
      onClose();
    } catch (error) {
      toast({ title: kind === 'approve' ? 'Not applied' : 'Not turned down', description: errorText(error, 'Please try again.'), variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const r = data?.reschedule;
  const changed = r && data?.current && Math.abs(data.current.principal - r.principal) > 0.005;

  return (
    <Dialog open={!!id} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reschedule {r?.contract?.contractNumber ?? ''}</DialogTitle>
        </DialogHeader>
        {loading || !r ? (
          <div className="flex min-h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
        ) : (
          <div className="space-y-4 text-sm">
            <p className="text-slate-600">
              {r.contract?.customer ? `${r.contract.customer.firstName} ${r.contract.customer.lastName} · ` : ''}
              {r.source === 'AUTO' ? 'Raised automatically' : `Asked for by ${r.requestedBy ?? 'unknown'}`} on {formatDate(r.createdAt)}.
              The term ended on {formatDate(r.oldEndDate)}.
            </p>
            {r.note && <p className="rounded-md bg-slate-50 p-3 text-slate-700">“{r.note}”</p>}
            {r.status !== 'PENDING' ? (
              <>
                <QuoteFigures quote={r} />
                <p className="text-slate-600">
                  {STATUS_BADGE[r.status]?.label} by {r.decidedBy ?? 'unknown'}{r.decidedAt ? ` on ${formatDate(r.decidedAt)}` : ''}.
                  {r.rejectReason ? ` Reason: ${r.rejectReason}` : ''}
                </p>
              </>
            ) : data?.current ? (
              <>
                {changed && (
                  <p role="status" className="rounded-md bg-blue-50 p-3 text-blue-900">
                    The balance has changed since this was asked for ({formatCurrency(r.principal)} then). These are the figures that will apply.
                  </p>
                )}
                <QuoteFigures quote={data.current} />
                <p className="rounded-md bg-amber-50 p-3 text-amber-900">
                  On approval the unpaid instalments are replaced by this schedule, the late charges are added to the balance,
                  and the customer gets an SMS. Their phone unlocks if nothing is overdue under the new schedule.
                </p>
              </>
            ) : (
              <p role="alert" className="rounded-md bg-red-50 p-3 text-red-800">{data?.currentError ?? 'This request can no longer be applied.'}</p>
            )}

            {r.status === 'PENDING' && !data?.canDecide && (
              <p className="text-slate-600">You asked for this, so someone else must approve it.</p>
            )}
            {r.status === 'PENDING' && data?.canDecide && (
              rejecting ? (
                <div className="space-y-2">
                  <Label htmlFor="reschedule-reject-reason">Why is it turned down?</Label>
                  <Textarea id="reschedule-reject-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button variant="outline" onClick={() => setRejecting(false)} disabled={!!busy}>Back</Button>
                    <Button variant="destructive" onClick={() => void decide('reject')} disabled={!!busy || reason.trim().length < 3}>
                      {busy === 'reject' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Turn down
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="outline" onClick={() => setRejecting(true)} disabled={!!busy}>Turn down</Button>
                  <Button onClick={() => void decide('approve')} disabled={!!busy || !data?.current}>
                    {busy === 'approve' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Approve and apply
                  </Button>
                </div>
              )
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface PreviewResponse {
  eligible: boolean;
  reason: string | null;
  settings: { defaultMonthlyRate: number; maxMonthlyRate: number };
  quote: RescheduleQuote | null;
}

/**
 * Rescheduling on the contract page: for a contract past its end date still
 * owing, ask for its balance to be spread over a new schedule with interest;
 * see what is waiting and what was done before.
 */
export function RescheduleBalanceCard({ contract, userId, canAsk, canDecide, onChanged }: {
  contract: { id: string; status: string; endDate: string; outstandingBalance: number; paymentFrequency?: string };
  userId?: string;
  canAsk: boolean;
  canDecide: boolean;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [rows, setRows] = useState<RescheduleRow[] | null>(null);
  const [asking, setAsking] = useState(false);
  const [deciding, setDeciding] = useState<string | null>(null);
  const [form, setForm] = useState({ frequency: (contract.paymentFrequency as Frequency) || 'WEEKLY', installments: '4', monthlyRate: '', firstDueDate: '', note: '' });
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/reschedules/contract/${contract.id}`);
      setRows(res.data.reschedules ?? []);
    } catch {
      setRows(null);
    }
  }, [contract.id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Live figures while the form changes.
  useEffect(() => {
    if (!asking) return;
    let live = true;
    const t = setTimeout(async () => {
      setPreviewing(true);
      try {
        const res = await api.get(`/reschedules/contract/${contract.id}/preview`, {
          params: {
            frequency: form.frequency,
            installments: form.installments || undefined,
            monthlyRate: form.monthlyRate === '' ? undefined : form.monthlyRate,
            firstDueDate: form.firstDueDate || undefined,
          },
        });
        if (!live) return;
        setPreview(res.data);
        setPreviewError(null);
        if (form.monthlyRate === '' && res.data?.settings) {
          setForm((f) => (f.monthlyRate === '' ? { ...f, monthlyRate: String(res.data.settings.defaultMonthlyRate) } : f));
        }
      } catch (error) {
        if (live) setPreviewError(errorText(error, 'Could not work out the figures'));
      } finally {
        if (live) setPreviewing(false);
      }
    }, 300);
    return () => { live = false; clearTimeout(t); };
  }, [asking, contract.id, form.frequency, form.installments, form.monthlyRate, form.firstDueDate]);

  const submit = async () => {
    setSaving(true);
    try {
      await api.post(`/reschedules/contract/${contract.id}`, {
        frequency: form.frequency,
        installments: Number(form.installments),
        monthlyRate: Number(form.monthlyRate),
        firstDueDate: form.firstDueDate || undefined,
        note: form.note,
      });
      toast({ title: 'Sent for approval', description: 'Nothing changes on the contract until someone else approves it.' });
      setAsking(false);
      void load();
      onChanged();
    } catch (error) {
      toast({ title: 'Not sent', description: errorText(error, 'Please try again.'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (rows === null) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expired = new Date(contract.endDate) < today && contract.outstandingBalance > 0.005 && ['ACTIVE', 'DEFAULTED'].includes(contract.status);
  const pending = rows.find((r) => r.status === 'PENDING');
  const past = rows.filter((r) => r.status !== 'PENDING');
  if (!expired && rows.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-5 w-5" aria-hidden="true" />
            Reschedule balance
          </CardTitle>
          {pending && <Badge variant="outline" className={STATUS_BADGE.PENDING.className}>{STATUS_BADGE.PENDING.label}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {pending ? (
          <div className="space-y-3">
            <p className="text-slate-600">
              {pending.source === 'AUTO' ? 'Raised automatically' : `Asked for by ${pending.requestedBy ?? 'unknown'}`} on {formatDate(pending.createdAt)}.
              Figures as asked for:
            </p>
            <QuoteFigures quote={pending} />
            {canDecide && pending.requestedById !== userId ? (
              <Button size="sm" onClick={() => setDeciding(pending.id)}>Review and decide</Button>
            ) : (
              <p className="text-slate-600">Waiting for someone with the right to change contract values to approve it.</p>
            )}
          </div>
        ) : expired ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-slate-700">
              The term ended on <strong>{formatDate(contract.endDate)}</strong> with <strong>{formatCurrency(contract.outstandingBalance)}</strong> still owed.
              The balance can be spread over a new schedule with interest.
            </p>
            {canAsk && (
              <Button size="sm" onClick={() => { setPreview(null); setPreviewError(null); setAsking(true); }}>
                Reschedule balance
              </Button>
            )}
          </div>
        ) : null}

        {past.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-900">Earlier</h3>
            <ul className="divide-y rounded-md border">
              {past.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <span className="min-w-0">
                    <span className="font-medium">{formatCurrency(r.newTotal)}</span>{' '}
                    <span className="text-slate-600">
                      in {r.installments} {FREQUENCY_LABEL[r.frequency]?.adj} payments at {r.monthlyRate}% a month
                    </span>
                    <span className="block text-xs text-slate-500">
                      {formatDate(r.decidedAt ?? r.createdAt)} · {r.decidedBy ?? ''}{r.rejectReason ? ` · ${r.rejectReason}` : ''}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge variant="outline" className={STATUS_BADGE[r.status]?.className}>{STATUS_BADGE[r.status]?.label}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => setDeciding(r.id)}>Details</Button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>

      <Dialog open={asking} onOpenChange={(open) => !open && !saving && setAsking(false)}>
        <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reschedule the balance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rs-frequency">How often</Label>
                <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v as Frequency })}>
                  <SelectTrigger id="rs-frequency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rs-count">Number of payments</Label>
                <Input id="rs-count" type="number" inputMode="numeric" min={1} value={form.installments} onChange={(e) => setForm({ ...form, installments: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rs-rate">Interest, % a month</Label>
                <Input id="rs-rate" type="number" inputMode="decimal" min={0} step="0.1" value={form.monthlyRate} onChange={(e) => setForm({ ...form, monthlyRate: e.target.value })} />
                {preview?.settings && <p className="text-xs text-slate-500">Up to {preview.settings.maxMonthlyRate}%</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rs-first">First due date</Label>
                <Input id="rs-first" type="date" value={form.firstDueDate} onChange={(e) => setForm({ ...form, firstDueDate: e.target.value })} />
                <p className="text-xs text-slate-500">Leave empty for one period from today</p>
              </div>
            </div>

            <div aria-live="polite" className="rounded-md border p-3">
              {previewError ? (
                <p role="alert" className="text-red-700">{previewError}</p>
              ) : preview && !preview.eligible ? (
                <p role="alert" className="text-red-700">{preview.reason}</p>
              ) : preview?.quote ? (
                <div className={previewing ? 'opacity-60' : undefined}>
                  <QuoteFigures quote={preview.quote} />
                  {preview.quote.schedule && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-blue-700">See every payment</summary>
                      <ol className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                        {preview.quote.schedule.map((s) => (
                          <li key={s.installmentNo} className="flex justify-between tabular-nums">
                            <span>{s.installmentNo}. {formatDate(s.dueDate)}</span>
                            <span>{formatCurrency(s.amount)}</span>
                          </li>
                        ))}
                      </ol>
                    </details>
                  )}
                </div>
              ) : (
                <div className="flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rs-note">Note for the approver (optional)</Label>
              <Textarea id="rs-note" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
            <p className="text-slate-600">Nothing changes on the contract until someone else approves it.</p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setAsking(false)} disabled={saving}>Cancel</Button>
              <Button onClick={() => void submit()} disabled={saving || previewing || !!previewError || !preview?.eligible}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send for approval
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <RescheduleDecisionDialog id={deciding} onClose={() => setDeciding(null)} onDecided={() => { void load(); onChanged(); }} />
    </Card>
  );
}
