'use client';

import { useEffect, useState } from 'react';
import { ClipboardCheck, X } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import { usePendingContractApprovals } from '@/hooks/usePendingContractApprovals';
import Link from 'next/link';

interface PendingContract {
  id: string;
  contractNumber: string;
  totalPrice: number;
  depositAmount: number;
  paymentFrequency: string;
  totalInstallments: number;
  createdAt: string;
  customer: { firstName: string; lastName: string; membershipId: string };
  inventoryItem: { product: { name: string } } | null;
  createdBy: { firstName: string; lastName: string; role: { name: string } };
}

export default function ContractApprovalBell({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const { count, refresh } = usePendingContractApprovals();
  const [open, setOpen] = useState(false);
  const [contracts, setContracts] = useState<PendingContract[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('keydown', handleKey);
      loadContracts();
    }
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const loadContracts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/contracts/approvals', { params: { limit: 10 } });
      setContracts(res.data.contracts || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const btnCls = variant === 'dark'
    ? 'text-slate-400 hover:bg-white/10 hover:text-white'
    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className={`relative flex items-center justify-center rounded-lg p-2 transition-colors ${btnCls}`}
        aria-label="Pending contract approvals"
      >
        <ClipboardCheck className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white leading-none">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed top-0 right-0 z-50 h-screen w-96 bg-slate-900 text-white shadow-2xl border-l border-white/10 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 shrink-0">
              <div>
                <p className="text-base font-semibold">Contract Approvals</p>
                <p className="text-xs text-cyan-100/60 mt-0.5">Contracts awaiting your review</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-cyan-100/60 hover:bg-white/10 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Summary */}
            <div className="border-b border-white/10 bg-white/5 px-5 py-4 shrink-0">
              <p className="text-xs text-cyan-100/60 uppercase tracking-wide">Pending Approvals</p>
              <p className="text-3xl font-bold text-amber-400 mt-1">{count}</p>
            </div>

            {/* Section label */}
            <div className="px-5 py-3 shrink-0 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-100/40">
                {count > 10 ? `Most Recent 10 of ${count}` : `All ${count} Pending`}
              </p>
              <Link
                href="/admin/contract-approvals"
                onClick={() => setOpen(false)}
                className="text-xs text-amber-400 hover:text-amber-300 font-medium"
              >
                View all →
              </Link>
            </div>

            {/* Contract list */}
            <div className="overflow-y-auto flex-1 min-h-0 px-2">
              {loading ? (
                <p className="px-4 py-10 text-center text-sm text-cyan-100/50">Loading…</p>
              ) : contracts.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-cyan-100/50">
                  No contracts pending approval
                </p>
              ) : (
                <ul className="space-y-1 pb-4">
                  {contracts.map((c, i) => (
                    <li key={c.id} className="rounded-lg px-4 py-3 hover:bg-white/5 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-xs font-bold text-amber-400">
                            {i + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white">
                              {c.customer?.firstName} {c.customer?.lastName}
                            </p>
                            <p className="text-xs text-cyan-100/50 mt-0.5">{c.customer?.membershipId}</p>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-amber-400 shrink-0">
                          {formatCurrency(c.totalPrice)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-2 pl-11">
                        <p className="text-xs text-cyan-100/50">
                          {c.contractNumber} · {c.inventoryItem?.product?.name ?? 'Item'}
                        </p>
                        <p className="text-xs text-cyan-100/40">{formatDate(c.createdAt)}</p>
                      </div>
                      <div className="mt-1 pl-11">
                        <p className="text-xs text-cyan-100/40">
                          By {c.createdBy?.firstName} {c.createdBy?.lastName} ({c.createdBy?.role?.name ?? '—'})
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer link */}
            <div className="border-t border-white/10 px-5 py-4 shrink-0">
              <Link
                href="/admin/contract-approvals"
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-center rounded-lg bg-amber-500/20 px-4 py-2.5 text-sm font-semibold text-amber-400 hover:bg-amber-500/30 transition-colors"
              >
                Open Approvals Page
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
