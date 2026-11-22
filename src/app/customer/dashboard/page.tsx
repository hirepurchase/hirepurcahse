'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, FileText, AlertCircle, ChevronRight, ArrowRight, Wallet } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { HirePurchaseContract, InstallmentSchedule } from '@/types';

type UpcomingInstallment = InstallmentSchedule & {
  contract?: { contractNumber?: string };
};

type DashboardStats = {
  totalContracts: number;
  totalOutstanding: number;
  nextPaymentDue: UpcomingInstallment | null;
};

const STATUS_DOT: Record<string, string> = {
  PENDING: 'bg-amber-400',
  PAID: 'bg-emerald-400',
  OVERDUE: 'bg-red-400',
};

export default function CustomerDashboardPage() {
  const [contracts, setContracts] = useState<HirePurchaseContract[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingInstallment[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalContracts: 0,
    totalOutstanding: 0,
    nextPaymentDue: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setLoadError(false);
      const contractsResponse = await api.get('/customers/me/contracts');
      const contractsData: HirePurchaseContract[] = contractsResponse.data.contracts || [];
      setContracts(contractsData);

      const activeContracts = contractsData.filter((c) => c.status === 'ACTIVE');
      const totalOutstanding = activeContracts.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0);

      const installmentsResponse = await api.get('/customers/me/installments/upcoming');
      const upcomingData: UpcomingInstallment[] = installmentsResponse.data.installments || [];
      setUpcomingPayments(upcomingData);

      setStats({
        totalContracts: contractsData.length,
        totalOutstanding,
        nextPaymentDue: upcomingData[0] || null,
      });
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const activeContracts = contracts.filter((c) => c.status === 'ACTIVE');
  const nextPayment = stats.nextPaymentDue;

  return (
    <div className="space-y-6">
      <header className="workspace-heading workspace-heading--customer">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">My account</h1>
        <p className="mt-2 text-base text-slate-600">Manage your hire purchase contracts and payments.</p>
      </header>

      {isLoading ? (
        <div role="status" className="operations-panel p-8 text-center text-slate-600">Loading account…</div>
      ) : loadError ? (
        <div role="alert" className="operations-panel flex flex-wrap items-center gap-3 p-5">
          <AlertCircle aria-hidden="true" className="size-5 text-red-600" />
          <p className="flex-1 text-sm text-slate-700">We couldn’t load your account.</p>
          <button type="button" className="min-h-10 rounded-lg border px-4 text-sm font-semibold hover:bg-slate-50" onClick={loadDashboardData}>Retry</button>
        </div>
      ) : (
        <>
          <section aria-label="Payment summary" className="grid gap-4 md:grid-cols-[1.25fr_1fr]">
            <div className="rounded-2xl border border-teal-800 bg-teal-900 p-5 text-white sm:p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-teal-100">
                <Wallet aria-hidden="true" className="size-5" /> Outstanding balance
              </div>
              <p className="mt-3 break-words text-3xl font-bold tabular-nums sm:text-4xl">{formatCurrency(stats.totalOutstanding)}</p>
              <Link href="/customer/payments" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-teal-900 hover:bg-teal-50">
                <CreditCard aria-hidden="true" className="size-4" /> Make a payment
              </Link>
            </div>
            <div className="operations-panel flex flex-col justify-center p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-slate-700">Next scheduled installment</h2>
              {nextPayment ? (
                <>
                  <p className="mt-2 break-words text-2xl font-bold tabular-nums text-slate-950">{formatCurrency(nextPayment.amount)}</p>
                  <p className="mt-1 text-sm text-slate-600">Due {formatDate(nextPayment.dueDate)}</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-600">No upcoming installments.</p>
              )}
              <Link href="/customer/contracts" className="mt-4 w-fit text-sm font-semibold text-teal-800 hover:underline">
                View all contracts ({stats.totalContracts})
              </Link>
            </div>
          </section>

          {/* Active Contracts */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-slate-950">Active Contracts</h2>
              <button
                onClick={() => router.push('/customer/contracts')}
                className="flex items-center gap-1 text-sm font-semibold text-teal-800 hover:text-teal-800 transition-colors"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {activeContracts.length === 0 ? (
              <div className="text-center py-10 operations-panel">
                <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500 workspace-empty-message">No active contracts</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeContracts.slice(0, 3).map((contract) => {
                  const progress = contract.totalPrice > 0
                    ? Math.min(100, Math.round((contract.totalPaid / contract.totalPrice) * 100))
                    : 0;
                  return (
                    <button
                      key={contract.id}
                      onClick={() => router.push(`/customer/contracts/${contract.id}`)}
                      className="w-full text-left operations-panel p-4 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {contract.inventoryItem?.product?.name ?? contract.contractNumber}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {contract.paymentFrequency} · {contract.totalInstallments} installments
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold text-emerald-600">{formatCurrency(contract.totalPaid)}</p>
                          <p className="text-xs text-gray-400">of {formatCurrency(contract.totalPrice)}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-300 shrink-0 mt-0.5 group-hover:text-gray-500 transition-colors" />
                      </div>
                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-slate-600 mb-1">
                          <span>Progress</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-red-500 font-medium">
                        Outstanding: {formatCurrency(contract.outstandingBalance)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming Payments */}
          {upcomingPayments.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-slate-950">Upcoming Payments</h2>
                <button
                  onClick={() => router.push('/customer/payments')}
                  className="flex items-center gap-1 text-sm font-semibold text-teal-800 hover:text-teal-800 transition-colors"
                >
                  Pay now <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="operations-panel overflow-hidden divide-y divide-gray-50">
                {upcomingPayments.slice(0, 5).map((inst) => (
                  <div key={inst.id} className="flex items-center gap-3 px-4 py-3">
                    <div className={cn('h-2 w-2 rounded-full shrink-0', STATUS_DOT[inst.status] ?? 'bg-gray-300')} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-gray-500 truncate">{inst.contract?.contractNumber}</p>
                      <p className="text-xs text-gray-400">{formatDate(inst.dueDate)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(inst.amount)}</p>
                      <span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded-full', getStatusColor(inst.status))}>
                        {inst.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
