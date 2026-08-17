"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Phone, Search, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import LogCallModal from "@/components/admin/LogCallModal";
import api from "@/lib/api";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";

interface QueueRow {
  id: string;
  contractNumber: string;
  totalPrice: number;
  depositAmount: number;
  totalInstallments: number;
  mobileMoneyNumber: string | null;
  createdAt: string;
  customer: { id: string; name: string; phone: string; membershipId: string };
  product: string | null;
  agent: string | null;
  isVerified: boolean;
  verification: { result: string; outcome: string; contactedAt: string; notes: string | null } | null;
}

/**
 * How long a contract has been waiting for its verification call. A customer is
 * most reachable shortly after signing, and the contract cannot go live until
 * the call is made, so waiting time is the thing to act on.
 */
function waitingBand(createdAt: string): { label: string; className: string } {
  const hours = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  if (hours < 1) {
    return { label: `${Math.max(1, Math.round(hours * 60))}m waiting`, className: "bg-green-100 text-green-800" };
  }
  if (hours < 2) return { label: "1h waiting", className: "bg-green-100 text-green-800" };
  if (hours < 6) return { label: `${Math.floor(hours)}h waiting`, className: "bg-amber-100 text-amber-800" };
  if (hours < 24) return { label: `${Math.floor(hours)}h waiting`, className: "bg-red-100 text-red-800" };
  const days = Math.floor(hours / 24);
  return { label: `${days}d waiting`, className: "bg-red-100 text-red-800 font-semibold" };
}

export default function VerificationQueuePage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [summary, setSummary] = useState({
    count: 0,
    awaitingVerification: 0,
    readyToApprove: 0,
    overdueForCall: 0,
    oldestWaitingHours: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [callTarget, setCallTarget] = useState<QueueRow | null>(null);
  const [rejectTarget, setRejectTarget] = useState<QueueRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async (searchTerm?: string) => {
    try {
      setIsLoading(true);
      const res = await api.get("/customer-service/verification-queue", {
        params: { search: searchTerm || undefined },
      });
      setRows(res.data.contracts || []);
      setSummary({
        count: res.data.count || 0,
        awaitingVerification: res.data.awaitingVerification || 0,
        readyToApprove: res.data.readyToApprove || 0,
        overdueForCall: res.data.overdueForCall || 0,
        oldestWaitingHours: res.data.oldestWaitingHours || 0,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to load verification queue",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (row: QueueRow) => {
    if (!confirm(`Approve ${row.contractNumber} for ${row.customer.name}?`)) return;
    try {
      setBusyId(row.id);
      await api.post(`/contracts/${row.id}/approve`);
      toast({ title: "Approved", description: `${row.contractNumber} is now active` });
      load(search);
    } catch (error: any) {
      toast({
        title: "Could not approve",
        description: error.response?.data?.error || "Failed to approve contract",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    try {
      setBusyId(rejectTarget.id);
      await api.post(`/contracts/${rejectTarget.id}/request-revision`, { reason: rejectReason.trim() });
      toast({ title: "Sent back", description: "The agent has been asked to revise this contract" });
      setRejectTarget(null);
      setRejectReason("");
      load(search);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to request revision",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Verification Queue</h1>
        <p className="text-sm text-gray-500">
          Call each customer to confirm their details before approving the contract
        </p>
      </div>

      {summary.overdueForCall > 0 && (
        <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <Clock className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">
              {summary.overdueForCall} contract{summary.overdueForCall === 1 ? "" : "s"} waiting
              more than 6 hours for a verification call
            </p>
            <p className="text-sm text-red-700">
              The longest has been waiting {summary.oldestWaitingHours}h. These contracts cannot go
              live until you call the customer.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500">Pending</p>
            <p className="text-2xl font-bold">{summary.count}</p>
          </CardContent>
        </Card>
        <Card className={summary.awaitingVerification > 0 ? "border-amber-300" : undefined}>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500">Awaiting your call</p>
            <p className="text-2xl font-bold text-amber-600">{summary.awaitingVerification}</p>
            {summary.oldestWaitingHours > 0 && (
              <p className="text-[11px] text-gray-400 mt-0.5">
                oldest {summary.oldestWaitingHours}h
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500">Ready to approve</p>
            <p className="text-2xl font-bold text-green-600">{summary.readyToApprove}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-2">
            <Input
              placeholder="Search name, phone, contract..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load(search)}
            />
            <Button variant="outline" onClick={() => load(search)}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-center text-gray-500 py-12 text-sm">
              Nothing waiting for verification.
            </p>
          ) : (
            <>
              {/* Mobile */}
              <div className="sm:hidden divide-y divide-gray-100">
                {rows.map((row) => (
                  <div key={row.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{row.customer.name}</p>
                        <a href={`tel:${row.customer.phone}`} className="text-sm text-blue-600">
                          {row.customer.phone}
                        </a>
                      </div>
                      {row.isVerified ? (
                        <Badge className="bg-green-100 text-green-800 shrink-0">Verified</Badge>
                      ) : (
                        <Badge className={cn("shrink-0", waitingBand(row.createdAt).className)}>
                          {waitingBand(row.createdAt).label}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {row.contractNumber} · {row.product ?? "—"} · {formatCurrency(row.totalPrice)}
                    </p>
                    <p className="text-xs text-gray-400">Agent: {row.agent ?? "—"}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => setCallTarget(row)}>
                        <Phone className="h-4 w-4 mr-1" /> Log Call
                      </Button>
                      <Button
                        size="sm"
                        disabled={!row.isVerified || busyId === row.id}
                        onClick={() => handleApprove(row)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === row.id}
                        onClick={() => setRejectTarget(row)}
                      >
                        <XCircle className="h-4 w-4 mr-1" /> Send back
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Contract</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <p className="font-medium">{row.customer.name}</p>
                          <p className="text-xs text-gray-400">{row.customer.membershipId}</p>
                        </TableCell>
                        <TableCell>
                          <a href={`tel:${row.customer.phone}`} className="text-blue-600 hover:underline">
                            {row.customer.phone}
                          </a>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{row.contractNumber}</p>
                          <p className="text-xs text-gray-400">{formatDate(row.createdAt)}</p>
                        </TableCell>
                        <TableCell className="text-sm">{row.product ?? "—"}</TableCell>
                        <TableCell className="text-sm">{formatCurrency(row.totalPrice)}</TableCell>
                        <TableCell className="text-sm">{row.agent ?? "—"}</TableCell>
                        <TableCell>
                          {row.isVerified ? (
                            <Badge className="bg-green-100 text-green-800">Verified</Badge>
                          ) : row.verification ? (
                            <Badge className="bg-red-100 text-red-800">
                              {row.verification.result}
                            </Badge>
                          ) : (
                            <Badge className={waitingBand(row.createdAt).className}>
                              <Clock className="h-3 w-3 mr-1" />
                              {waitingBand(row.createdAt).label}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => setCallTarget(row)}>
                              <Phone className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              disabled={!row.isVerified || busyId === row.id}
                              onClick={() => handleApprove(row)}
                              title={row.isVerified ? "Approve" : "Log a verified call first"}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === row.id}
                              onClick={() => setRejectTarget(row)}
                            >
                              Send back
                            </Button>
                          </div>
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

      {callTarget && (
        <LogCallModal
          customerId={callTarget.customer.id}
          customerName={callTarget.customer.name}
          customerPhone={callTarget.customer.phone}
          contractId={callTarget.id}
          contractNumber={callTarget.contractNumber}
          defaultPurpose="VERIFICATION"
          onClose={() => setCallTarget(null)}
          onLogged={() => load(search)}
        />
      )}

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Send back for revision</h2>
            <p className="text-sm text-gray-500 mb-4">
              {rejectTarget.contractNumber} — {rejectTarget.customer.name}
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              What needs fixing? *
            </label>
            <textarea
              className="flex min-h-[90px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="The agent will see this note"
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleReject} disabled={!rejectReason.trim() || busyId === rejectTarget.id}>
                {busyId === rejectTarget.id ? "Sending..." : "Send back"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
