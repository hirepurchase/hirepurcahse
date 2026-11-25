'use client';

import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface Progress {
  settings: { amountPerCompletion: number; threshold: number; startMonth: string; maxPerMonth?: number };
  completedToDate: number;
  qualified: boolean;
  toGo: number;
  thisMonth: { month: string; count: number; carriedOver?: number; total: number };
  history: Array<{ month: string | null; approved: boolean; count: number; total: number; status: string; paidAt: string | null; reference: string | null }>;
}

const monthLabel = (month: string) => { const [y, m] = month.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }); };

/**
 * The agent's progress towards the monthly completion commission: how many of
 * their customers have finished paying since it started, how many more are
 * needed, and what has been paid.
 */
export default function MyCompletionPayCard() {
  const [p, setP] = useState<Progress | null>(null);

  useEffect(() => {
    api.get('/agent-completion-pay/mine').then(({ data }) => setP(data)).catch(() => setP(null));
  }, []);

  if (!p) return null;
  const { threshold, amountPerCompletion, startMonth } = p.settings;
  const pct = Math.min(100, Math.round((p.completedToDate / threshold) * 100));

  return (
    <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
          <Trophy className="h-4 w-4 text-emerald-700" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">Completion commission</p>
          <p className="text-xs text-gray-500">
            {formatCurrency(amountPerCompletion)} for each customer who finishes paying, once you reach {threshold}
          </p>
        </div>
      </div>
      <div className="mt-3">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold text-gray-900">{p.completedToDate} completed since {monthLabel(startMonth)}</span>
          <span className={p.qualified ? 'font-semibold text-emerald-700' : 'text-gray-600'}>
            {p.qualified ? 'Qualified' : `${p.toGo} more to qualify`}
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuemin={0} aria-valuemax={threshold} aria-valuenow={Math.min(p.completedToDate, threshold)} aria-label="Completed customers towards qualifying">
          <div className="h-full rounded-full bg-emerald-600" style={{ width: `${pct}%` }} />
        </div>
        {p.qualified && (
          <p className="mt-2 text-xs text-gray-600">
            This month so far: {p.thisMonth.count} to be paid ({formatCurrency(p.thisMonth.total)}), paid after the month is closed and approved.
            {!!p.thisMonth.carriedOver && ` ${p.thisMonth.carriedOver} more will be paid next month (up to ${p.settings.maxPerMonth} are paid each month).`}
          </p>
        )}
      </div>
      {p.history.length > 0 && (
        <ul className="mt-3 divide-y divide-gray-100 text-xs">
          {p.history.map((h) => (
            <li key={`${h.month}`} className="flex justify-between py-1.5">
              <span>{h.month ? monthLabel(h.month) : ''} · {h.count} customer{h.count === 1 ? '' : 's'}</span>
              <span className={h.status === 'PAID' ? 'font-semibold text-emerald-700' : 'text-gray-600'}>
                {formatCurrency(h.total)} {h.status === 'PAID' ? '· paid' : h.approved ? '· approved' : '· awaiting approval'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
