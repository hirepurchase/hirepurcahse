'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/useToast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ExportButtons } from '@/components/admin/ExportButtons';
import { ExportOptions } from '@/lib/exportUtils';
import {
  BookOpen,
  Wallet,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Banknote,
  X,
  Loader2,
} from 'lucide-react';
import api from '@/lib/api';

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface LedgerEntry {
  id: string;
  contractNumber: string;
  customerName: string;
  depositAmount: number;
  commissionAmount: number;
  amountDueCompany: number;
  amountPaid: number;
  outstandingBalance: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  createdAt: string;
  agent: Agent;
}

interface Summary {
  totalDeposits: number;
  totalCommission: number;
  totalPaid: number;
  totalOutstanding: number;
}

interface ManualPayModal {
  entry: LedgerEntry;
  amount: string;
  note: string;
  submitting: boolean;
}

export default function AdminAgentLedgerPage() {
  const { toast } = useToast();

  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [agentFilter, setAgentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [manualPay, setManualPay] = useState<ManualPayModal | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ledgerRes, summaryRes] = await Promise.all([
        api.get('/agent-deposits/admin/all-ledgers', {
          params: {
            page,
            limit: 20,
            agentId: agentFilter || undefined,
            status: statusFilter || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          },
        }),
        api.get('/agent-deposits/admin/summary', {
          params: { agentId: agentFilter || undefined },
        }),
      ]);
      setEntries(ledgerRes.data.entries || []);
      setTotalPages(ledgerRes.data.pagination?.totalPages || 1);
      setTotal(ledgerRes.data.pagination?.total || 0);
      setSummary(summaryRes.data.summary);
      if (summaryRes.data.agents) setAgents(summaryRes.data.agents);
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Failed to load agent ledgers', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, agentFilter, statusFilter, startDate, endDate, toast]);

  useEffect(() => { load(); }, [load]);

  const handleManualPay = async () => {
    if (!manualPay) return;
    const amount = parseFloat(manualPay.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Invalid amount', description: 'Enter a valid amount greater than zero.', variant: 'destructive' });
      return;
    }
    if (amount > manualPay.entry.outstandingBalance) {
      toast({ title: 'Amount exceeds balance', description: `Maximum is ${formatCurrency(manualPay.entry.outstandingBalance)}`, variant: 'destructive' });
      return;
    }
    setManualPay((p) => p ? { ...p, submitting: true } : p);
    try {
      await api.post(`/agent-deposits/${manualPay.entry.id}/admin-pay`, {
        amount,
        note: manualPay.note.trim() || undefined,
      });
      toast({ title: 'Payment recorded', description: `GHS ${amount.toFixed(2)} recorded for ${manualPay.entry.contractNumber}` });
      setManualPay(null);
      load();
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Failed to record payment', variant: 'destructive' });
      setManualPay((p) => p ? { ...p, submitting: false } : p);
    }
  };

  const exportOptions: ExportOptions = {
    title: 'Agent Deposit Ledger — All Agents',
    filename: 'agent-deposit-ledger-admin',
    summary: summary
      ? [
          { label: 'Total Deposits Collected', value: formatCurrency(summary.totalDeposits) },
          { label: 'Total Commissions Paid', value: formatCurrency(summary.totalCommission) },
          { label: 'Total Remitted', value: formatCurrency(summary.totalPaid) },
          { label: 'Total Outstanding', value: formatCurrency(summary.totalOutstanding) },
        ]
      : undefined,
    columns: [
      { header: 'Agent', accessor: (r: any) => `${r.agent.firstName} ${r.agent.lastName}` },
      { header: 'Contract #', accessor: (r: any) => r.contractNumber },
      { header: 'Customer', accessor: (r: any) => r.customerName },
      { header: 'Deposit', accessor: (r: any) => formatCurrency(r.depositAmount) },
      { header: 'Commission', accessor: (r: any) => formatCurrency(r.commissionAmount) },
      { header: 'Due Company', accessor: (r: any) => formatCurrency(r.amountDueCompany) },
      { header: 'Paid', accessor: (r: any) => formatCurrency(r.amountPaid) },
      { header: 'Outstanding', accessor: (r: any) => formatCurrency(r.outstandingBalance) },
      { header: 'Date', accessor: (r: any) => formatDate(r.createdAt) },
      { header: 'Status', accessor: (r: any) => r.status },
    ],
    data: entries as any[],
  };

  const statusBadge = (status: string) => {
    if (status === 'PAID') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    if (status === 'CANCELLED') return 'bg-gray-100 text-gray-500 border border-gray-200';
    return 'bg-amber-50 text-amber-700 border border-amber-200';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Agent Deposit Ledger</h1>
            <p className="text-sm text-gray-500">Consolidated view of all agent deposit collections</p>
          </div>
        </div>
        <ExportButtons exportOptions={exportOptions} />
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Deposits', value: summary.totalDeposits, icon: Wallet },
            { label: 'Total Commissions', value: summary.totalCommission, icon: TrendingUp },
            { label: 'Total Remitted', value: summary.totalPaid, icon: CheckCircle2 },
            { label: 'Total Outstanding', value: summary.totalOutstanding, icon: AlertCircle },
          ].map((card) => (
            <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">{card.label}</p>
              <p className="text-lg font-semibold text-gray-900">{formatCurrency(card.value)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <select
            value={agentFilter}
            onChange={(e) => { setAgentFilter(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <BookOpen className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No ledger entries found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Agent', 'Contract #', 'Customer', 'Deposit', 'Commission', 'Due Company', 'Paid', 'Outstanding', 'Date', 'Status', 'Action'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-900 font-medium">{entry.agent.firstName} {entry.agent.lastName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-blue-700">{entry.contractNumber}</td>
                  <td className="px-4 py-3 text-gray-700">{entry.customerName}</td>
                  <td className="px-4 py-3 text-gray-700">{formatCurrency(entry.depositAmount)}</td>
                  <td className="px-4 py-3 text-emerald-700 font-medium">{formatCurrency(entry.commissionAmount)}</td>
                  <td className="px-4 py-3 text-gray-700">{formatCurrency(entry.amountDueCompany)}</td>
                  <td className="px-4 py-3 text-gray-700">{formatCurrency(entry.amountPaid)}</td>
                  <td className="px-4 py-3 font-medium text-amber-700">{formatCurrency(entry.outstandingBalance)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(entry.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge(entry.status)}`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {entry.status === 'PENDING' && (
                      <button
                        onClick={() => setManualPay({ entry, amount: entry.outstandingBalance.toFixed(2), note: '', submitting: false })}
                        className="flex items-center gap-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Banknote className="h-3.5 w-3.5" />
                        Record Payment
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <BookOpen className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No entries found</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs text-blue-700 font-semibold">{entry.contractNumber}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge(entry.status)}`}>
                  {entry.status}
                </span>
              </div>
              <p className="text-xs text-indigo-600 font-medium mb-1">{entry.agent.firstName} {entry.agent.lastName}</p>
              <p className="text-sm text-gray-900 font-medium mb-2">{entry.customerName}</p>
              <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                <span>Deposit: <strong>{formatCurrency(entry.depositAmount)}</strong></span>
                <span>Commission: <strong className="text-emerald-600">{formatCurrency(entry.commissionAmount)}</strong></span>
                <span>Due: <strong>{formatCurrency(entry.amountDueCompany)}</strong></span>
                <span>Paid: <strong>{formatCurrency(entry.amountPaid)}</strong></span>
                <span className="col-span-2">Outstanding: <strong className="text-amber-600">{formatCurrency(entry.outstandingBalance)}</strong></span>
              </div>
              <p className="text-xs text-gray-400 mt-2">{formatDate(entry.createdAt)}</p>
              {entry.status === 'PENDING' && (
                <button
                  onClick={() => setManualPay({ entry, amount: entry.outstandingBalance.toFixed(2), note: '', submitting: false })}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors"
                >
                  <Banknote className="h-4 w-4" />
                  Record Cash Payment
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{total} entries total</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Manual Pay Modal */}
      {manualPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Record Cash Payment</h2>
              <button onClick={() => setManualPay(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-1 text-sm">
              <p className="text-gray-700"><span className="text-gray-500">Agent:</span> {manualPay.entry.agent.firstName} {manualPay.entry.agent.lastName}</p>
              <p className="text-gray-700"><span className="text-gray-500">Contract:</span> <span className="font-mono text-blue-700">{manualPay.entry.contractNumber}</span></p>
              <p className="text-gray-700"><span className="text-gray-500">Customer:</span> {manualPay.entry.customerName}</p>
              <p className="text-gray-700"><span className="text-gray-500">Outstanding:</span> <strong className="text-amber-700">{formatCurrency(manualPay.entry.outstandingBalance)}</strong></p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (GHS)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={manualPay.entry.outstandingBalance}
                  value={manualPay.amount}
                  onChange={(e) => setManualPay((p) => p ? { ...p, amount: e.target.value } : p)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Cash received at office"
                  value={manualPay.note}
                  onChange={(e) => setManualPay((p) => p ? { ...p, note: e.target.value } : p)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setManualPay(null)}
                disabled={manualPay.submitting}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleManualPay}
                disabled={manualPay.submitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {manualPay.submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
                {manualPay.submitting ? 'Recording…' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
