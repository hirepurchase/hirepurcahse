"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ClipboardCheck,
  CheckCircle,
  XCircle,
  User,
  Package,
  Calendar,
  Banknote,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Pencil,
  Search,
  UserCheck,
  Clock3,
  Eye,
  Phone,
  MapPin,
  ShieldAlert,
  CreditCard,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import api from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { usePendingContractApprovals } from "@/hooks/usePendingContractApprovals";
import { useAuth } from "@/hooks/useAuth";

interface PendingContract {
  id: string;
  contractNumber: string;
  totalPrice: number;
  depositAmount: number;
  financeAmount: number;
  installmentAmount: number;
  paymentFrequency: string;
  totalInstallments: number;
  gracePeriodDays: number;
  penaltyPercentage: number;
  startDate: string;
  endDate: string;
  signatureUrl?: string | null;
  mobileMoneyNumber?: string | null;
  mobileMoneyNetwork?: string | null;
  paymentMethod?: string | null;
  createdAt: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    membershipId: string;
    phone: string;
    email?: string | null;
    address?: string | null;
    nationalId?: string | null;
    dateOfBirth?: string | null;
    photoUrl?: string | null;
    guarantorName?: string | null;
    guarantorPhone?: string | null;
  };
  inventoryItem: {
    serialNumber: string;
    lockStatus?: string | null;
    product: { name: string; category?: { name: string } | null };
  } | null;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    role: { name: string };
  };
  approvalSnapshot: {
    blockers: string[];
    warnings: string[];
    riskFlags: string[];
    priority: "LOW" | "MEDIUM" | "HIGH";
    riskScore: number;
    suggestedSlaHours: number;
    relatedOpenContracts: number;
    defaultedContracts: number;
    sameProductContracts: number;
    ageHours: number;
    isBreached: boolean;
    currentAssignment: {
      assignedApproverId: string | null;
      assignedApproverName: string | null;
      assignedAt: string | null;
    } | null;
    resubmissionCount: number;
    lastSubmittedAt: string;
  } | null;
}

interface QueueSummary {
  total: number;
  highPriority: number;
  mediumPriority: number;
  breached: number;
  unassigned: number;
  mine: number;
}

function getPriorityBadge(priority?: "LOW" | "MEDIUM" | "HIGH" | null) {
  if (priority === "HIGH") return "bg-red-100 text-red-700 border-red-200";
  if (priority === "MEDIUM") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-emerald-100 text-emerald-700 border-emerald-200";
}

function formatAgeHours(ageHours?: number) {
  if (ageHours === undefined || ageHours === null) return "—";
  if (ageHours < 1) return "<1h";
  if (ageHours < 24) return `${Math.round(ageHours)}h`;
  return `${Math.round(ageHours / 24)}d`;
}

// Contract Preview Modal
function ContractPreviewModal({
  contract,
  onClose,
  onApprove,
  onRevision,
  approvingId,
}: {
  contract: PendingContract;
  onClose: () => void;
  onApprove: (contract: PendingContract) => void;
  onRevision: (contract: PendingContract) => void;
  approvingId: string | null;
}) {
  const freqLabel = (f: string) =>
    f === "DAILY" ? "Daily" : f === "WEEKLY" ? "Weekly" : "Monthly";

  const snapshot = contract.approvalSnapshot;
  const isApproving = approvingId === contract.id;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl sm:mx-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 px-5 pt-5 pb-4 border-b shrink-0">
          <FileText className="h-5 w-5 text-amber-500 shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-gray-900">Contract Preview</h2>
            <p className="text-xs text-gray-500 font-mono">{contract.contractNumber}</p>
          </div>
          <Badge
            variant="outline"
            className={`shrink-0 text-[10px] ${getPriorityBadge(snapshot?.priority)}`}
          >
            {snapshot?.priority || "LOW"} priority
          </Badge>
          {snapshot?.isBreached && (
            <Badge variant="outline" className="shrink-0 text-[10px] border-red-200 bg-red-50 text-red-700">
              SLA Breached
            </Badge>
          )}
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

          {/* Risk alerts */}
          {(snapshot?.blockers?.length || snapshot?.warnings?.length || snapshot?.riskFlags?.length) ? (
            <div className="space-y-2">
              {snapshot?.blockers?.map((b, i) => (
                <div key={i} className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700">
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{b}</span>
                </div>
              ))}
              {snapshot?.warnings?.map((w, i) => (
                <div key={i} className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-700">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{w}</span>
                </div>
              ))}
              {snapshot?.riskFlags?.map((f, i) => (
                <div key={i} className="flex items-start gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs text-slate-600">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          ) : null}

          {/* Customer */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> Customer
            </h3>
            <div className="rounded-xl border border-gray-200 p-4 flex gap-4">
              {contract.customer.photoUrl && (
                <img
                  src={contract.customer.photoUrl}
                  alt="Customer photo"
                  className="h-16 w-16 rounded-xl object-cover shrink-0 border border-gray-200"
                />
              )}
              <div className="flex-1 min-w-0 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <p className="text-gray-400">Full Name</p>
                  <p className="font-semibold text-gray-900">{contract.customer.firstName} {contract.customer.lastName}</p>
                </div>
                <div>
                  <p className="text-gray-400">Membership ID</p>
                  <p className="font-semibold text-gray-900">{contract.customer.membershipId}</p>
                </div>
                <div className="flex items-center gap-1 col-span-2 sm:col-span-1">
                  <Phone className="h-3 w-3 text-gray-400" />
                  <p className="font-medium text-gray-700">{contract.customer.phone}</p>
                </div>
                {contract.customer.email && (
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-gray-400">Email</p>
                    <p className="font-medium text-gray-700 truncate">{contract.customer.email}</p>
                  </div>
                )}
                {contract.customer.nationalId && (
                  <div>
                    <p className="text-gray-400">National ID</p>
                    <p className="font-medium text-gray-700">{contract.customer.nationalId}</p>
                  </div>
                )}
                {contract.customer.dateOfBirth && (
                  <div>
                    <p className="text-gray-400">Date of Birth</p>
                    <p className="font-medium text-gray-700">{formatDate(contract.customer.dateOfBirth)}</p>
                  </div>
                )}
                {contract.customer.address && (
                  <div className="col-span-2 flex items-start gap-1">
                    <MapPin className="h-3 w-3 text-gray-400 mt-0.5 shrink-0" />
                    <p className="text-gray-700">{contract.customer.address}</p>
                  </div>
                )}
              </div>
            </div>
            {(contract.customer.guarantorName || contract.customer.guarantorPhone) && (
              <div className="mt-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <p className="col-span-2 text-gray-400 font-medium mb-1">Guarantor</p>
                {contract.customer.guarantorName && (
                  <div>
                    <p className="text-gray-400">Name</p>
                    <p className="font-semibold text-gray-800">{contract.customer.guarantorName}</p>
                  </div>
                )}
                {contract.customer.guarantorPhone && (
                  <div>
                    <p className="text-gray-400">Phone</p>
                    <p className="font-semibold text-gray-800">{contract.customer.guarantorPhone}</p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Product / Device */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" /> Product / Device
            </h3>
            <div className="rounded-xl border border-gray-200 p-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <p className="text-gray-400">Product</p>
                <p className="font-semibold text-gray-900">{contract.inventoryItem?.product?.name ?? "—"}</p>
              </div>
              {contract.inventoryItem?.product?.category?.name && (
                <div>
                  <p className="text-gray-400">Category</p>
                  <p className="font-medium text-gray-700">{contract.inventoryItem.product.category.name}</p>
                </div>
              )}
              <div>
                <p className="text-gray-400">Serial / IMEI</p>
                <p className="font-mono font-medium text-gray-700">{contract.inventoryItem?.serialNumber ?? "—"}</p>
              </div>
              <div>
                <p className="text-gray-400">Lock Status</p>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  contract.inventoryItem?.lockStatus === "LOCKED"
                    ? "bg-red-100 text-red-700"
                    : "bg-green-100 text-green-700"
                }`}>
                  {contract.inventoryItem?.lockStatus ?? "—"}
                </span>
              </div>
            </div>
          </section>

          {/* Financial Terms */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Banknote className="h-3.5 w-3.5" /> Financial Terms
            </h3>
            <div className="rounded-xl border border-gray-200 p-4 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-xs">
              <div>
                <p className="text-gray-400">Total Price</p>
                <p className="font-bold text-gray-900 text-sm">{formatCurrency(contract.totalPrice)}</p>
              </div>
              <div>
                <p className="text-gray-400">Deposit</p>
                <p className="font-bold text-gray-900 text-sm">{formatCurrency(contract.depositAmount)}</p>
              </div>
              <div>
                <p className="text-gray-400">Finance Amount</p>
                <p className="font-semibold text-gray-700">{formatCurrency(contract.financeAmount)}</p>
              </div>
              <div>
                <p className="text-gray-400">Installment</p>
                <p className="font-semibold text-gray-700">{formatCurrency(contract.installmentAmount)} / {freqLabel(contract.paymentFrequency)}</p>
              </div>
              <div>
                <p className="text-gray-400">Total Installments</p>
                <p className="font-semibold text-gray-700">{contract.totalInstallments}×</p>
              </div>
              <div>
                <p className="text-gray-400">Grace Period</p>
                <p className="font-semibold text-gray-700">{contract.gracePeriodDays} days</p>
              </div>
              {contract.penaltyPercentage > 0 && (
                <div>
                  <p className="text-gray-400">Penalty</p>
                  <p className="font-semibold text-gray-700">{contract.penaltyPercentage}%</p>
                </div>
              )}
              <div>
                <p className="text-gray-400">Start Date</p>
                <p className="font-semibold text-gray-700">{formatDate(contract.startDate)}</p>
              </div>
              <div>
                <p className="text-gray-400">End Date</p>
                <p className="font-semibold text-gray-700">{formatDate(contract.endDate)}</p>
              </div>
            </div>
          </section>

          {/* Payment Method */}
          {(contract.paymentMethod || contract.mobileMoneyNumber) && (
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5" /> Payment Method
              </h3>
              <div className="rounded-xl border border-gray-200 p-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <p className="text-gray-400">Method</p>
                  <p className="font-semibold text-gray-900">{contract.paymentMethod ?? "—"}</p>
                </div>
                {contract.mobileMoneyNetwork && (
                  <div>
                    <p className="text-gray-400">Network</p>
                    <p className="font-semibold text-gray-900">{contract.mobileMoneyNetwork}</p>
                  </div>
                )}
                {contract.mobileMoneyNumber && (
                  <div>
                    <p className="text-gray-400">Mobile Money Number</p>
                    <p className="font-semibold text-gray-900">{contract.mobileMoneyNumber}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Submitted By + Risk Score */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5" /> Submission
            </h3>
            <div className="rounded-xl border border-gray-200 p-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <p className="text-gray-400">Submitted By</p>
                <p className="font-semibold text-gray-900">{contract.createdBy.firstName} {contract.createdBy.lastName}</p>
                <p className="text-gray-400">{contract.createdBy.role.name}</p>
              </div>
              <div>
                <p className="text-gray-400">Submitted</p>
                <p className="font-semibold text-gray-900">{formatDate(snapshot?.lastSubmittedAt || contract.createdAt)}</p>
                <p className="text-gray-400">Queue age: {formatAgeHours(snapshot?.ageHours)}</p>
              </div>
              {snapshot && (
                <>
                  <div>
                    <p className="text-gray-400">Risk Score</p>
                    <p className={`font-bold text-sm ${snapshot.riskScore >= 70 ? "text-red-600" : snapshot.riskScore >= 40 ? "text-amber-600" : "text-green-600"}`}>
                      {snapshot.riskScore}
                    </p>
                  </div>
                  {snapshot.resubmissionCount > 0 && (
                    <div>
                      <p className="text-gray-400">Resubmissions</p>
                      <p className="font-semibold text-gray-700">{snapshot.resubmissionCount}×</p>
                    </div>
                  )}
                  {snapshot.relatedOpenContracts > 0 && (
                    <div>
                      <p className="text-gray-400">Open Contracts</p>
                      <p className="font-semibold text-gray-700">{snapshot.relatedOpenContracts}</p>
                    </div>
                  )}
                  {snapshot.defaultedContracts > 0 && (
                    <div>
                      <p className="text-gray-400">Defaulted</p>
                      <p className="font-semibold text-red-600">{snapshot.defaultedContracts}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* Signature */}
          {contract.signatureUrl && (
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Customer Signature</h3>
              <div className="rounded-xl border border-gray-200 p-3 bg-gray-50">
                <img
                  src={contract.signatureUrl}
                  alt="Customer signature"
                  className="max-h-24 object-contain"
                />
              </div>
            </section>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex gap-2 px-5 pb-5 pt-4 border-t shrink-0">
          <button
            onClick={() => { onApprove(contract); onClose(); }}
            disabled={isApproving}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5"
          >
            <CheckCircle className="h-4 w-4" />
            {isApproving ? "Approving..." : "Approve"}
          </button>
          <button
            onClick={() => { onClose(); onRevision(contract); }}
            disabled={isApproving}
            className="flex-1 bg-red-100 hover:bg-red-200 disabled:opacity-50 text-red-700 text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5"
          >
            <XCircle className="h-4 w-4" />
            Request Revision
          </button>
          <button
            onClick={onClose}
            className="px-4 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold py-2.5 rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Revision Request Modal
function RejectModal({
  contract,
  onConfirm,
  onClose,
}: {
  contract: PendingContract;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    await onConfirm(reason.trim());
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 w-full sm:max-w-md sm:mx-4">
        <div className="flex items-center gap-2 mb-4">
          <XCircle className="h-5 w-5 text-red-500 shrink-0" />
          <h2 className="text-base font-semibold text-gray-900">Request Revision</h2>
        </div>
        <p className="text-sm text-gray-600 mb-1">
          Contract <span className="font-semibold">{contract.contractNumber}</span> for{" "}
          <span className="font-semibold">
            {contract.customer.firstName} {contract.customer.lastName}
          </span>{" "}
          will be returned to the agent for correction.
        </p>
        <p className="text-sm text-gray-500 mb-4">
          The contract and reserved inventory stay in place so the agent can fix the issue and resubmit it.
        </p>
        <div>
          <label className="text-xs font-medium text-gray-600">
            Revision note <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            placeholder="Explain what the agent needs to correct before resubmitting..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSubmit}
            disabled={loading || !reason.trim()}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl"
          >
            {loading ? "Sending..." : "Request Revision"}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold py-2.5 rounded-xl"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Edit Modal
function EditModal({
  contract,
  onSaved,
  onClose,
}: {
  contract: PendingContract;
  onSaved: () => void;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    totalPrice: String(contract.totalPrice),
    depositAmount: String(contract.depositAmount),
    paymentFrequency: contract.paymentFrequency,
    totalInstallments: String(contract.totalInstallments),
    gracePeriodDays: String(contract.gracePeriodDays),
    penaltyPercentage: String(contract.penaltyPercentage),
    startDate: contract.startDate ? contract.startDate.split("T")[0] : "",
  });

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const totalPrice = parseFloat(form.totalPrice) || 0;
  const depositAmount = parseFloat(form.depositAmount) || 0;
  const totalInstallments = parseInt(form.totalInstallments) || 1;
  const financeAmount =
    totalPrice > 0 && depositAmount >= 0 ? Math.max(0, totalPrice - depositAmount) : 0;
  const installmentAmount =
    financeAmount > 0 && totalInstallments > 0
      ? Math.ceil((financeAmount / totalInstallments) * 100) / 100
      : 0;

  const handleSave = async () => {
    if (depositAmount >= totalPrice) {
      toast({ title: "Validation Error", description: "Deposit must be less than total price", variant: "destructive" });
      return;
    }
    if (totalInstallments < 1) {
      toast({ title: "Validation Error", description: "Total installments must be at least 1", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await api.patch(`/contracts/${contract.id}/pending-edit`, {
        totalPrice: parseFloat(form.totalPrice),
        depositAmount: parseFloat(form.depositAmount),
        paymentFrequency: form.paymentFrequency,
        totalInstallments: parseInt(form.totalInstallments),
        gracePeriodDays: parseInt(form.gracePeriodDays),
        penaltyPercentage: parseFloat(form.penaltyPercentage),
        startDate: form.startDate || undefined,
      });
      toast({ title: "Saved", description: `Contract ${contract.contractNumber} updated.` });
      onSaved();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.error || "Failed to update contract",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500";
  const labelCls = "text-xs font-medium text-gray-600 block mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg sm:mx-4 max-h-[92vh] flex flex-col">
        <div className="flex items-center gap-2 px-5 pt-5 pb-4 border-b">
          <Pencil className="h-5 w-5 text-amber-500 shrink-0" />
          <h2 className="text-base font-semibold text-gray-900">Edit Contract</h2>
          <Badge variant="outline" className="ml-auto text-[10px] border-amber-300 text-amber-700 bg-amber-50">
            {contract.contractNumber}
          </Badge>
        </div>

        <div className="px-5 py-3 bg-gray-50 border-b text-xs text-gray-600 flex flex-wrap gap-3">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {contract.customer.firstName} {contract.customer.lastName}
          </span>
          <span className="flex items-center gap-1">
            <Package className="h-3 w-3" />
            {contract.inventoryItem?.product?.name ?? "—"}
          </span>
        </div>

        <div className="overflow-y-auto px-5 py-5 space-y-4 flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Total Price (GHS)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputCls}
                value={form.totalPrice}
                onChange={(e) => set("totalPrice", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Deposit Amount (GHS)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputCls}
                value={form.depositAmount}
                onChange={(e) => set("depositAmount", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Payment Frequency</label>
              <select
                className={inputCls}
                value={form.paymentFrequency}
                onChange={(e) => set("paymentFrequency", e.target.value)}
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Total Installments</label>
              <input
                type="number"
                min="1"
                className={inputCls}
                value={form.totalInstallments}
                onChange={(e) => set("totalInstallments", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Grace Period (days)</label>
              <input
                type="number"
                min="0"
                className={inputCls}
                value={form.gracePeriodDays}
                onChange={(e) => set("gracePeriodDays", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Penalty (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                className={inputCls}
                value={form.penaltyPercentage}
                onChange={(e) => set("penaltyPercentage", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Start Date</label>
            <input
              type="date"
              className={inputCls}
              value={form.startDate}
              onChange={(e) => set("startDate", e.target.value)}
            />
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-1.5">
            <p className="text-xs font-semibold text-amber-700 mb-2">Calculated Preview</p>
            <div className="grid grid-cols-3 gap-2 text-xs text-gray-700">
              <div>
                <p className="text-gray-400">Finance Amount</p>
                <p className="font-semibold">{formatCurrency(financeAmount)}</p>
              </div>
              <div>
                <p className="text-gray-400">Per Installment</p>
                <p className="font-semibold">{formatCurrency(installmentAmount)}</p>
              </div>
              <div>
                <p className="text-gray-400">Installments</p>
                <p className="font-semibold">{totalInstallments}x</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 px-5 pb-5 pt-4 border-t">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold py-2.5 rounded-xl"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ContractApprovalsPage() {
  const { toast } = useToast();
  const { refresh: refreshCount } = usePendingContractApprovals();
  const { user } = useAuth();
  const currentUserId = (user as { id?: string } | null)?.id || "";

  const [contracts, setContracts] = useState<PendingContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [queueSummary, setQueueSummary] = useState<QueueSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [assignedFilter, setAssignedFilter] = useState("");
  const [sortBy, setSortBy] = useState("age");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [rejectTarget, setRejectTarget] = useState<PendingContract | null>(null);
  const [editTarget, setEditTarget] = useState<PendingContract | null>(null);
  const [previewTarget, setPreviewTarget] = useState<PendingContract | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const itemsPerPage = 20;

  const loadContracts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/contracts/approvals", {
        params: {
          page: currentPage,
          limit: itemsPerPage,
          search: searchQuery || undefined,
          priority: priorityFilter || undefined,
          assignedTo: assignedFilter || undefined,
          sortBy,
          sortOrder,
        },
      });
      setContracts(res.data.contracts || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setTotalItems(res.data.pagination?.total || 0);
      setQueueSummary(res.data.queueSummary || null);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.error || "Failed to load pending approvals",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [assignedFilter, currentPage, priorityFilter, searchQuery, sortBy, sortOrder, toast]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  const handleApprove = async (contract: PendingContract) => {
    setApprovingId(contract.id);
    try {
      await api.post(`/contracts/${contract.id}/approve`);
      toast({ title: "Approved", description: `Contract ${contract.contractNumber} has been approved.` });
      loadContracts();
      refreshCount();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.error || "Failed to approve contract",
        variant: "destructive",
      });
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (reason: string) => {
    if (!rejectTarget) return;
    try {
      await api.post(`/contracts/${rejectTarget.id}/request-revision`, { reason });
      toast({
        title: "Revision Requested",
        description: `Contract ${rejectTarget.contractNumber} has been sent back to the agent.`,
      });
      setRejectTarget(null);
      loadContracts();
      refreshCount();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.error || "Failed to request revision",
        variant: "destructive",
      });
    }
  };

  const handleAssignToMe = async (contract: PendingContract) => {
    if (!currentUserId) return;
    setAssigningId(contract.id);
    try {
      await api.post(`/contracts/${contract.id}/assign-approver`, {
        assignedApproverId: currentUserId,
      });
      toast({
        title: "Assigned",
        description: `Contract ${contract.contractNumber} is now assigned to you.`,
      });
      loadContracts();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.error || "Failed to assign contract",
        variant: "destructive",
      });
    } finally {
      setAssigningId(null);
    }
  };

  const freqLabel = (f: string) =>
    f === "DAILY" ? "Daily" : f === "WEEKLY" ? "Weekly" : "Monthly";

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-amber-100 shrink-0">
          <ClipboardCheck className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">Contract Approvals</h1>
          <p className="text-xs sm:text-sm text-gray-500 truncate">
            Review, assign, and decision pending contracts
          </p>
        </div>
        {totalItems > 0 && (
          <span className="ml-auto flex h-7 min-w-7 items-center justify-center rounded-full bg-amber-500 px-2 text-xs font-bold text-white shrink-0">
            {totalItems}
          </span>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: "Waiting", value: queueSummary?.total ?? totalItems, color: "text-gray-900" },
          { label: "High Priority", value: queueSummary?.highPriority ?? 0, color: "text-red-600" },
          { label: "SLA Breached", value: queueSummary?.breached ?? 0, color: "text-amber-600" },
          { label: "Unassigned", value: queueSummary?.unassigned ?? 0, color: "text-slate-700" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-3 sm:p-4">
              <p className="text-xs text-gray-500 leading-tight">{stat.label}</p>
              <p className={`text-xl sm:text-2xl font-bold mt-0.5 ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="space-y-2 sm:space-y-0 sm:grid sm:gap-3 sm:grid-cols-[2fr,1fr,1fr,1fr,auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(e) => {
                  setCurrentPage(1);
                  setSearchQuery(e.target.value);
                }}
                placeholder="Search contract, customer, agent..."
                className="h-10 w-full rounded-lg border border-gray-300 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:contents">
              <select
                value={priorityFilter}
                onChange={(e) => { setCurrentPage(1); setPriorityFilter(e.target.value); }}
                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">All priorities</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              <select
                value={assignedFilter}
                onChange={(e) => { setCurrentPage(1); setAssignedFilter(e.target.value); }}
                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">All assignments</option>
                <option value="unassigned">Unassigned</option>
                <option value="me">Assigned to me</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:contents">
              <select
                value={`${sortBy}:${sortOrder}`}
                onChange={(e) => {
                  const [nextSortBy, nextSortOrder] = e.target.value.split(":");
                  setSortBy(nextSortBy);
                  setSortOrder((nextSortOrder as "asc" | "desc") || "desc");
                }}
                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="age:desc">Oldest first</option>
                <option value="priority:desc">Highest priority</option>
                <option value="amount:desc">Highest value</option>
                <option value="submittedAt:desc">Newest submitted</option>
                <option value="customer:asc">Customer A-Z</option>
              </select>

              <Button
                variant="outline"
                className="h-10 w-full sm:w-auto"
                onClick={() => {
                  setSearchQuery("");
                  setPriorityFilter("");
                  setAssignedFilter("");
                  setSortBy("age");
                  setSortOrder("desc");
                  setCurrentPage(1);
                }}
              >
                Clear
              </Button>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Pending contracts cannot receive payments until approved.
          </p>
        </CardContent>
      </Card>

      {/* Queue */}
      <Card>
        <CardHeader className="pb-3 px-4 sm:px-6">
          <CardTitle className="text-base">Approval Queue</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
            </div>
          ) : contracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <CheckCircle className="h-12 w-12 text-green-400 mb-3" />
              <p className="text-base font-semibold text-gray-700">All caught up!</p>
              <p className="text-sm text-gray-400 mt-1">No contracts match the current queue filters.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden xl:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contract</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Submitted By</TableHead>
                      <TableHead>Assignment</TableHead>
                      <TableHead>Queue Age</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.map((contract) => (
                      <TableRow key={contract.id}>
                        <TableCell>
                          <p className="font-mono text-xs font-semibold text-gray-900">{contract.contractNumber}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatCurrency(contract.totalPrice)} total · {formatCurrency(contract.depositAmount)} deposit
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant="outline" className={getPriorityBadge(contract.approvalSnapshot?.priority)}>
                              {contract.approvalSnapshot?.priority || "LOW"}
                            </Badge>
                            {contract.approvalSnapshot?.isBreached && (
                              <p className="text-[11px] font-medium text-red-600">SLA breached</p>
                            )}
                            {!!contract.approvalSnapshot?.riskFlags?.length && (
                              <p className="text-[11px] text-gray-500">
                                {contract.approvalSnapshot.riskFlags.slice(0, 2).join(", ")}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-sm text-gray-900">
                            {contract.customer.firstName} {contract.customer.lastName}
                          </p>
                          <p className="text-xs text-gray-400">{contract.customer.membershipId}</p>
                          <p className="text-xs text-gray-400">{contract.customer.phone}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-gray-900">{contract.inventoryItem?.product?.name ?? "—"}</p>
                          <p className="text-xs text-gray-400">{contract.inventoryItem?.serialNumber ?? "—"}</p>
                          <p className="text-xs text-gray-400">
                            {contract.totalInstallments}x {formatCurrency(contract.installmentAmount)} / {freqLabel(contract.paymentFrequency)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-gray-900">
                            {contract.createdBy.firstName} {contract.createdBy.lastName}
                          </p>
                          <p className="text-xs text-gray-400">{contract.createdBy.role.name}</p>
                        </TableCell>
                        <TableCell>
                          {contract.approvalSnapshot?.currentAssignment?.assignedApproverName ? (
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-gray-900">
                                {contract.approvalSnapshot.currentAssignment.assignedApproverName}
                              </p>
                              <p className="text-xs text-gray-400">
                                {contract.approvalSnapshot.currentAssignment.assignedAt
                                  ? formatDate(contract.approvalSnapshot.currentAssignment.assignedAt)
                                  : "Assigned"}
                              </p>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleAssignToMe(contract)}
                              disabled={assigningId === contract.id || !currentUserId}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              {assigningId === contract.id ? "Assigning..." : "Assign to Me"}
                            </button>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-gray-900">
                              {formatAgeHours(contract.approvalSnapshot?.ageHours)}
                            </p>
                            <p className="text-xs text-gray-400">
                              Submitted {formatDate(contract.approvalSnapshot?.lastSubmittedAt || contract.createdAt)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setPreviewTarget(contract)}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                            >
                              <Eye className="h-3 w-3" />
                              Preview
                            </button>
                            <button
                              onClick={() => setEditTarget(contract)}
                              disabled={approvingId === contract.id}
                              className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-60 transition-colors"
                            >
                              <Pencil className="h-3 w-3" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleApprove(contract)}
                              disabled={approvingId === contract.id}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              {approvingId === contract.id ? "Approving..." : "Approve"}
                            </button>
                            <button
                              onClick={() => setRejectTarget(contract)}
                              disabled={approvingId === contract.id}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-60 transition-colors"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Request Revision
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile / tablet cards */}
              <div className="xl:hidden divide-y divide-gray-100">
                {contracts.map((contract) => (
                  <div key={contract.id} className="p-4 space-y-3">
                    {/* Top row: contract number + badges + amount */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-bold text-gray-900 truncate">{contract.contractNumber}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          <Badge variant="outline" className={`text-[10px] ${getPriorityBadge(contract.approvalSnapshot?.priority)}`}>
                            {contract.approvalSnapshot?.priority || "LOW"}
                          </Badge>
                          {contract.approvalSnapshot?.isBreached && (
                            <Badge variant="outline" className="text-[10px] border-red-200 bg-red-50 text-red-700">
                              SLA Breached
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(contract.totalPrice)}</p>
                        <p className="text-xs text-gray-400">{formatCurrency(contract.depositAmount)} dep.</p>
                      </div>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div className="flex items-center gap-1.5 text-gray-700 min-w-0">
                        <User className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        <span className="truncate font-medium">{contract.customer.firstName} {contract.customer.lastName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-700 min-w-0">
                        <Package className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        <span className="truncate">{contract.inventoryItem?.product?.name ?? "—"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600 min-w-0">
                        <Banknote className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        <span className="truncate">{contract.totalInstallments}× {formatCurrency(contract.installmentAmount)} / {freqLabel(contract.paymentFrequency)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600 min-w-0">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        <span className="truncate">{formatDate(contract.createdAt)}</span>
                      </div>
                    </div>

                    {/* Meta strip */}
                    <div className="rounded-lg bg-gray-50 px-3 py-2.5 text-xs text-gray-600 grid grid-cols-2 gap-x-4 gap-y-1">
                      <div>
                        <span className="text-gray-400">Submitted by</span>
                        <p className="font-semibold text-gray-800 truncate">{contract.createdBy.firstName} {contract.createdBy.lastName}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Queue age</span>
                        <p className="font-semibold text-gray-800">{formatAgeHours(contract.approvalSnapshot?.ageHours)}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-400">Assignment </span>
                        <span className="font-semibold text-gray-800">
                          {contract.approvalSnapshot?.currentAssignment?.assignedApproverName || "Unassigned"}
                        </span>
                      </div>
                      {!!contract.approvalSnapshot?.warnings?.length && (
                        <p className="col-span-2 text-amber-700">
                          ⚠ {contract.approvalSnapshot.warnings[0]}
                        </p>
                      )}
                    </div>

                    {/* Action buttons — stacked layout on very small, row on sm+ */}
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2">
                      {!contract.approvalSnapshot?.currentAssignment?.assignedApproverName && (
                        <button
                          onClick={() => handleAssignToMe(contract)}
                          disabled={assigningId === contract.id || !currentUserId}
                          className="col-span-2 sm:col-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          {assigningId === contract.id ? "Assigning..." : "Assign to Me"}
                        </button>
                      )}
                      <button
                        onClick={() => setPreviewTarget(contract)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                      </button>
                      <button
                        onClick={() => setEditTarget(contract)}
                        disabled={approvingId === contract.id}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-60 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleApprove(contract)}
                        disabled={approvingId === contract.id}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        {approvingId === contract.id ? "Approving..." : "Approve"}
                      </button>
                      <button
                        onClick={() => setRejectTarget(contract)}
                        disabled={approvingId === contract.id}
                        className="col-span-2 sm:col-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-60 transition-colors"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Request Revision
      </button>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-4 border-t border-gray-100">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </button>
                  <p className="text-sm text-gray-500">
                    Page {currentPage} of {totalPages}
                  </p>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Info cards */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-gray-200 p-3 sm:p-4">
              <div className="flex items-center gap-2 text-gray-700">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                <p className="text-sm font-semibold">Queue policy</p>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Pending contracts stay non-payable until approved. Revision requests keep inventory reserved.
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 p-3 sm:p-4">
              <div className="flex items-center gap-2 text-gray-700">
                <UserCheck className="h-4 w-4 text-blue-500 shrink-0" />
                <p className="text-sm font-semibold">Assignment</p>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Assign high-touch contracts to yourself before editing so ownership and turnaround are easier to track.
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 p-3 sm:p-4">
              <div className="flex items-center gap-2 text-gray-700">
                <Clock3 className="h-4 w-4 text-red-500 shrink-0" />
                <p className="text-sm font-semibold">SLA risk</p>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                High-priority contracts target a 6-hour review window. Medium is 12 hours, low is 24 hours.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {previewTarget && (
        <ContractPreviewModal
          contract={previewTarget}
          onClose={() => setPreviewTarget(null)}
          onApprove={handleApprove}
          onRevision={(c) => { setPreviewTarget(null); setRejectTarget(c); }}
          approvingId={approvingId}
        />
      )}

      {rejectTarget && (
        <RejectModal
          contract={rejectTarget}
          onConfirm={handleReject}
          onClose={() => setRejectTarget(null)}
        />
      )}

      {editTarget && (
        <EditModal
          contract={editTarget}
          onSaved={() => {
            setEditTarget(null);
            loadContracts();
          }}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}
