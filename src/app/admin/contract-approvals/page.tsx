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
  createdAt: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    membershipId: string;
    phone: string;
  };
  inventoryItem: {
    serialNumber: string;
    product: { name: string };
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center gap-2 mb-4">
          <XCircle className="h-5 w-5 text-red-500" />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center gap-2 px-6 pt-6 pb-4 border-b">
          <Pencil className="h-5 w-5 text-amber-500" />
          <h2 className="text-base font-semibold text-gray-900">Edit Contract</h2>
          <Badge variant="outline" className="ml-auto text-[10px] border-amber-300 text-amber-700 bg-amber-50">
            {contract.contractNumber}
          </Badge>
        </div>

        <div className="px-6 py-3 bg-gray-50 border-b text-xs text-gray-600 flex gap-4">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {contract.customer.firstName} {contract.customer.lastName}
          </span>
          <span className="flex items-center gap-1">
            <Package className="h-3 w-3" />
            {contract.inventoryItem?.product?.name ?? "—"}
          </span>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-4 flex-1">
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

        <div className="flex gap-2 px-6 pb-6 pt-4 border-t">
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
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
          <ClipboardCheck className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Contract Approvals</h1>
          <p className="text-sm text-gray-500">
            Review, assign, and decision pending contracts from agents
          </p>
        </div>
        {totalItems > 0 && (
          <span className="ml-auto flex h-7 min-w-7 items-center justify-center rounded-full bg-amber-500 px-2 text-xs font-bold text-white">
            {totalItems}
          </span>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Waiting</p>
            <p className="text-2xl font-bold text-gray-900">{queueSummary?.total ?? totalItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">High Priority</p>
            <p className="text-2xl font-bold text-red-600">{queueSummary?.highPriority ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">SLA Breached</p>
            <p className="text-2xl font-bold text-amber-600">{queueSummary?.breached ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Unassigned</p>
            <p className="text-2xl font-bold text-slate-700">{queueSummary?.unassigned ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-[2fr,1fr,1fr,1fr,auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(e) => {
                  setCurrentPage(1);
                  setSearchQuery(e.target.value);
                }}
                placeholder="Search contract, customer, product, agent..."
                className="h-10 w-full rounded-lg border border-gray-300 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => {
                setCurrentPage(1);
                setPriorityFilter(e.target.value);
              }}
              className="h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">All priorities</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={assignedFilter}
              onChange={(e) => {
                setCurrentPage(1);
                setAssignedFilter(e.target.value);
              }}
              className="h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">All assignments</option>
              <option value="unassigned">Unassigned</option>
              <option value="me">Assigned to me</option>
            </select>

            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [nextSortBy, nextSortOrder] = e.target.value.split(":");
                setSortBy(nextSortBy);
                setSortOrder((nextSortOrder as "asc" | "desc") || "desc");
              }}
              className="h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="age:desc">Oldest first</option>
              <option value="priority:desc">Highest priority</option>
              <option value="amount:desc">Highest value</option>
              <option value="submittedAt:desc">Newest submitted</option>
              <option value="customer:asc">Customer A-Z</option>
            </select>

            <Button
              variant="outline"
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
          <p className="mt-3 text-xs text-gray-500">
            Pending contracts cannot receive payments until they are approved.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Approval Queue</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
            </div>
          ) : contracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle className="h-12 w-12 text-green-400 mb-3" />
              <p className="text-base font-semibold text-gray-700">All caught up!</p>
              <p className="text-sm text-gray-400 mt-1">No contracts match the current queue filters.</p>
            </div>
          ) : (
            <>
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

              <div className="xl:hidden space-y-3 p-4">
                {contracts.map((contract) => (
                  <div key={contract.id} className="rounded-xl border border-amber-200 bg-white p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs font-bold text-gray-900">{contract.contractNumber}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <Badge variant="outline" className={getPriorityBadge(contract.approvalSnapshot?.priority)}>
                            {contract.approvalSnapshot?.priority || "LOW"}
                          </Badge>
                          {contract.approvalSnapshot?.isBreached && (
                            <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                              SLA Breached
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-base font-bold text-gray-900">{formatCurrency(contract.totalPrice)}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <User className="h-3.5 w-3.5 shrink-0" />
                        <span>{contract.customer.firstName} {contract.customer.lastName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Package className="h-3.5 w-3.5 shrink-0" />
                        <span>{contract.inventoryItem?.product?.name ?? "—"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Banknote className="h-3.5 w-3.5 shrink-0" />
                        <span>{contract.totalInstallments}x {formatCurrency(contract.installmentAmount)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>{formatDate(contract.createdAt)}</span>
                      </div>
                    </div>

                    <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600 space-y-1">
                      <p>
                        Submitted by <span className="font-semibold text-gray-900">{contract.createdBy.firstName} {contract.createdBy.lastName}</span>
                      </p>
                      <p>
                        Queue age <span className="font-semibold text-gray-900">{formatAgeHours(contract.approvalSnapshot?.ageHours)}</span>
                      </p>
                      <p>
                        Assignment{" "}
                        <span className="font-semibold text-gray-900">
                          {contract.approvalSnapshot?.currentAssignment?.assignedApproverName || "Unassigned"}
                        </span>
                      </p>
                      {!!contract.approvalSnapshot?.warnings?.length && (
                        <p className="text-amber-700">
                          Warning: {contract.approvalSnapshot.warnings[0]}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {!contract.approvalSnapshot?.currentAssignment?.assignedApproverName && (
                        <button
                          onClick={() => handleAssignToMe(contract)}
                          disabled={assigningId === contract.id || !currentUserId}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          {assigningId === contract.id ? "Assigning..." : "Assign to Me"}
                        </button>
                      )}
                      <button
                        onClick={() => setEditTarget(contract)}
                        disabled={approvingId === contract.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-60"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleApprove(contract)}
                        disabled={approvingId === contract.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        {approvingId === contract.id ? "Approving..." : "Approve"}
                      </button>
                      <button
                        onClick={() => setRejectTarget(contract)}
                        disabled={approvingId === contract.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-60"
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

      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-gray-700">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <p className="text-sm font-semibold">Queue policy</p>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Pending contracts stay non-payable until approved. Revision requests keep the inventory reserved for the original submission.
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-gray-700">
                <UserCheck className="h-4 w-4 text-blue-500" />
                <p className="text-sm font-semibold">Assignment</p>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Assign high-touch contracts to yourself before editing so ownership and turnaround are easier to track.
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-gray-700">
                <Clock3 className="h-4 w-4 text-red-500" />
                <p className="text-sm font-semibold">SLA risk</p>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                High-priority contracts target a 6-hour review window. Medium is 12 hours, and low is 24 hours.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
