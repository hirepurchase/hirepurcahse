"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Shield, User, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw, Search, Download } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';

interface PreapprovalReport {
  id: string;
  clientReferenceId: string;
  hubtelPreapprovalId: string | null;
  status: string;
  customerMsisdn: string;
  channel: string;
  verificationType: string | null;
  approvedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    membershipId: string;
    phone: string;
    email: string | null;
  };
  contracts: {
    id: string;
    contractNumber: string;
    totalPrice: number;
    outstandingBalance: number;
    status: string;
  }[];
}

interface StatusStats {
  total: number;
  approved: number;
  pending: number;
  failed: number;
  expired: number;
  cancelled: number;
}

export default function PreapprovalsReportPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [preapprovals, setPreapprovals] = useState<PreapprovalReport[]>([]);
  const [filteredPreapprovals, setFilteredPreapprovals] = useState<PreapprovalReport[]>([]);
  const [stats, setStats] = useState<StatusStats>({
    total: 0,
    approved: 0,
    pending: 0,
    failed: 0,
    expired: 0,
    cancelled: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');

  useEffect(() => {
    loadPreapprovals();
  }, []);

  useEffect(() => {
    filterPreapprovals();
  }, [searchTerm, statusFilter, channelFilter, preapprovals]);

  const loadPreapprovals = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/reports/preapprovals');
      setPreapprovals(response.data.preapprovals || []);
      setStats(response.data.stats || {
        total: 0,
        approved: 0,
        pending: 0,
        failed: 0,
        expired: 0,
        cancelled: 0,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to load preapprovals',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterPreapprovals = () => {
    let filtered = [...preapprovals];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.customer.firstName.toLowerCase().includes(term) ||
          p.customer.lastName.toLowerCase().includes(term) ||
          p.customer.membershipId.toLowerCase().includes(term) ||
          p.customer.phone.includes(term) ||
          p.clientReferenceId.toLowerCase().includes(term) ||
          p.contracts.some((c) => c.contractNumber.toLowerCase().includes(term))
      );
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    // Channel filter
    if (channelFilter !== 'ALL') {
      filtered = filtered.filter((p) => p.channel.includes(channelFilter.toLowerCase()));
    }

    setFilteredPreapprovals(filtered);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'EXPIRED':
        return <Badge className="bg-gray-500"><AlertCircle className="h-3 w-3 mr-1" />Expired</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-orange-500"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getChannelName = (channel: string) => {
    if (channel.includes('mtn')) return 'MTN';
    if (channel.includes('vodafone')) return 'Vodafone';
    if (channel.includes('telecel')) return 'Telecel';
    if (channel.includes('airteltigo')) return 'AirtelTigo';
    return channel;
  };

  const exportToCSV = () => {
    const headers = [
      'Customer Name',
      'Membership ID',
      'Phone',
      'Email',
      'Status',
      'Channel',
      'Verification Type',
      'Client Reference',
      'Hubtel ID',
      'Created Date',
      'Approved Date',
      'Expires Date',
      'Contracts',
      'Total Contract Value',
    ];

    const rows = filteredPreapprovals.map((p) => [
      `${p.customer.firstName} ${p.customer.lastName}`,
      p.customer.membershipId,
      p.customer.phone,
      p.customer.email || 'N/A',
      p.status,
      getChannelName(p.channel),
      p.verificationType || 'N/A',
      p.clientReferenceId,
      p.hubtelPreapprovalId || 'N/A',
      formatDate(p.createdAt),
      p.approvedAt ? formatDate(p.approvedAt) : 'N/A',
      p.expiresAt ? formatDate(p.expiresAt) : 'N/A',
      p.contracts.map((c) => c.contractNumber).join('; '),
      formatCurrency(p.contracts.reduce((sum, c) => sum + c.totalPrice, 0)),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `preapprovals-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Success',
      description: 'Report exported successfully',
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
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
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Preapprovals Report</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Direct debit mandate approvals</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={loadPreapprovals}>
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-blue-600">{stats.total}</p><p className="text-xs text-gray-500 mt-0.5">Total</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-green-600">{stats.approved}</p><p className="text-xs text-gray-500 mt-0.5">Approved</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-yellow-600">{stats.pending}</p><p className="text-xs text-gray-500 mt-0.5">Pending</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-red-600">{stats.failed}</p><p className="text-xs text-gray-500 mt-0.5">Failed</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-gray-600">{stats.expired}</p><p className="text-xs text-gray-500 mt-0.5">Expired</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-orange-600">{stats.cancelled}</p><p className="text-xs text-gray-500 mt-0.5">Cancelled</p></CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Customer name, phone, contract..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="APPROVED">Approved</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
                <option value="EXPIRED">Expired</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Network</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
              >
                <option value="ALL">All Networks</option>
                <option value="MTN">MTN</option>
                <option value="VODAFONE">Vodafone</option>
                <option value="TELECEL">Telecel</option>
                <option value="AIRTELTIGO">AirtelTigo</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preapprovals Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Preapproval Records <span className="text-sm font-normal text-gray-400">({filteredPreapprovals.length})</span></CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredPreapprovals.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">No preapprovals found.</div>
          ) : (
            <>
              {/* Mobile */}
              <div className="sm:hidden divide-y divide-gray-100">
                {filteredPreapprovals.map((preapproval) => (
                  <div key={preapproval.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{preapproval.customer.firstName} {preapproval.customer.lastName}</p>
                      {getStatusBadge(preapproval.status)}
                    </div>
                    <p className="text-xs text-gray-500">{preapproval.customerMsisdn} · {preapproval.customer.membershipId}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{getChannelName(preapproval.channel)}</Badge>
                      {preapproval.verificationType && <span className="text-xs text-gray-400">{preapproval.verificationType}</span>}
                    </div>
                    {preapproval.contracts.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {preapproval.contracts.map((c) => (
                          <button key={c.id} onClick={() => router.push(`/admin/contracts/${c.id}`)} className="text-xs text-blue-600 hover:underline">{c.contractNumber}</button>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>Created: {formatDate(preapproval.createdAt)}</span>
                      {preapproval.approvedAt && <span className="text-green-600">Approved: {formatDate(preapproval.approvedAt)}</span>}
                    </div>
                    <Button variant="ghost" size="sm" className="mt-1 h-7 px-2 text-xs" onClick={() => router.push(`/admin/customers/${preapproval.customer.id}`)}>
                      <User className="h-3 w-3 mr-1" />View Customer
                    </Button>
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
                      <TableHead>Status</TableHead>
                      <TableHead>Network</TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead>Contracts</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Approved</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPreapprovals.map((preapproval) => (
                      <TableRow key={preapproval.id}>
                        <TableCell>
                          <p className="font-medium">{preapproval.customer.firstName} {preapproval.customer.lastName}</p>
                          <p className="text-xs text-gray-500">{preapproval.customer.membershipId}</p>
                        </TableCell>
                        <TableCell>
                          <p className="font-mono text-sm">{preapproval.customerMsisdn}</p>
                          {preapproval.customer.email && <p className="text-xs text-gray-500">{preapproval.customer.email}</p>}
                        </TableCell>
                        <TableCell>{getStatusBadge(preapproval.status)}</TableCell>
                        <TableCell><Badge variant="outline">{getChannelName(preapproval.channel)}</Badge></TableCell>
                        <TableCell><span className="text-sm">{preapproval.verificationType || 'N/A'}</span></TableCell>
                        <TableCell>
                          {preapproval.contracts.length > 0 ? (
                            <div>
                              {preapproval.contracts.map((contract) => (
                                <div key={contract.id} className="mb-1">
                                  <button onClick={() => router.push(`/admin/contracts/${contract.id}`)} className="text-blue-600 hover:underline text-sm">{contract.contractNumber}</button>
                                  <p className="text-xs text-gray-500">{formatCurrency(contract.outstandingBalance)} outstanding</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-500 text-sm">No contracts</span>
                          )}
                        </TableCell>
                        <TableCell><span className="text-sm">{formatDate(preapproval.createdAt)}</span></TableCell>
                        <TableCell>
                          {preapproval.approvedAt ? (
                            <span className="text-sm text-green-600">{formatDate(preapproval.approvedAt)}</span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/customers/${preapproval.customer.id}`)}>
                            <User className="h-4 w-4" />
                          </Button>
                        </TableCell>
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
