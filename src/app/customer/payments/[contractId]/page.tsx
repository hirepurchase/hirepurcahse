'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Smartphone, CheckCircle, XCircle, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import api from '@/lib/api';
import { cn, formatCurrency, formatDate, roundMoney } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import {
  DueInstallment,
  summariseDue,
  quickAmounts,
  describeCoverage,
  guessNetwork,
  unpaidInstallments,
  isInstallmentOverdue,
} from '@/lib/paymentDue';

interface Contract {
  id: string;
  contractNumber: string;
  status: string;
  totalPrice: number;
  totalPaid: number;
  outstandingBalance: number;
  penaltyOutstanding?: number;
  totalDue?: number;
  mobileMoneyNumber?: string | null;
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
  installments: DueInstallment[];
}

// A daily contract can have hundreds of rows; the schedule opens on the
// next few, and the rest are one tap away.
const SCHEDULE_PREVIEW = 6;

function errorMessage(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null
    ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
    : undefined;
}

export default function CustomerContractPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const contractId = params.contractId as string;

  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [network, setNetwork] = useState('MTN');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  const [transactionRef, setTransactionRef] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [showAllRows, setShowAllRows] = useState(false);

  const summary = useMemo(() => (contract ? summariseDue(contract) : null), [contract]);
  const options = useMemo(() => (summary ? quickAmounts(summary) : []), [summary]);

  useEffect(() => {
    if (contractId) {
      loadContract(true);
    }
  }, [contractId]);

  const loadContract = async (firstLoad = false) => {
    try {
      if (firstLoad) setIsLoading(true);
      const response = await api.get(`/customers/me/contracts/${contractId}`);
      const data: Contract = response.data;
      setContract(data);
      if (firstLoad) {
        const phone = data.mobileMoneyNumber || data.customer?.phone || '';
        setPhoneNumber(phone);
        setNetwork(guessNetwork(phone) || 'MTN');
        // Start on what clears the arrears, or the next payment.
        const first = quickAmounts(summariseDue(data))[0];
        if (first) setAmount(first.amount.toFixed(2));
      }
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: errorMessage(error) || 'Failed to load contract',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneChange = (value: string) => {
    setPhoneNumber(value);
    const guessed = guessNetwork(value);
    if (guessed) setNetwork(guessed);
  };

  const paymentAmount = roundMoney(parseFloat(amount) || 0);

  const handlePayment = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!contract || !summary) return;

    if (contract.status !== 'ACTIVE') {
      toast({
        title: 'Payment Unavailable',
        description: contract.status === 'PENDING_APPROVAL'
          ? 'This contract is still awaiting approval.'
          : 'This contract is not approved for payments yet.',
        variant: 'destructive',
      });
      return;
    }
    if (paymentAmount <= 0) {
      toast({ title: 'Enter an amount', description: 'Choose or type how much to pay.', variant: 'destructive' });
      return;
    }
    if (paymentAmount > summary.totalDue + 0.005) {
      toast({
        title: 'Amount too high',
        description: `The most you can pay on this contract is ${formatCurrency(summary.totalDue)}.`,
        variant: 'destructive',
      });
      return;
    }
    if (!phoneNumber || phoneNumber.replace(/\D/g, '').length < 10) {
      toast({ title: 'Error', description: 'Please enter a valid mobile money number', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('pending');

    try {
      const response = await api.post('/payments/hubtel/initiate', {
        contractId: contract.id,
        amount: paymentAmount,
        phoneNumber,
        network,
      });

      setTransactionRef(response.data.transactionRef);
      toast({
        title: 'Payment Initiated',
        description: 'Please check your phone and approve the payment prompt',
      });
      pollPaymentStatus(response.data.transactionRef, paymentAmount);
    } catch (error: unknown) {
      console.error('Payment error:', error);
      setPaymentStatus('failed');
      toast({
        title: 'Payment Failed',
        description: errorMessage(error) || 'Failed to initiate payment',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  const pollPaymentStatus = async (txnRef: string, paid: number) => {
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
            description: `Payment of ${formatCurrency(paid)} has been processed`,
          });
          setTimeout(() => {
            loadContract();
            setAmount('');
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
      } catch {
        // Expected while Hubtel has not registered the payment yet.
      }
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 2000);
      } else {
        setPaymentStatus('idle');
        setIsProcessing(false);
        toast({
          title: 'Payment Pending',
          description: 'Payment verification timed out. Please check your payment history later.',
        });
      }
    };

    poll();
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!contract || !summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-gray-600 mb-4">Contract not found</p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const canMakePayment = contract.status === 'ACTIVE' && summary.totalDue > 0;
  const paymentBlockedMessage =
    contract.status === 'PENDING_APPROVAL'
      ? 'This contract is awaiting approval. Payments will unlock once an approver activates it.'
      : contract.status === 'REVISION_REQUESTED'
        ? 'This contract is currently under revision and cannot receive payments until it is approved.'
        : summary.totalDue <= 0
          ? 'This contract is fully paid. Thank you!'
          : 'This contract is not available for payment.';
  const coverage = describeCoverage(contract, paymentAmount);
  const unpaid = unpaidInstallments(contract.installments);
  const scheduleRows = showAllRows ? unpaid : unpaid.slice(0, SCHEDULE_PREVIEW);
  const payDisabled = !canMakePayment || isProcessing || paymentAmount <= 0;

  const payButtonLabel = isProcessing ? (
    <><Clock className="h-4 w-4 mr-2 animate-spin" />Waiting for approval…</>
  ) : (
    <><Smartphone className="h-4 w-4 mr-2" />Pay {formatCurrency(paymentAmount)}</>
  );

  return (
    // Room at the bottom on phones for the pay bar.
    <div className="space-y-4 pb-28 lg:pb-0">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Back</span>
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Make Payment</h1>
          <p className="text-xs sm:text-sm text-gray-500 truncate">
            {contract.inventoryItem?.product?.name} · #{contract.contractNumber}
          </p>
        </div>
      </div>

      {/* Payment Status Alerts */}
      {paymentStatus === 'pending' && (
        <Alert className="border-blue-500 bg-blue-50">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 text-sm">
            Check your phone and enter your Mobile Money PIN to approve. Ref: <strong>{transactionRef}</strong>
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
      {!canMakePayment && (
        <Alert className="border-amber-500 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900 text-sm">{paymentBlockedMessage}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        <div className="lg:col-span-2 space-y-4">
          {/* What is owed */}
          <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 p-5 text-white shadow-sm">
            <p className="text-xs uppercase tracking-wide text-teal-100">
              {summary.dueNow > 0 ? 'Due now' : 'Next payment'}
            </p>
            <p className="mt-1 text-3xl font-bold">
              {formatCurrency(summary.dueNow > 0 ? summary.dueNow : summary.next ? roundMoney(summary.next.amount - summary.next.paidAmount) : 0)}
            </p>
            <p className="mt-1 text-sm text-teal-50">
              {summary.dueNow > 0
                ? `${summary.overdue.length} overdue installment${summary.overdue.length === 1 ? '' : 's'}${summary.penaltyOutstanding > 0 ? ` + ${formatCurrency(summary.penaltyOutstanding)} late charges` : ''}`
                : summary.next
                  ? `Due ${formatDate(summary.next.dueDate)}`
                  : 'Nothing due'}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/20 pt-3 text-sm">
              <div>
                <p className="text-teal-100 text-xs">Balance</p>
                <p className="font-semibold">{formatCurrency(summary.totalDue)}</p>
              </div>
              <div>
                <p className="text-teal-100 text-xs">Paid so far</p>
                <p className="font-semibold">{formatCurrency(contract.totalPaid)}</p>
              </div>
            </div>
          </div>

          {/* How much */}
          {canMakePayment && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label className="text-sm font-semibold">How much do you want to pay?</Label>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {options.map((option) => {
                      const selected = Math.abs(option.amount - paymentAmount) < 0.005;
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => setAmount(option.amount.toFixed(2))}
                          disabled={isProcessing}
                          className={cn(
                            'flex items-center justify-between sm:flex-col sm:items-start rounded-xl border px-3 py-2.5 text-left transition',
                            selected ? 'border-teal-600 bg-teal-50 ring-1 ring-teal-600' : 'border-gray-200 hover:border-teal-300',
                          )}
                        >
                          <span className="text-xs text-gray-600">{option.label}</span>
                          <span className="font-bold text-gray-900">{formatCurrency(option.amount)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <Label htmlFor="amount" className="text-xs text-gray-600">Or enter another amount (GHS)</Label>
                  <Input
                    id="amount"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    max={summary.totalDue}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={isProcessing}
                    className="mt-1 h-11 text-lg font-semibold"
                    placeholder="0.00"
                  />
                  {coverage && <p className="mt-1 text-xs text-teal-700">{coverage}</p>}
                  {paymentAmount > summary.totalDue + 0.005 && (
                    <p className="mt-1 text-xs text-red-600">More than you owe ({formatCurrency(summary.totalDue)}).</p>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="phoneNumber" className="text-xs text-gray-600">Mobile Money number</Label>
                    <Input id="phoneNumber" type="tel" inputMode="tel" value={phoneNumber} onChange={(e) => handlePhoneChange(e.target.value)} placeholder="0244123456" disabled={isProcessing} className="mt-1 h-11" />
                  </div>
                  <div>
                    <Label htmlFor="network" className="text-xs text-gray-600">Network</Label>
                    <Select value={network} onValueChange={setNetwork} disabled={isProcessing}>
                      <SelectTrigger id="network" className="mt-1 h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MTN">MTN Mobile Money</SelectItem>
                        <SelectItem value="VODAFONE">Telecel Cash</SelectItem>
                        <SelectItem value="AIRTELTIGO">AirtelTigo Money</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  <AlertCircle className="h-3 w-3 inline mr-1" />
                  You will get a prompt on this phone. Enter your PIN to approve. Payments clear overdue installments first.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Schedule, collapsed */}
          {unpaid.length > 0 && (
            <Card>
              <button
                type="button"
                onClick={() => setShowSchedule((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-sm font-semibold text-gray-800">
                  Unpaid installments <span className="text-gray-400 font-normal">({unpaid.length})</span>
                </span>
                {showSchedule ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
              </button>
              {showSchedule && (
                <div className="border-t divide-y divide-gray-100">
                  {scheduleRows.map((inst) => {
                    const overdue = isInstallmentOverdue(inst);
                    return (
                      <div key={inst.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold">#{inst.installmentNo}</span>
                            {overdue && <Badge className="bg-red-100 text-red-800 text-[10px]">OVERDUE</Badge>}
                            {inst.status === 'PARTIAL' && <Badge className="bg-orange-100 text-orange-800 text-[10px]">PART PAID</Badge>}
                          </div>
                          <p className="text-xs text-gray-500">{formatDate(inst.dueDate)}</p>
                        </div>
                        <p className={cn('text-sm font-semibold', overdue ? 'text-red-600' : 'text-gray-800')}>
                          {formatCurrency(roundMoney(inst.amount - inst.paidAmount))}
                        </p>
                      </div>
                    );
                  })}
                  {unpaid.length > SCHEDULE_PREVIEW && (
                    <button
                      type="button"
                      onClick={() => setShowAllRows((v) => !v)}
                      className="w-full px-4 py-2.5 text-sm font-medium text-teal-700 hover:bg-teal-50"
                    >
                      {showAllRows ? 'Show fewer' : `Show all ${unpaid.length}`}
                    </button>
                  )}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Desktop: pay card stays in view */}
        <div className="hidden lg:block">
          <Card className="lg:sticky lg:top-4">
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between text-sm"><span className="text-gray-500">You are paying</span><span className="font-bold text-lg">{formatCurrency(paymentAmount)}</span></div>
              {coverage && <p className="text-xs text-teal-700">{coverage}</p>}
              <div className="flex justify-between text-sm"><span className="text-gray-500">From</span><span className="font-medium">{phoneNumber || '—'}</span></div>
              <Button className="w-full h-11 bg-teal-600 hover:bg-teal-700" disabled={payDisabled} onClick={() => handlePayment()}>
                {payButtonLabel}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Phones: pay bar pinned above the bottom tabs */}
      {canMakePayment && (
        <div
          className="lg:hidden fixed inset-x-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
          style={{ bottom: 'calc(4rem + 2px + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-gray-500">You are paying</p>
              <p className="text-lg font-bold leading-tight">{formatCurrency(paymentAmount)}</p>
            </div>
            <Button className="h-11 px-5 bg-teal-600 hover:bg-teal-700" disabled={payDisabled} onClick={() => handlePayment()}>
              {payButtonLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
