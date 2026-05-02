'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, FileText, AlertCircle, CheckCircle, ChevronRight, ArrowRight, Wallet } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import type { HirePurchaseContract, InstallmentSchedule } from '@/types';

type UpcomingInstallment = InstallmentSchedule & {
  contract?: { contractNumber?: string };
};

type DashboardStats = {
  totalContracts: number;
  activeContracts: number;
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
    activeContracts: 0,
    totalOutstanding: 0,
    nextPaymentDue: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
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
        activeContracts: activeContracts.length,
        totalOutstanding,
        nextPaymentDue: upcomingData[0] || null,
      });
    } catch (error: unknown) {
      const message =
        typeof error === 'object' && error !== null
          ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      toast({ title: 'Error', description: message || 'Failed to load dashboard data', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
      </div>
    );
  }

  const activeContracts = contracts.filter((c) => c.status === 'ACTIVE');

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your hire purchase summary</p>
      </div>

      {/* Stats — 2 cols on mobile, 4 on lg */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Contracts"
          value={stats.totalContracts}
          icon={FileText}
          iconClass="text-blue-600"
          iconBg="bg-blue-50"
          subtitle={`${stats.activeContracts} active`}
        />
        <StatCard
          title="Active"
          value={stats.activeContracts}
          icon={CheckCircle}
          iconClass="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(stats.totalOutstanding)}
          icon={Wallet}
          iconClass="text-red-600"
          iconBg="bg-red-50"
          highlight={stats.totalOutstanding > 0}
        />
        <StatCard
          title="Next Due"
          value={stats.nextPaymentDue ? formatCurrency(stats.nextPaymentDue.amount) : '—'}
          icon={AlertCircle}
          iconClass="text-amber-600"
          iconBg="bg-amber-50"
          subtitle={stats.nextPaymentDue ? formatDate(stats.nextPaymentDue.dueDate) : undefined}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <button
          onClick={() => router.push('/customer/payments')}
          className="flex flex-col items-center gap-2 p-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-colors shadow-sm"
        >
          <CreditCard className="h-6 w-6" />
          <span className="text-sm font-semibold">Make Payment</span>
        </button>
        <button
          onClick={() => router.push('/customer/contracts')}
          className="flex flex-col items-center gap-2 p-4 bg-white hover:bg-gray-50 text-gray-700 rounded-xl border border-gray-200 transition-colors shadow-sm"
        >
          <FileText className="h-6 w-6" />
          <span className="text-sm font-semibold">View Contracts</span>
        </button>
        <button
          onClick={() => router.push('/customer/profile')}
          className="flex flex-col items-center gap-2 p-4 bg-white hover:bg-gray-50 text-gray-700 rounded-xl border border-gray-200 transition-colors shadow-sm col-span-2 sm:col-span-1"
        >
          <FileText className="h-6 w-6" />
          <span className="text-sm font-semibold">My Profile</span>
        </button>
      </div>

      {/* Active Contracts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Active Contracts</h2>
          <button
            onClick={() => router.push('/customer/contracts')}
            className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-800 transition-colors"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {activeContracts.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-gray-100">
            <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No active contracts</p>
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
                  className="w-full text-left bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all group"
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
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
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
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Upcoming Payments</h2>
            <button
              onClick={() => router.push('/customer/payments')}
              className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-800 transition-colors"
            >
              Pay now <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
            {upcomingPayments.slice(0, 5).map((inst) => (
              <div key={inst.id} className="flex items-center gap-3 px-4 py-3">
                <div className={cn('h-2 w-2 rounded-full shrink-0', STATUS_DOT[inst.status] ?? 'bg-gray-300')} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-gray-500 truncate">{inst.contract?.contractNumber}</p>
                  <p className="text-xs text-gray-400">{formatDate(inst.dueDate)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(inst.amount)}</p>
                  <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', getStatusColor(inst.status))}>
                    {inst.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  iconClass,
  iconBg,
  subtitle,
  highlight,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconClass: string;
  iconBg: string;
  subtitle?: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      'flex flex-col gap-3 rounded-xl border bg-white p-4',
      highlight ? 'border-red-200 ring-1 ring-red-100' : 'border-gray-100'
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs sm:text-sm font-medium text-gray-500">{title}</span>
        <div className={cn('p-1.5 sm:p-2 rounded-lg', iconBg)}>
          <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', iconClass)} />
        </div>
      </div>
      <div>
        <div className={cn('text-xl sm:text-2xl font-bold', highlight ? 'text-red-600' : 'text-gray-900')}>
          {value}
        </div>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
