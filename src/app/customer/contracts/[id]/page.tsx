'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { formatCurrency, formatDate, getStatusColor, calculateProgress } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import type { HirePurchaseContract, InstallmentSchedule, PaymentTransaction } from '@/types';

export default function CustomerContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [contract, setContract] = useState<HirePurchaseContract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadContract();
  }, [params.id]);

  const loadContract = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/customers/me/contracts/${params.id}`);
      setContract(response.data);
    } catch (error: unknown) {
      const message =
        typeof error === 'object' && error !== null
          ? (error as { response?: { data?: { error?: string } } }).response?.data
              ?.error
          : undefined;
      toast({
        title: 'Error',
        description: message || 'Failed to load contract',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadStatement = async () => {
    try {
      const response = await api.get(`/customers/me/contracts/${params.id}/statement`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      const contractNumber = contract?.contractNumber || 'contract';
      link.href = url;
      link.setAttribute('download', `statement-${contractNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast({
        title: 'Success',
        description: 'Statement downloaded successfully',
      });
    } catch (error: unknown) {
      const message =
        typeof error === 'object' && error !== null
          ? (error as { response?: { data?: { error?: string } } }).response?.data
              ?.error
          : undefined;
      toast({
        title: 'Error',
        description: message || 'Failed to download statement',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="space-y-5">
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">Contract not found</p>
          <Button className="mt-4" onClick={() => router.push('/customer/contracts')}>Back to Contracts</Button>
        </div>
      </div>
    );
  }

  const progress = calculateProgress(contract.totalPaid, contract.totalPrice);
  const canMakePayment = contract.status === 'ACTIVE' && contract.outstandingBalance > 0;
  const paymentStatusNote =
    contract.status === 'PENDING_APPROVAL'
      ? 'This contract is still awaiting approval, so payments are not available yet.'
      : contract.status === 'REVISION_REQUESTED'
        ? 'This contract is under revision and cannot receive payments until it is approved.'
        : contract.outstandingBalance <= 0
          ? 'This contract has no outstanding balance.'
          : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Contract {contract.contractNumber}</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Hire purchase agreement details</p>
          </div>
        </div>
        <Badge className={getStatusColor(contract.status)}>{contract.status.replace(/_/g, ' ')}</Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-gray-600">Total Price</p><p className="text-lg sm:text-xl font-bold mt-1">{formatCurrency(contract.totalPrice)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-600">Deposit Paid</p><p className="text-lg sm:text-xl font-bold mt-1 text-blue-600">{formatCurrency(contract.depositAmount)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-600">Total Paid</p><p className="text-lg sm:text-xl font-bold mt-1 text-green-600">{formatCurrency(contract.totalPaid)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-600">Outstanding</p><p className="text-lg sm:text-xl font-bold mt-1 text-red-600">{formatCurrency(contract.outstandingBalance)}</p></CardContent></Card>
        <Card className="col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <p className="text-xs text-gray-600">Progress</p>
            <p className="text-lg sm:text-xl font-bold mt-1">{progress.toFixed(0)}%</p>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-green-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Product Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Product Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-gray-500">Product</p><p className="font-medium">{contract.inventoryItem?.product?.name}</p></div>
                <div><p className="text-xs text-gray-500">Category</p><p className="font-medium">{contract.inventoryItem?.product?.category?.name}</p></div>
                <div><p className="text-xs text-gray-500">Serial/IMEI</p><p className="font-medium font-mono text-xs">{contract.inventoryItem?.serialNumber}</p></div>
                <div><p className="text-xs text-gray-500">Ownership</p><Badge variant={contract.ownershipTransferred ? 'default' : 'secondary'} className="text-xs">{contract.ownershipTransferred ? 'Transferred' : 'Pending'}</Badge></div>
              </div>
            </CardContent>
          </Card>

          {/* Installment Schedule */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Installment Schedule</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Mobile */}
              <div className="sm:hidden divide-y divide-gray-100">
                {contract.installments?.map((inst: InstallmentSchedule) => (
                  <div key={inst.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">#{inst.installmentNo}</span>
                        <Badge className={`text-xs ${getStatusColor(inst.status)}`}>{inst.status}</Badge>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">Due: {formatDate(inst.dueDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(inst.amount)}</p>
                      {inst.paidAmount > 0 && <p className="text-xs text-green-600">{formatCurrency(inst.paidAmount)} paid</p>}
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contract.installments?.map((inst: InstallmentSchedule) => (
                      <TableRow key={inst.id}>
                        <TableCell>{inst.installmentNo}</TableCell>
                        <TableCell>{formatDate(inst.dueDate)}</TableCell>
                        <TableCell>{formatCurrency(inst.amount)}</TableCell>
                        <TableCell className="text-green-600">{formatCurrency(inst.paidAmount)}</TableCell>
                        <TableCell><Badge className={getStatusColor(inst.status)}>{inst.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Payment History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {contract.payments?.length === 0 ? (
                <p className="text-center py-8 text-gray-500 text-sm">No payments yet</p>
              ) : (
                <>
                  {/* Mobile */}
                  <div className="sm:hidden divide-y divide-gray-100">
                    {contract.payments?.map((payment: PaymentTransaction) => (
                      <div key={payment.id} className="px-4 py-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-green-700">{formatCurrency(payment.amount)}</span>
                          <Badge className={`text-xs ${getStatusColor(payment.status)}`}>{payment.status}</Badge>
                        </div>
                        <p className="text-xs font-mono text-gray-400 truncate">{payment.transactionRef}</p>
                        <p className="text-xs text-gray-400">{payment.paymentMethod} · {formatDate(payment.paymentDate)}</p>
                      </div>
                    ))}
                  </div>
                  {/* Desktop */}
                  <div className="hidden sm:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Transaction Ref</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contract.payments?.map((payment: PaymentTransaction) => (
                          <TableRow key={payment.id}>
                            <TableCell className="font-mono text-sm">{payment.transactionRef}</TableCell>
                            <TableCell>{formatCurrency(payment.amount)}</TableCell>
                            <TableCell>{payment.paymentMethod}</TableCell>
                            <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                            <TableCell><Badge className={getStatusColor(payment.status)}>{payment.status}</Badge></TableCell>
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

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Contract Terms */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Contract Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Frequency</span><span className="font-medium">{contract.paymentFrequency}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Installment</span><span className="font-medium">{formatCurrency(contract.installmentAmount)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Total Installments</span><span className="font-medium">{contract.totalInstallments}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Start Date</span><span className="font-medium">{formatDate(contract.startDate)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">End Date</span><span className="font-medium">{formatDate(contract.endDate)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Grace Period</span><span className="font-medium">{contract.gracePeriodDays} days</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Penalty Rate</span><span className="font-medium">{contract.penaltyPercentage}%</span></div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full" onClick={handleDownloadStatement}>
                <Download className="mr-2 h-4 w-4" />
                Download Statement
              </Button>
              {canMakePayment ? (
                <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => router.push('/customer/payments')}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Make Payment
                </Button>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {paymentStatusNote}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
