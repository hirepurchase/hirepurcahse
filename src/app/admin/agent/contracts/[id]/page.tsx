"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Package,
  FileText,
  Banknote,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  CreditCard,
  RefreshCw,
  Pencil,
} from "lucide-react";
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
import { formatCurrency, formatDate, formatDateTime, getStatusColor } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";

function getPriorityBadge(priority?: "LOW" | "MEDIUM" | "HIGH") {
  if (priority === "HIGH") return "border-red-200 bg-red-50 text-red-700";
  if (priority === "MEDIUM") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function formatQueueAge(ageHours?: number) {
  if (ageHours === undefined || ageHours === null) return "—";
  if (ageHours < 1) return "<1h";
  if (ageHours < 24) return `${Math.round(ageHours)}h`;
  return `${Math.round(ageHours / 24)}d`;
}

function RevisionEditModal({
  contract,
  onSaved,
  onClose,
}: {
  contract: any;
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
  const financeAmount = Math.max(0, totalPrice - depositAmount);
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
      await api.patch(`/contracts/agent/mine/${contract.id}/revision-edit`, {
        totalPrice: parseFloat(form.totalPrice),
        depositAmount: parseFloat(form.depositAmount),
        paymentFrequency: form.paymentFrequency,
        totalInstallments: parseInt(form.totalInstallments),
        gracePeriodDays: parseInt(form.gracePeriodDays),
        penaltyPercentage: parseFloat(form.penaltyPercentage),
        startDate: form.startDate || undefined,
      });
      toast({ title: "Saved", description: "Revision changes saved. Resubmit when ready." });
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
    "h-11 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500";
  const labelCls = "mb-1 block text-xs font-medium text-gray-600";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:mx-4 sm:rounded-3xl">
        <div className="border-b px-4 pb-4 pt-5 sm:px-6 sm:pt-6">
          <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-gray-200 sm:hidden" />
          <div className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-orange-500" />
            <h2 className="text-base font-semibold text-gray-900">Edit Revision</h2>
            <Badge variant="outline" className="ml-auto text-[10px] border-orange-300 bg-orange-50 text-orange-700">
              {contract.contractNumber}
            </Badge>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 rounded-2xl bg-gray-50 p-3 text-xs text-gray-600 sm:grid-cols-2">
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              {contract.customer?.firstName} {contract.customer?.lastName}
            </span>
            <span className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" />
              {contract.inventoryItem?.product?.name ?? "—"}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Total Price (GHS)</label>
                <input type="number" min="0" step="0.01" className={inputCls} value={form.totalPrice} onChange={(e) => set("totalPrice", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Deposit Amount (GHS)</label>
                <input type="number" min="0" step="0.01" className={inputCls} value={form.depositAmount} onChange={(e) => set("depositAmount", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Payment Frequency</label>
                <select className={inputCls} value={form.paymentFrequency} onChange={(e) => set("paymentFrequency", e.target.value)}>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Total Installments</label>
                <input type="number" min="1" className={inputCls} value={form.totalInstallments} onChange={(e) => set("totalInstallments", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Grace Period (days)</label>
                <input type="number" min="0" className={inputCls} value={form.gracePeriodDays} onChange={(e) => set("gracePeriodDays", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Penalty (%)</label>
                <input type="number" min="0" max="100" step="0.1" className={inputCls} value={form.penaltyPercentage} onChange={(e) => set("penaltyPercentage", e.target.value)} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Start Date</label>
              <input type="date" className={inputCls} value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </div>

            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Calculated Preview</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">Finance Amount</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{formatCurrency(financeAmount)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">Per Installment</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{formatCurrency(installmentAmount)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">Installments</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{totalInstallments}x</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t bg-white px-4 py-4 sm:px-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="h-11 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="h-11 rounded-xl bg-orange-600 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AgentContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [contract, setContract] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [isEditingRevision, setIsEditingRevision] = useState(false);
  const [tab, setTab] = useState<"installments" | "payments">("installments");

  const loadContract = async () => {
    try {
      const res = await api.get(`/contracts/agent/mine/${id}`);
      setContract(res.data);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.error || "Failed to load contract",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadContract();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="px-4 py-8 text-center">
        <FileText className="mx-auto mb-3 h-10 w-10 text-gray-300" />
        <p className="text-gray-500">Contract not found.</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-sm text-cyan-600 hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  const paidInstallments = contract.installments?.filter((installment: any) => installment.status === "PAID").length ?? 0;
  const totalInstallments = contract.installments?.length ?? 0;
  const progressPct = contract.totalPrice > 0
    ? Math.min(100, Math.round((contract.totalPaid / contract.totalPrice) * 100))
    : 0;
  const successPayments = contract.payments?.filter((payment: any) => payment.status === "SUCCESS") ?? [];
  const approvalSnapshot = contract.approvalSnapshot;
  const approvalHistory = contract.approvalHistory ?? [];
  const isPendingApproval = contract.status === "PENDING_APPROVAL";
  const isRevisionRequested = contract.status === "REVISION_REQUESTED";
  const paymentGateMessage = isRevisionRequested
    ? "Payments stay disabled until you address the revision note and resubmit this contract."
    : "Customer payments stay disabled until an approver activates this contract.";

  const handleResubmit = async () => {
    setIsResubmitting(true);
    try {
      await api.post(`/contracts/agent/mine/${id}/resubmit`);
      await loadContract();
      toast({
        title: "Resubmitted",
        description: "The contract is back in the approval queue.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.error || "Failed to resubmit contract",
        variant: "destructive",
      });
    } finally {
      setIsResubmitting(false);
    }
  };

  const handleRevisionSaved = async () => {
    await loadContract();
    setIsEditingRevision(false);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-4 pb-24 sm:px-6 sm:py-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/admin/agent/contracts")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] text-gray-400">{contract.contractNumber}</p>
          <h1 className="truncate text-xl font-bold text-gray-900">
            {contract.customer?.firstName} {contract.customer?.lastName}
          </h1>
          <p className="text-xs text-gray-500">{contract.customer?.membershipId}</p>
        </div>
        <Badge className={`${getStatusColor(contract.status)} shrink-0`}>
          {contract.status.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-cyan-900 to-cyan-700 text-white shadow-sm">
        <div className="space-y-5 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-100">Portfolio Snapshot</p>
              <p className="mt-2 text-2xl font-bold">{contract.inventoryItem?.product?.name ?? "Contract"}</p>
              <p className="mt-1 text-sm text-cyan-50">{contract.inventoryItem?.serialNumber || "No serial attached"}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-cyan-100">Outstanding</p>
              <p className="mt-1 text-2xl font-bold">{formatCurrency(contract.outstandingBalance)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-[11px] uppercase tracking-wide text-cyan-100">Total Price</p>
              <p className="mt-1 text-sm font-semibold">{formatCurrency(contract.totalPrice)}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-[11px] uppercase tracking-wide text-cyan-100">Deposit</p>
              <p className="mt-1 text-sm font-semibold">{formatCurrency(contract.depositAmount)}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-[11px] uppercase tracking-wide text-cyan-100">Installments</p>
              <p className="mt-1 text-sm font-semibold">{paidInstallments} / {totalInstallments}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-[11px] uppercase tracking-wide text-cyan-100">Payments</p>
              <p className="mt-1 text-sm font-semibold">{successPayments.length} successful</p>
            </div>
          </div>
        </div>
      </div>

      {(isPendingApproval || isRevisionRequested) && (
        <Card className={isRevisionRequested ? "border-orange-200 bg-orange-50" : "border-amber-200 bg-amber-50"}>
          <CardContent className="space-y-4 p-4">
            <div className="flex items-start gap-3">
              <div className={`rounded-2xl p-2.5 ${isRevisionRequested ? "bg-orange-100 text-orange-700" : "bg-amber-100 text-amber-700"}`}>
                <AlertCircle className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  {isRevisionRequested ? "Revision requested" : "Awaiting approval"}
                </p>
                <p className="mt-1 text-sm text-gray-700">{paymentGateMessage}</p>
              </div>
            </div>

            {contract.rejectionReason && (
              <div className="rounded-2xl border border-white/70 bg-white/80 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Latest approver note</p>
                <p className="mt-1 text-sm text-gray-700">{contract.rejectionReason}</p>
              </div>
            )}

            {isRevisionRequested && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  onClick={() => setIsEditingRevision(true)}
                  disabled={isResubmitting}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-white px-4 text-sm font-semibold text-orange-700 hover:bg-orange-100 disabled:opacity-60"
                >
                  <Pencil className="h-4 w-4" />
                  Edit Terms
                </button>
                <button
                  onClick={handleResubmit}
                  disabled={isResubmitting}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${isResubmitting ? "animate-spin" : ""}`} />
                  {isResubmitting ? "Resubmitting..." : "Resubmit for Approval"}
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-gray-400" /> Approval Flow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Priority</p>
              <Badge variant="outline" className={`mt-2 ${getPriorityBadge(approvalSnapshot?.priority)}`}>
                {approvalSnapshot?.priority || "LOW"}
              </Badge>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Queue Age</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{formatQueueAge(approvalSnapshot?.ageHours)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Assigned To</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {approvalSnapshot?.currentAssignment?.assignedApproverName || "Unassigned"}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Resubmissions</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{approvalSnapshot?.resubmissionCount ?? 0}</p>
            </div>
          </div>

          {!!approvalSnapshot?.riskFlags?.length && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Risk Flags</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {approvalSnapshot.riskFlags.map((flag: string) => (
                  <Badge key={flag} variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                    {flag.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {!!approvalSnapshot?.warnings?.length && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Review Notes</p>
              <div className="mt-2 space-y-1">
                {approvalSnapshot.warnings.map((warning: string) => (
                  <p key={warning} className="text-sm text-amber-800">{warning}</p>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Timeline</p>
            <div className="mt-3 space-y-3">
              {approvalHistory.length === 0 ? (
                <p className="text-sm text-gray-400">No approval activity has been recorded yet.</p>
              ) : (
                approvalHistory.map((item: any) => {
                  const changeKeys = item.newValues
                    ? Object.keys(item.newValues).filter((key) => !["editedBy", "resubmittedBy", "requestedBy", "priority", "riskFlags"].includes(key))
                    : [];

                  return (
                    <div key={item.id} className="rounded-2xl border border-gray-200 p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {item.actorName} · {formatDateTime(item.createdAt)}
                          </p>
                        </div>
                        <Badge variant="outline" className="w-fit text-[10px] border-gray-200 text-gray-600">
                          {item.action.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      {item.note && (
                        <p className="mt-2 text-sm text-gray-700">{item.note}</p>
                      )}
                      {changeKeys.length > 0 && (
                        <p className="mt-2 text-xs text-gray-500">
                          Updated: {changeKeys.map((key) => key.replace(/([A-Z])/g, " $1")).join(", ")}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-cyan-100 bg-cyan-50">
        <CardContent className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Repayment Progress</span>
            <span className="text-xs font-bold text-cyan-700">{progressPct}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-cyan-100">
            <div
              className="h-full rounded-full bg-cyan-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-2xl bg-white/80 p-3">
              <p className="uppercase tracking-wide text-gray-400">Paid</p>
              <p className="mt-1 text-sm font-semibold text-green-600">{formatCurrency(contract.totalPaid)}</p>
            </div>
            <div className="rounded-2xl bg-white/80 p-3">
              <p className="uppercase tracking-wide text-gray-400">Balance</p>
              <p className="mt-1 text-sm font-semibold text-red-500">{formatCurrency(contract.outstandingBalance)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wide text-gray-400">Installment Amount</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{formatCurrency(contract.installmentAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wide text-gray-400">Frequency</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{contract.paymentFrequency}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wide text-gray-400">Start Date</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{formatDate(contract.startDate)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wide text-gray-400">End Date</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{formatDate(contract.endDate)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-gray-400" /> Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-base font-semibold text-gray-900">
              {contract.customer?.firstName} {contract.customer?.lastName}
            </p>
            <p className="font-mono text-xs text-gray-500">{contract.customer?.membershipId}</p>
            <p className="text-gray-600">{contract.customer?.phone}</p>
            {contract.customer?.address && <p className="text-xs text-gray-400">{contract.customer.address}</p>}
            {contract.customer?.nationalId && <p className="text-xs text-gray-400">ID: {contract.customer.nationalId}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-gray-400" /> Product
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-base font-semibold text-gray-900">{contract.inventoryItem?.product?.name ?? "—"}</p>
            <p className="text-xs text-gray-500">{contract.inventoryItem?.product?.category?.name}</p>
            <p className="font-mono text-xs text-gray-500">{contract.inventoryItem?.serialNumber}</p>
            <div className="flex flex-wrap gap-2">
              <Badge className={getStatusColor(contract.inventoryItem?.status ?? "")}>
                {contract.inventoryItem?.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-gray-400" /> Contract Terms
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Start Date", value: formatDate(contract.startDate) },
              { label: "End Date", value: formatDate(contract.endDate) },
              { label: "Grace Period", value: `${contract.gracePeriodDays} day${contract.gracePeriodDays !== 1 ? "s" : ""}` },
              { label: "Penalty", value: `${contract.penaltyPercentage}%` },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl bg-gray-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
                <p className="mt-1 text-sm font-semibold text-gray-800">{value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-1">
          <button
            onClick={() => setTab("installments")}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === "installments"
                ? "bg-white text-cyan-700 shadow-sm"
                : "text-gray-500"
            }`}
          >
            Installments ({totalInstallments})
          </button>
          <button
            onClick={() => setTab("payments")}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === "payments"
                ? "bg-white text-cyan-700 shadow-sm"
                : "text-gray-500"
            }`}
          >
            Payments ({contract.payments?.length ?? 0})
          </button>
        </div>

        {tab === "installments" && (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100 md:hidden">
                {contract.installments?.map((installment: any) => (
                  <div key={installment.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Installment {installment.installmentNo}
                        </p>
                        <p className="mt-1 text-base font-semibold text-gray-900">{formatCurrency(installment.amount)}</p>
                        <p className="mt-1 text-xs text-gray-500">Due {formatDate(installment.dueDate)}</p>
                        {installment.paidAmount > 0 && (
                          <p className="mt-1 text-xs text-green-600">Paid {formatCurrency(installment.paidAmount)}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <Badge className={`${getStatusColor(installment.status)} text-[10px]`}>
                          {installment.status}
                        </Badge>
                        {installment.paidAt && (
                          <p className="mt-1 text-xs text-gray-400">{formatDate(installment.paidAt)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Paid On</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contract.installments?.map((installment: any) => (
                      <TableRow key={installment.id}>
                        <TableCell className="font-mono text-xs text-gray-500">{installment.installmentNo}</TableCell>
                        <TableCell className="text-sm">{formatDate(installment.dueDate)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(installment.amount)}</TableCell>
                        <TableCell className="text-green-600">{formatCurrency(installment.paidAmount)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(installment.status)}>{installment.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-gray-400">
                          {installment.paidAt ? formatDate(installment.paidAt) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {tab === "payments" && (
          <Card>
            <CardContent className="p-0">
              {!contract.payments?.length ? (
                <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                  <CreditCard className="mb-2 h-8 w-8 text-gray-300" />
                  <p className="text-sm text-gray-400">No payments yet</p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-100 md:hidden">
                    {contract.payments.map((payment: any) => (
                      <div key={payment.id} className="px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-mono text-[11px] text-gray-500">{payment.transactionRef}</p>
                            <p className="mt-1 text-base font-bold text-gray-900">{formatCurrency(payment.amount)}</p>
                            <p className="mt-1 text-xs text-gray-400">{payment.paymentMethod?.replace(/_/g, " ") ?? "—"}</p>
                            {payment.mobileMoneyProvider && (
                              <p className="mt-1 text-xs text-gray-400">
                                {payment.mobileMoneyProvider} · {payment.mobileMoneyNumber}
                              </p>
                            )}
                            <p className="mt-1 text-xs text-gray-400">{formatDateTime(payment.paymentDate || payment.createdAt)}</p>
                          </div>
                          <Badge className={`${getStatusColor(payment.status)} shrink-0 text-[10px]`}>
                            {payment.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Reference</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contract.payments.map((payment: any) => (
                          <TableRow key={payment.id}>
                            <TableCell className="font-mono text-xs">{payment.transactionRef}</TableCell>
                            <TableCell className="font-semibold">{formatCurrency(payment.amount)}</TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm">{payment.paymentMethod?.replace(/_/g, " ") ?? "—"}</p>
                                {payment.mobileMoneyProvider && (
                                  <p className="text-xs text-gray-400">{payment.mobileMoneyProvider} · {payment.mobileMoneyNumber}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(payment.status)}>{payment.status}</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-gray-500">
                              {formatDateTime(payment.paymentDate || payment.createdAt)}
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
        )}
      </div>

      {isEditingRevision && (
        <RevisionEditModal
          contract={contract}
          onSaved={handleRevisionSaved}
          onClose={() => setIsEditingRevision(false)}
        />
      )}
    </div>
  );
}
