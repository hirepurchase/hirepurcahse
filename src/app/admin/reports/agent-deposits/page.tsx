'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { ExportButtons } from '@/components/admin/ExportButtons';
import { ExportOptions } from '@/lib/exportUtils';

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
  status: string;
  createdAt: string;
  agent: Agent;
}

interface Summary {
  totalDeposits: number;
  totalCommission: number;
  totalPaid: number;
  totalOutstanding: number;
}

export default function AgentDepositReportPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [agentFilter, setAgentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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
      toast({ title: 'Error', description: err.response?.data?.error || 'Failed to load report', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, agentFilter, statusFilter, startDate, endDate, toast]);

  useEffect(() => { load(); }, [load]);

  const exportOptions: ExportOptions = {
    title: 'Agent Deposit Collections Report',
    filename: `agent-deposit-report-${startDate}-${endDate}`,
    dateRange: { start: startDate, end: endDate },
    summary: summary
      ? [
          { label: 'Total Deposits Collected', value: formatCurrency(summary.totalDeposits) },
          { label: 'Total Commissions', value: formatCurrency(summary.totalCommission) },
          { label: 'Total Remitted to Company', value: formatCurrency(summary.totalPaid) },
          { label: 'Total Outstanding', value: formatCurrency(summary.totalOutstanding) },
        ]
      : undefined,
    columns: [
      { header: 'Agent', accessor: (r: any) => `${r.agent.firstName} ${r.agent.lastName}` },
      { header: 'Contract #', accessor: (r: any) => r.contractNumber },
      { header: 'Customer', accessor: (r: any) => r.customerName },
      { header: 'Deposit (GHS)', accessor: (r: any) => formatCurrency(r.depositAmount) },
      { header: 'Commission (GHS)', accessor: (r: any) => formatCurrency(r.commissionAmount) },
      { header: 'Due Company (GHS)', accessor: (r: any) => formatCurrency(r.amountDueCompany) },
      { header: 'Paid (GHS)', accessor: (r: any) => formatCurrency(r.amountPaid) },
      { header: 'Outstanding (GHS)', accessor: (r: any) => formatCurrency(r.outstandingBalance) },
      { header: 'Date', accessor: (r: any) => formatDate(r.createdAt) },
      { header: 'Status', accessor: (r: any) => r.status },
    ],
    data: entries as any[],
  };

  const statusBadge = (status: string) =>
    status === 'PAID'
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : 'bg-amber-50 text-amber-700 border border-amber-200';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2 rounded-lg bg-cyan-100 text-cyan-600">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Agent Deposit Collections Report</h1>
            <p className="text-sm text-gray-500">Deposits collected, commissions, and remittances per agent</p>
          </div>
        </div>
        <ExportButtons exportOptions={exportOptions} />
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
          </select>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Deposits', value: summary.totalDeposits },
            { label: 'Total Commissions', value: summary.totalCommission },
            { label: 'Total Remitted', value: summary.totalPaid },
            { label: 'Total Outstanding', value: summary.totalOutstanding },
          ].map((card) => (
            <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">{card.label}</p>
              <p className="text-lg font-semibold text-gray-900">{formatCurrency(card.value)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <DollarSign className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No data for the selected filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Agent', 'Contract #', 'Customer', 'Deposit', 'Commission', 'Due Company', 'Paid', 'Outstanding', 'Date', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-900 font-medium whitespace-nowrap">{entry.agent.firstName} {entry.agent.lastName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-blue-700">{entry.contractNumber}</td>
                    <td className="px-4 py-3 text-gray-700">{entry.customerName}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatCurrency(entry.depositAmount)}</td>
                    <td className="px-4 py-3 text-emerald-700 font-medium whitespace-nowrap">{formatCurrency(entry.commissionAmount)}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatCurrency(entry.amountDueCompany)}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatCurrency(entry.amountPaid)}</td>
                    <td className="px-4 py-3 text-amber-700 font-medium whitespace-nowrap">{formatCurrency(entry.outstandingBalance)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(entry.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge(entry.status)}`}>
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
    </div>
  );
}
