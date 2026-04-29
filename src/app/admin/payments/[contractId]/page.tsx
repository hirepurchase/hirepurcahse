'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Banknote, Calendar, CheckCircle } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
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
    membershipId: string;
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
  paymentAmount: number; // Amount to pay
  isPartial: boolean;
}

export default function ContractPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const contractId = params.contractId as string;

  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInstallments, setSelectedInstallments] = useState<Map<string, SelectedInstallment>>(
    new Map()
  );
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (contractId) {
      loadContract();
    }
  }, [contractId]);

  const loadContract = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/contracts/admin/${contractId}`);
      setContract(response.data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to load contract',
        variant: 'destructive',
      });
      router.push('/admin/payments');
    } finally {
      setIsLoading(false);
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
        paymentAmount: remainingAmount, // Default to full payment
        isPartial: false,
      });
    } else {
      newSelected.delete(installment.id);
    }

    setSelectedInstallments(newSelected);
  };

  const handlePaymentAmountChange = (installmentId: string, value: string) => {
    const newSelected = new Map(selectedInstallments);
    const selected = newSelected.get(installmentId);

    if (selected) {
      const paymentAmount = parseFloat(value) || 0;
      const remainingAmount = selected.amount - selected.paidAmount;
      const isPartial = paymentAmount < remainingAmount;

      newSelected.set(installmentId, {
        ...selected,
        paymentAmount,
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

  const handleProcessPayment = async () => {
    if (selectedInstallments.size === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one installment to pay',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Process each selected installment
      const paymentPromises = Array.from(selectedInstallments.values()).map(async (item) => {
        return api.post(`/contracts/${contractId}/installments/${item.id}/pay`, {
          amount: item.paymentAmount,
          paymentMethod,
          reference: reference || undefined,
          notes: notes || undefined,
        });
      });

      await Promise.all(paymentPromises);

      toast({
        title: 'Success',
        description: `Successfully processed payment for ${selectedInstallments.size} installment(s)`,
      });

      // Reset form
      setSelectedInstallments(new Map());
      setReference('');
      setNotes('');

      // Reload contract
      await loadContract();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to process payment',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
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
    return null;
  }

  const unpaidInstallments = contract.installments.filter(
    (i) => i.status !== 'PAID'
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/payments')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Back to Contracts</span>
          <span className="sm:hidden">Back</span>
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Process Payment</h1>
          <p className="text-sm text-gray-500">Contract: {contract.contractNumber}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column - Contract Details & Installments */}
        <div className="lg:col-span-2 space-y-5">
          {/* Contract Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Contract Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Customer</p>
                  <p className="font-semibold text-sm">{contract.customer.firstName} {contract.customer.lastName}</p>
                  <p className="text-xs text-gray-500">{contract.customer.phone}</p>
                  <p className="text-xs text-gray-400">ID: {contract.customer.membershipId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Product</p>
                  <p className="font-semibold text-sm">{contract.inventoryItem.product.name}</p>
                  <p className="text-xs text-gray-500">{contract.inventoryItem.serialNumber}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                <div>
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="font-bold text-sm">{formatCurrency(contract.totalPrice)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Paid</p>
                  <p className="font-bold text-sm text-green-600">{formatCurrency(contract.totalPaid)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Outstanding</p>
                  <p className="font-bold text-sm text-red-600">{formatCurrency(contract.outstandingBalance)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Installments */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Installments ({unpaidInstallments.length} unpaid)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Mobile card list */}
              <div className="sm:hidden divide-y divide-gray-100">
                {unpaidInstallments.map((installment) => {
                  const remainingAmount = installment.amount - installment.paidAmount;
                  const isSelected = selectedInstallments.has(installment.id);
                  const selectedData = selectedInstallments.get(installment.id);
                  return (
                    <div key={installment.id} className={`px-4 py-3 ${isSelected ? 'bg-cyan-50' : ''}`}>
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleInstallmentToggle(installment, checked as boolean)}
                          className="mt-0.5 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">#{installment.installmentNo}</span>
                              <Badge className={getStatusColor(installment.status)}>{installment.status}</Badge>
                            </div>
                            <span className="text-sm font-bold text-gray-700">{formatCurrency(remainingAmount)}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">Due: {formatDate(installment.dueDate)}</p>
                          <div className="flex gap-3 text-xs text-gray-400 mt-0.5">
                            <span>Amount: {formatCurrency(installment.amount)}</span>
                            {installment.paidAmount > 0 && <span>Paid: {formatCurrency(installment.paidAmount)}</span>}
                          </div>
                          {isSelected && (
                            <div className="mt-2 flex items-center gap-2">
                              <Label className="text-xs shrink-0">Pay:</Label>
                              <Input
                                type="number" step="0.01" min="0" max={remainingAmount}
                                value={selectedData?.paymentAmount || ''}
                                onChange={(e) => handlePaymentAmountChange(installment.id, e.target.value)}
                                className="h-8 text-sm"
                              />
                              {selectedData?.isPartial && <Badge variant="outline" className="text-xs shrink-0">Partial</Badge>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>#</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Pay Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unpaidInstallments.map((installment) => {
                      const remainingAmount = installment.amount - installment.paidAmount;
                      const isSelected = selectedInstallments.has(installment.id);
                      const selectedData = selectedInstallments.get(installment.id);
                      return (
                        <TableRow key={installment.id} className={isSelected ? 'bg-blue-50' : ''}>
                          <TableCell>
                            <Checkbox checked={isSelected} onCheckedChange={(checked) => handleInstallmentToggle(installment, checked as boolean)} />
                          </TableCell>
                          <TableCell className="font-medium">#{installment.installmentNo}</TableCell>
                          <TableCell>{formatDate(installment.dueDate)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(installment.amount)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(installment.paidAmount)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(remainingAmount)}</TableCell>
                          <TableCell><Badge className={getStatusColor(installment.status)}>{installment.status}</Badge></TableCell>
                          <TableCell className="text-right">
                            {isSelected ? (
                              <div className="flex items-center justify-end gap-2">
                                <Input type="number" step="0.01" min="0" max={remainingAmount} value={selectedData?.paymentAmount || ''} onChange={(e) => handlePaymentAmountChange(installment.id, e.target.value)} className="w-32 text-right" />
                                {selectedData?.isPartial && <Badge variant="outline" className="text-xs">Partial</Badge>}
                              </div>
                            ) : <span className="text-gray-400">-</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Payment Form */}
        <div>
          <Card className="lg:sticky lg:top-8">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Selected</p>
                  <p className="text-xl font-bold text-blue-600">{selectedInstallments.size}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Total Amount</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(getTotalPaymentAmount())}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Method *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CHECK">Check</SelectItem>
                    <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Reference Number</Label>
                <Input placeholder="Transaction reference (optional)" value={reference} onChange={(e) => setReference(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea placeholder="Additional notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>

              <Button className="w-full" size="lg" onClick={handleProcessPayment} disabled={selectedInstallments.size === 0 || isProcessing}>
                {isProcessing ? 'Processing...' : (
                  <><Banknote className="h-4 w-4 mr-2" />Process Payment ({selectedInstallments.size})</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
