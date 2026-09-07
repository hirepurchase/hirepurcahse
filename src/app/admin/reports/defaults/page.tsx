'use client';

import { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, AlertTriangle, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { useRouter } from 'next/navigation';
import { ExportButtons } from '@/components/admin/ExportButtons';
import { ExportOptions } from '@/lib/exportUtils';

const filterInputCls =
  'h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const filterLabelCls = 'mb-1 block text-xs font-medium text-gray-600';

export default function DefaultersReportPage() {
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Date filters apply to when each contract first fell overdue, not the contract date
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [agentId, setAgentId] = useState('');
  const [productId, setProductId] = useState('');
  const [minDaysOverdue, setMinDaysOverdue] = useState('');
  const [maxDaysOverdue, setMaxDaysOverdue] = useState('');
  const { toast } = useToast();
  const router = useRouter();

  const hasFilters = Boolean(startDate || endDate || agentId || productId || minDaysOverdue || maxDaysOverdue);

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setAgentId('');
    setProductId('');
    setMinDaysOverdue('');
    setMaxDaysOverdue('');
  };

  // Debounced so typing in the day-count inputs doesn't fire a request per keystroke
  useEffect(() => {
    const timer = setTimeout(() => loadReport(), 350);
    return () => clearTimeout(timer);
  }, [startDate, endDate, agentId, productId, minDaysOverdue, maxDaysOverdue]);

  const loadReport = async () => {
    try {
      setIsLoading(true);
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (agentId) params.agentId = agentId;
      if (productId) params.productId = productId;
      if (minDaysOverdue) params.minDaysOverdue = minDaysOverdue;
      if (maxDaysOverdue) params.maxDaysOverdue = maxDaysOverdue;
      const response = await api.get('/reports/defaults', { params });
      setReport(response.data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to load defaulters report',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDaysOverdueColor = (days: number) => {
    if (days <= 7) return 'bg-yellow-100 text-yellow-800';
    if (days <= 30) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const exportOptions = useMemo<ExportOptions>(() => {
    if (!report) {
      return {
        title: 'Defaulters Report',
        filename: 'defaulters-report',
        columns: [],
        data: [],
      };
    }

    return {
      title: 'Defaulters Report',
      filename: `defaulters-report-${new Date().toISOString().split('T')[0]}`,
      summary: [
        { label: 'Total Defaulters', value: report.summary?.totalDefaulters || 0 },
        { label: 'Total Overdue Amount', value: formatCurrency(report.summary?.totalOverdueAmount || 0) },
        { label: 'Total Penalties', value: formatCurrency(report.summary?.totalPenalties || 0) },
        // Without these an exported filtered report is indistinguishable from a full one
        ...(startDate || endDate
          ? [{
              label: 'First Overdue Between',
              value: `${startDate ? formatDate(startDate) : 'Any'} — ${endDate ? formatDate(endDate) : 'Any'}`,
            }]
          : []),
        ...(agentId
          ? [{
              label: 'Agent',
              value: (report.filterOptions?.agents || []).find((a: any) => a.id === agentId)?.name || agentId,
            }]
          : []),
        ...(productId
          ? [{
              label: 'Product',
              value: (report.filterOptions?.products || []).find((p: any) => p.id === productId)?.name || productId,
            }]
          : []),
        ...(minDaysOverdue || maxDaysOverdue
          ? [{
              label: 'Days Overdue',
              value: `${minDaysOverdue || 'Any'} — ${maxDaysOverdue || 'Any'}`,
            }]
          : []),
      ],
      columns: [
        { header: 'Customer', accessor: (row: any) => `${row.customer.firstName} ${row.customer.lastName}`, align: 'left' },
        { header: 'Contact', accessor: (row: any) => row.customer.phone, align: 'left' },
        { header: 'Agent', accessor: (row: any) => row.agent?.name || '-', align: 'left' },
        { header: 'Agent Contact', accessor: (row: any) => row.agent?.phone || '-', align: 'left' },
        { header: 'Contract #', accessor: (row: any) => row.contract.contractNumber, align: 'left' },
        { header: 'Product', accessor: (row: any) => row.product?.name || '-', align: 'left' },
        { header: 'Overdue Installments', accessor: 'overdueInstallments', align: 'right' },
        { header: 'Overdue Amount', accessor: (row: any) => formatCurrency(row.totalOverdueAmount), align: 'right' },
        { header: 'Penalties', accessor: (row: any) => formatCurrency(row.unpaidPenalties), align: 'right' },
        { header: 'Total Owed', accessor: (row: any) => formatCurrency(row.totalOwed), align: 'right' },
        { header: 'Days Overdue', accessor: (row: any) => `${row.daysOverdue} days`, align: 'right' },
        { header: 'Oldest Due Date', accessor: (row: any) => formatDate(row.oldestOverdueDate), align: 'left' },
      ],
      data: report.defaulters || [],
    };
  }, [report, startDate, endDate, agentId, productId, minDaysOverdue, maxDaysOverdue]);

  // Only the very first load takes over the page — a filter refresh must leave
  // the controls mounted, or the inputs vanish under the user mid-change.
  if (isLoading && !report) {
    return (
      <div className="p-8 flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Defaulters Report</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Overdue contracts and payment tracking</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={loadReport}>Refresh</Button>
          <ExportButtons exportOptions={exportOptions} />
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Filters</p>
            <div className="flex items-center gap-3">
              {isLoading && <span className="text-xs text-gray-400">Updating...</span>}
              {hasFilters && (
                <Button variant="outline" size="sm" className="h-8" onClick={clearFilters}>
                  Clear all
                </Button>
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={filterLabelCls}>First overdue from</label>
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => setStartDate(e.target.value)}
                className={filterInputCls}
              />
            </div>
            <div>
              <label className={filterLabelCls}>First overdue to</label>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className={filterInputCls}
              />
            </div>
            <div>
              <label className={filterLabelCls}>Agent</label>
              <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className={filterInputCls}>
                <option value="">All agents</option>
                {(report?.filterOptions?.agents || []).map((a: any) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={filterLabelCls}>Product</label>
              <select value={productId} onChange={(e) => setProductId(e.target.value)} className={filterInputCls}>
                <option value="">All products</option>
                {(report?.filterOptions?.products || []).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={filterLabelCls}>Days overdue — at least</label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="No minimum"
                value={minDaysOverdue}
                onChange={(e) => setMinDaysOverdue(e.target.value)}
                className={filterInputCls}
              />
            </div>
            <div>
              <label className={filterLabelCls}>Days overdue — at most</label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="No maximum"
                value={maxDaysOverdue}
                onChange={(e) => setMaxDaysOverdue(e.target.value)}
                className={filterInputCls}
              />
            </div>
          </div>

          {hasFilters && (
            <p className="mt-3 text-xs text-gray-500">
              Showing {report?.summary?.totalDefaulters ?? 0} matching defaulter
              {report?.summary?.totalDefaulters === 1 ? '' : 's'}.
              {(startDate || endDate) && (
                <>
                  {' '}First overdue between{' '}
                  <span className="font-medium text-gray-700">{startDate ? formatDate(startDate) : 'any date'}</span> and{' '}
                  <span className="font-medium text-gray-700">{endDate ? formatDate(endDate) : 'any date'}</span>.
                </>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Defaulters</p>
                <p className="text-2xl font-bold mt-1 text-red-600">
                  {report?.summary?.totalDefaulters || 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">Total Overdue Amount</p>
              <p className="text-2xl font-bold mt-1 text-red-600">
                {formatCurrency(report?.summary?.totalOverdueAmount || 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">Total Penalties</p>
              <p className="text-2xl font-bold mt-1 text-orange-600">
                {formatCurrency(report?.summary?.totalPenalties || 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">60+ Days Overdue</p>
              <p className="text-2xl font-bold mt-1 text-red-600">
                {report?.summary?.byDaysOverdue?.['60+ days'] || 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Days Overdue Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Overdue Breakdown by Days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(report?.summary?.byDaysOverdue || {}).map(([range, count]: [string, any]) => (
              <div key={range} className="p-4 border rounded-lg">
                <p className="text-sm text-gray-600">{range}</p>
                <p className="text-2xl font-bold mt-1">{count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Defaulters List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Defaulters List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {report?.defaulters?.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">No defaulters found. All contracts are up to date.</div>
          ) : (
            <>
              {/* Mobile */}
              <div className="sm:hidden divide-y divide-gray-100">
                {report?.defaulters?.map((defaulter: any) => (
                  <div key={defaulter.contract.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{defaulter.customer.firstName} {defaulter.customer.lastName}</p>
                      <Badge className={getDaysOverdueColor(defaulter.daysOverdue)}>{defaulter.daysOverdue}d</Badge>
                    </div>
                    <p className="text-xs text-gray-500">{defaulter.customer.phone} · {defaulter.customer.membershipId}</p>
                    <p className="text-xs font-mono text-gray-400">{defaulter.contract.contractNumber} · {defaulter.product?.name || '-'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Agent: <span className="font-medium text-gray-700">{defaulter.agent?.name || '-'}</span>{defaulter.agent?.phone ? ` · ${defaulter.agent.phone}` : ''}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs">
                      <span className="font-bold text-red-600">{formatCurrency(defaulter.totalOwed)} owed</span>
                      <span className="text-orange-600">{formatCurrency(defaulter.unpaidPenalties)} penalties</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{defaulter.overdueInstallments} overdue installment(s) · oldest: {formatDate(defaulter.oldestOverdueDate)}</p>
                  </div>
                ))}
              </div>
              {/* Desktop */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Contract #</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Overdue</TableHead>
                      <TableHead className="text-right">Overdue Amt</TableHead>
                      <TableHead className="text-right">Penalties</TableHead>
                      <TableHead className="text-right">Total Owed</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Oldest Due</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report?.defaulters?.map((defaulter: any) => (
                      <TableRow key={defaulter.contract.id}>
                        <TableCell><p className="font-medium">{defaulter.customer.firstName} {defaulter.customer.lastName}</p><p className="text-xs text-gray-500">{defaulter.customer.membershipId}</p></TableCell>
                        <TableCell><div className="flex items-center gap-2"><Phone className="h-3 w-3 text-gray-500" /><span className="text-sm">{defaulter.customer.phone}</span></div></TableCell>
                        <TableCell><p className="text-sm font-medium">{defaulter.agent?.name || '-'}</p>{defaulter.agent?.phone && <p className="text-xs text-gray-500">{defaulter.agent.phone}</p>}</TableCell>
                        <TableCell className="font-mono text-sm">{defaulter.contract.contractNumber}</TableCell>
                        <TableCell className="text-sm">{defaulter.product?.name || '-'}</TableCell>
                        <TableCell className="text-right font-medium">{defaulter.overdueInstallments}</TableCell>
                        <TableCell className="text-right font-medium text-red-600">{formatCurrency(defaulter.totalOverdueAmount)}</TableCell>
                        <TableCell className="text-right font-medium text-orange-600">{formatCurrency(defaulter.unpaidPenalties)}</TableCell>
                        <TableCell className="text-right font-bold text-red-600">{formatCurrency(defaulter.totalOwed)}</TableCell>
                        <TableCell><Badge className={getDaysOverdueColor(defaulter.daysOverdue)}>{defaulter.daysOverdue} days</Badge></TableCell>
                        <TableCell className="text-sm">{formatDate(defaulter.oldestOverdueDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
