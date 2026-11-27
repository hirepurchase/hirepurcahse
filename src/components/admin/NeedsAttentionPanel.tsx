'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BellRing, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';

interface Item {
  key: string;
  label: string;
  count: number;
  amount?: number;
  detail?: string;
  href: string;
  tone: 'red' | 'amber' | 'blue';
}

const TONE: Record<Item['tone'], string> = {
  red: 'bg-red-50 text-red-700',
  amber: 'bg-amber-50 text-amber-800',
  blue: 'bg-blue-50 text-blue-700',
};

/**
 * What is waiting on someone, with a link to deal with each: approvals,
 * reschedules, unlock requests, unpaid deposits, failed payments, and the
 * commission month-end. Only items this person can act on; hidden when there
 * is nothing.
 */
export default function NeedsAttentionPanel() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [monthEnd, setMonthEnd] = useState<{ month: string; issues: string[] } | null>(null);

  useEffect(() => {
    api.get('/reports/attention')
      .then(({ data }) => { setItems(data.items ?? []); setMonthEnd(data.monthEnd ?? null); })
      .catch(() => setItems([]));
  }, []);

  if (!items || items.length === 0) return null;
  return (
    <section aria-labelledby="needs-attention" className="operations-panel p-4 sm:p-5">
      <h2 id="needs-attention" className="flex items-center gap-2 text-lg font-bold text-slate-950">
        <BellRing className="h-5 w-5 text-amber-600" aria-hidden="true" /> Needs attention
      </h2>
      {monthEnd && (
        <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">
          <strong>Commission month-end:</strong> {monthEnd.issues.join(' ')}
        </p>
      )}
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((i) => (
          <li key={i.key}>
            <Link href={i.href} className="flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors hover:border-blue-200 hover:bg-blue-50/40">
              <span className={cn('grid h-9 min-w-9 shrink-0 place-items-center rounded-lg px-2 text-sm font-bold tabular-nums', TONE[i.tone])}>{i.count}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900">{i.label}</span>
                {(i.amount !== undefined || i.detail) && (
                  <span className="block text-xs text-slate-600">
                    {i.amount !== undefined && formatCurrency(i.amount)}
                    {i.amount !== undefined && i.detail && ' · '}
                    {i.detail}
                  </span>
                )}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
