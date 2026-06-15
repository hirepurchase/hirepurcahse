'use client';

import { useEffect, useState } from 'react';
import { X, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useDailyPayments } from '@/hooks/useDailyPayments';

const BANNER_KEY = 'daily_payments_banner_dismissed';

function getTodayKey() {
  return new Date().toISOString().split('T')[0]; // e.g. "2026-03-02"
}

function wasDismissedToday(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem(BANNER_KEY);
    return stored === getTodayKey();
  } catch {
    return false;
  }
}

function dismissToday() {
  try {
    localStorage.setItem(BANNER_KEY, getTodayKey());
  } catch {
    // ignore storage errors
  }
}

export default function DailyPaymentsBanner() {
  const { data } = useDailyPayments();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!wasDismissedToday());
  }, []);

  const handleDismiss = () => {
    dismissToday();
    setVisible(false);
  };

  if (!visible || !data) return null;

  return (
    <div className="mx-4 mt-4 sm:mx-6 lg:mx-8 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100">
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-green-800">
              {data.count === 0
                ? 'No successful payments yet today'
                : `${data.count} payment${data.count !== 1 ? 's' : ''} received today`}
            </p>
            {data.count > 0 && (
              <p className="text-xs text-green-700 mt-0.5">
                Total collected today: <span className="font-bold">{formatCurrency(data.totalAmount)}</span>
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-md p-1 text-green-600 transition-colors hover:bg-green-100 hover:text-green-800"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
