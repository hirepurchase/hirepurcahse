'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText, Users, Banknote, TrendingUp, AlertCircle,
  Clock, CheckCircle, XCircle, RefreshCw, ChevronRight,
  Wallet, Target, BarChart2, ArrowUpRight, ArrowDownRight,
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

function StatCard({
  icon: Icon, label, value, sub, color = 'cyan', trend,
}: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color?: string; trend?: number;
}) {
  const colors: Record<string, string> = {
    cyan:   'from-cyan-500 to-cyan-700',
    green:  'from-emerald-500 to-emerald-700',
    amber:  'from-amber-500 to-amber-700',
    blue:   'from-blue-500 to-blue-700',
    purple: 'from-purple-500 to-purple-700',
    red:    'from-red-500 to-red-700',
    orange: 'from-orange-500 to-orange-700',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center shadow`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-semibold ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend)}% vs last month
          </span>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-800 leading-tight">{value}</div>
        <div className="text-sm text-slate-500 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

export default function AgentDashboardPage() {
  const { user } = useAuthStore();
  const adminUser = user as AdminUser | null;
  const agentName = adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Agent';

  const [data, setData] = useState<AgentDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get('/reports/agent-dashboard')
      .then(r => setData(r.data))
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-slate-600">{error ?? 'No data available'}</p>
          <button onClick={() => window.location.reload()} className="mt-4 text-sm text-cyan-600 underline">Retry</button>
        </div>
      </div>
    );
  }

  const { portfolio, customers, financials, alerts, thisMonth, nextDue, recentContracts } = data;
  const hasAlerts = alerts.overdueInstallments > 0 || alerts.revisionsPending > 0;

  return (
    <div className="space-y-6 pb-10">

      {/* ── HEADER ── */}
      <div className="bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 bg-[url('data:image/svg+xml,%3Csvg width=60 height=60 viewBox=0 0 60 60 xmlns=http://www.w3.org/2000/svg%3E%3Cg fill=none fill-rule=evenodd%3E%3Cg fill=%23ffffff fill-opacity=1%3E%3Cpath d=M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
        <div className="relative">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-cyan-300 text-sm font-medium mb-1">Welcome back</p>
              <h1 className="text-2xl sm:text-3xl font-bold">{agentName}</h1>
              <p className="text-slate-400 text-sm mt-1">Sales Agent · Personal Dashboard</p>
            </div>
            <Link
              href="/admin/agent/contracts"
              className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors self-start sm:self-auto"
            >
              <FileText className="w-4 h-4" /> My Contracts
            </Link>
          </div>

          {/* Quick stats ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {[
              { label: 'Total Contracts', value: portfolio.totalContracts },
              { label: 'Active',          value: portfolio.activeContracts },
              { label: 'Customers',       value: customers.total },
              { label: 'This Month',      value: thisMonth.contractsCreated },
            ].map(s => (
              <div key={s.label} className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 text-center border border-white/10">
                <div className="text-xl font-bold">{s.value}</div>
                <div className="text-xs text-slate-300 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ALERTS ── */}
      {hasAlerts && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {alerts.overdueInstallments > 0 && (
            <div className="flex items-center gap-4 bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-red-700 text-sm">{alerts.overdueInstallments} Overdue Installment{alerts.overdueInstallments > 1 ? 's' : ''}</p>
                <p className="text-red-500 text-xs mt-0.5">Customers on your contracts have missed payments</p>
              </div>
              <Link href="/admin/agent/contracts" className="text-red-600 flex-shrink-0">
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          )}
          {alerts.revisionsPending > 0 && (
            <div className="flex items-center gap-4 bg-orange-50 border border-orange-200 rounded-2xl px-5 py-4">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                <RefreshCw className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-orange-700 text-sm">{alerts.revisionsPending} Revision{alerts.revisionsPending > 1 ? 's' : ''} Requested</p>
                <p className="text-orange-500 text-xs mt-0.5">Admin has sent contracts back for your changes</p>
              </div>
              <Link href="/admin/agent/contracts?status=REVISION_REQUESTED" className="text-orange-600 flex-shrink-0">
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── PORTFOLIO STATUS BREAKDOWN ── */}
      <div>
        <h2 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-cyan-600" /> Portfolio Breakdown
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Active',    value: portfolio.activeContracts,    color: 'bg-emerald-500' },
            { label: 'Pending',   value: portfolio.pendingContracts,   color: 'bg-amber-500' },
            { label: 'Revision',  value: portfolio.revisionContracts,  color: 'bg-orange-500' },
            { label: 'Completed', value: portfolio.completedContracts, color: 'bg-blue-500' },
            { label: 'Defaulted', value: portfolio.defaultedContracts, color: 'bg-red-500' },
            { label: 'Total',     value: portfolio.totalContracts,     color: 'bg-slate-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm text-center">
              <div className={`w-2 h-2 rounded-full ${s.color} mx-auto mb-2`} />
              <div className="text-2xl font-bold text-slate-800">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FINANCIAL SUMMARY ── */}
      <div>
        <h2 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-cyan-600" /> Financial Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            icon={TrendingUp} label="Total Sales Value" color="cyan"
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
            icon={AlertCircle} label="Outstanding Balance" color="orange"
            value={formatCurrency(financials.totalOutstanding)}
            sub="Remaining on active contracts"
          />
          <StatCard
            icon={Users} label="Customers Registered" color="cyan"
            value={customers.total}
            sub={`${customers.thisMonth} registered this month`}
          />
        </div>
      </div>

      {/* ── THIS MONTH + NEXT DUE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* This month activity */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-cyan-600" /> This Month's Activity
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-cyan-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Contracts Created</p>
                  <p className="text-xs text-slate-400">New hire purchase agreements</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-slate-800">{thisMonth.contractsCreated}</div>
                {thisMonth.contractGrowth !== 0 && (
                  <div className={`text-xs font-medium ${thisMonth.contractGrowth >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {thisMonth.contractGrowth >= 0 ? '+' : ''}{thisMonth.contractGrowth}% vs last month
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <Banknote className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Payments Collected</p>
                  <p className="text-xs text-slate-400">Received this month</p>
                </div>
              </div>
              <div className="text-lg font-bold text-slate-800">{formatCurrency(thisMonth.paymentsCollected)}</div>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Customers Registered</p>
                  <p className="text-xs text-slate-400">New customers this month</p>
                </div>
              </div>
              <div className="text-lg font-bold text-slate-800">{customers.thisMonth}</div>
            </div>
          </div>
        </div>

        {/* Next due / pending approval */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-amber-500" /> Attention Required
          </h3>
          <div className="space-y-3">
            {nextDue && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
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
              <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                <div className="w-9 h-9 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-yellow-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-yellow-800">{alerts.pendingApproval} Contract{alerts.pendingApproval > 1 ? 's' : ''} Awaiting Approval</p>
                  <p className="text-xs text-yellow-600">In the approval queue</p>
                </div>
                <Link href="/admin/agent/contracts?status=PENDING_APPROVAL" className="text-yellow-600 flex-shrink-0">
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}
            {alerts.revisionsPending > 0 && (
              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
                <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-4 h-4 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-orange-800">{alerts.revisionsPending} Revision{alerts.revisionsPending > 1 ? 's' : ''} to Action</p>
                  <p className="text-xs text-orange-600">Edit terms and resubmit</p>
                </div>
                <Link href="/admin/agent/contracts?status=REVISION_REQUESTED" className="text-orange-600 flex-shrink-0">
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}
            {alerts.overdueInstallments > 0 && (
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-800">{alerts.overdueInstallments} Overdue Installment{alerts.overdueInstallments > 1 ? 's' : ''}</p>
                  <p className="text-xs text-red-600">Customers have missed payments</p>
                </div>
              </div>
            )}
            {!nextDue && alerts.pendingApproval === 0 && alerts.revisionsPending === 0 && alerts.overdueInstallments === 0 && (
              <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400">
                <CheckCircle className="w-8 h-8 text-emerald-400 mb-2" />
                <p className="text-sm font-medium text-slate-600">All clear!</p>
                <p className="text-xs">No items needing your attention</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── RECENT CONTRACTS ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
          <h3 className="font-semibold text-slate-700 flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4 text-cyan-600" /> Recent Contracts
          </h3>
          <Link href="/admin/agent/contracts" className="text-xs text-cyan-600 font-medium hover:underline flex items-center gap-1">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Contract</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Product</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Price</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Outstanding</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentContracts.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">No contracts yet. <Link href="/admin/contracts" className="text-cyan-600 underline">Create your first contract</Link></td></tr>
              )}
              {recentContracts.map(c => {
                const s = STATUS_STYLES[c.status] ?? STATUS_STYLES.CANCELLED;
                return (
                  <tr key={c.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => window.location.href = `/admin/agent/contracts/${c.id}`}>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-800">{c.contractNumber}</div>
                      <div className="text-xs text-slate-400">{formatDate(c.createdAt)}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-700">{c.customer.firstName} {c.customer.lastName}</div>
                      <div className="text-xs text-slate-400">{c.customer.membershipId}</div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{c.product ?? '—'}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{formatCurrency(c.totalPrice)}</td>
                    <td className="px-5 py-3.5 font-semibold text-red-600">{formatCurrency(c.outstandingBalance)}</td>
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
        <div className="sm:hidden divide-y divide-slate-50">
          {recentContracts.length === 0 && (
            <div className="px-5 py-8 text-center text-slate-400 text-sm">
              No contracts yet. <Link href="/admin/contracts" className="text-cyan-600 underline">Create one</Link>
            </div>
          )}
          {recentContracts.map(c => {
            const s = STATUS_STYLES[c.status] ?? STATUS_STYLES.CANCELLED;
            return (
              <Link key={c.id} href={`/admin/agent/contracts/${c.id}`} className="block px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">{c.contractNumber}</div>
                    <div className="text-xs text-slate-400">{c.customer.firstName} {c.customer.lastName}</div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>{s.label}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{c.product ?? '—'}</span>
                  <span className="font-semibold text-red-600">{formatCurrency(c.outstandingBalance)} due</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── QUICK ACTIONS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/admin/contracts" className="flex items-center gap-4 bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-200 rounded-2xl p-5 hover:from-cyan-100 hover:to-cyan-200 transition-colors group">
          <div className="w-10 h-10 rounded-xl bg-cyan-600 flex items-center justify-center group-hover:bg-cyan-700 transition-colors">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-cyan-900 text-sm">New Contract</div>
            <div className="text-xs text-cyan-600">Create a hire purchase agreement</div>
          </div>
        </Link>
        <Link href="/admin/customers" className="flex items-center gap-4 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-5 hover:from-purple-100 hover:to-purple-200 transition-colors group">
          <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center group-hover:bg-purple-700 transition-colors">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-purple-900 text-sm">Register Customer</div>
            <div className="text-xs text-purple-600">Add a new hire-purchase customer</div>
          </div>
        </Link>
        <Link href="/admin/agent/contracts" className="flex items-center gap-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl p-5 hover:from-emerald-100 hover:to-emerald-200 transition-colors group">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center group-hover:bg-emerald-700 transition-colors">
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-emerald-900 text-sm">My Contracts</div>
            <div className="text-xs text-emerald-600">View your full portfolio</div>
          </div>
        </Link>
      </div>

    </div>
  );
}
