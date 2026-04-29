'use client';

import { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { useRouter } from 'next/navigation';
import { ExportButtons } from '@/components/admin/ExportButtons';
import { ExportOptions } from '@/lib/exportUtils';

export default function SalesReportPage() {
  const [report, setReport] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    productId: '',
    agentId: '',
  });
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    loadProducts();
    loadAgents();
  }, []);

  useEffect(() => {
    loadReport();
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [filters]);

  const loadProducts = async () => {
    try {
      const response = await api.get('/products', {
        params: { limit: 1000 } // Increase limit to show all products
      });
      setProducts(response.data.products || []);
    } catch (error: any) {
      console.error('Failed to load products:', error);
    }
  };

  const loadAgents = async () => {
    try {
      const response = await api.get('/admin-users', { params: { limit: 200 } });
      setAgents(response.data.users || []);
    } catch (error: any) {
      console.error('Failed to load agents:', error);
    }
  };

  const loadReport = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/reports/sales', {
        params: filters,
      });
      setReport(response.data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to load sales report',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Pagination calculations
  const contracts = report?.contracts || [];
  const totalPages = Math.ceil(contracts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedContracts = contracts.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const exportOptions = useMemo<ExportOptions>(() => {
    if (!report) {
      return {
        title: 'Sales Report',
        filename: 'sales-report',
        columns: [],
        data: [],
      };
    }

    return {
      title: 'Sales Report',
      filename: `sales-report-${filters.startDate}-to-${filters.endDate}`,
      dateRange: {
        start: formatDate(filters.startDate),
        end: formatDate(filters.endDate),
      },
      summary: [
        { label: 'Total Contracts', value: report.summary?.totalContracts || 0 },
        { label: 'Total Sales Value', value: formatCurrency(report.summary?.totalSalesValue || 0) },
        { label: 'Total Deposits', value: formatCurrency(report.summary?.totalDeposits || 0) },
        { label: 'Average Contract Value', value: formatCurrency(report.summary?.averageContractValue || 0) },
      ],
      columns: [
        { header: 'Date', accessor: (row: any) => formatDate(row.createdAt), align: 'left' },
        { header: 'Contract #', accessor: 'contractNumber', align: 'left' },
        { header: 'Customer', accessor: (row: any) => `${row.customer?.firstName || ''} ${row.customer?.lastName || ''}`, align: 'left' },
        { header: 'Product', accessor: (row: any) => row.inventoryItem?.product?.name || '-', align: 'left' },
        { header: 'Total Price', accessor: (row: any) => formatCurrency(row.totalPrice), align: 'right' },
        { header: 'Deposit', accessor: (row: any) => formatCurrency(row.depositAmount), align: 'right' },
        { header: 'Status', accessor: 'status', align: 'left' },
      ],
      data: report.contracts || [],
    };
  }, [report, filters]);

  if (isLoading) {
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
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Sales Report</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Contract sales and performance</p>
          </div>
        </div>
        <ExportButtons exportOptions={exportOptions} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium mb-2">Start Date</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">End Date</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Product</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={filters.productId}
                onChange={(e) => setFilters({ ...filters, productId: e.target.value })}
              >
                <option value="">All Products</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Sales Agent</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={filters.agentId}
                onChange={(e) => setFilters({ ...filters, agentId: e.target.value })}
              >
                <option value="">All Agents</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.firstName} {agent.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={loadReport}>
              Generate Report
            </Button>
            <Button
              variant="outline"
              onClick={() => setFilters({
                startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0],
                productId: '',
                agentId: '',
              })}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards — 2 col mobile, 4 desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card><CardContent className="p-4"><p className="text-xs sm:text-sm text-gray-500">Total Contracts</p><p className="text-xl sm:text-2xl font-bold mt-1">{report?.summary?.totalContracts || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs sm:text-sm text-gray-500">Sales Value</p><p className="text-xl sm:text-2xl font-bold mt-1 text-green-600">{formatCurrency(report?.summary?.totalSalesValue || 0)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs sm:text-sm text-gray-500">Total Deposits</p><p className="text-xl sm:text-2xl font-bold mt-1 text-blue-600">{formatCurrency(report?.summary?.totalDeposits || 0)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs sm:text-sm text-gray-500">Avg Contract</p><p className="text-xl sm:text-2xl font-bold mt-1">{formatCurrency(report?.summary?.averageContractValue || 0)}</p></CardContent></Card>
      </div>

      {/* Sales Contracts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sales Contracts <span className="text-sm font-normal text-gray-400">({contracts.length})</span></CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {contracts.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">No contracts found. Try adjusting your filters.</div>
          ) : (
            <>
              {/* Mobile */}
              <div className="sm:hidden divide-y divide-gray-100">
                {paginatedContracts.map((contract: any) => (
                  <div key={contract.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold truncate">{contract.customer?.firstName} {contract.customer?.lastName}</p>
                      <Badge variant={contract.status === 'ACTIVE' ? 'default' : 'secondary'}>{contract.status}</Badge>
                    </div>
                    <p className="text-xs font-mono text-gray-500">{contract.contractNumber}</p>
                    <p className="text-xs text-gray-400 truncate">{contract.inventoryItem?.product?.name || '-'}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs">
                      <span className="font-semibold text-cyan-600">{formatCurrency(contract.totalPrice)}</span>
                      <span className="text-gray-400">Dep: {formatCurrency(contract.depositAmount)}</span>
                      <span className="text-gray-400">{formatDate(contract.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Contract #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead className="text-right">Total Price</TableHead>
                      <TableHead className="text-right">Deposit</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedContracts.map((contract: any) => (
                      <TableRow key={contract.id}>
                        <TableCell className="text-sm">{formatDate(contract.createdAt)}</TableCell>
                        <TableCell className="font-mono text-sm">{contract.contractNumber}</TableCell>
                        <TableCell>{contract.customer?.firstName} {contract.customer?.lastName}</TableCell>
                        <TableCell>{contract.inventoryItem?.product?.name || '-'}</TableCell>
                        <TableCell className="text-sm">{contract.createdBy?.firstName} {contract.createdBy?.lastName}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(contract.totalPrice)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(contract.depositAmount)}</TableCell>
                        <TableCell><Badge variant={contract.status === 'ACTIVE' ? 'default' : 'secondary'}>{contract.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {contracts.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">{startIndex + 1}–{Math.min(endIndex, contracts.length)} of {contracts.length}</p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="text-xs text-gray-500">{currentPage}/{totalPages}</span>
                    <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
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
