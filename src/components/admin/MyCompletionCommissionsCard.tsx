'use client';

import { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface Totals {
  PENDING: { count: number; amount: number };
  PAYABLE: { count: number; amount: number };
  ON_HOLD: { count: number; amount: number };
  FORFEITED: { count: number; amount: number };
  PAID: { count: number; amount: number };
}

/**
 * The agent's commission still to come: the part held back at sale plus the
 * completion bonus, paid when each customer completes. Hidden for agents with
 * nothing under the split scheme.
 */
export default function MyCompletionCommissionsCard() {
  const [totals, setTotals] = useState<Totals | null>(null);

  useEffect(() => {
    api
      .get('/agent-deposits/completion-commissions/mine')
      .then(({ data }) => setTotals(data.totals))
      .catch(() => setTotals(null));
  }, []);

  if (!totals) return null;
  const any = Object.values(totals).some((t) => t.count > 0);
  if (!any) return null;
  const waiting = totals.PENDING.amount + totals.ON_HOLD.amount;
  const waitingCount = totals.PENDING.count + totals.ON_HOLD.count;

  return (
    <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
          <Gift className="h-4 w-4 text-emerald-700" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Commission at completion</p>
          <p className="text-xs text-gray-500">Paid when your customers finish paying</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Cell label={`Waiting · ${waitingCount}`} value={formatCurrency(waiting)} />
        <Cell label={`Ready to pay · ${totals.PAYABLE.count}`} value={formatCurrency(totals.PAYABLE.amount)} strong />
        <Cell label={`Paid · ${totals.PAID.count}`} value={formatCurrency(totals.PAID.amount)} />
      </div>
      {totals.FORFEITED.count > 0 && (
        <p className="mt-2 text-xs text-gray-500">
          {formatCurrency(totals.FORFEITED.amount)} lost on {totals.FORFEITED.count} contract{totals.FORFEITED.count === 1 ? '' : 's'} that were
          cancelled or written off.
        </p>
      )}
    </div>
  );
}

function Cell({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-lg bg-gray-50 px-2 py-2">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className={`text-sm font-bold ${strong ? 'text-emerald-700' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}
