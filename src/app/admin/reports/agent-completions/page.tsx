'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Award, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { ExportButtons } from '@/components/admin/ExportButtons';
import { ExportOptions } from '@/lib/exportUtils';

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return month;
  return new Date(y, m - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
}

export default function AgentCompletionsReportPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [month, setMonth] = useState(currentMonth());
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/reports/agent-completions', { params: { month } });
        setReport(res.data);
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.response?.data?.error || 'Failed to load agent completions',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [month, toast]);

  const exportOptions = useMemo<ExportOptions>(() => ({
    title: `Agent Completions — ${monthLabel(month)}`,
    filename: `agent-completions-${month}`,
    summary: [
      { label: 'Month', value: monthLabel(month) },
      { label: 'Contracts Completed', value: report?.summary?.totalCompleted ?? 0 },
      { label: 'Agents With Completions', value: report?.summary?.agentsWithCompletions ?? 0 },
      { label: 'Total Value', value: formatCurrency(report?.summary?.totalValue ?? 0) },
    ],
    columns: [
      { header: 'Agent', accessor: (r: any) => r.agent.name, align: 'left' },
      { header: 'Phone', accessor: (r: any) => r.agent.phone || '-', align: 'left' },
      { header: 'Completed', accessor: (r: any) => r.completedCount, align: 'right' },
      { header: 'Total Value', accessor: (r: any) => formatCurrency(r.totalValue), align: 'right' },
    ],
    data: report?.agents || [],
  }), [report, month]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Agent Completions</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Contracts paid off per agent — the basis for completion bonuses</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            max={currentMonth()}
            onChange={(e) => setMonth(e.target.value)}
            className="h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <ExportButtons exportOptions={exportOptions} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Contracts Completed</p>
                <p className="text-2xl font-bold mt-1 text-emerald-600">{report?.summary?.totalCompleted ?? 0}</p>
              </div>
              <Award className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Agents With Completions</p>
            <p className="text-2xl font-bold mt-1">{report?.summary?.agentsWithCompletions ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 min-w-0">
            <p className="text-sm text-gray-600">Total Value</p>
            <p className="text-2xl font-bold mt-1 truncate">{formatCurrency(report?.summary?.totalValue ?? 0)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {isLoading ? 'Loading...' : `${monthLabel(month)} — ${report?.agents?.length ?? 0} agent${report?.agents?.length === 1 ? '' : 's'}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading...</div>
          ) : (report?.agents?.length ?? 0) === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">No contracts were completed in {monthLabel(month)}.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.agents.map((row: any) => (
                    <Fragment key={row.agent.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => setExpanded(expanded === row.agent.id ? null : row.agent.id)}
                      >
                        <TableCell className="font-medium">{row.agent.name}</TableCell>
                        <TableCell className="text-sm text-gray-600">{row.agent.phone || '-'}</TableCell>
                        <TableCell className="text-right font-bold text-emerald-600">{row.completedCount}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.totalValue)}</TableCell>
                        <TableCell>
                          {expanded === row.agent.id
                            ? <ChevronDown className="h-4 w-4 text-gray-400" />
                            : <ChevronRight className="h-4 w-4 text-gray-400" />}
                        </TableCell>
                      </TableRow>
                      {expanded === row.agent.id && (
                        <TableRow>
                          <TableCell colSpan={5} className="bg-gray-50 p-0">
                            <div className="divide-y divide-gray-100">
                              {row.contracts.map((c: any) => (
                                <div key={c.contractNumber} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
                                  <div className="min-w-0">
                                    <span className="font-mono text-xs text-gray-500">{c.contractNumber}</span>
                                    <span className="ml-2 font-medium">{c.customerName}</span>
                                    <span className="ml-2 text-xs text-gray-400">{c.product || '-'}</span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <span className="text-xs text-gray-500">completed {formatDate(c.completedAt)}</span>
                                    <span className="font-medium">{formatCurrency(c.totalPrice)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
