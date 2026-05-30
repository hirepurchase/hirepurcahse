'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Edit, FileText, User, Package, Calendar, Banknote, CalendarRange, Pencil, AlertTriangle, Trash2, Smartphone, Shield, Lock, Unlock, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { adminHasAnyPermission, PERMISSIONS } from '@/lib/permissions';
import type { AdminUser } from '@/types';

interface KnoxEnrollmentDefaults {
  disclosureVersion: string;
  disclosureSummary: string;
  termsReference?: string | null;
  supportPhone?: string | null;
  supportMessage: string;
  warningMessage: string;
  paymentAppPackage?: string | null;
  paymentAppLabel: string;
  paymentUssd?: string | null;
  refreshActionLabel: string;
  allowCustomerAppOnLockScreen: boolean;
  allowSupportOnLockScreen: boolean;
  allowPaymentUssdOnLockScreen: boolean;
}

const emptyKnoxEnrollForm = {
  deviceUid: '',
  deviceUidType: 'SERIAL_NUMBER',
  approveId: '',
  disclosureAccepted: false,
  disclosureVersion: '',
  termsReference: '',
  supportPhone: '',
  supportMessage: '',
  warningMessage: '',
  paymentAppPackage: '',
  paymentAppLabel: '',
  paymentUssd: '',
  refreshActionLabel: 'Refresh account status',
};

function withKnoxEnrollDefaults(
  current: typeof emptyKnoxEnrollForm,
  defaults?: KnoxEnrollmentDefaults | null
) {
  if (!defaults) {
    return current;
  }

  return {
    ...current,
    disclosureVersion: current.disclosureVersion || defaults.disclosureVersion || '',
    termsReference: current.termsReference || defaults.termsReference || '',
    supportPhone: current.supportPhone || defaults.supportPhone || '',
    supportMessage: current.supportMessage || defaults.supportMessage || '',
    warningMessage: current.warningMessage || defaults.warningMessage || '',
    paymentAppPackage: current.paymentAppPackage || defaults.paymentAppPackage || '',
    paymentAppLabel: current.paymentAppLabel || defaults.paymentAppLabel || '',
    paymentUssd: current.paymentUssd || defaults.paymentUssd || '',
    refreshActionLabel: current.refreshActionLabel || defaults.refreshActionLabel || 'Refresh account status',
  };
}

function getKnoxStatusClasses(status?: string | null) {
  const normalized = (status || 'UNKNOWN').toUpperCase();

  if (['LOCKED', 'FAILED', 'OVERDUE'].includes(normalized)) {
    return 'bg-red-100 text-red-700 border-red-200';
  }

  if (['UNLOCKED', 'ACTIVE', 'APPROVED', 'SUCCEEDED', 'COMPLETED'].includes(normalized)) {
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  }

  if (['PENDING', 'PROCESSING', 'APPROVAL_QUEUED', 'UNKNOWN'].includes(normalized)) {
    return 'bg-amber-100 text-amber-700 border-amber-200';
  }

  return 'bg-slate-100 text-slate-700 border-slate-200';
}

export default function ContractDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const adminUser = user as AdminUser | null;
  const canViewDeviceControl = adminHasAnyPermission(adminUser, [PERMISSIONS.VIEW_DEVICE_CONTROL, PERMISSIONS.MANAGE_DEVICE_CONTROL]);
  const canManageDeviceControl = adminHasAnyPermission(adminUser, [PERMISSIONS.MANAGE_DEVICE_CONTROL]);
  const canWriteOff = adminHasAnyPermission(adminUser, [PERMISSIONS.WRITE_OFF_CONTRACT]);
  const [contract, setContract] = useState<any>(null);
  const [knoxContract, setKnoxContract] = useState<any>(null);
  const [knoxDefaults, setKnoxDefaults] = useState<KnoxEnrollmentDefaults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isKnoxLoading, setIsKnoxLoading] = useState(false);
  const [knoxBusyAction, setKnoxBusyAction] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [newStartDate, setNewStartDate] = useState('');
  const [showEditInstallmentDialog, setShowEditInstallmentDialog] = useState(false);
  const [editingInstallment, setEditingInstallment] = useState<any>(null);
  const [isEditingInstallment, setIsEditingInstallment] = useState(false);
  const [installmentEditData, setInstallmentEditData] = useState({
    amount: '',
    dueDate: '',
  });
  const [showEditPaymentDialog, setShowEditPaymentDialog] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [paymentEditData, setPaymentEditData] = useState({ amount: '', paymentMethod: '', reference: '', notes: '' });
  const [showFinancialAmendDialog, setShowFinancialAmendDialog] = useState(false);
  const [isAmending, setIsAmending] = useState(false);
  const [showWriteOffDialog, setShowWriteOffDialog] = useState(false);
  const [writeOffReason, setWriteOffReason] = useState('');
  const [isWritingOff, setIsWritingOff] = useState(false);
  const [amendSummary, setAmendSummary] = useState<any>(null);
  const [amendFormData, setAmendFormData] = useState({
    totalPrice: '',
    depositAmount: '',
    totalInstallments: '',
    paymentFrequency: '',
    penaltyPercentage: '',
    gracePeriodDays: '',
    reason: '',
  });
  const [editFormData, setEditFormData] = useState({
    gracePeriodDays: '',
    penaltyPercentage: '',
    paymentMethod: '',
    mobileMoneyNetwork: '',
    mobileMoneyNumber: '',
  });
  const [knoxEnrollForm, setKnoxEnrollForm] = useState(emptyKnoxEnrollForm);

  useEffect(() => {
    loadContract();
  }, [params.id]);

  useEffect(() => {
    if (!canViewDeviceControl || !params.id) return;
    void loadKnoxContractDevice();
  }, [params.id, canViewDeviceControl]);

  const loadContract = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/contracts/admin/${params.id}`);
      setContract(response.data);
      setEditFormData({
        gracePeriodDays: response.data.gracePeriodDays?.toString() || '0',
        penaltyPercentage: response.data.penaltyPercentage?.toString() || '0',
        paymentMethod: response.data.paymentMethod || 'NO_PREFERENCE',
        mobileMoneyNetwork: response.data.mobileMoneyNetwork || '',
        mobileMoneyNumber: response.data.mobileMoneyNumber || '',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to load contract details',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadKnoxContractDevice = async () => {
    if (!canViewDeviceControl) return;

    try {
      setIsKnoxLoading(true);
      const response = await api.get(`/knox-guard/contracts/${params.id}`);
      setKnoxContract(response.data.contract);
      setKnoxDefaults(response.data.defaults || null);
      setKnoxEnrollForm((current) => withKnoxEnrollDefaults(current, response.data.defaults || null));
    } catch (error: any) {
      console.error('Failed to load Knox Guard contract device:', error);
      toast({
        title: 'Knox Guard Error',
        description: error.response?.data?.error || 'Failed to load Knox Guard device details',
        variant: 'destructive',
      });
    } finally {
      setIsKnoxLoading(false);
    }
  };

  const refreshKnoxContractDevice = async () => {
    await loadKnoxContractDevice();
  };

  const handleKnoxEnroll = async () => {
    if (!knoxEnrollForm.disclosureAccepted) {
      toast({
        title: 'Disclosure required',
        description: 'Confirm that the customer accepted the Knox Guard enrollment disclosure before continuing.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const allowCustomerAppOnLockScreen = knoxDefaults?.allowCustomerAppOnLockScreen ?? true;
      const allowSupportOnLockScreen = knoxDefaults?.allowSupportOnLockScreen ?? true;
      const allowPaymentUssdOnLockScreen = (knoxDefaults?.allowPaymentUssdOnLockScreen ?? true)
        && Boolean(knoxEnrollForm.paymentUssd.trim());

      setKnoxBusyAction('enroll');
      await api.post(`/knox-guard/contracts/${params.id}/enroll`, {
        deviceUid: knoxEnrollForm.deviceUid.trim() || undefined,
        deviceUidType: knoxEnrollForm.deviceUidType,
        approveId: knoxEnrollForm.approveId.trim() || undefined,
        metadata: {
          customerExperience: {
            disclosureAccepted: knoxEnrollForm.disclosureAccepted,
            disclosureVersion: knoxEnrollForm.disclosureVersion.trim() || undefined,
            termsReference: knoxEnrollForm.termsReference.trim() || undefined,
            supportPhone: knoxEnrollForm.supportPhone.trim() || undefined,
            supportMessage: knoxEnrollForm.supportMessage.trim() || undefined,
            warningMessage: knoxEnrollForm.warningMessage.trim() || undefined,
            paymentAppPackage: knoxEnrollForm.paymentAppPackage.trim() || undefined,
            paymentAppLabel: knoxEnrollForm.paymentAppLabel.trim() || undefined,
            paymentUssd: knoxEnrollForm.paymentUssd.trim() || undefined,
            refreshActionLabel: knoxEnrollForm.refreshActionLabel.trim() || undefined,
            allowCustomerAppOnLockScreen,
            allowSupportOnLockScreen,
            allowPaymentUssdOnLockScreen,
          },
        },
      });

      toast({
        title: 'Enrollment queued',
        description: 'The contract device was enrolled and queued for Knox Guard approval.',
      });
      setKnoxEnrollForm(withKnoxEnrollDefaults({ ...emptyKnoxEnrollForm }, knoxDefaults));
      await refreshKnoxContractDevice();
    } catch (error: any) {
      toast({
        title: 'Knox Guard Error',
        description: error.response?.data?.error || 'Failed to enroll contract device',
        variant: 'destructive',
      });
    } finally {
      setKnoxBusyAction(null);
    }
  };

  const handleKnoxAction = async (action: 'evaluate' | 'lock' | 'unlock') => {
    try {
      setKnoxBusyAction(action);
      await api.post(`/knox-guard/contracts/${params.id}/${action}`, {});
      toast({
        title: action === 'evaluate' ? 'Device evaluated' : action === 'lock' ? 'Lock queued' : 'Unlock queued',
        description: `Knox Guard ${action} request completed successfully.`,
      });
      await refreshKnoxContractDevice();
    } catch (error: any) {
      toast({
        title: 'Knox Guard Error',
        description: error.response?.data?.error || `Failed to ${action} contract device`,
        variant: 'destructive',
      });
    } finally {
      setKnoxBusyAction(null);
    }
  };

  const handleAmendContract = async () => {
    try {
      const updateData: any = {
        gracePeriodDays: Number(editFormData.gracePeriodDays),
        penaltyPercentage: Number(editFormData.penaltyPercentage),
      };

      if (editFormData.paymentMethod && editFormData.paymentMethod !== 'NO_PREFERENCE') {
        updateData.paymentMethod = editFormData.paymentMethod;

        if (editFormData.paymentMethod === 'HUBTEL_MOMO' || editFormData.paymentMethod === 'HUBTEL_DIRECT_DEBIT') {
          if (!editFormData.mobileMoneyNetwork || !editFormData.mobileMoneyNumber) {
            toast({
              title: 'Error',
              description: 'Mobile money network and number are required for Hubtel payment method',
              variant: 'destructive',
            });
            return;
          }
          updateData.mobileMoneyNetwork = editFormData.mobileMoneyNetwork;
          updateData.mobileMoneyNumber = editFormData.mobileMoneyNumber;
        }
      } else if (editFormData.paymentMethod === 'NO_PREFERENCE') {
        // Explicitly send NO_PREFERENCE to clear the payment method
        updateData.paymentMethod = 'NO_PREFERENCE';
      }

      const response = await api.put(`/contracts/${params.id}`, updateData);

      // Check if preapproval was initiated or linked
      if (response.data.preapproval) {
        const preapproval = response.data.preapproval;

        if (preapproval.status === 'INITIATED') {
          toast({
            title: 'Contract Updated & Preapproval Initiated',
            description: preapproval.message + '. Customer must approve the direct debit mandate.',
            duration: 8000,
          });
        } else if (preapproval.status === 'ALREADY_APPROVED') {
          toast({
            title: 'Contract Updated',
            description: preapproval.message,
            duration: 5000,
          });
        } else if (preapproval.status === 'FAILED') {
          toast({
            title: 'Warning',
            description: preapproval.message,
            variant: 'destructive',
            duration: 8000,
          });
        }
      } else {
        toast({
          title: 'Success',
          description: 'Contract has been updated successfully',
        });
      }

      setIsEditing(false);
      loadContract();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to update contract',
        variant: 'destructive',
      });
    }
  };

  const handleRescheduleInstallments = async () => {
    if (!newStartDate) {
      toast({
        title: 'Error',
        description: 'Please select a new start date',
        variant: 'destructive',
      });
      return;
    }

    setIsRescheduling(true);

    try {
      await api.post(`/contracts/${params.id}/reschedule`, {
        newStartDate,
      });

      toast({
        title: 'Success',
        description: 'Installments have been rescheduled successfully',
      });

      setShowRescheduleDialog(false);
      setNewStartDate('');
      loadContract();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to reschedule installments',
        variant: 'destructive',
      });
    } finally {
      setIsRescheduling(false);
    }
  };

  const openFinancialAmendDialog = () => {
    setAmendFormData({
      totalPrice: contract.totalPrice?.toString() || '',
      depositAmount: contract.depositAmount?.toString() || '',
      totalInstallments: contract.totalInstallments?.toString() || '',
      paymentFrequency: contract.paymentFrequency || '',
      penaltyPercentage: contract.penaltyPercentage?.toString() || '',
      gracePeriodDays: contract.gracePeriodDays?.toString() || '',
      reason: '',
    });
    setAmendSummary(null);
    setShowFinancialAmendDialog(true);
  };

  const handleFinancialAmend = async () => {
    if (!amendFormData.reason.trim()) {
      toast({ title: 'Error', description: 'A reason is required for amendments', variant: 'destructive' });
      return;
    }

    if (!Number.isInteger(Number(amendFormData.totalInstallments)) || Number(amendFormData.totalInstallments) < 1) {
      toast({
        title: 'Error',
        description: 'Total installments must be a whole number greater than zero.',
        variant: 'destructive',
      });
      return;
    }

    setIsAmending(true);
    try {
      const payload: any = { reason: amendFormData.reason };
      if (amendFormData.totalPrice) payload.totalPrice = Number(amendFormData.totalPrice);
      if (amendFormData.depositAmount) payload.depositAmount = Number(amendFormData.depositAmount);
      if (amendFormData.totalInstallments) payload.totalInstallments = Number(amendFormData.totalInstallments);
      if (amendFormData.paymentFrequency) payload.paymentFrequency = amendFormData.paymentFrequency;
      if (amendFormData.penaltyPercentage !== '') payload.penaltyPercentage = Number(amendFormData.penaltyPercentage);
      if (amendFormData.gracePeriodDays !== '') payload.gracePeriodDays = Number(amendFormData.gracePeriodDays);

      const response = await api.post(`/contracts/${params.id}/amend`, payload);
      setAmendSummary(response.data.summary);
      toast({ title: 'Contract Amended', description: 'Financial terms corrected and unpaid installments recalculated.' });
      loadContract();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.error || 'Failed to amend contract', variant: 'destructive' });
    } finally {
      setIsAmending(false);
    }
  };

  const hasPaidInstallments = contract?.installments?.some(
    (i: any) => i.status === 'PAID' || i.paidAmount > 0
  );

  const openEditInstallmentDialog = (installment: any) => {
    setEditingInstallment(installment);
    setInstallmentEditData({
      amount: installment.amount.toString(),
      dueDate: new Date(installment.dueDate).toISOString().split('T')[0],
    });
    setShowEditInstallmentDialog(true);
  };

  const handleEditInstallment = async () => {
    if (!editingInstallment) return;

    if (!installmentEditData.amount && !installmentEditData.dueDate) {
      toast({
        title: 'Error',
        description: 'Please update at least one field',
        variant: 'destructive',
      });
      return;
    }

    setIsEditingInstallment(true);

    try {
      const updateData: any = {};
      if (installmentEditData.amount && installmentEditData.amount !== editingInstallment.amount.toString()) {
        updateData.amount = Number(installmentEditData.amount);
      }
      if (installmentEditData.dueDate && installmentEditData.dueDate !== new Date(editingInstallment.dueDate).toISOString().split('T')[0]) {
        updateData.dueDate = installmentEditData.dueDate;
      }

      if (Object.keys(updateData).length === 0) {
        toast({
          title: 'Info',
          description: 'No changes detected',
        });
        setShowEditInstallmentDialog(false);
        return;
      }

      await api.put(`/contracts/${params.id}/installments/${editingInstallment.id}`, updateData);

      toast({
        title: 'Success',
        description: 'Installment has been updated successfully. Remaining installments have been auto-recalculated.',
      });

      setShowEditInstallmentDialog(false);
      setEditingInstallment(null);
      loadContract();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to update installment',
        variant: 'destructive',
      });
    } finally {
      setIsEditingInstallment(false);
    }
  };

  const openEditPaymentDialog = (payment: any) => {
    setEditingPayment(payment);
    const meta = JSON.parse(payment.metadata || '{}');
    setPaymentEditData({
      amount: payment.amount.toString(),
      paymentMethod: payment.paymentMethod,
      reference: payment.externalRef || '',
      notes: meta.notes || '',
    });
    setShowEditPaymentDialog(true);
  };

  const handleUpdatePayment = async () => {
    if (!editingPayment) return;
    setIsSavingPayment(true);
    try {
      await api.put(`/payments/manual/${editingPayment.id}`, {
        amount: Number(paymentEditData.amount),
        paymentMethod: paymentEditData.paymentMethod,
        reference: paymentEditData.reference,
        notes: paymentEditData.notes,
      });
      toast({ title: 'Success', description: 'Payment updated successfully' });
      setShowEditPaymentDialog(false);
      setEditingPayment(null);
      const response = await api.get(`/contracts/admin/${params.id}`);
      setContract(response.data);
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.error || 'Failed to update payment', variant: 'destructive' });
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleDeletePayment = async (payment: any) => {
    if (!confirm(`Delete payment of ${formatCurrency(payment.amount)}? This will reverse the installment allocation.`)) return;
    try {
      await api.delete(`/payments/manual/${payment.id}`);
      toast({ title: 'Success', description: 'Payment deleted successfully' });
      const response = await api.get(`/contracts/admin/${params.id}`);
      setContract(response.data);
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.error || 'Failed to delete payment', variant: 'destructive' });
    }
  };

  const handleWriteOff = async () => {
    if (!writeOffReason.trim()) return;
    setIsWritingOff(true);
    try {
      await api.post(`/contracts/${params.id}/write-off`, { reason: writeOffReason.trim() });
      toast({ title: 'Contract written off', description: 'The contract has been written off and the device released.' });
      setShowWriteOffDialog(false);
      setWriteOffReason('');
      const response = await api.get(`/contracts/admin/${params.id}`);
      setContract(response.data);
    } catch (error: any) {
      toast({ title: 'Write-off failed', description: error.response?.data?.error || 'Failed to write off contract', variant: 'destructive' });
    } finally {
      setIsWritingOff(false);
    }
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
      <div className="p-8">
        <div className="text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg text-gray-600">Contract not found</p>
          <Button className="mt-4" onClick={() => router.push('/admin/contracts')}>
            Back to Contracts
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={() => router.push('/admin/contracts')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Back to Contracts</span>
          <span className="sm:hidden">Back</span>
        </Button>

        {!isEditing && contract.status === 'ACTIVE' && (
          <div className="flex gap-2 flex-wrap justify-end">
            <Button
              variant="outline" size="sm"
              onClick={() => setShowRescheduleDialog(true)}
              disabled={hasPaidInstallments}
              title={hasPaidInstallments ? 'Cannot reschedule after payments have been made' : ''}
            >
              <CalendarRange className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Reschedule</span>
            </Button>
            <Button
              variant="outline" size="sm"
              className="border-orange-400 text-orange-600 hover:bg-orange-50"
              onClick={openFinancialAmendDialog}
            >
              <AlertTriangle className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Correct Terms</span>
            </Button>
            <Button size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Amend</span>
            </Button>
            {canWriteOff && (
              <Button
                variant="outline" size="sm"
                className="border-red-400 text-red-600 hover:bg-red-50"
                onClick={() => setShowWriteOffDialog(true)}
              >
                <AlertTriangle className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Write Off</span>
              </Button>
            )}
          </div>
        )}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Contract {contract.contractNumber}</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Created on {formatDate(contract.createdAt)}
              </p>
            </div>
            <Badge className={getStatusColor(contract.status)} style={{ fontSize: '16px', padding: '8px 16px' }}>
              {contract.status}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contract.customer?.photoUrl && (
              <div className="flex justify-center mb-4">
                <img
                  src={contract.customer.photoUrl}
                  alt={`${contract.customer.firstName} ${contract.customer.lastName}`}
                  className="w-24 h-24 rounded-lg object-cover border-2 border-gray-200"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-medium">
                {contract.customer?.firstName} {contract.customer?.lastName}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Membership ID</p>
              <p className="font-mono">{contract.customer?.membershipId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p>{contract.customer?.phone}</p>
            </div>
            {contract.customer?.email && (
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p>{contract.customer.email}</p>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4"
              onClick={() => router.push(`/admin/customers/${contract.customer?.id}`)}
            >
              View Customer Details
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Product Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Product</p>
              <p className="font-medium">{contract.inventoryItem?.product?.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Category</p>
              <p>{contract.inventoryItem?.product?.category?.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Serial/IMEI Number</p>
              <p className="font-mono">{contract.inventoryItem?.serialNumber || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Base Price</p>
              <p className="font-semibold">{formatCurrency(contract.inventoryItem?.product?.basePrice || 0)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Contract Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Total Price</p>
              <p className="font-semibold text-lg">{formatCurrency(contract.totalPrice)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Deposit Amount</p>
              <p className="font-semibold">{formatCurrency(contract.depositAmount)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Finance Amount</p>
              <p className="font-semibold">{formatCurrency(contract.financeAmount)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Payment Frequency</p>
              <p>{contract.paymentFrequency}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Installment Amount</p>
              <p className="font-semibold">{formatCurrency(contract.installmentAmount)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Installments</p>
              <p>{contract.totalInstallments}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Start Date → End Date</p>
              <p>{formatDate(contract.startDate)} → {formatDate(contract.endDate)}</p>
            </div>
            {contract.paymentMethod && (
              <>
                <div className="border-t pt-3 mt-3">
                  <p className="text-sm text-gray-500">Payment Method</p>
                  <p className="font-medium">
                    {contract.paymentMethod === 'HUBTEL_MOMO' && 'Hubtel Mobile Money'}
                    {contract.paymentMethod === 'HUBTEL_DIRECT_DEBIT' && 'Hubtel Direct Debit'}
                    {contract.paymentMethod === 'CASH' && 'Cash'}
                    {contract.paymentMethod === 'BANK_TRANSFER' && 'Bank Transfer'}
                  </p>
                </div>
                {(contract.paymentMethod === 'HUBTEL_MOMO' || contract.paymentMethod === 'HUBTEL_DIRECT_DEBIT') && (
                  <>
                    {contract.mobileMoneyNetwork && (
                      <div>
                        <p className="text-sm text-gray-500">Mobile Money Network</p>
                        <p>{contract.mobileMoneyNetwork}</p>
                      </div>
                    )}
                    {contract.mobileMoneyNumber && (
                      <div>
                        <p className="text-sm text-gray-500">Mobile Money Number</p>
                        <p className="font-mono">{contract.mobileMoneyNumber}</p>
                      </div>
                    )}
                    {contract.paymentMethod === 'HUBTEL_DIRECT_DEBIT' && contract.hubtelPreapproval && (
                      <div>
                        <p className="text-sm text-gray-500">Direct Debit Status</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={
                            contract.hubtelPreapproval.status === 'APPROVED' ? 'bg-green-500' :
                            contract.hubtelPreapproval.status === 'PENDING' ? 'bg-yellow-500' :
                            contract.hubtelPreapproval.status === 'FAILED' ? 'bg-red-500' :
                            'bg-gray-500'
                          }>
                            {contract.hubtelPreapproval.status}
                          </Badge>
                          {contract.hubtelPreapproval.status === 'APPROVED' && contract.hubtelPreapproval.approvedAt && (
                            <span className="text-xs text-gray-500">
                              Approved on {formatDate(contract.hubtelPreapproval.approvedAt)}
                            </span>
                          )}
                        </div>
                        {contract.hubtelPreapproval.status === 'PENDING' && (
                          <p className="text-xs text-yellow-700 mt-1">
                            Customer needs to approve the direct debit mandate
                          </p>
                        )}
                      </div>
                    )}
                    {contract.paymentMethod === 'HUBTEL_DIRECT_DEBIT' && !contract.hubtelPreapproval && (
                      <div>
                        <p className="text-sm text-gray-500">Direct Debit Status</p>
                        <Badge className="bg-orange-500 mt-1">NOT INITIATED</Badge>
                        <p className="text-xs text-orange-700 mt-1">
                          Direct debit preapproval has not been set up yet
                        </p>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {canViewDeviceControl && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Knox Guard Device Control
                </CardTitle>
                <p className="mt-1 text-sm text-gray-500">
                  Manage the financed Samsung device linked to this contract directly from the contract record.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void refreshKnoxContractDevice()}
                  disabled={isKnoxLoading || knoxBusyAction !== null}
                >
                  {isKnoxLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Refresh
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/admin/device-control">
                    <Shield className="mr-2 h-4 w-4" />
                    Open Console
                  </Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {isKnoxLoading && !knoxContract ? (
              <div className="flex items-center justify-center py-10 text-gray-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading Knox Guard details...
              </div>
            ) : knoxContract?.managedDevice ? (
              <>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Actual state</p>
                    <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getKnoxStatusClasses(knoxContract.managedDevice.actualState)}`}>
                      {knoxContract.managedDevice.actualState}
                    </span>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Desired state</p>
                    <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getKnoxStatusClasses(knoxContract.managedDevice.desiredState)}`}>
                      {knoxContract.managedDevice.desiredState}
                    </span>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Enrollment</p>
                    <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getKnoxStatusClasses(knoxContract.managedDevice.enrollmentStatus)}`}>
                      {knoxContract.managedDevice.enrollmentStatus}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <p className="text-sm text-gray-500">Approve ID</p>
                    <p className="font-mono text-sm">{knoxContract.managedDevice.approveId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Device UID</p>
                    <p className="font-mono text-sm">{knoxContract.managedDevice.deviceUid}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Device UID Type</p>
                    <p className="text-sm">{knoxContract.managedDevice.deviceUidType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tenant Domain</p>
                    <p className="text-sm">{knoxContract.managedDevice.knoxTenantDomain || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Inventory lock status</p>
                    <p className="text-sm">{knoxContract.inventoryItem?.lockStatus || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Last evaluated</p>
                    <p className="text-sm">{knoxContract.managedDevice.lastEvaluatedAt ? formatDate(knoxContract.managedDevice.lastEvaluatedAt) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Last locked</p>
                    <p className="text-sm">{knoxContract.managedDevice.lastLockedAt ? formatDate(knoxContract.managedDevice.lastLockedAt) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Last unlocked</p>
                    <p className="text-sm">{knoxContract.managedDevice.lastUnlockedAt ? formatDate(knoxContract.managedDevice.lastUnlockedAt) : '—'}</p>
                  </div>
                </div>

                {knoxContract.managedDevice.customerExperience && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-sm font-semibold text-slate-900">Customer Experience Configuration</h3>
                    <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <div>
                        <p className="text-sm text-gray-500">Disclosure status</p>
                        <p className="text-sm">
                          {knoxContract.managedDevice.customerExperience.disclosureAccepted ? 'Confirmed' : 'Missing'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Disclosure version</p>
                        <p className="text-sm">{knoxContract.managedDevice.customerExperience.disclosureVersion}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Terms reference</p>
                        <p className="text-sm break-all">{knoxContract.managedDevice.customerExperience.termsReference || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Support phone</p>
                        <p className="text-sm">{knoxContract.managedDevice.customerExperience.supportPhone || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Payment app</p>
                        <p className="text-sm">
                          {knoxContract.managedDevice.customerExperience.paymentAppLabel}
                          {knoxContract.managedDevice.customerExperience.paymentAppPackage ? ` (${knoxContract.managedDevice.customerExperience.paymentAppPackage})` : ''}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Payment USSD</p>
                        <p className="text-sm">{knoxContract.managedDevice.customerExperience.paymentUssd || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Refresh action</p>
                        <p className="text-sm">{knoxContract.managedDevice.customerExperience.refreshActionLabel}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                      <div>
                        <p className="text-sm text-gray-500">Support message</p>
                        <p className="mt-1 text-sm text-slate-700">{knoxContract.managedDevice.customerExperience.supportMessage}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Warning message</p>
                        <p className="mt-1 text-sm text-slate-700">{knoxContract.managedDevice.customerExperience.warningMessage}</p>
                      </div>
                    </div>
                  </div>
                )}

                {knoxContract.managedDevice.lastError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <strong>Last error:</strong> {knoxContract.managedDevice.lastError}
                  </div>
                )}

                {canManageDeviceControl && (
                  <div className="flex flex-wrap gap-2 border-t pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleKnoxAction('evaluate')}
                      disabled={knoxBusyAction !== null}
                    >
                      {knoxBusyAction === 'evaluate' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                      Evaluate
                    </Button>
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => void handleKnoxAction('lock')}
                      disabled={knoxBusyAction !== null}
                    >
                      {knoxBusyAction === 'lock' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                      Queue Lock
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => void handleKnoxAction('unlock')}
                      disabled={knoxBusyAction !== null}
                    >
                      {knoxBusyAction === 'unlock' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unlock className="mr-2 h-4 w-4" />}
                      Queue Unlock
                    </Button>
                  </div>
                )}

                {knoxContract.managedDevice.commands?.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="mb-3 text-sm font-semibold text-gray-900">Recent Knox Guard Commands</h3>
                    <div className="space-y-2">
                      {knoxContract.managedDevice.commands.map((command: any) => (
                        <div key={command.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{command.type}</p>
                            <p className="text-xs text-slate-500">{formatDate(command.createdAt)}</p>
                          </div>
                          <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${getKnoxStatusClasses(command.status)}`}>
                            {command.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5">
                  <p className="font-medium text-slate-900">No Knox Guard device enrolled yet</p>
                  <p className="mt-1 text-sm text-slate-600">
                    This contract is not yet linked to a managed Samsung device. If the inventory serial number is correct,
                    you can enroll it below after capturing disclosure and the lock-screen payment/support setup.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <Label>Inventory serial / IMEI</Label>
                    <Input
                      value={knoxEnrollForm.deviceUid}
                      onChange={(e) => setKnoxEnrollForm((current) => ({ ...current, deviceUid: e.target.value }))}
                      placeholder={contract.inventoryItem?.serialNumber || 'Uses contract inventory serial by default'}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Leave empty to use the contract inventory serial automatically.
                    </p>
                  </div>
                  <div>
                    <Label>Device UID Type</Label>
                    <Select
                      value={knoxEnrollForm.deviceUidType}
                      onValueChange={(value) => setKnoxEnrollForm((current) => ({ ...current, deviceUidType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SERIAL_NUMBER">Serial Number</SelectItem>
                        <SelectItem value="IMEI">IMEI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Approve ID</Label>
                    <Input
                      value={knoxEnrollForm.approveId}
                      onChange={(e) => setKnoxEnrollForm((current) => ({ ...current, approveId: e.target.value }))}
                      placeholder={contract.contractNumber}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Leave empty to use the contract number as the approve ID.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="contract-knox-disclosure"
                      checked={knoxEnrollForm.disclosureAccepted}
                      onCheckedChange={(checked) =>
                        setKnoxEnrollForm((current) => ({ ...current, disclosureAccepted: checked === true }))
                      }
                      className="mt-0.5"
                    />
                    <div className="space-y-1">
                      <label htmlFor="contract-knox-disclosure" className="text-sm font-medium text-slate-900">
                        Customer disclosure confirmed
                      </label>
                      <p className="text-sm text-slate-600">
                        Confirm the customer was told that overdue payments can trigger restriction while payment and support options remain available.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <Label>Disclosure version</Label>
                    <Input
                      value={knoxEnrollForm.disclosureVersion}
                      onChange={(e) => setKnoxEnrollForm((current) => ({ ...current, disclosureVersion: e.target.value }))}
                      placeholder={knoxDefaults?.disclosureVersion || 'e.g. v1'}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Terms reference or URL</Label>
                    <Input
                      value={knoxEnrollForm.termsReference}
                      onChange={(e) => setKnoxEnrollForm((current) => ({ ...current, termsReference: e.target.value }))}
                      placeholder={knoxDefaults?.termsReference || 'Policy URL or signed terms reference'}
                    />
                  </div>
                  <div>
                    <Label>Support phone</Label>
                    <Input
                      value={knoxEnrollForm.supportPhone}
                      onChange={(e) => setKnoxEnrollForm((current) => ({ ...current, supportPhone: e.target.value }))}
                      placeholder={knoxDefaults?.supportPhone || 'Customer service line'}
                    />
                  </div>
                  <div>
                    <Label>Payment app package</Label>
                    <Input
                      value={knoxEnrollForm.paymentAppPackage}
                      onChange={(e) => setKnoxEnrollForm((current) => ({ ...current, paymentAppPackage: e.target.value }))}
                      placeholder={knoxDefaults?.paymentAppPackage || 'com.aidootech.customer'}
                    />
                  </div>
                  <div>
                    <Label>Payment app label</Label>
                    <Input
                      value={knoxEnrollForm.paymentAppLabel}
                      onChange={(e) => setKnoxEnrollForm((current) => ({ ...current, paymentAppLabel: e.target.value }))}
                      placeholder={knoxDefaults?.paymentAppLabel || 'AIDOO TECH'}
                    />
                  </div>
                  <div>
                    <Label>Payment USSD</Label>
                    <Input
                      value={knoxEnrollForm.paymentUssd}
                      onChange={(e) => setKnoxEnrollForm((current) => ({ ...current, paymentUssd: e.target.value }))}
                      placeholder={knoxDefaults?.paymentUssd || '*170#'}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Refresh action label</Label>
                    <Input
                      value={knoxEnrollForm.refreshActionLabel}
                      onChange={(e) => setKnoxEnrollForm((current) => ({ ...current, refreshActionLabel: e.target.value }))}
                      placeholder={knoxDefaults?.refreshActionLabel || 'Refresh account status'}
                    />
                  </div>
                  <div className="md:col-span-2 xl:col-span-3">
                    <Label>Support message on lock screen</Label>
                    <Textarea
                      value={knoxEnrollForm.supportMessage}
                      onChange={(e) => setKnoxEnrollForm((current) => ({ ...current, supportMessage: e.target.value }))}
                      placeholder={knoxDefaults?.supportMessage || 'Message shown to the customer while the device is restricted.'}
                      className="min-h-[90px]"
                    />
                  </div>
                  <div className="md:col-span-2 xl:col-span-3">
                    <Label>Warning message before restriction</Label>
                    <Textarea
                      value={knoxEnrollForm.warningMessage}
                      onChange={(e) => setKnoxEnrollForm((current) => ({ ...current, warningMessage: e.target.value }))}
                      placeholder={knoxDefaults?.warningMessage || 'Reminder shown before the device is locked.'}
                      className="min-h-[90px]"
                    />
                  </div>
                </div>

                {canManageDeviceControl && (
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void handleKnoxEnroll()} disabled={knoxBusyAction !== null}>
                      {knoxBusyAction === 'enroll' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />}
                      Enroll Device
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Payment Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700 font-medium">Deposit Paid</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">
                {formatCurrency(contract.depositAmount)}
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-700 font-medium">Total Paid</p>
              <p className="text-2xl font-bold text-green-700 mt-1">
                {formatCurrency(contract.totalPaid)}
              </p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-700 font-medium">Outstanding Balance</p>
              <p className="text-2xl font-bold text-red-700 mt-1">
                {formatCurrency(contract.outstandingBalance)}
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-700 font-medium">Progress</p>
              <p className="text-2xl font-bold text-purple-700 mt-1">
                {((contract.totalPaid / contract.totalPrice) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isEditing && (
        <Card className="">
          <CardHeader>
            <CardTitle>Amend Contract Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>Grace Period (Days)</Label>
                <Input
                  type="number"
                  value={editFormData.gracePeriodDays}
                  onChange={(e) => setEditFormData({ ...editFormData, gracePeriodDays: e.target.value })}
                  placeholder="e.g., 7"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Number of days grace period before penalties apply
                </p>
              </div>
              <div>
                <Label>Penalty Percentage (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editFormData.penaltyPercentage}
                  onChange={(e) => setEditFormData({ ...editFormData, penaltyPercentage: e.target.value })}
                  placeholder="e.g., 2.5"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Percentage penalty for late payments
                </p>
              </div>
            </div>

            <div className="">
              <h3 className="text-lg font-semibold mb-4">Payment Method</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label>Payment Method</Label>
                  <Select
                    value={editFormData.paymentMethod || undefined}
                    onValueChange={(value) => setEditFormData({ ...editFormData, paymentMethod: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NO_PREFERENCE">No preference</SelectItem>
                      <SelectItem value="HUBTEL_MOMO">Hubtel Mobile Money</SelectItem>
                      <SelectItem value="HUBTEL_DIRECT_DEBIT">Hubtel Direct Debit</SelectItem>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Preferred payment collection method
                  </p>
                </div>

                {(editFormData.paymentMethod === 'HUBTEL_MOMO' || editFormData.paymentMethod === 'HUBTEL_DIRECT_DEBIT') && (
                  <>
                    <div>
                      <Label>Mobile Money Network</Label>
                      <Select
                        value={editFormData.mobileMoneyNetwork}
                        onValueChange={(value) => setEditFormData({ ...editFormData, mobileMoneyNetwork: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select network" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MTN">MTN</SelectItem>
                          <SelectItem value="VODAFONE">Vodafone</SelectItem>
                          <SelectItem value="TELECEL">Telecel</SelectItem>
                          <SelectItem value="AIRTELTIGO">AirtelTigo</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        Customer mobile money provider
                      </p>
                    </div>

                    <div>
                      <Label>Mobile Money Number</Label>
                      <Input
                        type="text"
                        value={editFormData.mobileMoneyNumber}
                        onChange={(e) => setEditFormData({ ...editFormData, mobileMoneyNumber: e.target.value })}
                        placeholder="e.g., 0244123456"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Customer mobile money number
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <Button onClick={handleAmendContract}>
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {contract.installments && contract.installments.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Installment Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile card list */}
            <div className="sm:hidden divide-y divide-gray-100">
              {contract.installments.map((installment: any) => {
                const isPaid = installment.status === 'PAID' || installment.paidAmount > 0;
                return (
                  <div key={installment.id} className="px-4 py-3 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">#{installment.installmentNo}</span>
                        <Badge className={getStatusColor(installment.status)}>{installment.status}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">Due: {formatDate(installment.dueDate)}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs font-semibold text-gray-700">{formatCurrency(installment.amount)}</span>
                        {installment.paidAt && <span className="text-xs text-gray-400">Paid: {formatDate(installment.paidAt)}</span>}
                      </div>
                    </div>
                    {contract.status === 'ACTIVE' && (
                      <Button variant="ghost" size="sm" onClick={() => openEditInstallmentDialog(installment)} disabled={isPaid}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Installment #</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paid On</TableHead>
                    {contract.status === 'ACTIVE' && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contract.installments.map((installment: any) => {
                    const isPaid = installment.status === 'PAID' || installment.paidAmount > 0;
                    return (
                      <TableRow key={installment.id}>
                        <TableCell className="font-medium">#{installment.installmentNo}</TableCell>
                        <TableCell>{formatDate(installment.dueDate)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(installment.amount)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(installment.status)}>{installment.status}</Badge>
                        </TableCell>
                        <TableCell>{installment.paidAt ? formatDate(installment.paidAt) : '-'}</TableCell>
                        {contract.status === 'ACTIVE' && (
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => openEditInstallmentDialog(installment)} disabled={isPaid}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      {contract.payments && contract.payments.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Banknote className="h-4 w-4" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile */}
            <div className="sm:hidden divide-y divide-gray-100">
              {contract.payments.map((payment: any) => {
                const meta = JSON.parse(payment.metadata || '{}');
                const isManual = !!meta.isManual;
                return (
                  <div key={payment.id} className="px-4 py-3 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-green-700">{formatCurrency(payment.amount)}</span>
                        <Badge className={getStatusColor(payment.status)}>{payment.status}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{payment.paymentDate ? formatDate(payment.paymentDate) : formatDate(payment.createdAt)}</p>
                      <p className="text-xs font-mono text-gray-400 truncate">{payment.transactionRef}</p>
                      <p className="text-xs text-gray-500">{payment.paymentMethod?.replace(/_/g, ' ')}</p>
                    </div>
                    {isManual && (
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => openEditPaymentDialog(payment)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeletePayment(payment)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Desktop */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contract.payments.map((payment: any) => {
                    const meta = JSON.parse(payment.metadata || '{}');
                    const isManual = !!meta.isManual;
                    return (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.paymentDate ? formatDate(payment.paymentDate) : formatDate(payment.createdAt)}</TableCell>
                        <TableCell className="font-mono text-xs">{payment.transactionRef}</TableCell>
                        <TableCell>{payment.paymentMethod?.replace(/_/g, ' ')}</TableCell>
                        <TableCell className="font-semibold text-green-700">{formatCurrency(payment.amount)}</TableCell>
                        <TableCell><Badge className={getStatusColor(payment.status)}>{payment.status}</Badge></TableCell>
                        <TableCell>
                          {isManual ? (
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => openEditPaymentDialog(payment)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDeletePayment(payment)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          ) : <span className="text-xs text-gray-400">Auto</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Payment Dialog */}
      <Dialog open={showEditPaymentDialog} onOpenChange={(open) => { if (!isSavingPayment) setShowEditPaymentDialog(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Manual Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount (GHS)</Label>
              <Input type="number" step="0.01" value={paymentEditData.amount} onChange={(e) => setPaymentEditData({ ...paymentEditData, amount: e.target.value })} />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentEditData.paymentMethod} onValueChange={(v) => setPaymentEditData({ ...paymentEditData, paymentMethod: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reference</Label>
              <Input value={paymentEditData.reference} onChange={(e) => setPaymentEditData({ ...paymentEditData, reference: e.target.value })} placeholder="Optional reference number" />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={paymentEditData.notes} onChange={(e) => setPaymentEditData({ ...paymentEditData, notes: e.target.value })} placeholder="Optional notes" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleUpdatePayment} disabled={isSavingPayment}>
                {isSavingPayment ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={() => setShowEditPaymentDialog(false)} disabled={isSavingPayment}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {contract.signatureUrl && (
        <Card className="">
          <CardHeader>
            <CardTitle>Customer Signature</CardTitle>
          </CardHeader>
          <CardContent>
            <img
              src={contract.signatureUrl}
              alt="Customer signature"
              className="max-w-md border-2 border-gray-200 rounded-lg"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  parent.innerHTML = '<p class="text-gray-500">Signature image unavailable</p>';
                }
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Reschedule Dialog */}
      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Installments</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> This will reschedule all installments to new dates starting from the selected date.
                This action can only be performed if no payments have been made yet.
              </p>
            </div>

            <div>
              <Label htmlFor="newStartDate">New Start Date</Label>
              <Input
                id="newStartDate"
                type="date"
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-gray-500 mt-1">
                All installments will be recalculated from this date
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Current Schedule:</strong>
              </p>
              <ul className="text-sm text-blue-800 mt-2 space-y-1">
                <li>Start Date: {formatDate(contract.startDate)}</li>
                <li>End Date: {formatDate(contract.endDate)}</li>
                <li>Total Installments: {contract.totalInstallments}</li>
                <li>Payment Frequency: {contract.paymentFrequency}</li>
              </ul>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleRescheduleInstallments}
                disabled={isRescheduling || !newStartDate}
              >
                {isRescheduling ? 'Rescheduling...' : 'Confirm Reschedule'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRescheduleDialog(false);
                  setNewStartDate('');
                }}
                disabled={isRescheduling}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Correct Financial Terms Dialog */}
      <Dialog open={showFinancialAmendDialog} onOpenChange={(open) => { if (!isAmending) setShowFinancialAmendDialog(open); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Correct Financial Terms
            </DialogTitle>
          </DialogHeader>

          <div className="bg-orange-50 border border-orange-200 rounded-md p-3 text-sm text-orange-800">
            <strong>Important:</strong> This corrects a mistake in the original contract.
            Paid installments are preserved unchanged. Only unpaid installments will be recalculated
            based on the corrected figures. If the corrected installment count is shorter than the
            already-paid schedule, the payment history will be rebucketed onto the corrected plan.
            A full audit trail will be recorded.
          </div>

          {!amendSummary ? (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Total Price (GHS)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={amendFormData.totalPrice}
                    onChange={(e) => setAmendFormData({ ...amendFormData, totalPrice: e.target.value })}
                    placeholder={contract?.totalPrice?.toString()}
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave unchanged if correct</p>
                </div>
                <div>
                  <Label>Deposit Amount (GHS)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={amendFormData.depositAmount}
                    onChange={(e) => setAmendFormData({ ...amendFormData, depositAmount: e.target.value })}
                    placeholder={contract?.depositAmount?.toString()}
                  />
                </div>
                <div>
                  <Label>Total Installments (Count)</Label>
                  <Input
                    type="number"
                    value={amendFormData.totalInstallments}
                    onChange={(e) => setAmendFormData({ ...amendFormData, totalInstallments: e.target.value })}
                    placeholder={contract?.totalInstallments?.toString()}
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter the intended number of payments, such as 12. Already-paid installments are kept.</p>
                </div>
                <div>
                  <Label>Payment Frequency</Label>
                  <Select
                    value={amendFormData.paymentFrequency}
                    onValueChange={(v) => setAmendFormData({ ...amendFormData, paymentFrequency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAILY">Daily</SelectItem>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Grace Period (Days)</Label>
                  <Input
                    type="number"
                    value={amendFormData.gracePeriodDays}
                    onChange={(e) => setAmendFormData({ ...amendFormData, gracePeriodDays: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Penalty Percentage (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={amendFormData.penaltyPercentage}
                    onChange={(e) => setAmendFormData({ ...amendFormData, penaltyPercentage: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Reason for Amendment <span className="text-red-500">*</span></Label>
                <textarea
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
                  rows={3}
                  value={amendFormData.reason}
                  onChange={(e) => setAmendFormData({ ...amendFormData, reason: e.target.value })}
                  placeholder="Describe the mistake and why this correction is needed..."
                />
                <p className="text-xs text-gray-500 mt-1">This is recorded in the audit trail</p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleFinancialAmend}
                  disabled={isAmending || !amendFormData.reason.trim()}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {isAmending ? 'Applying Correction...' : 'Apply Correction'}
                </Button>
                <Button variant="outline" onClick={() => setShowFinancialAmendDialog(false)} disabled={isAmending}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <p className="text-green-800 font-medium mb-3">Amendment applied successfully</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white rounded p-3 border border-green-100">
                    <p className="text-gray-500 text-xs">{amendSummary.paidInstallmentLabel || 'Paid installments preserved'}</p>
                    <p className="text-lg font-bold text-gray-800">{amendSummary.paidInstallmentsPreserved}</p>
                  </div>
                  <div className="bg-white rounded p-3 border border-green-100">
                    <p className="text-gray-500 text-xs">{amendSummary.unpaidInstallmentLabel || 'Unpaid installments recalculated'}</p>
                    <p className="text-lg font-bold text-gray-800">{amendSummary.unpaidInstallmentsRecalculated}</p>
                  </div>
                  <div className="bg-white rounded p-3 border border-green-100">
                    <p className="text-gray-500 text-xs">New installment amount</p>
                    <p className="text-lg font-bold text-gray-800">GHS {Number(amendSummary.newInstallmentAmount).toFixed(2)}</p>
                  </div>
                  <div className="bg-white rounded p-3 border border-green-100">
                    <p className="text-gray-500 text-xs">New outstanding balance</p>
                    <p className="text-lg font-bold text-gray-800">GHS {Number(amendSummary.newOutstandingBalance).toFixed(2)}</p>
                  </div>
                </div>
              </div>
              <Button onClick={() => setShowFinancialAmendDialog(false)}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Installment Dialog */}
      <Dialog open={showEditInstallmentDialog} onOpenChange={setShowEditInstallmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Installment #{editingInstallment?.installmentNo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Auto-Recalculation:</strong> When you change the amount, all remaining unpaid installments will be automatically adjusted to maintain the total contract value.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                <strong>Current Values:</strong>
              </p>
              <ul className="text-sm text-gray-700 mt-2 space-y-1">
                <li>Amount: {formatCurrency(editingInstallment?.amount || 0)}</li>
                <li>Due Date: {editingInstallment?.dueDate ? formatDate(editingInstallment.dueDate) : '-'}</li>
              </ul>
            </div>

            <div>
              <Label htmlFor="installmentAmount">Installment Amount (GHS)</Label>
              <Input
                id="installmentAmount"
                type="number"
                step="0.01"
                value={installmentEditData.amount}
                onChange={(e) => setInstallmentEditData({ ...installmentEditData, amount: e.target.value })}
                placeholder="Enter new amount"
              />
              <p className="text-xs text-gray-500 mt-1">
                Changing this will auto-adjust remaining installments
              </p>
            </div>

            <div>
              <Label htmlFor="installmentDueDate">Due Date</Label>
              <Input
                id="installmentDueDate"
                type="date"
                value={installmentEditData.dueDate}
                onChange={(e) => setInstallmentEditData({ ...installmentEditData, dueDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-gray-500 mt-1">
                Update the due date for this installment
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleEditInstallment}
                disabled={isEditingInstallment}
              >
                {isEditingInstallment ? 'Updating...' : 'Update Installment'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditInstallmentDialog(false);
                  setEditingInstallment(null);
                }}
                disabled={isEditingInstallment}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Write-Off Dialog */}
      <Dialog open={showWriteOffDialog} onOpenChange={(open) => { if (!isWritingOff) setShowWriteOffDialog(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Write Off Contract
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 p-4 text-sm text-red-800 space-y-1">
              <p className="font-semibold">This action cannot be undone.</p>
              <ul className="list-disc pl-4 space-y-1 text-xs mt-2">
                <li>Contract status will be set to <strong>WRITTEN_OFF</strong></li>
                <li>All remaining unpaid installments will be written off</li>
                <li>The device will be released from Knox Guard management</li>
                <li>The inventory item will be returned to available stock</li>
                <li>Payment history is preserved for accounting purposes</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Outstanding balance: <span className="text-red-600 font-bold">{formatCurrency(contract.outstandingBalance)}</span></p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="writeOffReason" className="text-sm font-medium">
                Reason for write-off <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="writeOffReason"
                value={writeOffReason}
                onChange={(e) => setWriteOffReason(e.target.value)}
                placeholder="e.g. Customer untraceable, debt deemed unrecoverable after 6 months of non-payment..."
                rows={3}
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => { setShowWriteOffDialog(false); setWriteOffReason(''); }}
                disabled={isWritingOff}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleWriteOff}
                disabled={isWritingOff || !writeOffReason.trim()}
              >
                {isWritingOff ? 'Writing off…' : 'Confirm Write Off'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
