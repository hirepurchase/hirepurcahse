'use client';

import { useEffect, useState } from 'react';
import { Medal } from 'lucide-react';
import api from '@/lib/api';
import { MonthData, formatValue, ghs, monthLabel, thisMonth } from '@/app/admin/cluster-scorecard/types';

/**
 * The signed-in cluster leader's own scorecard for the month so far.
 * Hidden until management has switched on at least one indicator or a base
 * amount, so leaders are not shown a card of zeros.
 */
export default function MyScorecardCard() {
  const [data, setData] = useState<MonthData | null>(null);
  const month = thisMonth();

  useEffect(() => {
    api
      .get('/cluster-scorecard', { params: { month } })
      .then(({ data }) => setData(data))
      .catch(() => setData(null));
  }, [month]);

  if (!data) return null;
  const me = data.leaders[0];
  const enabled = data.rules.indicators.filter((r) => r.enabled);
  if (!me || (enabled.length === 0 && data.rules.settings.baseAmount === 0)) return null;
  const defs = new Map(data.indicators.map((d) => [d.key, d]));

  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
            <Medal className="h-4 w-4 text-emerald-700" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">My scorecard</p>
            <p className="text-xs text-gray-500">{monthLabel(month)} so far — an estimate until the month is closed</p>
          </div>
        </div>
        <p className="text-xl font-bold text-emerald-700">{ghs(me.total)}</p>
      </div>
      {me.gated && me.gateReason && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">Variable pay is on hold: {me.gateReason}.</p>
      )}
      <ul className="mt-3 divide-y divide-gray-100">
        {enabled.map((rule) => {
          const line = me.lines.find((l) => l.key === rule.key);
          const def = defs.get(rule.key);
          return (
            <li key={rule.key} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="text-gray-700">{def?.label || rule.key}</span>
              <span className="text-right">
                <span className="font-medium text-gray-900">{formatValue(def?.unit, line?.value ?? null)}</span>
                <span className={`ml-2 text-xs font-semibold ${(line?.payout ?? 0) < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                  {(line?.payout ?? 0) < 0 ? '−' : ''}
                  {ghs(Math.abs(line?.payout ?? 0))}
                </span>
              </span>
            </li>
          );
        })}
        {me.base > 0 && (
          <li className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="text-gray-700">Base</span>
            <span className="text-xs font-semibold text-emerald-700">{ghs(me.base)}</span>
          </li>
        )}
      </ul>
    </div>
  );
}
