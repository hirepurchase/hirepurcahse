'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText, Users, Banknote, TrendingUp, AlertCircle,
  Clock, CheckCircle, XCircle, RefreshCw, ChevronRight,
  Wallet, Target, CalendarClock,
} from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { AdminUser } from '@/types';

interface Portfolio {
  totalContracts: number;
  activeContracts: number;
  pendingContracts: number;
  revisionContracts: number;
  completedContracts: number;
  defaultedContracts: number;
}

interface Financials {
  totalSalesValue: number;
  totalDepositsCollected: number;
  totalPaymentsCollected: number;
  totalOutstanding: number;
  thisMonthPayments: number;
}

interface Alerts {
  overdueInstallments: number;
  upcomingDueTomorrow: number;
  revisionsPending: number;
  pendingApproval: number;
}

interface ThisMonth {
  contractsCreated: number;
  paymentsCollected: number;
  contractGrowth: number;
}

interface NextDue {
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: string;
  contractId: string;
}

interface RecentContract {
  id: string;
  contractNumber: string;
  status: string;
  totalPrice: number;
  outstandingBalance: number;
  createdAt: string;
  customer: { firstName: string; lastName: string; membershipId: string };
  product: string | null;
}

interface AgentDashboard {
  portfolio: Portfolio;
  customers: { total: number; thisMonth: number };
  financials: Financials;
  alerts: Alerts;
  thisMonth: ThisMonth;
  nextDue: NextDue | null;
  recentContracts: RecentContract[];
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  ACTIVE:            { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Active' },
  PENDING_APPROVAL:  { bg: 'bg-amber-100',   text: 'text-amber-700',   label: 'Pending Approval' },
  REVISION_REQUESTED:{ bg: 'bg-orange-100',  text: 'text-orange-700',  label: 'Revision' },
  COMPLETED:         { bg: 'bg-blue-100',    text: 'text-blue-700',    label: 'Completed' },
  DEFAULTED:         { bg: 'bg-red-100',     text: 'text-red-700',     label: 'Defaulted' },
  CANCELLED:         { bg: 'bg-slate-100',   text: 'text-slate-500',   label: 'Cancelled' },
};

function initialsOf(first: string, last: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
}

function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function StatCard({
  icon: Icon, label, value, sub, color = 'blue', trend, featured = false,
}: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color?: string; trend?: number; featured?: boolean;
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <div
      className={`bg-white rounded-xl border p-4 flex min-w-0 flex-col gap-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        featured ? 'border-blue-200 sm:col-span-2' : 'border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        {trend !== undefined && trend !== 0 && (
          <span className={`text-xs font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="min-w-0">
        <div
          className={`truncate font-bold text-gray-900 leading-tight tabular-nums ${featured ? 'text-3xl' : 'text-xl'}`}
          title={typeof value === 'string' ? value : undefined}
        >
          {value}
        </div>
        <div className="text-sm text-gray-500 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

export default function AgentDashboardPage() {
  const { user } = useAuthStore();
  const adminUser = user as AdminUser | null;
  const agentName = adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Agent';
  const agentInitials = adminUser ? initialsOf(adminUser.firstName, adminUser.lastName) : 'A';

  const [data, setData] = useState<AgentDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [officers, setOfficers] = useState<
    { id: string; name: string; email: string; phone: string | null }[]
  >([]);

  useEffect(() => {
    api.get('/reports/agent-dashboard')
      .then(r => setData(r.data))
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false));

    // Supplementary — a failure here must not blank the dashboard.
    api.get('/admin-users/me/customer-service')
      .then(r => setOfficers(r.data.officers || []))
      .catch(() => setOfficers([]));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-gray-600">{error ?? 'No data available'}</p>
          <button onClick={() => window.location.reload()} className="mt-4 text-sm text-blue-600 hover:underline">Retry</button>
        </div>
      </div>
    );
  }

  const { portfolio, customers, financials, alerts, thisMonth, nextDue, recentContracts } = data;
  const hasAlerts = alerts.overdueInstallments > 0 || alerts.upcomingDueTomorrow > 0 || alerts.revisionsPending > 0;

  const portfolioSegments = [
    { label: 'Active',    value: portfolio.activeContracts,    bar: 'bg-emerald-500', dot: 'bg-emerald-500', text: 'text-emerald-700' },
    { label: 'Pending',   value: portfolio.pendingContracts,   bar: 'bg-amber-500',   dot: 'bg-amber-500',   text: 'text-amber-700' },
    { label: 'Revision',  value: portfolio.revisionContracts,  bar: 'bg-orange-500',  dot: 'bg-orange-500',  text: 'text-orange-700' },
    { label: 'Completed', value: portfolio.completedContracts, bar: 'bg-blue-500',    dot: 'bg-blue-500',    text: 'text-blue-700' },
    { label: 'Defaulted', value: portfolio.defaultedContracts, bar: 'bg-red-500',     dot: 'bg-red-500',     text: 'text-red-700' },
  ].filter(s => s.value > 0);
  const portfolioTotal = Math.max(portfolio.totalContracts, 1);

  return (
    <div className="space-y-6 pb-10">

      {/* ── HEADER ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-lg sm:text-xl font-bold shrink-0">
              {agentInitials}
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-400 font-medium">{timeGreeting()}</p>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{agentName}</h1>
              <p className="text-sm text-gray-500 mt-0.5">Sales Agent · Personal Dashboard</p>
            </div>
          </div>
          <Link
            href="/admin/agent/contracts"
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5 self-start sm:self-auto"
          >
            <FileText className="w-4 h-4" /> My Contracts
          </Link>
        </div>

        {officers.length > 0 && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              Your customer service {officers.length === 1 ? 'officer' : 'officers'}
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {officers.map((o) => (
                <div key={o.id} className="text-sm">
                  <p className="font-semibold text-gray-800">{o.name}</p>
                  <div className="flex flex-wrap gap-x-3 text-gray-500 text-xs mt-0.5">
                    {o.phone && (
                      <a href={`tel:${o.phone}`} className="hover:text-blue-600">{o.phone}</a>
                    )}
                    <a href={`mailto:${o.email}`} className="hover:text-blue-600">{o.email}</a>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-gray-400 text-xs mt-2">They verify your customers before contracts are approved</p>
          </div>
        )}
      </div>

      {/* ── ALERTS ── */}
      {hasAlerts && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {alerts.overdueInstallments > 0 && (
            <Link
              href="/admin/agent/overdue"
              className="flex items-center gap-4 bg-white border border-red-200 rounded-xl px-5 py-4 shadow-sm hover:bg-red-50 hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-red-700 text-sm">{alerts.overdueInstallments} Overdue Installment{alerts.overdueInstallments > 1 ? 's' : ''}</p>
                <p className="text-red-500 text-xs mt-0.5">Customers on your contracts have missed payments</p>
              </div>
              <ChevronRight className="w-4 h-4 text-red-600 shrink-0" />
            </Link>
          )}
          {alerts.upcomingDueTomorrow > 0 && (
            <Link
              href="/admin/agent/upcoming"
              className="flex items-center gap-4 bg-white border border-amber-200 rounded-xl px-5 py-4 shadow-sm hover:bg-amber-50 hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                <CalendarClock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-amber-700 text-sm">{alerts.upcomingDueTomorrow} Payment{alerts.upcomingDueTomorrow > 1 ? 's' : ''} Due Tomorrow</p>
                <p className="text-amber-500 text-xs mt-0.5">Follow up before these go overdue</p>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-600 shrink-0" />
            </Link>
          )}
          {alerts.revisionsPending > 0 && (
            <Link
              href="/admin/agent/contracts?status=REVISION_REQUESTED"
              className="flex items-center gap-4 bg-white border border-orange-200 rounded-xl px-5 py-4 shadow-sm hover:bg-orange-50 hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                <RefreshCw className="w-4 h-4 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-orange-700 text-sm">{alerts.revisionsPending} Revision{alerts.revisionsPending > 1 ? 's' : ''} Requested</p>
                <p className="text-orange-500 text-xs mt-0.5">Admin has sent contracts back for your changes</p>
              </div>
              <ChevronRight className="w-4 h-4 text-orange-600 shrink-0" />
            </Link>
          )}
        </div>
      )}

      {/* ── PORTFOLIO STATUS BREAKDOWN ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Portfolio Breakdown</h2>
          <p className="text-sm text-gray-400">
            <span className="font-bold text-gray-900 tabular-nums">{portfolio.totalContracts}</span> total contracts
          </p>
        </div>

        {portfolio.totalContracts === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No contracts yet</p>
        ) : (
          <>
            <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-gray-100">
              {portfolioSegments.map(s => (
                <div
                  key={s.label}
                  className={`${s.bar} h-full first:rounded-l-full last:rounded-r-full`}
                  style={{ width: `${(s.value / portfolioTotal) * 100}%` }}
                  title={`${s.label}: ${s.value}`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4">
              {portfolioSegments.map(s => (
                <div key={s.label} className="flex items-center gap-1.5 text-sm">
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  <span className="font-semibold text-gray-900 tabular-nums">{s.value}</span>
                  <span className="text-gray-500">{s.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── FINANCIAL SUMMARY ── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Financial Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            icon={TrendingUp} label="Total Sales Value" color="blue" featured
            value={formatCurrency(financials.totalSalesValue)}
            sub={`${portfolio.totalContracts} contracts total`}
          />
          <StatCard
            icon={Banknote} label="Payments Collected" color="green"
            value={formatCurrency(financials.totalPaymentsCollected)}
            sub="All-time across your contracts"
          />
          <StatCard
            icon={Target} label="This Month Collections" color="blue"
            value={formatCurrency(financials.thisMonthPayments)}
            sub="Payments received this month"
            trend={thisMonth.contractGrowth}
          />
          <StatCard
            icon={Wallet} label="Deposits Collected" color="purple"
            value={formatCurrency(financials.totalDepositsCollected)}
            sub="Total upfront deposits"
          />
          <StatCard
            icon={AlertCircle} label="Outstanding Balance" color="amber"
            value={formatCurrency(financials.totalOutstanding)}
            sub="Remaining on active contracts"
          />
          <StatCard
            icon={Users} label="Customers Registered" color="blue"
            value={customers.total}
            sub={`${customers.thisMonth} registered this month`}
          />
        </div>
      </div>

      {/* ── THIS MONTH + NEXT DUE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* This month activity */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-4 text-sm">This Month&apos;s Activity</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Contracts Created</p>
                  <p className="text-xs text-gray-400">New hire purchase agreements</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900 tabular-nums">{thisMonth.contractsCreated}</div>
                {thisMonth.contractGrowth !== 0 && (
                  <div className={`text-xs font-medium ${thisMonth.contractGrowth >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {thisMonth.contractGrowth >= 0 ? '+' : ''}{thisMonth.contractGrowth}% vs last month
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <Banknote className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Payments Collected</p>
                  <p className="text-xs text-gray-400">Received this month</p>
                </div>
              </div>
              <div className="text-lg font-bold text-gray-900 tabular-nums">{formatCurrency(thisMonth.paymentsCollected)}</div>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Customers Registered</p>
                  <p className="text-xs text-gray-400">New customers this month</p>
                </div>
              </div>
              <div className="text-lg font-bold text-gray-900 tabular-nums">{customers.thisMonth}</div>
            </div>
          </div>
        </div>

        {/* Next due / pending approval */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-4 text-sm">Attention Required</h3>
          <div className="space-y-3">
            {nextDue && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800">Next Installment Due</p>
                  <p className="text-xs text-amber-600">{formatDate(nextDue.dueDate)} · {formatCurrency(nextDue.amount - nextDue.paidAmount)} remaining</p>
                </div>
              </div>
            )}
            {alerts.pendingApproval > 0 && (
              <Link href="/admin/agent/contracts?status=PENDING_APPROVAL" className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-100 hover:bg-yellow-100 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-yellow-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-yellow-800">{alerts.pendingApproval} Contract{alerts.pendingApproval > 1 ? 's' : ''} Awaiting Approval</p>
                  <p className="text-xs text-yellow-600">In the approval queue</p>
                </div>
                <ChevronRight className="w-4 h-4 text-yellow-600 flex-shrink-0" />
              </Link>
            )}
            {alerts.revisionsPending > 0 && (
              <Link href="/admin/agent/contracts?status=REVISION_REQUESTED" className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100 hover:bg-orange-100 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-4 h-4 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-orange-800">{alerts.revisionsPending} Revision{alerts.revisionsPending > 1 ? 's' : ''} to Action</p>
                  <p className="text-xs text-orange-600">Edit terms and resubmit</p>
                </div>
                <ChevronRight className="w-4 h-4 text-orange-600 flex-shrink-0" />
              </Link>
            )}
            {alerts.overdueInstallments > 0 && (
              <Link href="/admin/agent/overdue" className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100 hover:bg-red-100 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                  <XCircle className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-800">{alerts.overdueInstallments} Overdue Installment{alerts.overdueInstallments > 1 ? 's' : ''}</p>
                  <p className="text-xs text-red-600">Customers have missed payments</p>
                </div>
                <ChevronRight className="w-4 h-4 text-red-600 shrink-0" />
              </Link>
            )}
            {alerts.upcomingDueTomorrow > 0 && (
              <Link href="/admin/agent/upcoming" className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100 hover:bg-amber-100 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <CalendarClock className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800">{alerts.upcomingDueTomorrow} Payment{alerts.upcomingDueTomorrow > 1 ? 's' : ''} Due Tomorrow</p>
                  <p className="text-xs text-amber-600">Call ahead to help customers stay on track</p>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-600 shrink-0" />
              </Link>
            )}
            {!nextDue && alerts.pendingApproval === 0 && alerts.revisionsPending === 0 && alerts.overdueInstallments === 0 && alerts.upcomingDueTomorrow === 0 && (
              <div className="flex flex-col items-center justify-center py-6 text-center text-gray-400">
                <CheckCircle className="w-7 h-7 text-emerald-400 mb-2" />
                <p className="text-sm font-medium text-gray-600">All clear!</p>
                <p className="text-xs">No items needing your attention</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── RECENT CONTRACTS ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-700 text-sm">Recent Contracts</h3>
          <Link href="/admin/agent/contracts" className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Contract</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Price</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Outstanding</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentContracts.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400 text-sm">No contracts yet. <Link href="/admin/contracts" className="text-blue-600 underline">Create your first contract</Link></td></tr>
              )}
              {recentContracts.map(c => {
                const s = STATUS_STYLES[c.status] ?? STATUS_STYLES.CANCELLED;
                return (
                  <tr key={c.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => window.location.href = `/admin/agent/contracts/${c.id}`}>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-gray-800">{c.contractNumber}</div>
                      <div className="text-xs text-gray-400">{formatDate(c.createdAt)}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-[11px] font-bold flex items-center justify-center shrink-0">
                          {initialsOf(c.customer.firstName, c.customer.lastName)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-700 truncate">{c.customer.firstName} {c.customer.lastName}</div>
                          <div className="text-xs text-gray-400">{c.customer.membershipId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">{c.product ?? '—'}</td>
                    <td className="px-5 py-3.5 font-semibold text-gray-800 tabular-nums">{formatCurrency(c.totalPrice)}</td>
                    <td className="px-5 py-3.5 font-semibold text-red-600 tabular-nums">{formatCurrency(c.outstandingBalance)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>{s.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-gray-50">
          {recentContracts.length === 0 && (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">
              No contracts yet. <Link href="/admin/contracts" className="text-blue-600 underline">Create one</Link>
            </div>
          )}
          {recentContracts.map(c => {
            const s = STATUS_STYLES[c.status] ?? STATUS_STYLES.CANCELLED;
            return (
              <Link key={c.id} href={`/admin/agent/contracts/${c.id}`} className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center shrink-0">
                  {initialsOf(c.customer.firstName, c.customer.lastName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-800 text-sm truncate">{c.contractNumber}</div>
                      <div className="text-xs text-gray-400 truncate">{c.customer.firstName} {c.customer.lastName}</div>
                    </div>
                    <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>{s.label}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{c.product ?? '—'}</span>
                    <span className="font-semibold text-red-600">{formatCurrency(c.outstandingBalance)} due</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── QUICK ACTIONS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/admin/contracts" className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-blue-300 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="font-semibold text-gray-800 text-sm">New Contract</div>
            <div className="text-xs text-gray-500">Create a hire purchase agreement</div>
          </div>
        </Link>
        <Link href="/admin/customers" className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-purple-300 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <div className="font-semibold text-gray-800 text-sm">Register Customer</div>
            <div className="text-xs text-gray-500">Add a new hire-purchase customer</div>
          </div>
        </Link>
        <Link href="/admin/agent/contracts" className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-emerald-300 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="font-semibold text-gray-800 text-sm">My Contracts</div>
            <div className="text-xs text-gray-500">View your full portfolio</div>
          </div>
        </Link>
      </div>

    </div>
  );
}
