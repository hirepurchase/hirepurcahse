'use client';

import { useEffect, useState } from 'react';
import { X, TrendingUp } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface DailyPaymentsData {
  date: string;
  count: number;
  totalAmount: number;
}

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
  const [data, setData] = useState<DailyPaymentsData | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (wasDismissedToday()) return;

    api.get('/reports/daily-payments')
      .then(res => {
        setData(res.data);
        setVisible(true);
      })
      .catch(() => {
        // silently fail
      });
  }, []);

  const handleDismiss = () => {
    dismissToday();
    setVisible(false);
  };

  if (!visible || !data) return null;

  return (
    <div className="mx-4 mt-4 sm:mx-6 lg:mx-8 rounded-xl border border-green-500/30 bg-green-950/40 px-4 py-3 text-white backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-green-500/20">
            <TrendingUp className="h-5 w-5 text-green-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-green-300">
              {data.count === 0
                ? 'No successful payments yet today'
                : `${data.count} payment${data.count !== 1 ? 's' : ''} received today`}
            </p>
            {data.count > 0 && (
              <p className="text-xs text-green-400/80 mt-0.5">
                Total collected today: <span className="font-bold">{formatCurrency(data.totalAmount)}</span>
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 rounded-md p-1 text-green-400/70 transition-colors hover:bg-green-500/20 hover:text-green-300"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
