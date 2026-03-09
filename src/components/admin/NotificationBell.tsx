'use client';

import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useDailyPayments } from '@/hooks/useDailyPayments';

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
  const { data, count } = useDailyPayments();
  const [open, setOpen] = useState(false);

  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <div className="relative">
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
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Panel — fixed to right side of screen, full viewport height */}
          <div className="fixed top-0 right-0 z-50 h-screen w-96 bg-slate-900 text-white shadow-2xl border-l border-white/10 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 shrink-0">
              <div>
                <p className="text-base font-semibold">Today&apos;s Payments</p>
                <p className="text-xs text-cyan-100/60 mt-0.5">
                  {data?.date ? new Date(data.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-cyan-100/60 hover:bg-white/10 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-px border-b border-white/10 bg-white/5 shrink-0">
              <div className="bg-slate-900 px-5 py-4">
                <p className="text-xs text-cyan-100/60 uppercase tracking-wide">Payments</p>
                <p className="text-3xl font-bold text-green-400 mt-1">{count}</p>
              </div>
              <div className="bg-slate-900 px-5 py-4">
                <p className="text-xs text-cyan-100/60 uppercase tracking-wide">Total Collected</p>
                <p className="text-xl font-bold text-green-400 mt-1">
                  {data ? formatCurrency(data.totalAmount) : '—'}
                </p>
              </div>
            </div>

            {/* Section label */}
            <div className="px-5 py-3 shrink-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-100/40">
                {count > 10 ? `Most Recent 10 of ${count} Payments` : `All ${count} Payment${count !== 1 ? 's' : ''} Today`}
              </p>
            </div>

            {/* Payment list — scrollable, fills remaining space */}
            <div className="overflow-y-auto flex-1 min-h-0 px-2">
              {!data || data.recentPayments.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-cyan-100/50">
                  No successful payments today yet
                </p>
              ) : (
                <ul className="space-y-1 pb-4">
                  {data.recentPayments.map((p, i) => (
                    <li key={p.id} className="rounded-lg px-4 py-3 hover:bg-white/5 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/15 text-xs font-bold text-green-400">
                            {i + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white">
                              {p.customer.firstName} {p.customer.lastName}
                            </p>
                            <p className="text-xs text-cyan-100/50 mt-0.5">
                              {p.customer.membershipId}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-green-400 shrink-0">
                          {formatCurrency(p.amount)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-2 pl-11">
                        <p className="text-xs text-cyan-100/50">
                          {p.contract.contractNumber} · {getPaymentMethodLabel(p.paymentMethod)}
                        </p>
                        <p className="text-xs text-cyan-100/40">
                          {formatDate(p.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
