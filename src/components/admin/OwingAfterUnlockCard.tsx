'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Phone } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface OwingItem {
  id: string;
  contractId: string;
  contractNumber: string;
  customerName: string;
  customerPhone: string | null;
  agentName: string;
  agentPhone: string | null;
  isOwn: boolean;
  overdueNow: number;
  daysSinceEnded: number | null;
}

/**
 * Customers whose temporary unlock ran out with the arrears still unpaid.
 * Shown to the selling agent (and their cluster leader) so they chase the
 * customer before it costs them: while the admin switch is on, the agent
 * cannot create new contracts until the customer clears what they owe.
 * Renders nothing when there is nobody to chase.
 */
export default function OwingAfterUnlockCard({ showAgent = false }: { showAgent?: boolean }) {
  const [data, setData] = useState<{ blocksSales: boolean; items: OwingItem[] } | null>(null);

  useEffect(() => {
    api
      .get('/temporary-unlocks/owing')
      .then(({ data }) => setData(data))
      .catch(() => setData(null));
  }, []);

  if (!data || data.items.length === 0) return null;
  const total = data.items.reduce((sum, item) => sum + item.overdueNow, 0);
  const ownBlocked = data.blocksSales && data.items.some((item) => item.isOwn);
  const tone = data.blocksSales
    ? { box: 'border-red-200 bg-red-50', head: 'text-red-800', text: 'text-red-700', icon: 'text-red-600' }
    : { box: 'border-amber-200 bg-amber-50', head: 'text-amber-900', text: 'text-amber-800', icon: 'text-amber-600' };

  return (
    <section className={`rounded-2xl border p-4 sm:p-5 ${tone.box}`} aria-label="Customers still owing after a temporary unlock">
      <div className="flex items-start gap-3">
        <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${tone.icon}`} />
        <div className="min-w-0 space-y-1">
          <h2 className={`text-sm font-semibold ${tone.head}`}>
            {data.items.length === 1 ? '1 customer still owes' : `${data.items.length} customers still owe`} after a temporary unlock · {formatCurrency(total)}
          </h2>
          <p className={`text-xs ${tone.text}`}>
            {ownBlocked
              ? 'Their unlock ran out with the arrears unpaid. You cannot create new contracts until they clear what they owe.'
              : data.blocksSales
                ? 'Their unlock ran out with the arrears unpaid. The selling agent cannot create new contracts until they clear what they owe.'
                : 'Their unlock ran out with the arrears unpaid. Follow them up: an administrator can switch the block on new contracts back on.'}
          </p>
        </div>
      </div>
      <ul className="mt-3 divide-y divide-black/5 rounded-xl bg-white/70">
        {data.items.map((item) => (
          <li key={item.id} className="flex flex-col gap-1.5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">{item.customerName}</p>
              <p className="text-xs text-gray-500">
                {item.contractNumber}
                {showAgent && !item.isOwn && item.agentName ? ` · sold by ${item.agentName}` : ''}
                {item.daysSinceEnded !== null ? ` · unlock ended ${item.daysSinceEnded === 0 ? 'today' : `${item.daysSinceEnded} day${item.daysSinceEnded === 1 ? '' : 's'} ago`}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-sm font-bold text-red-700">{formatCurrency(item.overdueNow)}</span>
              {item.customerPhone && (
                <a href={`tel:${item.customerPhone}`} className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">
                  <Phone className="h-3.5 w-3.5" /> {item.customerPhone}
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
      {showAgent && (
        <Link href="/admin/temporary-unlocks" className={`mt-3 inline-block text-xs font-semibold ${tone.head} hover:underline`}>
          Open Temporary Unlocks →
        </Link>
      )}
    </section>
  );
}
