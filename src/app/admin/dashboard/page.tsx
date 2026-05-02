'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, FileText, Banknote, AlertCircle, ChevronRight, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { AdminUser } from '@/types';

interface RecentContract {
  id: string;
  createdAt: string;
  totalPrice: number;
  status: string;
  customer: { firstName: string; lastName: string; membershipId: string };
  inventoryItem: { product: { name: string } } | null;
}

interface DashboardStats {
  totalCustomers: number;
  totalContracts: number;
  activeContracts: number;
  totalRevenue: number;
  overduePayments: number;
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuthStore();
  const adminUser = user as AdminUser | null;

  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalContracts: 0,
    activeContracts: 0,
    totalRevenue: 0,
    overduePayments: 0,
  });
  const [recentContracts, setRecentContracts] = useState<RecentContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardStats = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get('/reports/dashboard');
      const payload = response.data;
      setStats({
        totalCustomers: payload?.customers?.total ?? 0,
        totalContracts: payload?.contracts?.total ?? 0,
        activeContracts: payload?.contracts?.active ?? 0,
        totalRevenue: payload?.payments?.monthlyTotal ?? 0,
        overduePayments: payload?.alerts?.overdueInstallments ?? 0,
      });
      setRecentContracts(payload?.recentContracts ?? []);
    } catch {
      setError('Could not load dashboard statistics. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (adminUser?.role === 'AGENT') {
      router.replace('/admin/agent/dashboard');
      return;
    }

    void loadDashboardStats();
  }, [adminUser?.role, isAuthLoading, loadDashboardStats, router]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Hire purchase management overview</p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button
            onClick={loadDashboardStats}
            className="shrink-0 text-sm font-medium text-red-700 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Grid — 2 cols on mobile, 4 on lg */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Customers"
          value={stats.totalCustomers}
          icon={Users}
          iconClass="text-blue-600"
          iconBg="bg-blue-50"
          href="/admin/customers"
        />
        <StatCard
          title="Contracts"
          value={stats.totalContracts}
          icon={FileText}
          iconClass="text-emerald-600"
          iconBg="bg-emerald-50"
          subtitle={`${stats.activeContracts} active`}
          href="/admin/contracts"
        />
        <StatCard
          title="This Month"
          value={formatCurrency(stats.totalRevenue)}
          icon={Banknote}
          iconClass="text-purple-600"
          iconBg="bg-purple-50"
          href="/admin/reports"
        />
        <StatCard
          title="Overdue"
          value={stats.overduePayments}
          icon={AlertCircle}
          iconClass="text-red-600"
          iconBg="bg-red-50"
          href="/admin/reports"
          highlight={stats.overduePayments > 0}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <QuickAction
            href="/admin/customers?action=new"
            label="Register Customer"
            description="Create account & membership ID"
            colorClass="bg-blue-50 hover:bg-blue-100 border-blue-100"
            labelClass="text-blue-900"
            descClass="text-blue-600"
            icon={<Plus className="h-5 w-5 text-blue-600" />}
          />
          <QuickAction
            href="/admin/contracts?action=new"
            label="New HP Sale"
            description="Initiate a hire purchase contract"
            colorClass="bg-emerald-50 hover:bg-emerald-100 border-emerald-100"
            labelClass="text-emerald-900"
            descClass="text-emerald-600"
            icon={<Plus className="h-5 w-5 text-emerald-600" />}
          />
          <QuickAction
            href="/admin/products?action=new"
            label="Add Product"
            description="Add products to inventory"
            colorClass="bg-purple-50 hover:bg-purple-100 border-purple-100"
            labelClass="text-purple-900"
            descClass="text-purple-600"
            icon={<Plus className="h-5 w-5 text-purple-600" />}
          />
        </div>
      </div>

      {/* Recent Contracts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Recent Contracts</h2>
          <Link
            href="/admin/contracts"
            className="flex items-center gap-1 text-xs font-medium text-cyan-600 hover:text-cyan-800 transition-colors"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentContracts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No contracts yet</p>
            <p className="text-xs text-gray-400 mt-1">Recent contracts will appear here</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
            {recentContracts.map((contract) => (
              <Link
                key={contract.id}
                href={`/admin/contracts/${contract.id}`}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors group"
              >
                {/* Avatar */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 group-hover:bg-cyan-50 group-hover:text-cyan-700 transition-colors">
                  {contract.customer.firstName[0]}{contract.customer.lastName[0]}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {contract.customer.firstName} {contract.customer.lastName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {contract.inventoryItem?.product?.name ?? 'Product'} · {contract.customer.membershipId}
                  </p>
                </div>
                {/* Right */}
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(contract.totalPrice)}</p>
                  <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', STATUS_STYLES[contract.status] ?? 'bg-gray-100 text-gray-600')}>
                    {contract.status}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
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
  href,
  highlight,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconClass: string;
  iconBg: string;
  subtitle?: string;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex flex-col gap-3 rounded-xl border bg-white p-4 transition-all hover:shadow-md hover:-translate-y-0.5',
        highlight ? 'border-red-200 ring-1 ring-red-100' : 'border-gray-100'
      )}
    >
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
    </Link>
  );
}

function QuickAction({
  href,
  label,
  description,
  colorClass,
  labelClass,
  descClass,
  icon,
}: {
  href: string;
  label: string;
  description: string;
  colorClass: string;
  labelClass: string;
  descClass: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 p-4 rounded-xl border transition-colors',
        colorClass
      )}
    >
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className={cn('text-sm font-semibold', labelClass)}>{label}</p>
        <p className={cn('text-xs truncate', descClass)}>{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 ml-auto" />
    </Link>
  );
}
