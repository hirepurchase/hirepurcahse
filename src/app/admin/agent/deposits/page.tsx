'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ExportButtons } from '@/components/admin/ExportButtons';
import { ExportOptions } from '@/lib/exportUtils';
import {
  Wallet,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Smartphone,
  Lock,
} from 'lucide-react';
import api from '@/lib/api';

interface LedgerEntry {
  id: string;
  contractNumber: string;
  customerName: string;
  depositAmount: number;
  commissionAmount: number;
  amountDueCompany: number;
  amountPaid: number;
  outstandingBalance: number;
  status: 'PENDING' | 'PAID';
  createdAt: string;
}

interface Summary {
  totalDeposits: number;
  totalCommission: number;
  totalPaid: number;
  totalOutstanding: number;
}

const NETWORKS = ['MTN', 'VODAFONE', 'TELECEL', 'AIRTELTIGO'];

export default function AgentDepositsPage() {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();

  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [contractSearch, setContractSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [payModal, setPayModal] = useState<LedgerEntry | null>(null);
  const [payForm, setPayForm] = useState({ phoneNumber: '', network: 'MTN', amount: '' });
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ledgerRes, summaryRes] = await Promise.all([
        api.get('/agent-deposits/my-ledger', {
          params: {
            page,
            limit: 20,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            contractNumber: contractSearch || undefined,
            customerName: customerSearch || undefined,
            status: statusFilter || undefined,
          },
        }),
        api.get('/agent-deposits/my-summary'),
      ]);
      setEntries(ledgerRes.data.entries || []);
      setTotalPages(ledgerRes.data.pagination?.totalPages || 1);
      setTotal(ledgerRes.data.pagination?.total || 0);
      setSummary(summaryRes.data);
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Failed to load ledger', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, startDate, endDate, contractSearch, customerSearch, statusFilter, toast]);

  useEffect(() => { load(); }, [load]);

  function openPayModal(entry: LedgerEntry) {
    setPayForm({ phoneNumber: '', network: 'MTN', amount: String(entry.outstandingBalance.toFixed(2)) });
    setPayModal(entry);
  }

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payModal) return;
    const amount = parseFloat(payForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Error', description: 'Enter a valid amount', variant: 'destructive' });
      return;
    }
    if (amount > payModal.outstandingBalance) {
      toast({ title: 'Error', description: `Cannot exceed outstanding balance of ${formatCurrency(payModal.outstandingBalance)}`, variant: 'destructive' });
      return;
    }
    try {
      setPaying(true);
      await api.post(`/agent-deposits/${payModal.id}/pay`, {
        amount,
        phoneNumber: payForm.phoneNumber,
        network: payForm.network,
      });
      toast({ title: 'Payment Initiated', description: 'You will receive a prompt on your phone to complete the payment.' });
      setPayModal(null);
      load();
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Payment failed', variant: 'destructive' });
    } finally {
      setPaying(false);
    }
  }

  const exportOptions: ExportOptions = {
    title: 'Agent Deposit Ledger',
    filename: 'agent-deposit-ledger',
    summary: summary
      ? [
          { label: 'Total Deposits Collected', value: formatCurrency(summary.totalDeposits) },
          { label: 'Commission Earned', value: formatCurrency(summary.totalCommission) },
          { label: 'Remitted to Company', value: formatCurrency(summary.totalPaid) },
          { label: 'Outstanding Balance', value: formatCurrency(summary.totalOutstanding) },
        ]
      : undefined,
    columns: [
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

  const statusBadge = (status: string) =>
    status === 'PAID'
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : 'bg-amber-50 text-amber-700 border border-amber-200';

  if (!hasPermission(PERMISSIONS.VIEW_AGENT_COMMISSIONS)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Wallet className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-sm">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Deposit Ledger</h1>
          <p className="text-sm text-gray-500">Track your deposit collections and remittances</p>
        </div>
        <ExportButtons exportOptions={exportOptions} />
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Deposits Collected', value: summary.totalDeposits, icon: Wallet, color: 'blue' },
            { label: 'Commission Earned', value: summary.totalCommission, icon: TrendingUp, color: 'emerald' },
            { label: 'Remitted to Company', value: summary.totalPaid, icon: CheckCircle2, color: 'indigo' },
            { label: 'Outstanding Balance', value: summary.totalOutstanding, icon: AlertCircle, color: 'amber' },
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Start date"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="End date"
          />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={contractSearch}
              onChange={(e) => { setContractSearch(e.target.value); setPage(1); }}
              placeholder="Contract #"
              className="w-full pl-9 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => { setCustomerSearch(e.target.value); setPage(1); }}
              placeholder="Customer name"
              className="w-full pl-9 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
          </select>
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
            <Wallet className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No ledger entries found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Contract #', 'Customer', 'Deposit', 'Commission', 'Due Company', 'Paid', 'Outstanding', 'Date', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-blue-700">{entry.contractNumber}</td>
                  <td className="px-4 py-3 text-gray-900">{entry.customerName}</td>
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
                    <div className="flex flex-col gap-1.5">
                      {entry.status === 'PENDING' && entry.outstandingBalance > 0 && (
                        <button
                          onClick={() => openPayModal(entry)}
                          className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Smartphone className="h-3 w-3" />
                          Pay
                        </button>
                      )}
                      {entry.status === 'PENDING' && (
                        <span className="flex items-center gap-1 text-xs text-amber-600" title="Device stays locked until this deposit is fully paid">
                          <Lock className="h-3 w-3" />
                          Device locked
                        </span>
                      )}
                    </div>
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
            <Wallet className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No entries found</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-blue-700 font-semibold">{entry.contractNumber}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge(entry.status)}`}>
                  {entry.status}
                </span>
              </div>
              <p className="text-sm text-gray-900 font-medium mb-2">{entry.customerName}</p>
              <div className="grid grid-cols-2 gap-1 text-xs text-gray-600 mb-3">
                <span>Deposit: <strong>{formatCurrency(entry.depositAmount)}</strong></span>
                <span>Commission: <strong className="text-emerald-600">{formatCurrency(entry.commissionAmount)}</strong></span>
                <span>Due Company: <strong>{formatCurrency(entry.amountDueCompany)}</strong></span>
                <span>Paid: <strong>{formatCurrency(entry.amountPaid)}</strong></span>
                <span className="col-span-2">Outstanding: <strong className="text-amber-600">{formatCurrency(entry.outstandingBalance)}</strong></span>
              </div>
              {entry.status === 'PENDING' && (
                <p className="flex items-center gap-1 text-xs text-amber-600 mb-2">
                  <Lock className="h-3 w-3" />
                  Device stays locked until deposit is fully paid
                </p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{formatDate(entry.createdAt)}</span>
                {entry.status === 'PENDING' && entry.outstandingBalance > 0 && (
                  <button
                    onClick={() => openPayModal(entry)}
                    className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg"
                  >
                    <Smartphone className="h-3 w-3" />
                    Pay Now
                  </button>
                )}
              </div>
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

      {/* Pay Modal */}
      {payModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Remit Deposit Payment</h2>
              <button onClick={() => setPayModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <div className="p-5">
              {/* Entry details */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Contract</span>
                  <span className="font-mono text-blue-700 font-semibold">{payModal.contractNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer</span>
                  <span className="text-gray-900">{payModal.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Deposit Collected</span>
                  <span className="text-gray-900">{formatCurrency(payModal.depositAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Your Commission</span>
                  <span className="text-emerald-700 font-medium">{formatCurrency(payModal.commissionAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-1.5">
                  <span className="text-gray-700 font-medium">Outstanding Balance</span>
                  <span className="text-amber-700 font-semibold">{formatCurrency(payModal.outstandingBalance)}</span>
                </div>
              </div>

              <form onSubmit={submitPayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Money Number</label>
                  <input
                    type="tel"
                    value={payForm.phoneNumber}
                    onChange={(e) => setPayForm({ ...payForm, phoneNumber: e.target.value })}
                    placeholder="e.g. 0244123456"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Network</label>
                  <select
                    value={payForm.network}
                    onChange={(e) => setPayForm({ ...payForm, network: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {NETWORKS.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (GHS)</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={payModal.outstandingBalance}
                    value={payForm.amount}
                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Max: {formatCurrency(payModal.outstandingBalance)}</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setPayModal(null)}
                    className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={paying}
                    className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {paying ? 'Processing...' : 'Pay via Mobile Money'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
