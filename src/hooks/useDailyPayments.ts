'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export interface DailyPayment {
  id: string;
  transactionRef: string;
  amount: number;
  paymentMethod: string;
  createdAt: string;
  paymentDate?: string | null;
  customer: { firstName: string; lastName: string; membershipId: string };
  contract: { contractNumber: string };
}

export interface DailyPaymentsData {
  date: string;
  count: number;
  totalAmount: number;
  recentPayments: DailyPayment[];
}

export function useDailyPayments() {
  const [data, setData] = useState<DailyPaymentsData | null>(null);
  const { isAuthenticated, isLoading, userType } = useAuthStore();

  const load = useCallback(async () => {
    if (isLoading || !isAuthenticated || userType !== 'admin') {
      return;
    }

    try {
      const res = await api.get('/reports/daily-payments');
      setData(res.data);
    } catch {
      // silently fail — non-critical UI
    }
  }, [isAuthenticated, isLoading, userType]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || userType !== 'admin') {
      return;
    }

    load();
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void load();
      }
    }, 30 * 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void load();
      }
    };

    const handleFocus = () => {
      void load();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated, isLoading, load, userType]);

  return { data, count: data?.count ?? 0, refresh: load };
}
