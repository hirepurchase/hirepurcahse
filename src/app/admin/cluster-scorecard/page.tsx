'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Loader2, Lock, ShieldAlert } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExportButtons } from '@/components/admin/ExportButtons';
import type { ExportOptions } from '@/lib/exportUtils';
import { useToast } from '@/hooks/useToast';
import { formatDateTime } from '@/lib/utils';
import { LeaderCard, MonthData, errorText, formatValue, ghs, monthLabel, shiftMonth, thisMonth } from './types';

const PRIMARY = 'bg-emerald-600 text-white hover:bg-emerald-700';

export default function ClusterScorecardPage() {
  const { toast } = useToast();
  const [month, setMonth] = useState(() => shiftMonth(thisMonth(), 0));
  const [data, setData] = useState<MonthData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [payFor, setPayFor] = useState<LeaderCard | null>(null);
  const [reference, setReference] = useState('');

  const load = useCallback(() => {
    setError(null);
    api
      .get('/cluster-scorecard', { params: { month } })
      .then(({ data }) => setData(data))
      .catch((err) => setError(errorText(err, 'Could not load the scorecard')));
  }, [month]);

  useEffect(() => {
    setData(null);
    load();
  }, [load]);

  const act = async (key: string, path: string, body: Record<string, unknown> | undefined, done: string) => {
    setBusy(key);
    try {
      const { data } = await api.post(path, body);
      setData((prev) => (prev ? { ...data, indicators: prev.indicators, canManage: prev.canManage } : data));
      toast({ title: done });
      return true;
    } catch (err) {
      toast({ title: 'Not done', description: errorText(err, 'Request failed'), variant: 'destructive' });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const defs = useMemo(() => new Map((data?.indicators || []).map((d) => [d.key, d])), [data]);
  const enabledKeys = useMemo(() => new Set((data?.rules.indicators || []).filter((r) => r.enabled).map((r) => r.key)), [data]);

  const exportOptions = useMemo(() => {
    if (!data) return null;
    return {
      title: `Cluster leader payouts — ${monthLabel(month)}`,
      filename: `cluster-scorecard-${month}`,
      summary: [
        { label: 'Status', value: data.status },
        { label: 'Leaders', value: data.leaders.length },
        { label: 'Total payout', value: ghs(data.totals.total) },
        { label: 'Paid so far', value: ghs(data.totals.paid) },
      ],
      columns: [
        { header: 'Leader', accessor: (r: LeaderCard) => r.name },
        { header: 'Phone', accessor: (r: LeaderCard) => r.phone || '' },
        { header: 'Agents', accessor: (r: LeaderCard) => r.agentCount, align: 'right' as const },
        ...data.rules.indicators
          .filter((r) => r.enabled)
          .map((rule) => ({
            header: defs.get(rule.key)?.label || rule.key,
            accessor: (r: LeaderCard) => {
              const l = r.lines.find((x) => x.key === rule.key);
              return l ? `${formatValue(defs.get(rule.key)?.unit, l.value)} → ${l.payout.toFixed(2)}` : '';
            },
          })),
        { header: 'Base', accessor: (r: LeaderCard) => r.base.toFixed(2), align: 'right' as const },
        { header: 'Variable', accessor: (r: LeaderCard) => r.variable.toFixed(2), align: 'right' as const },
        { header: 'Deductions', accessor: (r: LeaderCard) => r.deductions.toFixed(2), align: 'right' as const },
        { header: 'Total (GHS)', accessor: (r: LeaderCard) => r.total.toFixed(2), align: 'right' as const },
        { header: 'Paid', accessor: (r: LeaderCard) => (r.status === 'PAID' ? `Yes — ${r.reference}` : 'No') },
      ],
      data: data.leaders,
    };
  }, [data, defs, month]);

  return (
    <div className="space-y-4">
      {/* Month picker */}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-2 py-2">
        <button className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-base font-semibold text-gray-900">{monthLabel(month)}</p>
          {data && <StatusLine data={data} />}
        </div>
        <button
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
          onClick={() => setMonth(shiftMonth(month, 1))}
          disabled={month >= thisMonth()}
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {!data && !error && <p className="py-10 text-center text-sm text-gray-400">Calculating…</p>}

      {data && (
        <>
          {enabledKeys.size === 0 && data.rules.settings.baseAmount === 0 && data.status === 'PREVIEW' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              No indicator is being paid yet.{' '}
              {data.canManage ? (
                <Link href="/admin/cluster-scorecard/rates" className="font-semibold underline">Set the rates</Link>
              ) : (
                'Ask an administrator to set the rates.'
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Total payout" value={ghs(data.totals.total)} strong />
            <Stat label="Paid" value={ghs(data.totals.paid)} />
            <Stat label="Variable" value={ghs(data.totals.variable)} />
            <Stat label="Deductions" value={ghs(data.totals.deductions)} />
          </div>

          {data.canManage && (
            <div className="flex flex-wrap items-center gap-2">
              {data.status === 'PREVIEW' && (
                <Button
                  className={PRIMARY}
                  disabled={!data.canClose || busy === 'close'}
                  onClick={() => act('close', `/cluster-scorecard/${month}/close`, undefined, 'Month closed — figures frozen')}
                >
                  {busy === 'close' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  {data.canClose ? 'Close month' : 'Closes after the month ends'}
                </Button>
              )}
              {data.status === 'CLOSED' && (
                <>
                  <Button className={PRIMARY} disabled={busy === 'approve'} onClick={() => act('approve', `/cluster-scorecard/${month}/approve`, undefined, 'Approved for payment')}>
                    <CheckCircle2 className="h-4 w-4" /> Approve for payment
                  </Button>
                  <Button variant="outline" disabled={busy === 'rec'} onClick={() => act('rec', `/cluster-scorecard/${month}/recompute`, undefined, 'Recalculated')}>
                    Recalculate
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy === 'rec2'}
                    onClick={() => act('rec2', `/cluster-scorecard/${month}/recompute`, { useCurrentRules: true }, 'Recalculated with current rates')}
                  >
                    Apply current rates
                  </Button>
                </>
              )}
              {exportOptions && (
                <div className="ml-auto">
                  <ExportButtons exportOptions={exportOptions as unknown as ExportOptions} showPrint={false} />
                </div>
              )}
            </div>
          )}

          {data.leaders.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500">No cluster leaders this month.</p>
          ) : (
            <ul className="space-y-3">
              {data.leaders.map((l) => (
                <li key={l.leaderId} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <button className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => setOpen(open === l.leaderId ? null : l.leaderId)}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{l.name}</p>
                      <p className="text-xs text-gray-500">
                        {l.agentCount} agent{l.agentCount === 1 ? '' : 's'}
                        {l.gated && <span className="ml-1 font-semibold text-red-700">· variable pay withheld</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-gray-900">{ghs(l.total)}</p>
                      <PaidBadge leader={l} />
                    </div>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open === l.leaderId ? 'rotate-180' : ''}`} />
                  </button>

                  {open === l.leaderId && (
                    <div className="space-y-3 border-t border-gray-100 px-4 py-3">
                      {l.gated && l.gateReason && (
                        <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
                          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {l.gateReason}.
                        </p>
                      )}
                      <ul className="divide-y divide-gray-100">
                        {l.lines
                          .filter((line) => enabledKeys.has(line.key) || line.payout !== 0)
                          .map((line) => {
                            const def = defs.get(line.key);
                            return (
                              <li key={line.key} className="flex items-start justify-between gap-3 py-2">
                                <div className="min-w-0">
                                  <p className="text-sm text-gray-800">{def?.label || line.key}</p>
                                  <p className="text-xs text-gray-500">{line.explanation}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">{formatValue(def?.unit, line.value)}</p>
                                  <p className={`text-xs font-semibold ${line.payout < 0 ? 'text-red-700' : line.payout > 0 ? 'text-emerald-700' : 'text-gray-400'}`}>
                                    {line.payout < 0 ? '−' : ''}
                                    {ghs(Math.abs(line.payout))}
                                  </p>
                                </div>
                              </li>
                            );
                          })}
                      </ul>
                      {enabledKeys.size === 0 && <p className="text-xs text-gray-500">No indicators are paid this month.</p>}
                      <div className="space-y-1 rounded-lg bg-gray-50 px-3 py-2 text-sm">
                        <Row label="Base" value={ghs(l.base)} />
                        <Row label="Variable" value={ghs(l.variable)} />
                        <Row label="Deductions" value={ghs(l.deductions)} />
                        <Row label="Total" value={ghs(l.total)} strong />
                      </div>
                      {data.canManage && data.status === 'APPROVED' && (
                        l.status === 'PAID' ? (
                          <div className="flex items-center justify-between gap-2 text-xs text-gray-600">
                            <span>Paid {l.paidAt ? formatDateTime(l.paidAt) : ''} · ref {l.reference}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy === `unpay-${l.leaderId}`}
                              onClick={() => act(`unpay-${l.leaderId}`, `/cluster-scorecard/${month}/payouts/${l.leaderId}/unpaid`, undefined, 'Marked unpaid')}
                            >
                              Undo
                            </Button>
                          </div>
                        ) : (
                          <Button className={`w-full ${PRIMARY}`} onClick={() => { setPayFor(l); setReference(''); }}>
                            Mark as paid
                          </Button>
                        )
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {payFor && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPayFor(null)} />
          <div className="relative z-10 w-full max-w-md space-y-3 rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
            <h2 className="text-base font-semibold text-gray-900">Record payment to {payFor.name}</h2>
            <p className="text-sm text-gray-600">{ghs(payFor.total)} for {monthLabel(month)}.</p>
            <Input placeholder="MoMo or bank reference" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={100} />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setPayFor(null)}>Cancel</Button>
              <Button
                className={`flex-1 ${PRIMARY}`}
                disabled={!reference.trim() || busy === 'pay'}
                onClick={async () => {
                  const ok = await act('pay', `/cluster-scorecard/${month}/payouts/${payFor.leaderId}/paid`, { reference }, 'Payment recorded');
                  if (ok) setPayFor(null);
                }}
              >
                Record payment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusLine({ data }: { data: MonthData }) {
  if (data.status === 'PREVIEW') return <p className="text-xs text-amber-700">Preview — figures move until the month is closed</p>;
  if (data.status === 'CLOSED') return <p className="text-xs text-blue-700">Closed {data.closedAt ? formatDateTime(data.closedAt) : ''} — awaiting approval</p>;
  return <p className="text-xs text-emerald-700">Approved {data.approvedAt ? formatDateTime(data.approvedAt) : ''}</p>;
}

function PaidBadge({ leader }: { leader: LeaderCard }) {
  if (leader.status === 'PAID') return <span className="text-[11px] font-semibold text-emerald-700">Paid</span>;
  if (leader.status === 'PENDING') return <span className="text-[11px] font-semibold text-amber-700">Not paid</span>;
  return <span className="text-[11px] text-gray-400">Estimate</span>;
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 truncate text-lg font-bold ${strong ? 'text-emerald-700' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? 'border-t border-gray-200 pt-1 font-bold text-gray-900' : 'text-gray-600'}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
