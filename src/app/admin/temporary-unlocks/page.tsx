"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Unlock,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  ShieldAlert,
  Phone,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { useAuthStore } from "@/store/authStore";
import { AdminUser } from "@/types";
import { PERMISSIONS, adminHasPermission } from "@/lib/permissions";

type UnlockRequest = {
  id: string;
  contractId: string;
  contractNumber: string | null;
  customerName: string | null;
  customerPhone: string | null;
  membershipId: string | null;
  agentName: string | null;
  requestedByName: string | null;
  requestedWeeks: number;
  approvedWeeks: number | null;
  reason: string;
  status: string;
  expiresAt: string | null;
  arrearsAtApproval: number | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  daysRemaining: number | null;
};

type EligibleContract = {
  id: string;
  contractNumber: string;
  customerName: string;
  customerPhone: string;
  membershipId: string;
  agentName: string | null;
  outstandingBalance: number;
  deviceState: string | null;
  hasOpenRequest: boolean;
  isOwnSale?: boolean;
  overdueAmount: number;
  overdueCount: number;
  maxDaysOverdue: number;
};

const STATUS_TONE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-gray-100 text-gray-700",
  REVOKED: "bg-orange-100 text-orange-800",
  FULFILLED: "bg-blue-100 text-blue-800",
  DEFAULTED: "bg-red-100 text-red-800",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Awaiting approval",
  APPROVED: "Open",
  REJECTED: "Rejected",
  CANCELLED: "Withdrawn",
  REVOKED: "Ended early",
  FULFILLED: "Cleared",
  DEFAULTED: "Defaulted",
};

const FILTERS = ["PENDING", "APPROVED", "DEFAULTED", "ALL"] as const;

export default function TemporaryUnlocksPage() {
  const { user } = useAuthStore();
  const adminUser = user as AdminUser | null;
  const { toast } = useToast();

  const canApprove = adminHasPermission(adminUser, PERMISSIONS.APPROVE_TEMPORARY_UNLOCK);
  const canRequest = adminHasPermission(adminUser, PERMISSIONS.REQUEST_TEMPORARY_UNLOCK);

  const [requests, setRequests] = useState<UnlockRequest[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>(canApprove ? "PENDING" : "ALL");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Request dialog
  const [requestOpen, setRequestOpen] = useState(false);
  const [eligible, setEligible] = useState<EligibleContract[]>([]);
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [truncated, setTruncated] = useState(false);
  const [selected, setSelected] = useState<EligibleContract | null>(null);
  const [weeks, setWeeks] = useState("2");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Review dialog
  const [reviewTarget, setReviewTarget] = useState<UnlockRequest | null>(null);
  const [reviewWeeks, setReviewWeeks] = useState("");
  const [reviewNote, setReviewNote] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api.get("/temporary-unlocks", { params: { status: filter } });
      setRequests(res.data.requests || []);
      setCounts(res.data.counts || {});
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to load requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filter, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadEligible = useCallback(
    async (term: string) => {
      setEligibleLoading(true);
      try {
        const res = await api.get("/temporary-unlocks/eligible-contracts", {
          params: term ? { search: term } : {},
        });
        setEligible(res.data.contracts || []);
        setTruncated(Boolean(res.data.truncated));
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.response?.data?.error || "Failed to load customers",
          variant: "destructive",
        });
      } finally {
        setEligibleLoading(false);
      }
    },
    [toast]
  );

  const openRequestDialog = async () => {
    setRequestOpen(true);
    setSearch("");
    await loadEligible("");
  };

  // Searching happens on the server: there are far more overdue customers than
  // the page can hold, so filtering what was already sent would hide most of
  // them. Debounced so typing does not fire a query per keystroke.
  useEffect(() => {
    if (!requestOpen) return;
    const id = setTimeout(() => void loadEligible(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search, requestOpen, loadEligible]);

  // No local filtering: the server already answered this search.
  const filteredEligible = eligible;

  const submitRequest = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await api.post("/temporary-unlocks", {
        contractId: selected.id,
        requestedWeeks: Number(weeks),
        reason: reason.trim(),
      });
      toast({
        title: "Request sent",
        description: "An administrator will review it. The phone stays locked until it is approved.",
      });
      setRequestOpen(false);
      setSelected(null);
      setReason("");
      setWeeks("2");
      setSearch("");
      await load();
    } catch (error: any) {
      toast({
        title: "Could not send request",
        description: error.response?.data?.error || "Failed to create the request",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const decide = async (request: UnlockRequest, action: "approve" | "reject") => {
    setBusyId(request.id);
    try {
      const body: Record<string, unknown> = { note: reviewNote.trim() || undefined };
      if (action === "approve" && reviewWeeks) body.approvedWeeks = Number(reviewWeeks);

      const res = await api.post(`/temporary-unlocks/${request.id}/${action}`, body);

      if (action === "approve") {
        const warning = res.data?.device?.warning as string | null;
        const deviceOpened = res.data?.device?.success;
        toast({
          // A warning means the phone did not open. Saying so as an error
          // keeps the approver from telling the customer otherwise.
          title: warning ? "Approved — but the phone did not open" : "Approved",
          description: warning
            ? warning
            : deviceOpened
              ? `${request.customerName}'s phone has been opened until ${formatDate(res.data.request.expiresAt)}.`
              : "Approved. The device will be opened on the next device-control run.",
          variant: warning ? "destructive" : undefined,
        });
      } else {
        toast({ title: "Rejected", description: "The phone stays locked." });
      }
      setReviewTarget(null);
      setReviewNote("");
      setReviewWeeks("");
      await load();
    } catch (error: any) {
      toast({
        title: "Failed",
        description: error.response?.data?.error || `Could not ${action} the request`,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const revoke = async (request: UnlockRequest) => {
    // Ending a live window relocks a customer's phone, so it asks why and the
    // reason goes to the requester and into the audit trail.
    const reason = window.prompt(
      `End the unlock for ${request.customerName} now? Their phone will be locked again.\n\nReason (recorded, and sent to whoever asked for it):`
    );
    if (reason === null) return;
    if (reason.trim().length < 5) {
      toast({ title: "Reason too short", description: "Give at least 5 characters", variant: "destructive" });
      return;
    }
    setBusyId(request.id);
    try {
      const res = await api.post(`/temporary-unlocks/${request.id}/revoke`, { reason: reason.trim() });
      toast({
        title: res.data?.arrearsCleared ? "Window closed" : "Window ended early",
        description: res.data?.arrearsCleared
          ? "They had already cleared their arrears, so this closed as fulfilled."
          : "The phone has been returned to the normal rules.",
      });
      await load();
    } catch (error: any) {
      toast({
        title: "Failed",
        description: error.response?.data?.error || "Could not end the window",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const withdraw = async (request: UnlockRequest) => {
    setBusyId(request.id);
    try {
      await api.post(`/temporary-unlocks/${request.id}/cancel`);
      toast({ title: "Withdrawn" });
      await load();
    } catch (error: any) {
      toast({
        title: "Failed",
        description: error.response?.data?.error || "Could not withdraw the request",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = counts.PENDING ?? 0;
  const openCount = counts.APPROVED ?? 0;
  const defaultedCount = counts.DEFAULTED ?? 0;

  return (
    <div className="space-y-5 pb-10 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Temporary Unlocks</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {canApprove
              ? "Requests to open a locked phone for a fixed period so the customer can clear their arrears"
              : "Ask for a customer's phone to be opened while they clear what they owe"}
          </p>
        </div>
        {canRequest && (
          <Button onClick={openRequestDialog} className="shrink-0">
            <Unlock className="mr-2 h-4 w-4" />
            Request unlock
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-600 sm:text-sm">Awaiting approval</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-600 sm:text-sm">Open now</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{openCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-600 sm:text-sm">Defaulted</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{defaultedCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              filter === f
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            {f === "ALL" ? "All" : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Unlock className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p className="text-sm font-medium text-gray-700">Nothing here</p>
            <p className="mt-1 text-xs text-gray-500">
              {filter === "PENDING"
                ? "No requests are waiting for a decision."
                : "No requests match this filter."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <Card key={request.id} className={request.status === "DEFAULTED" ? "border-red-200" : ""}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-900">{request.customerName}</span>
                      <Badge className={STATUS_TONE[request.status] ?? "bg-gray-100 text-gray-700"}>
                        {STATUS_LABEL[request.status] ?? request.status}
                      </Badge>
                      {request.status === "APPROVED" && request.daysRemaining !== null && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            request.daysRemaining <= 3
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          <Clock className="h-3 w-3" />
                          {request.daysRemaining === 0
                            ? "Ends today"
                            : `${request.daysRemaining} day${request.daysRemaining === 1 ? "" : "s"} left`}
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-gray-500">
                      {request.contractNumber}
                      {request.membershipId ? ` · ${request.membershipId}` : ""}
                      {request.customerPhone ? ` · ${request.customerPhone}` : ""}
                    </p>

                    <p className="mt-2 text-sm text-gray-700">{request.reason}</p>

                    <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>Agent: {request.agentName ?? "—"}</span>
                      <span>Asked by: {request.requestedByName ?? "—"}</span>
                      <span>
                        Requested: {request.requestedWeeks} week{request.requestedWeeks === 1 ? "" : "s"}
                      </span>
                      {request.approvedWeeks ? (
                        <span>
                          Approved: {request.approvedWeeks} week{request.approvedWeeks === 1 ? "" : "s"}
                        </span>
                      ) : null}
                      {request.expiresAt && request.status === "APPROVED" ? (
                        <span>Ends {formatDate(request.expiresAt)}</span>
                      ) : null}
                      {request.arrearsAtApproval ? (
                        <span>Arrears at approval: {formatCurrency(request.arrearsAtApproval)}</span>
                      ) : null}
                    </div>

                    {request.reviewNote && (
                      <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                        <span className="font-medium">{request.reviewedByName}:</span> {request.reviewNote}
                      </p>
                    )}

                    {request.status === "DEFAULTED" && (
                      <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
                        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                          The window closed with the arrears unpaid. The phone is locked again and{" "}
                          {request.agentName ?? "the agent"} cannot create new contracts until this customer pays.
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
                    {request.status === "PENDING" && canApprove && (
                      <>
                        <Button
                          size="sm"
                          disabled={busyId === request.id}
                          onClick={() => {
                            setReviewTarget(request);
                            setReviewWeeks(String(request.requestedWeeks));
                            setReviewNote("");
                          }}
                        >
                          <CheckCircle2 className="mr-1.5 h-4 w-4" />
                          Review
                        </Button>
                      </>
                    )}
                    {request.status === "PENDING" && !canApprove && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === request.id}
                        onClick={() => withdraw(request)}
                      >
                        Withdraw
                      </Button>
                    )}
                    {request.status === "APPROVED" && canApprove && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === request.id}
                        onClick={() => revoke(request)}
                      >
                        <XCircle className="mr-1.5 h-4 w-4" />
                        End now
                      </Button>
                    )}
                    {request.customerPhone && (
                      <a
                        href={`tel:${request.customerPhone}`}
                        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        Call
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Request dialog */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request a temporary unlock</DialogTitle>
          </DialogHeader>

          {selected ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{selected.customerName}</p>
                    <p className="text-xs text-gray-500">
                      {selected.contractNumber} · {selected.customerPhone}
                    </p>
                    <p className="mt-1.5 text-xs text-red-700">
                      {formatCurrency(selected.overdueAmount)} overdue across {selected.overdueCount}{" "}
                      installment{selected.overdueCount === 1 ? "" : "s"} · {selected.maxDaysOverdue} days behind
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
                    Change
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="weeks">How many weeks do they need?</Label>
                <Input
                  id="weeks"
                  type="number"
                  min={1}
                  max={4}
                  value={weeks}
                  onChange={(e) => setWeeks(e.target.value)}
                  className="mt-1.5"
                />
                <p className="mt-1 text-xs text-gray-500">
                  The phone relocks automatically when the period ends if the arrears are still unpaid.
                </p>
              </div>

              <div>
                <Label htmlFor="reason">Why should this be granted?</Label>
                <Textarea
                  id="reason"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="What the customer has told you, and why you believe they will pay."
                  className="mt-1.5"
                />
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  You are vouching for this customer. If the period ends with the arrears still unpaid,{" "}
                  {selected.agentName ?? "their agent"} will be blocked from creating new contracts until they pay.
                </span>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setRequestOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={submitRequest}
                  disabled={submitting || reason.trim().length < 10 || !weeks}
                >
                  {submitting ? "Sending…" : "Send for approval"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search by name, phone, membership or contract number"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {eligibleLoading ? (
                <div className="flex justify-center py-10">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
                </div>
              ) : filteredEligible.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-500">
                  {search.trim()
                    ? `No overdue customer matches "${search.trim()}".`
                    : "No overdue customers found."}
                </p>
              ) : (
                <div className="max-h-[50vh] space-y-2 overflow-y-auto">
                  {truncated && !search.trim() && (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Showing the most overdue customers only. Type a name, phone or contract number to
                      reach the rest.
                    </p>
                  )}
                  {filteredEligible.map((contract) => (
                    <button
                      key={contract.id}
                      disabled={contract.hasOpenRequest || contract.isOwnSale}
                      onClick={() => setSelected(contract)}
                      className="w-full rounded-lg border border-gray-200 p-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-gray-200 disabled:hover:bg-transparent"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">{contract.customerName}</p>
                          <p className="truncate text-xs text-gray-500">
                            {contract.contractNumber} · {contract.agentName ?? "—"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-red-600">
                            {formatCurrency(contract.overdueAmount)}
                          </p>
                          <p className="text-xs text-gray-500">{contract.maxDaysOverdue}d behind</p>
                        </div>
                      </div>
                      {contract.hasOpenRequest && (
                        <p className="mt-1.5 text-xs text-amber-700">Already has a request open</p>
                      )}
                      {contract.isOwnSale && (
                        <p className="mt-1.5 text-xs text-gray-500">
                          Your own sale — an administrator has to raise this one.
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Review dialog */}
      <Dialog open={Boolean(reviewTarget)} onOpenChange={(open) => !open && setReviewTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review request</DialogTitle>
          </DialogHeader>

          {reviewTarget && (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                <p className="font-medium text-gray-900">{reviewTarget.customerName}</p>
                <p className="text-xs text-gray-500">
                  {reviewTarget.contractNumber} · asked by {reviewTarget.requestedByName}
                </p>
                <p className="mt-2 text-gray-700">{reviewTarget.reason}</p>
              </div>

              <div>
                <Label htmlFor="reviewWeeks">Weeks to grant</Label>
                <Input
                  id="reviewWeeks"
                  type="number"
                  min={1}
                  max={reviewTarget.requestedWeeks}
                  value={reviewWeeks}
                  onChange={(e) => setReviewWeeks(e.target.value)}
                  className="mt-1.5"
                />
                <p className="mt-1 text-xs text-gray-500">
                  You can grant less than the {reviewTarget.requestedWeeks} week
                  {reviewTarget.requestedWeeks === 1 ? "" : "s"} asked for, but not more.
                </p>
              </div>

              <div>
                <Label htmlFor="reviewNote">Note (optional)</Label>
                <Textarea
                  id="reviewNote"
                  rows={2}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  className="mt-1.5"
                />
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2.5 text-xs text-blue-900">
                <Unlock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Approving opens the phone straight away and keeps it open for the period granted, even though
                  the customer is behind.
                </span>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  disabled={busyId === reviewTarget.id}
                  onClick={() => decide(reviewTarget, "reject")}
                >
                  <XCircle className="mr-1.5 h-4 w-4" />
                  Reject
                </Button>
                <Button disabled={busyId === reviewTarget.id} onClick={() => decide(reviewTarget, "approve")}>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  {busyId === reviewTarget.id ? "Working…" : "Approve & open phone"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
