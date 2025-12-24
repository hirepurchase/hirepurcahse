'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  Download,
  TrendingUp,
  CreditCard,
  Smartphone,
  Banknote,
  Building2,
  RefreshCw,
  Filter,
} from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Payment {
  id: string;
  transactionRef: string;
  amount: number;
  paymentMethod: string;
  mobileMoneyProvider: string | null;
  status: string;
  paymentDate: string | null;
  createdAt: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    membershipId: string;
    phone: string;
  };
  contract: {
    id: string;
    contractNumber: string;
    totalPrice: number;
    outstandingBalance: number;
  };
}

interface IncomeStats {
  totalPayments: number;
  successfulPayments: number;
  pendingPayments: number;
  failedPayments: number;
  totalIncome: number;
  averagePayment: number;
  byPaymentMethod: {
    [key: string]: {
      count: number;
      amount: number;
    };
  };
  byStatus: {
    SUCCESS: number;
    PENDING: number;
    FAILED: number;
  };
  dailyTotals: Array<{
    date: string;
    amount: number;
  }>;
}

export default function IncomeReportPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<IncomeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    paymentMethod: 'ALL',
    status: 'SUCCESS',
    search: '',
  });

  const loadReport = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.paymentMethod !== 'ALL') params.paymentMethod = filters.paymentMethod;
      if (filters.status !== 'ALL') params.status = filters.status;

      const response = await api.get('/reports/income', { params });
      setPayments(response.data.payments);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Failed to load income report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    loadReport();
  };

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      paymentMethod: 'ALL',
      status: 'SUCCESS',
      search: '',
    });
    setTimeout(loadReport, 100);
  };

  const exportToCSV = () => {
    const filteredPayments = payments.filter(payment => {
      const searchLower = filters.search.toLowerCase();
      return (
        payment.transactionRef.toLowerCase().includes(searchLower) ||
        `${payment.customer.firstName} ${payment.customer.lastName}`.toLowerCase().includes(searchLower) ||
        payment.customer.membershipId.toLowerCase().includes(searchLower) ||
        payment.contract.contractNumber.toLowerCase().includes(searchLower)
      );
    });

    const headers = [
      'Date',
      'Transaction Ref',
      'Customer',
      'Membership ID',
      'Contract Number',
      'Amount',
      'Payment Method',
      'Provider',
      'Status',
    ];

    const rows = filteredPayments.map(payment => [
      formatDate(payment.paymentDate || payment.createdAt),
      payment.transactionRef,
      `${payment.customer.firstName} ${payment.customer.lastName}`,
      payment.customer.membershipId,
      payment.contract.contractNumber,
      payment.amount.toFixed(2),
      payment.paymentMethod || 'N/A',
      payment.mobileMoneyProvider || 'N/A',
      payment.status,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `income-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'HUBTEL_DIRECT_DEBIT':
      case 'HUBTEL_MOMO':
      case 'HUBTEL_REGULAR':
      case 'MOBILE_MONEY':
        return <Smartphone className="h-4 w-4" />;
      case 'CASH':
        return <Banknote className="h-4 w-4" />;
      case 'BANK_TRANSFER':
        return <Building2 className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'HUBTEL_DIRECT_DEBIT':
        return 'Direct Debit';
      case 'HUBTEL_MOMO':
        return 'Hubtel MoMo';
      case 'HUBTEL_REGULAR':
        return 'Hubtel Regular';
      case 'MOBILE_MONEY':
        return 'Mobile Money';
      case 'CASH':
        return 'Cash';
      case 'BANK_TRANSFER':
        return 'Bank Transfer';
      default:
        return method || 'Unknown';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <Badge className="bg-green-500">Success</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-500">Failed</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };

  const filteredPayments = payments.filter(payment => {
    const searchLower = filters.search.toLowerCase();
    return (
      payment.transactionRef.toLowerCase().includes(searchLower) ||
      `${payment.customer.firstName} ${payment.customer.lastName}`.toLowerCase().includes(searchLower) ||
      payment.customer.membershipId.toLowerCase().includes(searchLower) ||
      payment.contract.contractNumber.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading income report...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Income Report</h1>
          <p className="text-gray-500">Track payments and revenue by payment method</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadReport} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Start Date</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={e => handleFilterChange('startDate', e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">End Date</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={e => handleFilterChange('endDate', e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Payment Method</label>
              <Select
                value={filters.paymentMethod}
                onValueChange={value => handleFilterChange('paymentMethod', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Methods</SelectItem>
                  <SelectItem value="HUBTEL_DIRECT_DEBIT">Direct Debit</SelectItem>
                  <SelectItem value="HUBTEL_MOMO">Hubtel MoMo</SelectItem>
                  <SelectItem value="HUBTEL_REGULAR">Hubtel Regular</SelectItem>
                  <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select
                value={filters.status}
                onValueChange={value => handleFilterChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="SUCCESS">Success</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={applyFilters} className="flex-1">
                Apply
              </Button>
              <Button onClick={resetFilters} variant="outline">
                Reset
              </Button>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium mb-1 block">Search</label>
            <Input
              placeholder="Search by transaction ref, customer, membership ID, or contract..."
              value={filters.search}
              onChange={e => handleFilterChange('search', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalIncome)}</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.successfulPayments} successful payments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Payment</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.averagePayment)}</div>
              <p className="text-xs text-gray-500 mt-1">Per transaction</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
              <CreditCard className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPayments}</div>
              <p className="text-xs text-gray-500 mt-1">All transactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending/Failed</CardTitle>
              <RefreshCw className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.pendingPayments + stats.failedPayments}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.pendingPayments} pending, {stats.failedPayments} failed
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Method Breakdown */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Income by Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(stats.byPaymentMethod)
                .filter(([_, data]) => data.count > 0)
                .map(([method, data]) => (
                  <div key={method} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {getPaymentMethodIcon(method)}
                      <span className="text-sm font-medium">{getPaymentMethodLabel(method)}</span>
                    </div>
                    <div className="text-2xl font-bold">{formatCurrency(data.amount)}</div>
                    <p className="text-xs text-gray-500 mt-1">{data.count} transactions</p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Payment Transactions ({filteredPayments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No payments found matching your filters
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Transaction Ref</th>
                    <th className="text-left p-2">Customer</th>
                    <th className="text-left p-2">Contract</th>
                    <th className="text-left p-2">Payment Method</th>
                    <th className="text-right p-2">Amount</th>
                    <th className="text-center p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map(payment => (
                    <tr key={payment.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        {formatDate(payment.paymentDate || payment.createdAt)}
                      </td>
                      <td className="p-2 font-mono text-sm">{payment.transactionRef}</td>
                      <td className="p-2">
                        <div>
                          <div className="font-medium">
                            {payment.customer.firstName} {payment.customer.lastName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {payment.customer.membershipId}
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="font-mono text-sm">{payment.contract.contractNumber}</div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          {getPaymentMethodIcon(payment.paymentMethod)}
                          <div>
                            <div className="text-sm">{getPaymentMethodLabel(payment.paymentMethod)}</div>
                            {payment.mobileMoneyProvider && (
                              <div className="text-xs text-gray-500">{payment.mobileMoneyProvider}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-right font-bold">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="p-2 text-center">
                        {getStatusBadge(payment.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
