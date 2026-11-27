'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Banknote, CheckCircle2, Clock, Loader2, Smartphone, Trophy, Wallet } from 'lucide-react';
import api from '@/lib/api';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

interface Earnings {
  role: string;
  payoutAccount: { number: string; network: string | null; registeredName: string | null; check: string | null } | null;
  sale: {
    thisMonth: { count: number; amount: number };
    thisYear: { count: number; amount: number };
    allTime: { count: number; amount: number };
    depositsToPayIn: { count: number; amount: number };
  };
  completion: {
    settings: { amountPerCompletion: number; threshold: number; startMonth: string; maxPerMonth?: number };
    completedToDate: number;
    qualified: boolean;
    toGo: number;
    thisMonth: { month: string; count: number; carriedOver?: number; total: number };
  };
  leaderThisMonth: { month: string; total: number; lines: Array<{ label: string; count: number; payout: number }> } | null;
  payouts: Array<{ kind: 'COMPLETION' | 'LEADER'; month: string; approved: boolean; amount: number; count: number | null; carriedOver: number; status: string; paidAt: string | null; reference: string | null }>;
  totals: { paidThisYear: number; onTheWay: number; approvedUnpaid: number; waitingApproval: number };
  months: Array<{ month: string; sales: number; saleCommission: number; completionPaid: number; leaderPaid: number }>;
}

const NET: Record<string, string> = { MTN: 'MTN', TELECEL: 'Telecel', AIRTELTIGO: 'AirtelTigo' };
const monthLabel = (m: string, short = false) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('en-GB', short ? { month: 'short' } : { month: 'long', year: 'numeric' });
};

/** Everything an agent or cluster leader earns, in one place. */
export default function MyEarningsPage() {
  const [data, setData] = useState<Earnings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get('/earnings/mine').then(({ data }) => setData(data)).catch((err) => setError(err?.response?.data?.error || 'Could not load your earnings.'));
  }, []);

  if (error) return <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>;
  if (!data) return <div className="flex min-h-56 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;

  const c = data.completion;
  const pct = Math.min(100, Math.round((c.completedToDate / Math.max(1, c.settings.threshold)) * 100));
  const maxBar = Math.max(1, ...data.months.map((m) => m.saleCommission + m.completionPaid + m.leaderPaid));
  const isLeader = data.role === 'CLUSTER_AGENT';

  return (
    <div className="space-y-5 pb-10">
      <header className="workspace-heading workspace-heading--work">
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900 sm:text-2xl"><Banknote className="h-6 w-6" aria-hidden="true" /> My earnings</h1>
        <p className="mt-0.5 text-sm text-gray-500">What you earn from sales{isLeader ? ', completions and your cluster' : ' and completions'}, and what has been paid to you.</p>
      </header>

      {!data.payoutAccount && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="min-w-0 flex-1">Add your MoMo number so your commission can be paid to you.</p>
          <Link href="/admin/account/payout" className="inline-flex min-h-10 items-center rounded-lg bg-amber-600 px-3 font-semibold text-white hover:bg-amber-700">Add number</Link>
        </div>
      )}

      <section aria-label="Totals" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile icon={CheckCircle2} label="Paid to you this year" value={formatCurrency(data.totals.paidThisYear)} tone="green" />
        <Tile icon={Clock} label="Approved, being paid" value={formatCurrency(data.totals.approvedUnpaid + data.totals.onTheWay)} />
        <Tile icon={Wallet} label="Kept from sales this month" value={formatCurrency(data.sale.thisMonth.amount)} detail={`${data.sale.thisMonth.count} sale${data.sale.thisMonth.count === 1 ? '' : 's'}`} />
        <Tile icon={AlertTriangle} label="Deposits to pay in" value={formatCurrency(data.sale.depositsToPayIn.amount)} detail={data.sale.depositsToPayIn.count ? `${data.sale.depositsToPayIn.count} sale${data.sale.depositsToPayIn.count === 1 ? '' : 's'}` : 'All paid in'} tone={data.sale.depositsToPayIn.count ? 'red' : undefined} />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="operations-panel space-y-3 p-4 sm:p-5" aria-labelledby="completion-h">
          <h2 id="completion-h" className="flex items-center gap-2 text-base font-semibold text-gray-900"><Trophy className="h-5 w-5 text-emerald-700" aria-hidden="true" /> Completion commission</h2>
          <p className="text-sm text-gray-600">
            {formatCurrency(c.settings.amountPerCompletion)} for each customer who finishes paying, once you reach {c.settings.threshold}
            {c.settings.maxPerMonth ? `; up to ${c.settings.maxPerMonth} paid a month` : ''}.
          </p>
          <div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-semibold text-gray-900">{c.completedToDate} completed since {monthLabel(c.settings.startMonth)}</span>
              <span className={c.qualified ? 'font-semibold text-emerald-700' : 'text-gray-600'}>{c.qualified ? 'Qualified' : `${c.toGo} more to qualify`}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-label="Completed customers towards qualifying" aria-valuemin={0} aria-valuemax={c.settings.threshold} aria-valuenow={Math.min(c.completedToDate, c.settings.threshold)}>
              <div className="h-full rounded-full bg-emerald-600" style={{ width: `${pct}%` }} />
            </div>
          </div>
          {c.qualified && (
            <p className="text-sm text-gray-700">
              {monthLabel(c.thisMonth.month)} so far: <strong>{c.thisMonth.count}</strong> to be paid ({formatCurrency(c.thisMonth.total)})
              {c.thisMonth.carriedOver ? `, ${c.thisMonth.carriedOver} more next month` : ''}. Paid after the month is closed and approved.
            </p>
          )}
        </section>

        {isLeader ? (
          <section className="operations-panel space-y-3 p-4 sm:p-5" aria-labelledby="leader-h">
            <h2 id="leader-h" className="flex items-center gap-2 text-base font-semibold text-gray-900"><Banknote className="h-5 w-5 text-blue-700" aria-hidden="true" /> Cluster leader pay this month</h2>
            {data.leaderThisMonth ? (
              <>
                <p className="text-2xl font-bold tabular-nums text-gray-900">{formatCurrency(data.leaderThisMonth.total)}</p>
                {data.leaderThisMonth.lines.length ? (
                  <ul className="divide-y divide-gray-100 text-sm">
                    {data.leaderThisMonth.lines.map((l) => (
                      <li key={l.label} className="flex justify-between py-1.5"><span>{l.label} · {l.count}</span><span className="tabular-nums">{formatCurrency(l.payout)}</span></li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-gray-500">Nothing earned yet this month.</p>}
                <p className="text-xs text-gray-500">So far this month; final once the month is closed and approved. Your own sales are paid as an agent, not here.</p>
              </>
            ) : <p className="text-sm text-gray-500">Not available right now.</p>}
          </section>
        ) : (
          <section className="operations-panel space-y-3 p-4 sm:p-5" aria-labelledby="sale-h">
            <h2 id="sale-h" className="flex items-center gap-2 text-base font-semibold text-gray-900"><Wallet className="h-5 w-5 text-blue-700" aria-hidden="true" /> Sale commission</h2>
            <dl className="grid grid-cols-[1fr_auto] gap-y-1.5 text-sm">
              <dt className="text-gray-600">This month</dt><dd className="text-right tabular-nums">{formatCurrency(data.sale.thisMonth.amount)} · {data.sale.thisMonth.count}</dd>
              <dt className="text-gray-600">This year</dt><dd className="text-right tabular-nums">{formatCurrency(data.sale.thisYear.amount)} · {data.sale.thisYear.count}</dd>
              <dt className="text-gray-600">All time</dt><dd className="text-right tabular-nums">{formatCurrency(data.sale.allTime.amount)} · {data.sale.allTime.count}</dd>
            </dl>
            <p className="text-xs text-gray-500">You keep this from the customer&apos;s deposit at each sale and pay the rest in.</p>
          </section>
        )}
      </div>

      <section className="operations-panel p-4 sm:p-5" aria-labelledby="months-h">
        <h2 id="months-h" className="text-base font-semibold text-gray-900">Last 6 months</h2>
        <ul className="mt-3 space-y-2">
          {data.months.map((m) => {
            const total = m.saleCommission + m.completionPaid + m.leaderPaid;
            return (
              <li key={m.month} className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 text-sm">
                <span className="text-gray-600">{monthLabel(m.month, true)}</span>
                <div className="flex h-3 overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
                  <div className="bg-blue-500" style={{ width: `${(m.saleCommission / maxBar) * 100}%` }} />
                  <div className="bg-emerald-500" style={{ width: `${(m.completionPaid / maxBar) * 100}%` }} />
                  <div className="bg-violet-500" style={{ width: `${(m.leaderPaid / maxBar) * 100}%` }} />
                </div>
                <span className="tabular-nums font-medium text-gray-900">{formatCurrency(total)}<span className="sr-only">: sales {formatCurrency(m.saleCommission)} from {m.sales}, completion {formatCurrency(m.completionPaid)}{isLeader ? `, leader ${formatCurrency(m.leaderPaid)}` : ''}</span></span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-blue-500" /> Kept from sales</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Completion commission paid</span>
          {isLeader && <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-violet-500" /> Leader pay paid</span>}
        </p>
      </section>

      <section className="operations-panel p-4 sm:p-5" aria-labelledby="payouts-h">
        <h2 id="payouts-h" className="text-base font-semibold text-gray-900">Monthly payments</h2>
        {data.payouts.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No monthly payments yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-100">
            {data.payouts.map((p, i) => (
              <li key={`${p.kind}-${p.month}-${i}`} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="font-medium text-gray-900">{monthLabel(p.month)}</span>
                  <span className="text-gray-600"> · {p.kind === 'COMPLETION' ? `Completion commission${p.count ? `, ${p.count} customers` : ''}` : 'Cluster leader pay'}</span>
                  {p.carriedOver > 0 && <span className="block text-xs text-blue-700">{p.carriedOver} more carried to the next month</span>}
                  {p.status === 'PAID' && p.reference && <span className="block text-xs text-gray-500">Paid {p.paidAt ? formatDate(p.paidAt) : ''} · ref {p.reference}</span>}
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-semibold tabular-nums">{formatCurrency(p.amount)}</span>
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', p.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : p.approved ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-900')}>
                    {p.status === 'PAID' ? 'Paid' : p.approved ? 'Approved' : 'Awaiting approval'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="operations-panel flex flex-wrap items-center justify-between gap-3 p-4 text-sm sm:p-5">
        <span className="flex items-center gap-2 text-gray-700">
          <Smartphone className="h-4 w-4" aria-hidden="true" />
          {data.payoutAccount
            ? <>Paid to <strong className="tabular-nums">{data.payoutAccount.number}</strong> {NET[data.payoutAccount.network || ''] ?? ''}{data.payoutAccount.registeredName ? ` · ${data.payoutAccount.registeredName}` : ''}</>
            : 'No payout number yet'}
        </span>
        <Link href="/admin/account/payout" className="font-semibold text-blue-700 hover:underline">{data.payoutAccount ? 'Change' : 'Add number'}</Link>
      </section>
    </div>
  );
}

function Tile({ icon: Icon, label, value, detail, tone }: { icon: typeof Banknote; label: string; value: string; detail?: string; tone?: 'green' | 'red' }) {
  return (
    <div className="operations-panel min-w-0 p-3 sm:p-4">
      <p className="flex items-center gap-1.5 text-xs text-gray-600"><Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}</p>
      <p className={cn('mt-1 truncate text-lg font-bold tabular-nums', tone === 'green' ? 'text-emerald-700' : tone === 'red' ? 'text-red-700' : 'text-gray-900')}>{value}</p>
      {detail && <p className="text-xs text-gray-500">{detail}</p>}
    </div>
  );
}
