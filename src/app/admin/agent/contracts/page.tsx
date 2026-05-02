"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  Package,
  Banknote,
  Calendar,
  Clock3,
  UserCheck,
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
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import type { AdminUser } from "@/types";

const STATUS_OPTIONS = ["", "ACTIVE", "PENDING_APPROVAL", "REVISION_REQUESTED", "COMPLETED", "DEFAULTED", "CANCELLED"];

type AgentContract = {
  id: string;
  contractNumber: string;
  totalPrice: number;
  outstandingBalance: number;
  startDate: string;
  status: string;
  customer?: {
    firstName?: string;
    lastName?: string;
    membershipId?: string;
    phone?: string;
  };
  inventoryItem?: {
    serialNumber?: string;
    product?: {
      name?: string;
    };
  } | null;
  _count?: {
    payments?: number;
  };
  approvalSnapshot?: {
    priority?: "LOW" | "MEDIUM" | "HIGH";
    ageHours?: number;
    isBreached?: boolean;
    currentAssignment?: {
      assignedApproverName?: string | null;
    } | null;
  } | null;
};

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

export default function AgentContractsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const agent = user && "role" in user ? (user as AdminUser) : null;

  const [contracts, setContracts] = useState<AgentContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const itemsPerPage = 20;

  const loadContracts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/contracts/agent/mine", {
        params: {
          page: currentPage,
          limit: itemsPerPage,
          search: searchQuery || undefined,
          status: statusFilter || undefined,
        },
      });
      setContracts(res.data.contracts || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setTotalItems(res.data.pagination?.total || 0);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.error || "Failed to load contracts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery, statusFilter, toast]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  const handleSearch = () => {
    setCurrentPage(1);
    setSearchQuery(searchInput.trim());
  };

  const statusLabel: Record<string, string> = {
    "": "All statuses",
    ACTIVE: "Active",
    PENDING_APPROVAL: "Pending",
    REVISION_REQUESTED: "Revision Requested",
    COMPLETED: "Completed",
    DEFAULTED: "Defaulted",
    CANCELLED: "Cancelled",
  };

  const pendingCount = contracts.filter((contract) => contract.status === "PENDING_APPROVAL").length;
  const revisionCount = contracts.filter((contract) => contract.status === "REVISION_REQUESTED").length;
  const activeCount = contracts.filter((contract) => contract.status === "ACTIVE").length;

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-4 sm:px-6 sm:py-6">
      <div className="rounded-3xl bg-gradient-to-br from-cyan-600 via-cyan-500 to-sky-500 p-5 text-white shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
              <FileText className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">My Contracts</h1>
            <p className="mt-1 text-sm text-cyan-50">
              Track submissions, revisions, and live repayment progress from your phone first.
            </p>
            {agent && (
              <p className="mt-2 text-xs font-medium text-cyan-100">
                Signed in as {agent.firstName} {agent.lastName}
              </p>
            )}
          </div>
          <div className="rounded-2xl bg-white/15 px-3 py-2 text-right">
            <p className="text-[11px] uppercase tracking-wide text-cyan-100">Portfolio</p>
            <p className="text-2xl font-bold">{totalItems}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-cyan-100">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">Visible</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{contracts.length}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-100">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">Pending</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card className="border-orange-100">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">Revisions</p>
            <p className="mt-1 text-2xl font-bold text-orange-600">{revisionCount}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-100">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">Active</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{activeCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Find Contracts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search customer, ID, contract, product..."
              className="h-11 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr),auto,auto]">
            <select
              className="h-11 rounded-xl border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {statusLabel[status]}
                </option>
              ))}
            </select>
            <button
              onClick={handleSearch}
              className="h-11 rounded-xl bg-cyan-600 px-4 text-sm font-semibold text-white hover:bg-cyan-700"
            >
              Apply Search
            </button>
            <button
              onClick={() => {
                setSearchInput("");
                setSearchQuery("");
                setStatusFilter("");
                setCurrentPage(1);
              }}
              className="h-11 rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
            </div>
          ) : contracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <FileText className="mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm font-medium text-gray-600">No contracts found</p>
              <p className="mt-1 text-xs text-gray-400">
                Adjust the filters or create a new contract to see it here.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3 p-3 md:hidden">
                {contracts.map((contract) => (
                  <button
                    key={contract.id}
                    className="w-full rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50/30 active:scale-[0.99]"
                    onClick={() => router.push(`/admin/agent/contracts/${contract.id}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-[11px] font-bold text-gray-500">{contract.contractNumber}</p>
                        <p className="mt-1 text-base font-bold text-gray-900">
                          {contract.customer?.firstName} {contract.customer?.lastName}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {contract.customer?.membershipId} · {contract.customer?.phone}
                        </p>
                      </div>
                      <Badge className={`${getStatusColor(contract.status)} shrink-0 text-[10px]`}>
                        {contract.status.replace(/_/g, " ")}
                      </Badge>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">Total</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">
                          {formatCurrency(contract.totalPrice)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-red-50 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-red-400">Balance</p>
                        <p className="mt-1 text-sm font-semibold text-red-600">
                          {formatCurrency(contract.outstandingBalance)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <Package className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        <span className="truncate">{contract.inventoryItem?.product?.name ?? "No product attached"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        <span>Started {formatDate(contract.startDate)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Banknote className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        <span>{contract._count?.payments ?? 0} payment{contract._count?.payments !== 1 ? "s" : ""} recorded</span>
                      </div>
                    </div>

                    {contract.approvalSnapshot && (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={getPriorityBadge(contract.approvalSnapshot.priority)}>
                            {contract.approvalSnapshot.priority || "LOW"} priority
                          </Badge>
                          {contract.approvalSnapshot.isBreached && (
                            <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                              SLA breached
                            </Badge>
                          )}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <Clock3 className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                            <span>Queue age {formatQueueAge(contract.approvalSnapshot.ageHours)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                            <span className="truncate">
                              {contract.approvalSnapshot.currentAssignment?.assignedApproverName || "Unassigned"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contract #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Total Price</TableHead>
                      <TableHead>Outstanding</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Queue</TableHead>
                      <TableHead>Payments</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.map((contract) => (
                      <TableRow
                        key={contract.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => router.push(`/admin/agent/contracts/${contract.id}`)}
                      >
                        <TableCell>
                          <p className="font-mono text-xs font-semibold text-gray-900">{contract.contractNumber}</p>
                          <p className="mt-1 text-xs text-gray-400">{formatDate(contract.startDate)}</p>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-sm text-gray-900">
                            {contract.customer?.firstName} {contract.customer?.lastName}
                          </p>
                          <p className="text-xs text-gray-400">{contract.customer?.membershipId}</p>
                          <p className="text-xs text-gray-400">{contract.customer?.phone}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-gray-800">{contract.inventoryItem?.product?.name ?? "—"}</p>
                          <p className="text-xs text-gray-400 font-mono">{contract.inventoryItem?.serialNumber ?? "—"}</p>
                        </TableCell>
                        <TableCell className="font-semibold">{formatCurrency(contract.totalPrice)}</TableCell>
                        <TableCell className="text-red-600 font-medium">{formatCurrency(contract.outstandingBalance)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(contract.status)}>{contract.status.replace(/_/g, " ")}</Badge>
                        </TableCell>
                        <TableCell>
                          {contract.approvalSnapshot ? (
                            <div className="space-y-1">
                              <Badge variant="outline" className={getPriorityBadge(contract.approvalSnapshot.priority)}>
                                {contract.approvalSnapshot.priority || "LOW"}
                              </Badge>
                              <p className="text-xs text-gray-500">
                                {formatQueueAge(contract.approvalSnapshot.ageHours)} ·{" "}
                                {contract.approvalSnapshot.currentAssignment?.assignedApproverName || "Unassigned"}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-gray-100 px-2 text-xs font-semibold text-gray-600">
                            {contract._count?.payments ?? 0}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="border-t px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-gray-500">
                      Page {currentPage} of {totalPages} · {totalItems} total contracts
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
                      <button
                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                        disabled={currentPage === 1}
                        className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                        disabled={currentPage === totalPages}
                        className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
