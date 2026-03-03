'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export interface DailyPayment {
  id: string;
  transactionRef: string;
  amount: number;
  paymentMethod: string;
  createdAt: string;
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

  const load = async () => {
    try {
      const res = await api.get('/reports/daily-payments');
      setData(res.data);
    } catch {
      // silently fail — non-critical UI
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { data, count: data?.count ?? 0 };
}
