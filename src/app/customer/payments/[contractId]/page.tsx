'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Banknote, Smartphone, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';

interface Installment {
  id: string;
  installmentNo: number;
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: string;
}

interface Contract {
  id: string;
  contractNumber: string;
  status: string;
  totalPrice: number;
  totalPaid: number;
  outstandingBalance: number;
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
  };
  inventoryItem: {
    product: {
      name: string;
    };
    serialNumber: string;
  };
  installments: Installment[];
}

interface SelectedInstallment {
  id: string;
  installmentNo: number;
  amount: number;
  paidAmount: number;
  paymentAmount: number;
  isPartial: boolean;
}

export default function CustomerContractPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const contractId = params.contractId as string;

  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInstallments, setSelectedInstallments] = useState<Map<string, SelectedInstallment>>(
    new Map()
  );
  const [phoneNumber, setPhoneNumber] = useState('');
  const [network, setNetwork] = useState('MTN');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  const [transactionRef, setTransactionRef] = useState('');

  useEffect(() => {
    if (contractId) {
      loadContract();
    }
  }, [contractId]);

  useEffect(() => {
    // Auto-fill phone number from contract
    if (contract?.customer?.phone) {
      setPhoneNumber(contract.customer.phone);
    }
  }, [contract]);

  const loadContract = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/customers/me/contracts/${contractId}`);
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

  const getInstallmentStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800';
      case 'PARTIAL':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleInstallmentToggle = (installment: Installment, checked: boolean) => {
    const newSelected = new Map(selectedInstallments);

    if (checked) {
      const remainingAmount = installment.amount - installment.paidAmount;
      newSelected.set(installment.id, {
        id: installment.id,
        installmentNo: installment.installmentNo,
        amount: installment.amount,
        paidAmount: installment.paidAmount,
        paymentAmount: remainingAmount,
        isPartial: false,
      });
    } else {
      newSelected.delete(installment.id);
    }

    setSelectedInstallments(newSelected);
  };

  const handlePaymentAmountChange = (installmentId: string, value: string) => {
    const amount = parseFloat(value) || 0;
    const newSelected = new Map(selectedInstallments);
    const selected = newSelected.get(installmentId);

    if (selected) {
      const remainingAmount = selected.amount - selected.paidAmount;
      const isPartial = amount < remainingAmount;

      newSelected.set(installmentId, {
        ...selected,
        paymentAmount: Math.min(amount, remainingAmount),
        isPartial,
      });

      setSelectedInstallments(newSelected);
    }
  };

  const getTotalPaymentAmount = () => {
    return Array.from(selectedInstallments.values()).reduce(
      (sum, item) => sum + item.paymentAmount,
      0
    );
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedInstallments.size === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one installment to pay',
        variant: 'destructive',
      });
      return;
    }

    const totalAmount = getTotalPaymentAmount();
    if (totalAmount <= 0) {
      toast({
        title: 'Error',
        description: 'Total payment amount must be greater than zero',
        variant: 'destructive',
      });
      return;
    }

    if (!phoneNumber || phoneNumber.length < 10) {
      toast({
        title: 'Error',
        description: 'Please enter a valid mobile money number',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('pending');

    try {
      const response = await api.post('/payments/hubtel/initiate', {
        contractId: contract?.id,
        amount: totalAmount,
        phoneNumber,
        network,
      });

      setTransactionRef(response.data.transactionRef);

      toast({
        title: 'Payment Initiated',
        description: 'Please check your phone and approve the payment prompt',
      });

      // Start polling for payment status
      pollPaymentStatus(response.data.transactionRef);
    } catch (error: unknown) {
      const message =
        typeof error === 'object' && error !== null
          ? (error as { response?: { data?: { error?: string } } }).response?.data
              ?.error
          : undefined;
      console.error('Payment error:', error);
      setPaymentStatus('failed');
      toast({
        title: 'Payment Failed',
        description: message || 'Failed to initiate payment',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  const pollPaymentStatus = async (txnRef: string) => {
    let attempts = 0;
    const maxAttempts = 60; // Poll for up to 2 minutes

    const poll = async () => {
      try {
        const response = await api.get(`/payments/hubtel/status/${txnRef}`);
        const status = response.data.status;

        if (status === 'SUCCESS') {
          setPaymentStatus('success');
          setIsProcessing(false);
          toast({
            title: 'Payment Successful!',
            description: `Payment of ${formatCurrency(getTotalPaymentAmount())} has been processed`,
          });

          // Reload contract data
          setTimeout(() => {
            loadContract();
            setSelectedInstallments(new Map());
          }, 2000);

          return;
        } else if (status === 'FAILED') {
          setPaymentStatus('failed');
          setIsProcessing(false);
          toast({
            title: 'Payment Failed',
            description: 'The payment was not successful. Please try again.',
            variant: 'destructive',
          });
          return;
        }

        // Still pending, continue polling
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000); // Poll every 2 seconds
        } else {
          setPaymentStatus('idle');
          setIsProcessing(false);
          toast({
            title: 'Payment Pending',
            description: 'Payment verification timed out. Please check your payment history later.',
            variant: 'default',
          });
        }
      } catch (error) {
        // Silently continue polling if status check fails
        // This is expected when Hubtel hasn't registered the payment yet
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setPaymentStatus('idle');
          setIsProcessing(false);
          toast({
            title: 'Payment Pending',
            description: 'Payment verification timed out. Please check your payment history later.',
            variant: 'default',
          });
        }
      }
    };

    poll();
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-gray-600 mb-4">Contract not found</p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const pendingInstallments = contract.installments.filter(
    (i) => i.status === 'PENDING' || i.status === 'PARTIAL' || i.status === 'OVERDUE'
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Back</span>
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Make Payment</h1>
          <p className="text-xs sm:text-sm text-gray-500">Contract #{contract.contractNumber}</p>
        </div>
      </div>

      {/* Payment Status Alerts */}
      {paymentStatus === 'pending' && (
        <Alert className="border-blue-500 bg-blue-50">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 text-sm">
            Waiting for approval on your phone. Ref: <strong>{transactionRef}</strong>
          </AlertDescription>
        </Alert>
      )}
      {paymentStatus === 'success' && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900 text-sm">Payment successful! Your contract has been updated.</AlertDescription>
        </Alert>
      )}
      {paymentStatus === 'failed' && (
        <Alert className="border-red-500 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-900 text-sm">Payment failed. Please try again or contact support.</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column - Installments */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Select Installments to Pay</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {pendingInstallments.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
                  <p className="text-gray-600 text-sm">All installments are paid!</p>
                </div>
              ) : (
                <>
                  {/* Mobile */}
                  <div className="sm:hidden divide-y divide-gray-100">
                    {pendingInstallments.map((installment) => {
                      const isSelected = selectedInstallments.has(installment.id);
                      const selected = selectedInstallments.get(installment.id);
                      const remainingAmount = installment.amount - installment.paidAmount;
                      return (
                        <div key={installment.id} className={`px-4 py-3 ${isSelected ? 'bg-blue-50' : ''}`}>
                          <div className="flex items-start gap-3">
                            <Checkbox checked={isSelected} onCheckedChange={(checked) => handleInstallmentToggle(installment, checked as boolean)} className="mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold">#{installment.installmentNo}</span>
                                  <Badge className={`text-xs ${getInstallmentStatusColor(installment.status)}`}>{installment.status}</Badge>
                                </div>
                                <span className="text-sm font-bold text-orange-600">{formatCurrency(remainingAmount)}</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">Due: {formatDate(installment.dueDate)}</p>
                              {installment.paidAmount > 0 && <p className="text-xs text-green-600">{formatCurrency(installment.paidAmount)} paid</p>}
                              {isSelected && (
                                <div className="mt-2 flex items-center gap-2">
                                  <Label className="text-xs shrink-0">Pay:</Label>
                                  <Input type="number" step="0.01" min="0" max={remainingAmount} value={selected?.paymentAmount || 0} onChange={(e) => handlePaymentAmountChange(installment.id, e.target.value)} className="h-8 text-sm" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Desktop */}
                  <div className="hidden sm:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>#</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Paid</TableHead>
                          <TableHead>Balance</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Pay Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingInstallments.map((installment) => {
                          const isSelected = selectedInstallments.has(installment.id);
                          const selected = selectedInstallments.get(installment.id);
                          const remainingAmount = installment.amount - installment.paidAmount;
                          return (
                            <TableRow key={installment.id} className={isSelected ? 'bg-blue-50' : ''}>
                              <TableCell>
                                <Checkbox checked={isSelected} onCheckedChange={(checked) => handleInstallmentToggle(installment, checked as boolean)} />
                              </TableCell>
                              <TableCell>{installment.installmentNo}</TableCell>
                              <TableCell>{formatDate(installment.dueDate)}</TableCell>
                              <TableCell>{formatCurrency(installment.amount)}</TableCell>
                              <TableCell className="text-green-600">{formatCurrency(installment.paidAmount)}</TableCell>
                              <TableCell className="font-semibold text-orange-600">{formatCurrency(remainingAmount)}</TableCell>
                              <TableCell><Badge className={getInstallmentStatusColor(installment.status)}>{installment.status}</Badge></TableCell>
                              <TableCell>
                                {isSelected ? (
                                  <Input type="number" step="0.01" min="0" max={remainingAmount} value={selected?.paymentAmount || 0} onChange={(e) => handlePaymentAmountChange(installment.id, e.target.value)} className="w-28" />
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Payment Form */}
        <div>
          <Card className="lg:sticky lg:top-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Payment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePayment} className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg text-sm">
                  <p className="text-xs text-gray-500">Product</p>
                  <p className="font-semibold">{contract.inventoryItem.product.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Serial: {contract.inventoryItem.serialNumber}</p>
                </div>

                <div className="space-y-1.5 text-sm border-t pt-3">
                  <div className="flex justify-between"><span className="text-gray-500">Total Price:</span><span className="font-medium">{formatCurrency(contract.totalPrice)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Paid:</span><span className="text-green-600">{formatCurrency(contract.totalPaid)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Outstanding:</span><span className="text-orange-600 font-semibold">{formatCurrency(contract.outstandingBalance)}</span></div>
                </div>

                {selectedInstallments.size > 0 && (
                  <div className="border-t pt-3 space-y-1.5 text-sm">
                    {Array.from(selectedInstallments.values()).map((item) => (
                      <div key={item.id} className="flex justify-between">
                        <span className="text-gray-500">Inst. #{item.installmentNo}{item.isPartial ? ' (Partial)' : ''}</span>
                        <span className="font-medium">{formatCurrency(item.paymentAmount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold text-base pt-1 border-t">
                      <span>Total:</span>
                      <span className="text-blue-600">{formatCurrency(getTotalPaymentAmount())}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-3 border-t pt-3">
                  <div>
                    <Label htmlFor="phoneNumber">Mobile Money Number</Label>
                    <Input id="phoneNumber" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="0244123456" required disabled={isProcessing} />
                  </div>
                  <div>
                    <Label htmlFor="network">Network</Label>
                    <Select value={network} onValueChange={setNetwork} disabled={isProcessing}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MTN">MTN Mobile Money</SelectItem>
                        <SelectItem value="VODAFONE">Vodafone Cash</SelectItem>
                        <SelectItem value="AIRTELTIGO">AirtelTigo Money</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isProcessing || selectedInstallments.size === 0}>
                  {isProcessing ? (
                    <><Clock className="h-4 w-4 mr-2 animate-spin" />Processing...</>
                  ) : (
                    <><Smartphone className="h-4 w-4 mr-2" />Pay {formatCurrency(getTotalPaymentAmount())}</>
                  )}
                </Button>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-blue-900"><AlertCircle className="h-3 w-3 inline mr-1" />You will receive a prompt on your phone to approve this payment.</p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
