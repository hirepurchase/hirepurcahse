'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Banknote, FileText, AlertCircle, ChevronLeft, ChevronRight, ChevronRight as ArrowRight, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import api from '@/lib/api';
import { formatCurrency, getStatusColor } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface Contract {
  id: string;
  contractNumber: string;
  status: string;
  totalPrice: number;
  totalPaid: number;
  outstandingBalance: number;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    membershipId: string;
    photoUrl?: string;
  };
  inventoryItem: {
    product: { name: string };
  };
  installments: Array<{ id: string; status: string; amount: number; paidAmount: number }>;
}

interface ReconcileResult {
  transactionRef: string;
  contractNumber: string;
  amount: number;
  createdAt: string;
  hubtelStatus: string;
  action: 'updated_success' | 'updated_failed' | 'still_pending' | 'error' | 'dry_run';
  error?: string;
}

interface ReconcileSummary {
  checkedCount: number;
  updatedSuccess: number;
  updatedFailed: number;
  stillPending: number;
  errors: number;
  dryRun: boolean;
  olderThanMinutes: number;
}

export default function PaymentsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [reconciling, setReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<{ summary: ReconcileSummary; results: ReconcileResult[] } | null>(null);
  const itemsPerPage = 10;
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => { loadContracts(); }, []);

  useEffect(() => {
    const q = searchQuery.toLowerCase();
    const filtered = q
      ? contracts.filter((c) =>
          c.contractNumber.toLowerCase().includes(q) ||
          c.customer.firstName.toLowerCase().includes(q) ||
          c.customer.lastName.toLowerCase().includes(q) ||
          c.customer.phone.includes(q) ||
          c.customer.membershipId.toLowerCase().includes(q)
        )
      : contracts;
    setFilteredContracts(filtered);
    setCurrentPage(1);
  }, [searchQuery, contracts]);

  const runReconcile = async (dryRun: boolean) => {
    try {
      setReconciling(true);
      setReconcileResult(null);
      const response = await api.post(`/payments/admin/reconcile?olderThanMinutes=5&dryRun=${dryRun}`);
      setReconcileResult(response.data);
      if (!dryRun && response.data.summary.updatedSuccess > 0) {
        await loadContracts();
      }
      toast({
        title: dryRun ? 'Reconciliation Preview' : 'Reconciliation Complete',
        description: `Checked ${response.data.summary.checkedCount} pending payments. ${dryRun ? '' : `${response.data.summary.updatedSuccess} updated to SUCCESS.`}`,
      });
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.error || 'Reconciliation failed', variant: 'destructive' });
    } finally {
      setReconciling(false);
    }
  };

  const loadContracts = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/contracts?limit=1000');
      const active = (response.data.contracts || []).filter(
        (c: Contract) => c.status === 'ACTIVE' && c.outstandingBalance > 0
      );
      setContracts(active);
      setFilteredContracts(active);
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.error || 'Failed to load contracts', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const totalOutstanding = contracts.reduce((s, c) => s + c.outstandingBalance, 0);
  const withOverdue = contracts.filter((c) => c.installments?.some((i) => i.status === 'OVERDUE')).length;
  const withPartial = contracts.filter((c) => c.installments?.some((i) => i.status === 'PARTIAL')).length;

  const totalPages = Math.ceil(filteredContracts.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginated = filteredContracts.slice(startIdx, startIdx + itemsPerPage);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Payment Processing</h1>
          <p className="text-sm text-gray-500 mt-0.5">Select a contract to process payments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => runReconcile(true)} disabled={reconciling} className="text-xs">
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${reconciling ? 'animate-spin' : ''}`} />
            Preview
          </Button>
          <Button size="sm" onClick={() => runReconcile(false)} disabled={reconciling} className="text-xs bg-cyan-600 hover:bg-cyan-700 text-white">
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${reconciling ? 'animate-spin' : ''}`} />
            Reconcile Payments
          </Button>
        </div>
      </div>

      {/* Stats — 2 cols mobile, 4 desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Active" value={contracts.length} icon={FileText} iconClass="text-blue-600" iconBg="bg-blue-50" />
        <StatCard title="Overdue" value={withOverdue} icon={AlertCircle} iconClass="text-red-600" iconBg="bg-red-50" highlight={withOverdue > 0} />
        <StatCard title="Partial" value={withPartial} icon={Banknote} iconClass="text-orange-600" iconBg="bg-orange-50" />
        <StatCard title="Outstanding" value={formatCurrency(totalOutstanding)} icon={Banknote} iconClass="text-emerald-600" iconBg="bg-emerald-50" />
      </div>

      {/* Reconciliation Results */}
      {reconcileResult && (
        <Card className="border-cyan-200 bg-cyan-50">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-cyan-800">
                {reconcileResult.summary.dryRun ? 'Reconciliation Preview (no changes made)' : 'Reconciliation Complete'}
              </CardTitle>
              <button onClick={() => setReconcileResult(null)} className="text-cyan-500 hover:text-cyan-700 text-xs">Dismiss</button>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-cyan-700 mt-1">
              <span>Checked: <strong>{reconcileResult.summary.checkedCount}</strong></span>
              <span className="text-green-700">✓ Success: <strong>{reconcileResult.summary.updatedSuccess}</strong></span>
              <span className="text-red-700">✗ Failed: <strong>{reconcileResult.summary.updatedFailed}</strong></span>
              <span className="text-gray-600">⏳ Still pending: <strong>{reconcileResult.summary.stillPending}</strong></span>
              {reconcileResult.summary.errors > 0 && <span className="text-orange-700">⚠ Errors: <strong>{reconcileResult.summary.errors}</strong></span>}
            </div>
          </CardHeader>
          {reconcileResult.results.length > 0 && (
            <CardContent className="px-4 pb-4">
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {reconcileResult.results.map((r) => (
                  <div key={r.transactionRef} className="flex items-center justify-between bg-white rounded px-3 py-2 text-xs border border-cyan-100">
                    <div className="flex items-center gap-2 min-w-0">
                      {r.action === 'updated_success' && <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                      {r.action === 'updated_failed' && <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                      {r.action === 'still_pending' && <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
                      {r.action === 'dry_run' && <RefreshCw className="h-3.5 w-3.5 text-cyan-500 shrink-0" />}
                      {r.action === 'error' && <AlertCircle className="h-3.5 w-3.5 text-orange-500 shrink-0" />}
                      <span className="font-mono text-gray-600 truncate">{r.transactionRef}</span>
                      <span className="text-gray-400 shrink-0">· {r.contractNumber}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className="text-gray-700 font-medium">GH₵{r.amount.toFixed(2)}</span>
                      <Badge className={cn('text-[10px] px-1.5 py-0',
                        r.action === 'updated_success' ? 'bg-green-100 text-green-700' :
                        r.action === 'updated_failed' ? 'bg-red-100 text-red-700' :
                        r.action === 'dry_run' ? 'bg-cyan-100 text-cyan-700' :
                        r.action === 'error' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-600'
                      )}>
                        {r.action === 'updated_success' ? 'Fixed → SUCCESS' :
                         r.action === 'updated_failed' ? 'Fixed → FAILED' :
                         r.action === 'dry_run' ? `Would fix → ${r.hubtelStatus}` :
                         r.action === 'error' ? 'Error' : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search contract, customer, phone…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Active Contracts with Balance
            <span className="ml-2 text-sm font-normal text-gray-400">({filteredContracts.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredContracts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No contracts found</p>
            </div>
          ) : (
            <>
              {/* ── Mobile card list ── */}
              <div className="sm:hidden divide-y divide-gray-100">
                {paginated.map((contract) => {
                  const hasOverdue = contract.installments?.some((i) => i.status === 'OVERDUE');
                  const hasPartial = contract.installments?.some((i) => i.status === 'PARTIAL');
                  return (
                    <button
                      key={contract.id}
                      onClick={() => router.push(`/admin/payments/${contract.id}`)}
                      className="w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="w-9 h-9 shrink-0 rounded-full overflow-hidden border border-gray-200 bg-gray-100">
                          {contract.customer.photoUrl ? (
                            <img src={contract.customer.photoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs font-bold">
                              {contract.customer.firstName.charAt(0)}{contract.customer.lastName.charAt(0)}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 justify-between">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {contract.customer.firstName} {contract.customer.lastName}
                            </p>
                            <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
                          </div>
                          <p className="text-xs font-mono text-gray-500">{contract.contractNumber}</p>
                          <p className="text-xs text-gray-400 truncate">{contract.inventoryItem.product.name}</p>

                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-xs text-emerald-600 font-semibold">
                              Paid: {formatCurrency(contract.totalPaid)}
                            </span>
                            <span className="text-xs text-red-600 font-semibold">
                              Bal: {formatCurrency(contract.outstandingBalance)}
                            </span>
                          </div>

                          {(hasOverdue || hasPartial) && (
                            <div className="flex gap-1.5 mt-1.5">
                              {hasOverdue && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                                  Overdue
                                </span>
                              )}
                              {hasPartial && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                                  Partial
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* ── Desktop table ── */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contract #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((contract) => {
                      const hasOverdue = contract.installments?.some((i) => i.status === 'OVERDUE');
                      const hasPartial = contract.installments?.some((i) => i.status === 'PARTIAL');
                      return (
                        <TableRow key={contract.id} className="cursor-pointer hover:bg-gray-50"
                          onClick={() => router.push(`/admin/payments/${contract.id}`)}>
                          <TableCell className="font-mono font-medium">{contract.contractNumber}</TableCell>
                          <TableCell>
                            <p className="font-medium">{contract.customer.firstName} {contract.customer.lastName}</p>
                            <p className="text-xs text-gray-500">{contract.customer.phone}</p>
                            <p className="text-xs text-gray-400">ID: {contract.customer.membershipId}</p>
                          </TableCell>
                          <TableCell>{contract.inventoryItem.product.name}</TableCell>
                          <TableCell className="text-right">{formatCurrency(contract.totalPrice)}</TableCell>
                          <TableCell className="text-right text-emerald-600 font-semibold">{formatCurrency(contract.totalPaid)}</TableCell>
                          <TableCell className="text-right text-red-600 font-semibold">{formatCurrency(contract.outstandingBalance)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge className={getStatusColor(contract.status)}>{contract.status}</Badge>
                              {hasOverdue && <Badge className="bg-red-100 text-red-800 text-xs">Overdue</Badge>}
                              {hasPartial && <Badge className="bg-orange-100 text-orange-800 text-xs">Partial</Badge>}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    {startIdx + 1}–{Math.min(startIdx + itemsPerPage, filteredContracts.length)} of {filteredContracts.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1">Prev</span>
                    </Button>
                    <span className="text-xs text-gray-500 px-1">{currentPage} / {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
                      <span className="hidden sm:inline mr-1">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, iconClass, iconBg, highlight }: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconClass: string;
  iconBg: string;
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
      <div className={cn('text-xl sm:text-2xl font-bold', highlight ? 'text-red-600' : 'text-gray-900')}>
        {value}
      </div>
    </div>
  );
}
