'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Gift, Loader2, Lock, Save, Undo2 } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/useToast';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { formatDate, formatDateTime } from '@/lib/utils';
import PayoutAccountLine, { PayoutAccountInfo } from '@/components/admin/PayoutAccountLine';

/**
 * Monthly completion commission for agents: once an agent's customers who
 * finished paying since the start month reach the set number, each of those
 * completions is paid, and every later one. Closed, approved and paid each
 * month, the same way as cluster leaders.
 */

interface Settings {
  amountPerCompletion: number;
  threshold: number;
  startMonth: string;
  updatedAt?: string | null;
}

interface AgentLine {
  agentId: string;
  payout: PayoutAccountInfo | null;
  name: string;
  phone: string | null;
  role: string;
  completedToDate: number;
  completedThisMonth: number;
  qualified: boolean;
  toGo: number;
  count: number;
  rate: number;
  total: number;
  contracts: Array<{ id: string; contractNumber: string; completedAt: string }>;
  status: 'PREVIEW' | 'PENDING' | 'PAID';
  paidAt: string | null;
  reference: string | null;
}

interface MonthView {
  month: string;
  status: 'PREVIEW' | 'CLOSED' | 'APPROVED';
  canClose: boolean;
  closeBlock: string | null;
  beforeStart: boolean;
  settings: Settings;
  agents: AgentLine[];
  totals: { agents: number; qualified: number; count: number; total: number; paid: number };
}

const PRIMARY = 'bg-emerald-600 text-white hover:bg-emerald-700';
const ghs = (n: number) => `GHS ${n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const errorText = (err: unknown, fallback: string) => (err as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback;
const thisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const shiftMonth = (month: string, by: number) => { const [y, m] = month.split('-').map(Number); const d = new Date(y, m - 1 + by, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const monthLabel = (month: string) => { const [y, m] = month.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }); };

export default function AgentCompletionCommissionPage() {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const canEditSettings = hasPermission(PERMISSIONS.MANAGE_COMMISSION_SETTINGS);
  const [month, setMonth] = useState(thisMonth);
  const [data, setData] = useState<MonthView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [payFor, setPayFor] = useState<AgentLine | null>(null);
  const [reference, setReference] = useState('');
  const [form, setForm] = useState<{ amountPerCompletion: string; threshold: string; startMonth: string } | null>(null);
  const [showOnlyPaid, setShowOnlyPaid] = useState(true);
  const [numbers, setNumbers] = useState<{ total: number; withNumber: number; nameMismatch: number; missing: Array<{ id: string; name: string; phone: string | null; role: string }> } | null>(null);
  useEffect(() => {
    api.get('/admin-users/payout-accounts/summary').then(({ data }) => setNumbers(data)).catch(() => setNumbers(null));
  }, []);

  const load = useCallback(() => {
    setError(null);
    api.get(`/agent-completion-pay/${month}`)
      .then(({ data }) => setData(data))
      .catch((err) => setError(errorText(err, 'Could not load completion commission')));
  }, [month]);

  useEffect(() => { setData(null); load(); }, [load]);

  const loadSettings = useCallback(() => {
    api.get('/agent-completion-pay/settings')
      .then(({ data }) => setForm({ amountPerCompletion: String(data.settings.amountPerCompletion), threshold: String(data.settings.threshold), startMonth: data.settings.startMonth }))
      .catch(() => setForm(null));
  }, []);
  useEffect(() => { loadSettings(); }, [loadSettings]);

  const act = async (key: string, path: string, body: Record<string, unknown> | undefined, done: string) => {
    setBusy(key);
    try {
      const { data } = await api.post(path, body);
      setData(data);
      toast({ title: done });
      return true;
    } catch (err) {
      toast({ title: 'Not done', description: errorText(err, 'Request failed'), variant: 'destructive' });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const saveSettings = async () => {
    if (!form) return;
    setBusy('settings');
    try {
      await api.put('/agent-completion-pay/settings', {
        amountPerCompletion: Number(form.amountPerCompletion),
        threshold: Number(form.threshold),
        startMonth: form.startMonth,
      });
      toast({ title: 'Saved', description: 'Applies to months not yet closed.' });
      loadSettings();
      load();
    } catch (err) {
      toast({ title: 'Not saved', description: errorText(err, 'Request failed'), variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const shown = data ? data.agents.filter((a) => !showOnlyPaid || a.total > 0 || a.status === 'PAID') : [];

  return (
    <div className="space-y-4 pb-10">
      <header className="flex items-center gap-3 workspace-heading workspace-heading--report">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
          <Gift className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Agent completion commission</h1>
          <p className="text-sm text-gray-500">Paid monthly once an agent&apos;s completed customers reach the set number.</p>
        </div>
      </header>

      {form && (
        <section className="operations-panel space-y-3 p-4">
          <h2 className="text-sm font-semibold text-gray-900">How it is paid</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="text-sm text-gray-700">
              Amount per completed customer (GHS)
              <Input type="number" min={0} step="0.01" value={form.amountPerCompletion} disabled={!canEditSettings}
                onChange={(e) => setForm({ ...form, amountPerCompletion: e.target.value })} className="mt-1" />
            </label>
            <label className="text-sm text-gray-700">
              Completed customers needed to qualify
              <Input type="number" min={1} step="1" value={form.threshold} disabled={!canEditSettings}
                onChange={(e) => setForm({ ...form, threshold: e.target.value })} className="mt-1" />
            </label>
            <label className="text-sm text-gray-700">
              Counted from (month)
              <Input type="month" value={form.startMonth} disabled={!canEditSettings}
                onChange={(e) => e.target.value && setForm({ ...form, startMonth: e.target.value })} className="mt-1" />
            </label>
          </div>
          <p className="text-xs text-gray-500">
            Customers who finished paying from {monthLabel(form.startMonth)} count, whether or not they paid within their contract period.
            When an agent reaches {form.threshold || '…'}, all of them are paid, and every one after that in the month it happens.
            A closed month keeps the amount it was closed with.
          </p>
          {canEditSettings && (
            <Button size="sm" className={PRIMARY} disabled={busy === 'settings'} onClick={() => void saveSettings()}>
              {busy === 'settings' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </Button>
          )}
        </section>
      )}

      {numbers && (
        <details className="operations-panel p-4 text-sm">
          <summary className="cursor-pointer font-semibold text-gray-900">
            Payout numbers: {numbers.withNumber} of {numbers.total} agents have added one
            {numbers.nameMismatch > 0 && <span className="font-normal text-amber-800"> · {numbers.nameMismatch} in a different name</span>}
          </summary>
          {numbers.missing.length > 0 ? (
            <ul className="mt-3 max-h-64 divide-y divide-gray-100 overflow-y-auto">
              {numbers.missing.map((m) => (
                <li key={m.id} className="flex justify-between gap-2 py-1.5">
                  <span>{m.name} <span className="text-xs text-gray-500">{m.role.replace('_', ' ').toLowerCase()}</span></span>
                  <span className="tabular-nums text-gray-500">{m.phone ?? ''}</span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-gray-600">Everyone has added a payout number.</p>}
          <p className="mt-2 text-xs text-gray-500">Agents and cluster leaders add it from the menu under their name: Payout MoMo number.</p>
        </details>
      )}

      <div className="operations-panel flex items-center justify-between gap-2 px-3 py-3">
        <button className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-base font-semibold text-gray-900">{monthLabel(month)}</p>
          {data && (
            <p className={`text-xs ${data.status === 'PREVIEW' ? 'text-amber-700' : data.status === 'CLOSED' ? 'text-blue-700' : 'text-emerald-700'}`}>
              {data.status === 'PREVIEW' ? 'Preview — figures move until the month is closed' : data.status === 'CLOSED' ? 'Closed — awaiting approval' : 'Approved for payment'}
            </p>
          )}
        </div>
        <button className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30" onClick={() => setMonth(shiftMonth(month, 1))}
          disabled={month >= thisMonth()} aria-label="Next month">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {!data && !error && <p className="py-10 text-center text-sm text-gray-400">Calculating…</p>}

      {data && (
        <>
          {data.beforeStart && (
            <p role="status" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
              Completion commission is counted from {monthLabel(data.settings.startMonth)}. Nothing is paid for this month.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="To pay this month" value={ghs(data.totals.total)} strong />
            <Stat label="Paid" value={ghs(data.totals.paid)} />
            <Stat label="Completions paid" value={String(data.totals.count)} />
            <Stat label="Agents qualified" value={`${data.totals.qualified} of ${data.totals.agents}`} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {data.status === 'PREVIEW' && (
              <Button className={PRIMARY} disabled={!data.canClose || busy === 'close'}
                onClick={() => act('close', `/agent-completion-pay/${month}/close`, undefined, 'Month closed — figures frozen')}>
                {busy === 'close' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                {data.canClose ? 'Close month' : data.closeBlock ?? 'Cannot close yet'}
              </Button>
            )}
            {data.status === 'CLOSED' && (
              <>
                <Button className={PRIMARY} disabled={busy === 'approve'} onClick={() => act('approve', `/agent-completion-pay/${month}/approve`, undefined, 'Approved for payment')}>
                  <CheckCircle2 className="h-4 w-4" /> Approve for payment
                </Button>
                <Button variant="outline" disabled={busy === 'rec'} onClick={() => act('rec', `/agent-completion-pay/${month}/recompute`, undefined, 'Recalculated')}>Recalculate</Button>
                <Button variant="outline" disabled={busy === 'rec2'} onClick={() => act('rec2', `/agent-completion-pay/${month}/recompute`, { useCurrentSettings: true }, 'Recalculated with the current amount')}>Apply current amount</Button>
                <Button variant="outline" disabled={busy === 'reopen'} onClick={() => act('reopen', `/agent-completion-pay/${month}/reopen`, undefined, 'Reopened')}>
                  <Undo2 className="h-4 w-4" /> Reopen
                </Button>
              </>
            )}
            <label className="ml-auto flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" className="h-4 w-4" checked={showOnlyPaid} onChange={(e) => setShowOnlyPaid(e.target.checked)} />
              Only agents being paid
            </label>
          </div>

          {shown.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500">
              {showOnlyPaid ? 'No agent is owed completion commission for this month.' : 'No completions counted yet.'}
            </p>
          ) : (
            <ul className="space-y-3">
              {shown.map((a) => (
                <li key={a.agentId} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <button className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => setOpen(open === a.agentId ? null : a.agentId)} aria-expanded={open === a.agentId}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{a.name}</p>
                      <p className="text-xs text-gray-500">
                        {a.completedToDate} completed since {monthLabel(data.settings.startMonth)} · {a.completedThisMonth} this month
                        {a.qualified ? <span className="ml-1 font-semibold text-emerald-700">· qualified</span> : <span className="ml-1">· {a.toGo} more to qualify</span>}
                      </p>
                      {a.total > 0 && !a.payout && <p className="text-xs font-medium text-amber-800">No payout number yet</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-gray-900">{ghs(a.total)}</p>
                      <p className="text-[11px] text-gray-500">{a.status === 'PAID' ? <span className="font-semibold text-emerald-700">Paid</span> : a.count ? `${a.count} × ${ghs(a.rate)}` : ''}</p>
                    </div>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open === a.agentId ? 'rotate-180' : ''}`} />
                  </button>
                  {open === a.agentId && (
                    <div className="space-y-3 border-t border-gray-100 px-4 py-3 text-sm">
                      <PayoutAccountLine payout={a.payout} />
                      {a.contracts.length > 0 ? (
                        <ul className="max-h-60 divide-y divide-gray-100 overflow-y-auto">
                          {a.contracts.map((c) => (
                            <li key={c.id} className="flex justify-between py-1.5">
                              <span>{c.contractNumber}</span>
                              <span className="text-gray-500">completed {formatDate(c.completedAt)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500">{a.qualified ? 'Nothing new to pay this month.' : `Not qualified yet: ${a.toGo} more completed customer${a.toGo === 1 ? '' : 's'} needed.`}</p>
                      )}
                      {data.status === 'APPROVED' && a.total > 0 && (
                        a.status === 'PAID' ? (
                          <div className="flex items-center justify-between gap-2 text-xs text-gray-600">
                            <span>Paid {a.paidAt ? formatDateTime(a.paidAt) : ''} · ref {a.reference}</span>
                            <Button size="sm" variant="outline" disabled={busy === `unpay-${a.agentId}`}
                              onClick={() => act(`unpay-${a.agentId}`, `/agent-completion-pay/${month}/payouts/${a.agentId}/unpaid`, undefined, 'Marked unpaid')}>Undo</Button>
                          </div>
                        ) : (
                          <Button className={`w-full ${PRIMARY}`} onClick={() => { setPayFor(a); setReference(''); }}>Mark as paid</Button>
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
        <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={`Record payment to ${payFor.name}`}>
          <div className="absolute inset-0 bg-black/50" onClick={() => setPayFor(null)} />
          <div className="relative z-10 w-full max-w-md space-y-3 rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
            <h2 className="text-base font-semibold text-gray-900">Record payment to {payFor.name}</h2>
            <p className="text-sm text-gray-600">{ghs(payFor.total)} for {payFor.count} completed customer{payFor.count === 1 ? '' : 's'}, {monthLabel(month)}.</p>
            <PayoutAccountLine payout={payFor.payout} />
            <Input placeholder="MoMo or bank reference" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={100} />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setPayFor(null)}>Cancel</Button>
              <Button className={`flex-1 ${PRIMARY}`} disabled={!reference.trim() || busy === 'pay'}
                onClick={async () => { const ok = await act('pay', `/agent-completion-pay/${month}/payouts/${payFor.agentId}/paid`, { reference }, 'Payment recorded'); if (ok) setPayFor(null); }}>
                Record payment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="operations-panel min-w-0 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 truncate ${strong ? 'text-lg font-bold text-emerald-700' : 'text-base font-semibold text-gray-900'}`}>{value}</p>
    </div>
  );
}
