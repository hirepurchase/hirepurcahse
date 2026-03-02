'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

interface DailyPayment {
  id: string;
  transactionRef: string;
  amount: number;
  paymentMethod: string;
  createdAt: string;
  customer: { firstName: string; lastName: string; membershipId: string };
  contract: { contractNumber: string };
}

interface DailyPaymentsData {
  date: string;
  count: number;
  totalAmount: number;
  recentPayments: DailyPayment[];
}

function getPaymentMethodLabel(method: string) {
  switch (method) {
    case 'HUBTEL_DIRECT_DEBIT': return 'Direct Debit';
    case 'HUBTEL_MOMO': return 'Hubtel MoMo';
    case 'HUBTEL_REGULAR': return 'Hubtel Regular';
    case 'MOBILE_MONEY': return 'Mobile Money';
    case 'CASH': return 'Cash';
    case 'BANK_TRANSFER': return 'Bank Transfer';
    default: return method || 'Unknown';
  }
}

export default function NotificationBell() {
  const [data, setData] = useState<DailyPaymentsData | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
    // Refresh every 2 minutes
    const interval = setInterval(load, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const count = data?.count ?? 0;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="relative flex items-center justify-center rounded-lg p-2 text-cyan-50/85 transition-colors hover:bg-white/10 hover:text-white"
        aria-label="Daily payments notifications"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white leading-none">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-full top-0 ml-2 z-50 w-80 rounded-xl border border-white/10 bg-slate-900 text-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Today&apos;s Payments</p>
              <p className="text-xs text-cyan-100/60">
                {data?.date ? new Date(data.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="text-cyan-100/60 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-px border-b border-white/10 bg-white/5">
            <div className="bg-slate-900 px-4 py-3">
              <p className="text-xs text-cyan-100/60">Payments</p>
              <p className="text-2xl font-bold text-green-400">{count}</p>
            </div>
            <div className="bg-slate-900 px-4 py-3">
              <p className="text-xs text-cyan-100/60">Total Collected</p>
              <p className="text-lg font-bold text-green-400">
                {data ? formatCurrency(data.totalAmount) : '—'}
              </p>
            </div>
          </div>

          {/* Recent payments list */}
          <div className="max-h-72 overflow-y-auto">
            {!data || data.recentPayments.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-cyan-100/50">
                No successful payments today yet
              </p>
            ) : (
              <ul className="divide-y divide-white/5">
                {data.recentPayments.map(p => (
                  <li key={p.id} className="px-4 py-2.5 hover:bg-white/5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {p.customer.firstName} {p.customer.lastName}
                      </p>
                      <p className="text-sm font-bold text-green-400">
                        {formatCurrency(p.amount)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-cyan-100/50">
                        {p.contract.contractNumber} · {getPaymentMethodLabel(p.paymentMethod)}
                      </p>
                      <p className="text-xs text-cyan-100/50">
                        {formatDate(p.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {count > 10 && (
            <div className="border-t border-white/10 px-4 py-2 text-center">
              <p className="text-xs text-cyan-100/50">Showing 10 most recent of {count} payments</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
