'use client';

import { useEffect, useState, useCallback } from 'react';
import { MessageSquare, Search, X, CheckCircle, XCircle, Clock, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface LogEntry {
  id: string;
  type: string;
  status: string;
  message: string;
  recipient: string;
  sentAt?: string;
  createdAt: string;
  errorMessage?: string;
  customer: {
    firstName: string;
    lastName: string;
    membershipId: string;
  };
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_OPTIONS = ['', 'SENT', 'FAILED', 'PENDING'];
const TYPE_OPTIONS = ['', 'SMS', 'EMAIL'];

function StatusBadge({ status }: { status: string }) {
  if (status === 'SENT') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
      <CheckCircle className="h-3 w-3" /> Sent
    </span>
  );
  if (status === 'FAILED') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
      <XCircle className="h-3 w-3" /> Failed
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
}

export default function SMSLogPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('SMS');

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: pagination.limit };
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.type = filterType;
      const res = await api.get('/notifications/logs', { params });
      let entries: LogEntry[] = res.data.logs;

      // Client-side search filter (name, phone, message)
      if (search.trim()) {
        const q = search.toLowerCase();
        entries = entries.filter(l =>
          `${l.customer.firstName} ${l.customer.lastName}`.toLowerCase().includes(q) ||
          l.customer.membershipId.toLowerCase().includes(q) ||
          l.recipient.includes(q) ||
          l.message.toLowerCase().includes(q)
        );
      }

      setLogs(entries);
      setPagination(res.data.pagination);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType, pagination.limit, search]);

  useEffect(() => {
    load(1);
  }, [filterStatus, filterType]);

  const handlePageChange = (page: number) => load(page);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(1);
  };

  const stats = {
    total: pagination.total,
    sent: logs.filter(l => l.status === 'SENT').length,
    failed: logs.filter(l => l.status === 'FAILED').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-cyan-600" />
          SMS Log
        </h1>
        <p className="text-sm text-gray-500 mt-1">History of all SMS and notification messages sent to customers</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Search */}
            <form onSubmit={handleSearch} className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, phone, message..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-200 pl-9 pr-9 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
              {search && (
                <button type="button" onClick={() => { setSearch(''); load(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </form>

            {/* Type filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="rounded-lg border border-gray-200 py-2 pl-3 pr-8 text-sm outline-none focus:border-cyan-500"
              >
                <option value="">All Types</option>
                {TYPE_OPTIONS.filter(Boolean).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="rounded-lg border border-gray-200 py-2 pl-3 pr-8 text-sm outline-none focus:border-cyan-500"
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.filter(Boolean).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Message Log</span>
            <span className="text-xs font-normal text-gray-500">{pagination.total} total records</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No messages found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left font-medium">Customer</th>
                    <th className="px-4 py-3 text-left font-medium">Recipient</th>
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Message</th>
                    <th className="px-4 py-3 text-left font-medium">Sent At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-medium text-gray-800">{log.customer.firstName} {log.customer.lastName}</p>
                        <p className="text-xs text-gray-400">{log.customer.membershipId}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600 font-mono text-xs">{log.recipient}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          log.type === 'SMS' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={log.status} />
                        {log.errorMessage && (
                          <p className="text-xs text-red-500 mt-0.5 max-w-32 truncate" title={log.errorMessage}>{log.errorMessage}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-gray-600 line-clamp-2 text-xs">{log.message}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-400">
                        {log.sentAt ? formatDate(log.sentAt) : formatDate(log.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChange}
          totalItems={pagination.total}
          itemsPerPage={pagination.limit}
        />
      )}
    </div>
  );
}
