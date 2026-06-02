"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  FileText,
  Search,
  Shield,
  Smartphone,
  Trash2,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import api from "@/lib/api";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { adminHasAnyPermission, PERMISSIONS } from "@/lib/permissions";
import type { AdminUser } from "@/types";

interface ContractGuardrailAssessment {
  blockers: string[];
  warnings: string[];
  riskFlags: string[];
  priority: "LOW" | "MEDIUM" | "HIGH";
  riskScore: number;
  suggestedSlaHours: number;
  relatedOpenContracts: number;
  defaultedContracts: number;
  sameProductContracts: number;
}

function getKnoxStatusClasses(status?: string | null) {
  const normalized = (status || "UNKNOWN").toUpperCase();

  if (["LOCKED", "FAILED", "OVERDUE"].includes(normalized)) {
    return "bg-red-100 text-red-700 border-red-200";
  }

  if (["UNLOCKED", "ACTIVE", "APPROVED", "SUCCEEDED", "COMPLETED"].includes(normalized)) {
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  }

  if (["PENDING", "PROCESSING", "APPROVAL_QUEUED", "UNKNOWN"].includes(normalized)) {
    return "bg-amber-100 text-amber-700 border-amber-200";
  }

  return "bg-slate-100 text-slate-700 border-slate-200";
}

function getPrimaryKnoxAction(managedDevice: any): "lock" | "unlock" {
  const actualState = String(managedDevice?.actualState || "").toUpperCase();
  const desiredState = String(managedDevice?.desiredState || "").toUpperCase();

  if (actualState === "LOCKED" || desiredState === "LOCKED") {
    return "unlock";
  }

  return "lock";
}

function GuardrailPanel({
  guardrails,
  isLoading,
}: {
  guardrails: ContractGuardrailAssessment | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">Reviewing submission risk...</p>
        <p className="text-xs text-slate-500 mt-1">
          Checking duplicates, risky terms, and approval signals.
        </p>
      </div>
    );
  }

  if (!guardrails) {
    return null;
  }

  const priorityTone =
    guardrails.priority === "HIGH"
      ? "bg-red-100 text-red-700 border-red-200"
      : guardrails.priority === "MEDIUM"
        ? "bg-amber-100 text-amber-700 border-amber-200"
        : "bg-emerald-100 text-emerald-700 border-emerald-200";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-slate-900">Submission Review</p>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${priorityTone}`}>
          {guardrails.priority} PRIORITY
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
          Risk score {guardrails.riskScore}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
          SLA {guardrails.suggestedSlaHours}h
        </span>
      </div>

      {guardrails.blockers.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Blockers</p>
          <div className="mt-2 space-y-1">
            {guardrails.blockers.map((item) => (
              <p key={item} className="text-sm text-red-700">
                {item}
              </p>
            ))}
          </div>
        </div>
      )}

      {guardrails.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Warnings</p>
          <div className="mt-2 space-y-1">
            {guardrails.warnings.map((item) => (
              <p key={item} className="text-sm text-amber-800">
                {item}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
        <div className="rounded-md bg-slate-50 p-2">
          Open contracts: <span className="font-semibold text-slate-900">{guardrails.relatedOpenContracts}</span>
        </div>
        <div className="rounded-md bg-slate-50 p-2">
          Default history: <span className="font-semibold text-slate-900">{guardrails.defaultedContracts}</span>
        </div>
        <div className="rounded-md bg-slate-50 p-2">
          Same product history: <span className="font-semibold text-slate-900">{guardrails.sameProductContracts}</span>
        </div>
        <div className="rounded-md bg-slate-50 p-2">
          Risk flags: <span className="font-semibold text-slate-900">{guardrails.riskFlags.length}</span>
        </div>
      </div>
    </div>
  );
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [knoxBusyKey, setKnoxBusyKey] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 20;
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const adminUser = user as AdminUser | null;
  const canViewDeviceControl = adminHasAnyPermission(adminUser, [
    PERMISSIONS.VIEW_DEVICE_CONTROL,
    PERMISSIONS.MANAGE_DEVICE_CONTROL,
  ]);
  const canManageDeviceControl = adminHasAnyPermission(adminUser, [
    PERMISSIONS.MANAGE_DEVICE_CONTROL,
  ]);

  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setShowCreateForm(true);
    }
    if (!isAuthLoading) {
      void loadContracts();
    }
  }, [searchParams, currentPage, canViewDeviceControl, isAuthLoading]);

  const loadContracts = async (pageOverride = currentPage) => {
    try {
      setIsLoading(true);
      const response = await api.get("/contracts", {
        params: {
          search: searchQuery || undefined,
          page: pageOverride,
          limit: itemsPerPage,
          includeDeviceControl: canViewDeviceControl || undefined,
        },
      });
      setContracts(response.data.contracts || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
      setTotalItems(response.data.pagination?.total || 0);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to load contracts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    void loadContracts(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDeleteContract = async (contract: any) => {
    if (contract._count?.payments > 0) {
      toast({
        title: "Cannot Delete",
        description: `This contract has ${contract._count.payments} payment(s). Cannot delete contracts that have received payments.`,
        variant: "destructive",
      });
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete contract ${contract.contractNumber}? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/contracts/${contract.id}`);
      toast({
        title: "Success",
        description: "Contract deleted successfully",
      });
      await loadContracts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to delete contract",
        variant: "destructive",
      });
    }
  };

  const handleKnoxAction = async (
    contractId: string,
    action: "evaluate" | "lock" | "unlock"
  ) => {
    try {
      setKnoxBusyKey(`${action}:${contractId}`);
      await api.post(`/knox-guard/contracts/${contractId}/${action}`, {});
      toast({
        title: action === "evaluate" ? "Device evaluated" : action === "lock" ? "Lock queued" : "Unlock queued",
        description: `Knox Guard ${action} request completed successfully.`,
      });
      await loadContracts();
    } catch (error: any) {
      toast({
        title: "Knox Guard Error",
        description: error.response?.data?.error || `Failed to ${action} contract device`,
        variant: "destructive",
      });
    } finally {
      setKnoxBusyKey(null);
    }
  };

  if (showCreateForm) {
    return (
      <CreateHirePurchaseSale
        onClose={() => setShowCreateForm(false)}
        onSuccess={() => {
          setShowCreateForm(false);
          loadContracts();
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Contracts</h1>
          <p className="text-sm text-gray-500 mt-0.5">Hire purchase sales and agreements</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} size="sm" className="shrink-0">
          <Plus className="mr-1.5 h-4 w-4" />
          <span className="hidden sm:inline">Create New Sale</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search customer, serial, contract #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} size="sm" className="shrink-0">Search</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-12 px-4">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">No contracts yet</p>
              <p className="text-sm text-gray-400 mt-1">Create your first hire purchase sale to get started</p>
              <Button className="mt-5" onClick={() => setShowCreateForm(true)}>
                <Plus className="mr-2 h-4 w-4" /> Create First Contract
              </Button>
            </div>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="sm:hidden divide-y divide-gray-100">
                {contracts.map((contract) => (
                  <button
                    key={contract.id}
                    onClick={() => router.push(`/admin/contracts/${contract.id}`)}
                    className="w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-9 h-9 shrink-0 rounded-full overflow-hidden border border-gray-200 bg-gray-100">
                        {contract.customer?.photoUrl ? (
                          <img src={contract.customer.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs font-bold">
                            {contract.customer?.firstName?.charAt(0)}{contract.customer?.lastName?.charAt(0)}
                          </div>
                        )}
                      </div>
                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {contract.customer?.firstName} {contract.customer?.lastName}
                          </p>
                          <Badge className={`${getStatusColor(contract.status)} text-[10px] shrink-0`}>
                            {contract.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 font-mono truncate">{contract.contractNumber}</p>
                        <p className="text-xs text-gray-500 truncate">{contract.inventoryItem?.product?.name || "—"}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs text-gray-400">Total: <span className="font-medium text-gray-700">{formatCurrency(contract.totalPrice)}</span></span>
                          <span className="text-xs text-red-500 font-medium">Bal: {formatCurrency(contract.outstandingBalance)}</span>
                        </div>
                        {canViewDeviceControl && (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                              <Shield className="h-3 w-3" />
                              Knox
                            </span>
                            {contract.managedDevice ? (
                              <>
                                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getKnoxStatusClasses(contract.managedDevice.actualState)}`}>
                                  Actual {contract.managedDevice.actualState}
                                </span>
                                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getKnoxStatusClasses(contract.managedDevice.desiredState)}`}>
                                  Desired {contract.managedDevice.desiredState}
                                </span>
                                {contract.managedDevice.lastError && (
                                  <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                                    Needs attention
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                Not enrolled
                              </span>
                            )}
                          </div>
                        )}
                        {contract.createdBy && (
                          <p className="text-xs text-gray-400 mt-1">By: {contract.createdBy.firstName} {contract.createdBy.lastName}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contract #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Total Price</TableHead>
                      <TableHead>Deposit</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Outstanding</TableHead>
                      <TableHead>Status</TableHead>
                      {canViewDeviceControl && <TableHead>Device Control</TableHead>}
                      <TableHead>Start Date</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.map((contract) => {
                      const primaryKnoxAction = contract.managedDevice
                        ? getPrimaryKnoxAction(contract.managedDevice)
                        : null;
                      const primaryKnoxActionKey = primaryKnoxAction
                        ? `${primaryKnoxAction}:${contract.id}`
                        : null;
                      const evaluateKnoxActionKey = `evaluate:${contract.id}`;

                      return (
                        <TableRow key={contract.id}>
                          <TableCell className="font-mono font-medium">{contract.contractNumber}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
                                {contract.customer?.photoUrl ? (
                                  <img src={contract.customer.photoUrl} alt="" className="w-full h-full object-cover"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-semibold">
                                    {contract.customer?.firstName?.charAt(0)}{contract.customer?.lastName?.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{contract.customer?.firstName} {contract.customer?.lastName}</p>
                                <p className="text-xs text-gray-500">{contract.customer?.membershipId}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">{contract.inventoryItem?.product?.name || "—"}</p>
                            <p className="text-xs text-gray-500 font-mono">{contract.inventoryItem?.serialNumber || "—"}</p>
                          </TableCell>
                          <TableCell>{formatCurrency(contract.totalPrice)}</TableCell>
                          <TableCell className="text-blue-600 font-medium">{formatCurrency(contract.depositAmount)}</TableCell>
                          <TableCell className="text-green-600 font-medium">{formatCurrency(contract.totalPaid)}</TableCell>
                          <TableCell className="text-red-600 font-medium">{formatCurrency(contract.outstandingBalance)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(contract.status)}>{contract.status}</Badge>
                          </TableCell>
                          {canViewDeviceControl && (
                            <TableCell className="min-w-[280px]">
                              {contract.managedDevice ? (
                                <div className="space-y-2">
                                  <div className="flex flex-wrap gap-1.5">
                                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getKnoxStatusClasses(contract.managedDevice.actualState)}`}>
                                      Actual {contract.managedDevice.actualState}
                                    </span>
                                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getKnoxStatusClasses(contract.managedDevice.desiredState)}`}>
                                      Desired {contract.managedDevice.desiredState}
                                    </span>
                                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getKnoxStatusClasses(contract.managedDevice.enrollmentStatus)}`}>
                                      {contract.managedDevice.enrollmentStatus}
                                    </span>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-xs text-slate-500">
                                      UID: <span className="font-mono text-slate-700">{contract.managedDevice.deviceUid}</span>
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      Last evaluation: {contract.managedDevice.lastEvaluatedAt ? formatDate(contract.managedDevice.lastEvaluatedAt) : "—"}
                                    </p>
                                    {contract.managedDevice.lastError ? (
                                      <p className="flex items-start gap-1 text-xs text-red-600">
                                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                                        <span className="line-clamp-2">{contract.managedDevice.lastError}</span>
                                      </p>
                                    ) : (
                                      <p className="text-xs text-slate-500">
                                        Inventory lock: {contract.inventoryItem?.lockStatus || "UNLOCKED"}
                                      </p>
                                    )}
                                  </div>
                                  {canManageDeviceControl && (
                                    <div className="flex flex-wrap gap-1.5">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleKnoxAction(contract.id, "evaluate")}
                                        disabled={knoxBusyKey === evaluateKnoxActionKey}
                                      >
                                        {knoxBusyKey === evaluateKnoxActionKey ? (
                                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                        ) : (
                                          <RefreshCw className="mr-1 h-3 w-3" />
                                        )}
                                        Evaluate
                                      </Button>
                                      {primaryKnoxAction && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className={primaryKnoxAction === "lock" ? "text-red-600 hover:bg-red-50" : "text-emerald-700 hover:bg-emerald-50"}
                                          onClick={() => handleKnoxAction(contract.id, primaryKnoxAction)}
                                          disabled={knoxBusyKey === primaryKnoxActionKey}
                                        >
                                          {knoxBusyKey === primaryKnoxActionKey ? (
                                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                          ) : primaryKnoxAction === "lock" ? (
                                            <Lock className="mr-1 h-3 w-3" />
                                          ) : (
                                            <Unlock className="mr-1 h-3 w-3" />
                                          )}
                                          {primaryKnoxAction === "lock" ? "Queue Lock" : "Queue Unlock"}
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                      Not enrolled
                                    </span>
                                    <span className="text-xs text-slate-500">Set up Knox Guard from the contract page.</span>
                                  </div>
                                  <Button size="sm" variant="outline" onClick={() => router.push(`/admin/contracts/${contract.id}`)}>
                                    <Smartphone className="mr-1 h-3 w-3" />
                                    Open Setup
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          )}
                          <TableCell>{formatDate(contract.startDate)}</TableCell>
                          <TableCell>
                            {contract.createdBy ? (
                              <div>
                                <p className="text-sm text-gray-800">{contract.createdBy.firstName} {contract.createdBy.lastName}</p>
                                <p className="text-xs text-gray-400">{contract.createdBy.role?.name}</p>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1.5">
                              <Button size="sm" variant="outline" onClick={() => router.push(`/admin/contracts/${contract.id}`)}>View</Button>
                              <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleDeleteContract(contract)} disabled={contract._count?.payments > 0}>
                                <Trash2 className="h-3 w-3 mr-1" /> Delete
                              </Button>
                            </div>
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
        {!isLoading && contracts.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
          />
        )}
      </Card>
    </div>
  );
}

// ─── Desktop step content (unchanged original layout) ────────────────────────
function DesktopStepContent({
  step, setStep,
  formData, setFormData,
  filteredCustomers, filteredInventory,
  customersLoading,
  selectedCustomer, setSelectedCustomer,
  selectedInventory, setSelectedInventory,
  unlockOnContract, setUnlockOnContract,
  searchQuery, setSearchQuery,
  productSearchQuery, setProductSearchQuery,
  signaturePreview, signatureFile,
  isDraggingSignature,
  handleSignatureFileInput, handleSignatureDrop,
  handleSignatureDragOver, handleSignatureDragLeave,
  handleSignatureCamera,
  setSignatureFile, setSignaturePreview,
  calculateInstallments, installmentSchedule,
  financeAmount, installmentAmount,
  guardrails, isGuardrailLoading,
  isSubmitting,
  step1Valid, step2Valid, step3Valid,
  onClose, handleSubmit,
}: any) {
  return (
    <>
      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Step 1: Select Customer</h3>
          <input
            type="text"
            placeholder="Search by Membership ID, Name, or Phone..."
            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            value={searchQuery}
            onChange={(e: any) => setSearchQuery(e.target.value)}
          />
          <div className="max-h-96 overflow-y-auto space-y-2">
            {customersLoading && (
              <p className="text-center text-sm text-gray-400 py-4 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Searching…
              </p>
            )}
            {!customersLoading && filteredCustomers.map((customer: any) => (
              <div
                key={customer.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${formData.customerId === customer.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}
                onClick={() => { setFormData({ ...formData, customerId: customer.id }); setSelectedCustomer(customer); }}
              >
                <div className="flex gap-4 items-start">
                  <div className="flex-shrink-0">
                    {customer.photoUrl ? (
                      <img src={customer.photoUrl} alt="" className="w-20 h-20 rounded-lg object-cover border-2 border-gray-200" onError={(e: any) => { e.currentTarget.style.display='none'; }} />
                    ) : (
                      <div className="w-20 h-20 rounded-lg border-2 border-gray-200 bg-gray-100 flex items-center justify-center text-gray-400 text-xl font-semibold">
                        {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                    <p className="text-sm text-gray-500">ID: {customer.membershipId}</p>
                    <p className="text-sm text-gray-500">Phone: {customer.phone}</p>
                    {customer.email && <p className="text-sm text-gray-500">Email: {customer.email}</p>}
                  </div>
                </div>
              </div>
            ))}
            {!customersLoading && filteredCustomers.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-8">No customers found</p>
            )}
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={() => setStep(2)} disabled={!step1Valid} className="flex-1">Next: Select Product</Button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Step 2: Select Product & Serial Number</h3>
          <input
            type="text"
            placeholder="Search by product name, category, or serial/IMEI number..."
            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            value={productSearchQuery}
            onChange={(e: any) => setProductSearchQuery(e.target.value)}
          />
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredInventory.map((item: any) => (
              <div
                key={item.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${formData.inventoryItemId === item.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}
                onClick={() => {
                  setFormData({ ...formData, inventoryItemId: item.id, totalPrice: item.product?.basePrice?.toString() || "", lockStatus: item.lockStatus || "UNLOCKED", registeredUnder: item.registeredUnder || "" });
                  setSelectedInventory(item);
                  setUnlockOnContract(item.lockStatus === 'LOCKED');
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-lg">{item.product?.name}</p>
                    <p className="text-sm text-gray-600 mt-1"><span className="font-semibold">Serial/IMEI:</span> <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{item.serialNumber}</span></p>
                    <div className="flex gap-3 mt-2 text-sm">
                      <p className="text-gray-500">Category: {item.product?.category?.name}</p>
                      {item.lockStatus && (
                        <Badge variant={item.lockStatus === 'LOCKED' ? 'destructive' : 'default'} className={item.lockStatus === 'UNLOCKED' ? 'bg-green-100 text-green-800' : ''}>
                          {item.lockStatus}
                        </Badge>
                      )}
                    </div>
                    {item.registeredUnder && <p className="text-xs text-gray-500 mt-1">Registered: {item.registeredUnder}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{formatCurrency(item.product?.basePrice || 0)}</p>
                    <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                  </div>
                </div>
              </div>
            ))}
            {filteredInventory.length === 0 && <div className="text-center py-8 text-gray-500"><p>No inventory items found matching your search</p></div>}
          </div>

          {/* Unlock checkbox — only shown when locked device is selected */}
          {selectedInventory?.lockStatus === 'LOCKED' && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <input
                type="checkbox"
                id="unlockOnContract"
                checked={unlockOnContract}
                onChange={(e) => setUnlockOnContract(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-cyan-600"
              />
              <div>
                <label htmlFor="unlockOnContract" className="text-sm font-medium text-amber-900 cursor-pointer">
                  Unlock device when contract is created
                </label>
                <p className="text-xs text-amber-700 mt-0.5">
                  Device <span className="font-mono font-semibold">{selectedInventory?.serialNumber}</span> is currently locked. Check to automatically unlock it via Knox Guard when this contract is saved.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
            <Button onClick={() => setStep(3)} disabled={!step2Valid} className="flex-1">Next: Payment Terms</Button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="space-y-6">
          <h3 className="font-semibold text-lg">Step 3: Configure Payment Terms</h3>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-blue-900">Selected Customer:</p>
            <p className="text-lg">{selectedCustomer?.firstName} {selectedCustomer?.lastName}</p>
            <p className="text-sm text-blue-700">{selectedCustomer?.membershipId}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-green-900">Selected Product:</p>
            <p className="text-lg">{selectedInventory?.product?.name}</p>
            <p className="text-sm text-green-700 font-mono">{selectedInventory?.serialNumber}</p>
          </div>

          {/* Unlock checkbox in step 3 too */}
          {selectedInventory?.lockStatus === 'LOCKED' && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <input
                type="checkbox"
                id="unlockOnContractStep3"
                checked={unlockOnContract}
                onChange={(e) => setUnlockOnContract(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-cyan-600"
              />
              <label htmlFor="unlockOnContractStep3" className="text-sm text-amber-900 cursor-pointer">
                <span className="font-medium">Unlock device on contract creation</span>
                <span className="text-xs text-amber-700 block mt-0.5">Device is currently locked — will be unlocked via Knox Guard when contract is saved.</span>
              </label>
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold mb-3 text-gray-700">Additional Device Info (Optional)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Lock Status</label>
                <select className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm" value={formData.lockStatus} onChange={(e: any) => setFormData({ ...formData, lockStatus: e.target.value })}>
                  <option value="">Not specified</option>
                  <option value="UNLOCKED">Unlocked</option>
                  <option value="LOCKED">Locked</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Registered Under</label>
                <Input placeholder="e.g., Customer Name" value={formData.registeredUnder} onChange={(e: any) => setFormData({ ...formData, registeredUnder: e.target.value })} />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">These details can be updated independently later if needed</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Total Price (GHS) *</label>
              <Input type="number" step="0.01" value={formData.totalPrice} onChange={(e: any) => setFormData({ ...formData, totalPrice: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Deposit Amount (GHS) *</label>
              <Input type="number" step="0.01" value={formData.depositAmount} onChange={(e: any) => setFormData({ ...formData, depositAmount: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Payment Frequency *</label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={formData.paymentFrequency} onChange={(e: any) => setFormData({ ...formData, paymentFrequency: e.target.value })}>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Total Installments *</label>
              <Input type="number" value={formData.totalInstallments} onChange={(e: any) => setFormData({ ...formData, totalInstallments: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Start Date *</label>
              <Input type="date" value={formData.startDate} onChange={(e: any) => setFormData({ ...formData, startDate: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Grace Period (Days)</label>
              <Input type="number" value={formData.gracePeriodDays} onChange={(e: any) => setFormData({ ...formData, gracePeriodDays: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Penalty (%)</label>
              <Input type="number" step="0.01" value={formData.penaltyPercentage} onChange={(e: any) => setFormData({ ...formData, penaltyPercentage: e.target.value })} />
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4 text-blue-900">Payment Method (Optional)</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Select Payment Method</label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={formData.paymentMethod} onChange={(e: any) => setFormData({ ...formData, paymentMethod: e.target.value, mobileMoneyNetwork: "", mobileMoneyNumber: "" })}>
                    <option value="">None (Manual Payment)</option>
                    <option value="HUBTEL_REGULAR">Hubtel - Regular Payment (PIN each time)</option>
                    <option value="HUBTEL_DIRECT_DEBIT">Hubtel - Direct Debit (Auto-debit)</option>
                    <option value="CASH">Cash Payment</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.paymentMethod === "HUBTEL_REGULAR" && "Customer will enter PIN for each payment"}
                    {formData.paymentMethod === "HUBTEL_DIRECT_DEBIT" && "One-time approval, then automatic deduction for installments"}
                    {formData.paymentMethod === "CASH" && "Customer will pay in cash"}
                    {!formData.paymentMethod && "Payments will be recorded manually by admin"}
                  </p>
                </div>
                {(formData.paymentMethod === "HUBTEL_REGULAR" || formData.paymentMethod === "HUBTEL_DIRECT_DEBIT") && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">Mobile Money Network *</label>
                      <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={formData.mobileMoneyNetwork} onChange={(e: any) => setFormData({ ...formData, mobileMoneyNetwork: e.target.value })}>
                        <option value="">Select Network</option>
                        <option value="MTN">MTN Mobile Money</option>
                        <option value="VODAFONE">Telecel (Vodafone)</option>
                        {formData.paymentMethod === "HUBTEL_REGULAR" && <option value="AIRTELTIGO">AirtelTigo</option>}
                      </select>
                      {formData.paymentMethod === "HUBTEL_DIRECT_DEBIT" && <p className="text-xs text-amber-600 mt-1">Note: Direct Debit only supports MTN and Telecel</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Mobile Money Number *</label>
                      <Input type="tel" placeholder="e.g., 0241234567" value={formData.mobileMoneyNumber} onChange={(e: any) => setFormData({ ...formData, mobileMoneyNumber: e.target.value })} />
                      <p className="text-xs text-gray-500 mt-1">Customer&apos;s mobile money number for payments</p>
                    </div>
                    {formData.paymentMethod === "HUBTEL_DIRECT_DEBIT" && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800"><strong>Direct Debit Setup:</strong> After contract creation, you&apos;ll need to initiate a one-time preapproval request.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <p className="font-semibold">Summary:</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Total Price:</div><div className="font-medium">{formatCurrency(parseFloat(formData.totalPrice) || 0)}</div>
              <div>Deposit:</div><div className="font-medium">{formatCurrency(parseFloat(formData.depositAmount) || 0)}</div>
              <div>Finance Amount:</div><div className="font-medium text-blue-600">{formatCurrency(financeAmount)}</div>
              <div>Installment Amount:</div><div className="font-medium text-green-600">{formatCurrency(installmentAmount)}</div>
              <div>Payment Frequency:</div><div className="font-medium">{formData.paymentFrequency}</div>
            </div>
          </div>

          <GuardrailPanel guardrails={guardrails} isLoading={isGuardrailLoading} />

          <Button variant="outline" onClick={calculateInstallments} className="w-full" disabled={!formData.totalInstallments || !formData.totalPrice}>
            <Calendar className="mr-2 h-4 w-4" /> Preview Installment Schedule
          </Button>

          {installmentSchedule.length > 0 && (
            <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
              <p className="font-medium mb-2">Installment Schedule Preview:</p>
              <div className="space-y-1 text-sm">
                {installmentSchedule.map((inst: any) => (
                  <div key={inst.installmentNo} className="flex justify-between">
                    <span>Installment #{inst.installmentNo}</span>
                    <span>{inst.dueDate}</span>
                    <span className="font-medium">{formatCurrency(inst.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Customer Signature (Optional)</label>
            <div
              onDrop={handleSignatureDrop} onDragOver={handleSignatureDragOver} onDragLeave={handleSignatureDragLeave}
              className={`border-2 border-dashed rounded-lg p-6 text-center ${isDraggingSignature ? "border-blue-500 bg-blue-50" : "border-gray-300"}`}
            >
              {signaturePreview ? (
                <div className="space-y-4">
                  <img src={signaturePreview} alt="Customer signature" className="max-w-xs mx-auto rounded border-2 border-gray-200" />
                  <Button type="button" variant="outline" size="sm" onClick={() => { setSignatureFile(null); setSignaturePreview(""); }}>Remove Signature</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-600">Drag & drop signature here, or use options below</p>
                  <div className="flex gap-2 justify-center flex-wrap">
                    <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("signature-input")?.click()}>Browse Files</Button>
                    <Button type="button" variant="outline" size="sm" onClick={handleSignatureCamera}>Take Photo</Button>
                  </div>
                  <p className="text-xs text-gray-500">JPEG or PNG only, max 5MB</p>
                </div>
              )}
              <input id="signature-input" type="file" accept="image/jpeg,image/jpg,image/png" onChange={handleSignatureFileInput} className="hidden" />
            </div>
          </div>

          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
            <Button onClick={handleSubmit} disabled={!step3Valid} className="flex-1">
              {isSubmitting ? "Creating Contract..." : "Create Contract"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

// Hire Purchase Sale Creation Component
function CreateHirePurchaseSale({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState(1);
  const [customers, setCustomers] = useState<any[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [availableInventory, setAvailableInventory] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedInventory, setSelectedInventory] = useState<any>(null);
  const [unlockOnContract, setUnlockOnContract] = useState(false);
  const [installmentSchedule, setInstallmentSchedule] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    customerId: "",
    inventoryItemId: "",
    totalPrice: "",
    depositAmount: "",
    paymentFrequency: "MONTHLY" as "DAILY" | "WEEKLY" | "MONTHLY",
    totalInstallments: "",
    gracePeriodDays: "0",
    penaltyPercentage: "0",
    startDate: new Date().toISOString().split("T")[0],
    paymentMethod: "" as "" | "HUBTEL_REGULAR" | "HUBTEL_DIRECT_DEBIT" | "MANUAL" | "CASH",
    mobileMoneyNetwork: "" as "" | "MTN" | "VODAFONE" | "TELECEL" | "AIRTELTIGO",
    mobileMoneyNumber: "",
    lockStatus: "" as "" | "LOCKED" | "UNLOCKED",
    registeredUnder: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const customerDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string>("");
  const [isDraggingSignature, setIsDraggingSignature] = useState(false);
  const [guardrails, setGuardrails] = useState<ContractGuardrailAssessment | null>(null);
  const [isGuardrailLoading, setIsGuardrailLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAvailableInventory();
  }, []);

  // Debounced live customer search — fetches from server on every keystroke (300ms delay)
  useEffect(() => {
    if (customerDebounce.current) clearTimeout(customerDebounce.current);
    customerDebounce.current = setTimeout(async () => {
      setCustomersLoading(true);
      try {
        const params: Record<string, any> = { limit: 50 };
        if (searchQuery.trim()) params.search = searchQuery.trim();
        const response = await api.get("/customers", { params });
        setCustomers(response.data.customers || []);
      } catch {
        // keep previous results
      } finally {
        setCustomersLoading(false);
      }
    }, 300);
    return () => { if (customerDebounce.current) clearTimeout(customerDebounce.current); };
  }, [searchQuery]);

  const loadAvailableInventory = async () => {
    try {
      const response = await api.get("/products/inventory", {
        params: { status: "AVAILABLE", limit: 1000 }, // Increase limit to show all available items
      });

      // Handle different response formats
      const inventoryData = Array.isArray(response.data)
        ? response.data
        : response.data?.items || [];

      setAvailableInventory(inventoryData);
    } catch (error) {
      console.error("Failed to load inventory:", error);
      setAvailableInventory([]);
    }
  };

  const validateSignatureFile = (file: File): boolean => {
    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a JPEG or PNG image only",
        variant: "destructive",
      });
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Signature image must be less than 5MB",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleSignatureChange = (file: File) => {
    if (validateSignatureFile(file)) {
      setSignatureFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignaturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleSignatureChange(file);
  };

  const handleSignatureDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingSignature(false);
    const file = e.dataTransfer.files[0];
    if (file) handleSignatureChange(file);
  };

  const handleSignatureDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingSignature(true);
  };

  const handleSignatureDragLeave = () => {
    setIsDraggingSignature(false);
  };

  const handleSignatureCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement("video");
      video.srcObject = stream;
      video.play();

      const captureBtn = document.createElement("button");
      captureBtn.textContent = "Capture Signature";
      captureBtn.style.cssText =
        "margin-top:1rem;padding:0.5rem 1rem;background:#3b82f6;color:white;border:none;border-radius:0.375rem;cursor:pointer;";

      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = "Cancel";
      cancelBtn.style.cssText =
        "margin-top:1rem;margin-left:0.5rem;padding:0.5rem 1rem;background:#6b7280;color:white;border:none;border-radius:0.375rem;cursor:pointer;";

      const modal = document.createElement("div");
      modal.style.cssText =
        "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;";
      video.style.cssText =
        "max-width:90%;max-height:70vh;border-radius:0.5rem;";

      const btnContainer = document.createElement("div");
      btnContainer.appendChild(captureBtn);
      btnContainer.appendChild(cancelBtn);

      modal.appendChild(video);
      modal.appendChild(btnContainer);
      document.body.appendChild(modal);

      captureBtn.onclick = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d")?.drawImage(video, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "signature.jpg", {
              type: "image/jpeg",
            });
            handleSignatureChange(file);
          }
          stream.getTracks().forEach((track) => track.stop());
          document.body.removeChild(modal);
        }, "image/jpeg");
      };

      cancelBtn.onclick = () => {
        stream.getTracks().forEach((track) => track.stop());
        document.body.removeChild(modal);
      };
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Could not access camera",
        variant: "destructive",
      });
    }
  };

  const calculateInstallments = () => {
    const totalPrice = parseFloat(formData.totalPrice) || 0;
    const deposit = parseFloat(formData.depositAmount) || 0;
    const financeAmount = totalPrice - deposit;
    const installments = parseInt(formData.totalInstallments) || 1;
    const installmentAmount = financeAmount / installments;

    const schedule = [];
    const startDate = new Date(formData.startDate);

    for (let i = 0; i < installments; i++) {
      const dueDate = new Date(startDate);

      if (formData.paymentFrequency === "DAILY") {
        dueDate.setDate(dueDate.getDate() + i);
      } else if (formData.paymentFrequency === "WEEKLY") {
        dueDate.setDate(dueDate.getDate() + i * 7);
      } else if (formData.paymentFrequency === "MONTHLY") {
        dueDate.setMonth(dueDate.getMonth() + i);
      }

      schedule.push({
        installmentNo: i + 1,
        dueDate: dueDate.toISOString().split("T")[0],
        amount: installmentAmount,
      });
    }

    setInstallmentSchedule(schedule);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      if (formData.customerId && formData.inventoryItemId && formData.totalPrice && formData.totalInstallments) {
        setIsGuardrailLoading(true);
        try {
          const reviewRes = await api.post("/contracts/preflight", {
            customerId: formData.customerId,
            inventoryItemId: formData.inventoryItemId,
            totalPrice: parseFloat(formData.totalPrice) || 0,
            depositAmount: parseFloat(formData.depositAmount) || 0,
            totalInstallments: parseInt(formData.totalInstallments) || 0,
            startDate: formData.startDate || undefined,
            paymentMethod: formData.paymentMethod || undefined,
            mobileMoneyNumber: formData.mobileMoneyNumber || undefined,
          });

          setGuardrails(reviewRes.data);

          if (reviewRes.data?.blockers?.length > 0) {
            toast({
              title: "Submission Blocked",
              description: reviewRes.data.blockers[0],
              variant: "destructive",
            });
            return;
          }
        } finally {
          setIsGuardrailLoading(false);
        }
      }

      const submitData = new FormData();
      submitData.append("customerId", formData.customerId);
      submitData.append("inventoryItemId", formData.inventoryItemId);
      submitData.append("totalPrice", formData.totalPrice);
      submitData.append("depositAmount", formData.depositAmount);
      submitData.append("paymentFrequency", formData.paymentFrequency);
      submitData.append("totalInstallments", formData.totalInstallments);
      submitData.append("gracePeriodDays", formData.gracePeriodDays);
      submitData.append("penaltyPercentage", formData.penaltyPercentage);
      submitData.append("startDate", formData.startDate);

      // Add payment method fields if selected
      if (formData.paymentMethod) {
        submitData.append("paymentMethod", formData.paymentMethod);
      }
      if (formData.mobileMoneyNetwork) {
        submitData.append("mobileMoneyNetwork", formData.mobileMoneyNetwork);
      }
      if (formData.mobileMoneyNumber) {
        submitData.append("mobileMoneyNumber", formData.mobileMoneyNumber);
      }

      // Add inventory additional info fields if provided
      if (formData.lockStatus) {
        submitData.append("lockStatus", formData.lockStatus);
      }
      if (formData.registeredUnder) {
        submitData.append("registeredUnder", formData.registeredUnder);
      }

      if (signatureFile) {
        submitData.append("signature", signatureFile);
      }

      const response = await api.post("/contracts", submitData);
      const createdContractId = response.data?.id;
      const createdContractNumber = response.data?.contractNumber;

      // Unlock device if checkbox checked and device was locked
      let unlockSucceeded = false;
      if (unlockOnContract && selectedInventory?.lockStatus === 'LOCKED' && createdContractId) {
        // Link managed device to this contract first if it has no contract yet
        if (selectedInventory?.managedDevice?.id && !selectedInventory?.managedDevice?.contractId) {
          try {
            await api.patch(`/knox-guard/devices/${selectedInventory.managedDevice.id}/link-contract`, { contractId: createdContractId });
          } catch (linkErr) {
            console.error('Link managed device to contract failed:', linkErr);
          }
        }

        // Retry unlock up to 3 times with 3s delay between attempts
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            await api.post(`/knox-guard/contracts/${createdContractId}/unlock`, { reason: 'Device unlocked on contract creation.' });
            unlockSucceeded = true;
            break;
          } catch (unlockErr: any) {
            console.error(`Unlock attempt ${attempt}/3 failed:`, unlockErr?.response?.data?.error || unlockErr?.message);
            if (attempt < 3) {
              await new Promise((r) => setTimeout(r, 3000));
            }
          }
        }

        // If all retries failed, set desiredState=UNLOCKED on the backend so the cron picks it up
        if (!unlockSucceeded) {
          try {
            await api.post(`/knox-guard/contracts/${createdContractId}/evaluate`, {});
          } catch {
            // cron will handle it on next cycle
          }
        }
      }

      toast({
        title: "Contract Created!",
        description: unlockOnContract && selectedInventory?.lockStatus === 'LOCKED'
          ? unlockSucceeded
            ? `Contract ${createdContractNumber} created and device unlocked.`
            : `Contract ${createdContractNumber} created — unlock pending. The device will be unlocked shortly.`
          : `Contract ${createdContractNumber} has been created successfully.`,
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to create contract",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCustomers = customers;

  const financeAmount =
    (parseFloat(formData.totalPrice) || 0) -
    (parseFloat(formData.depositAmount) || 0);
  const installmentAmount =
    financeAmount / (parseInt(formData.totalInstallments) || 1);

  // ── step action labels ────────────────────────────────────────────
  const step1Valid = !!formData.customerId;
  const step2Valid = !!formData.inventoryItemId;
  const step3Valid =
    !isSubmitting &&
    !isGuardrailLoading &&
    !!formData.totalInstallments &&
    !!formData.totalPrice &&
    !(guardrails?.blockers?.length) &&
    !((formData.paymentMethod === "HUBTEL_REGULAR" ||
       formData.paymentMethod === "HUBTEL_DIRECT_DEBIT") &&
      (!formData.mobileMoneyNetwork || !formData.mobileMoneyNumber));

  useEffect(() => {
    if (
      step !== 3 ||
      !formData.customerId ||
      !formData.inventoryItemId ||
      !formData.totalPrice ||
      formData.depositAmount === "" ||
      !formData.totalInstallments
    ) {
      setGuardrails(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      setIsGuardrailLoading(true);
      try {
        const res = await api.post("/contracts/preflight", {
          customerId: formData.customerId,
          inventoryItemId: formData.inventoryItemId,
          totalPrice: parseFloat(formData.totalPrice) || 0,
          depositAmount: parseFloat(formData.depositAmount) || 0,
          totalInstallments: parseInt(formData.totalInstallments) || 0,
          startDate: formData.startDate || undefined,
          paymentMethod: formData.paymentMethod || undefined,
          mobileMoneyNumber: formData.mobileMoneyNumber || undefined,
        });
        setGuardrails(res.data);
      } catch (error) {
        console.error("Failed to evaluate contract guardrails:", error);
      } finally {
        setIsGuardrailLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [
    step,
    formData.customerId,
    formData.inventoryItemId,
    formData.totalPrice,
    formData.depositAmount,
    formData.totalInstallments,
    formData.startDate,
    formData.paymentMethod,
    formData.mobileMoneyNumber,
  ]);

  const filteredInventory = (Array.isArray(availableInventory) ? availableInventory : []).filter((item) => {
    if (!productSearchQuery) return true;
    const q = productSearchQuery.toLowerCase();
    return (
      item.product?.name?.toLowerCase().includes(q) ||
      item.product?.category?.name?.toLowerCase().includes(q) ||
      item.serialNumber?.toLowerCase().includes(q)
    );
  });

  return (
    /* Full-screen on mobile, centered card on desktop */
    <div className="fixed inset-0 z-50 flex flex-col bg-white sm:static sm:inset-auto sm:z-auto sm:block sm:bg-transparent sm:p-6">
      {/* ── Desktop card wrapper (hidden on mobile, shown sm+) ── */}
      <div className="hidden sm:block">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Create Hire Purchase Sale</CardTitle>
            <div className="flex gap-2 mt-4">
              {[1, 2, 3].map((s) => (
                <div key={s} className={`h-2 flex-1 rounded-full ${s <= step ? "bg-blue-600" : "bg-gray-200"}`} />
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <DesktopStepContent
              step={step} setStep={setStep}
              formData={formData} setFormData={setFormData}
              filteredCustomers={filteredCustomers} filteredInventory={filteredInventory}
              customersLoading={customersLoading}
              selectedCustomer={selectedCustomer} setSelectedCustomer={setSelectedCustomer}
              selectedInventory={selectedInventory} setSelectedInventory={setSelectedInventory}
              unlockOnContract={unlockOnContract} setUnlockOnContract={setUnlockOnContract}
              searchQuery={searchQuery} setSearchQuery={setSearchQuery}
              productSearchQuery={productSearchQuery} setProductSearchQuery={setProductSearchQuery}
              signaturePreview={signaturePreview} signatureFile={signatureFile}
              isDraggingSignature={isDraggingSignature}
              handleSignatureFileInput={handleSignatureFileInput}
              handleSignatureDrop={handleSignatureDrop}
              handleSignatureDragOver={handleSignatureDragOver}
              handleSignatureDragLeave={handleSignatureDragLeave}
              handleSignatureCamera={handleSignatureCamera}
              setSignatureFile={setSignatureFile} setSignaturePreview={setSignaturePreview}
              calculateInstallments={calculateInstallments}
              installmentSchedule={installmentSchedule}
              financeAmount={financeAmount} installmentAmount={installmentAmount}
              guardrails={guardrails} isGuardrailLoading={isGuardrailLoading}
              isSubmitting={isSubmitting}
              step1Valid={step1Valid} step2Valid={step2Valid} step3Valid={step3Valid}
              onClose={onClose} handleSubmit={handleSubmit}
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Mobile: full-screen with sticky header + scrollable body + sticky footer ── */}
      <div className="sm:hidden flex flex-col h-full overflow-hidden">
        {/* Sticky header */}
        <div className="shrink-0 px-4 pt-4 pb-3 border-b border-gray-100 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">Create Hire Purchase</h2>
            <button onClick={onClose} className="text-xs text-gray-500 underline">Cancel</button>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-blue-600" : "bg-gray-200"}`} />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            Step {step} of 3 — {step === 1 ? "Select Customer" : step === 2 ? "Select Product" : "Payment Terms"}
          </p>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {/* ── Mobile Step 1 ── */}
          {step === 1 && (
            <>
              <input
                type="text"
                placeholder="Search by name, ID, or phone..."
                className="flex h-9 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="space-y-2">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                      formData.customerId === customer.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white"
                    }`}
                    onClick={() => { setFormData({ ...formData, customerId: customer.id }); setSelectedCustomer(customer); }}
                  >
                    <div className="w-11 h-11 shrink-0 rounded-full border border-gray-200 bg-gray-100 overflow-hidden flex items-center justify-center text-gray-500 text-sm font-bold">
                      {customer.photoUrl ? (
                        <img src={customer.photoUrl} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display='none'; }} />
                      ) : (
                        <>{customer.firstName.charAt(0)}{customer.lastName.charAt(0)}</>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{customer.firstName} {customer.lastName}</p>
                      <p className="text-xs text-gray-500">{customer.membershipId} · {customer.phone}</p>
                    </div>
                    {formData.customerId === customer.id && (
                      <div className="w-5 h-5 shrink-0 rounded-full bg-blue-600 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </div>
                    )}
                  </div>
                ))}
                {customersLoading && (
                  <p className="text-center text-sm text-gray-400 py-4 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Searching…
                  </p>
                )}
                {!customersLoading && filteredCustomers.length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-8">No customers found</p>
                )}
              </div>
            </>
          )}

          {/* ── Mobile Step 2 ── */}
          {step === 2 && (
            <>
              <input
                type="text"
                placeholder="Search by product, category, or serial..."
                className="flex h-9 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
              />
              <div className="space-y-2">
                {filteredInventory.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 border rounded-xl cursor-pointer transition-all ${
                      formData.inventoryItemId === item.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white"
                    }`}
                    onClick={() => {
                      setFormData({ ...formData, inventoryItemId: item.id, totalPrice: item.product?.basePrice?.toString() || "", lockStatus: item.lockStatus || "UNLOCKED", registeredUnder: item.registeredUnder || "" });
                      setSelectedInventory(item);
                      setUnlockOnContract(item.lockStatus === 'LOCKED');
                    }}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{item.product?.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{item.serialNumber}</p>
                        <p className="text-xs text-gray-400">{item.product?.category?.name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(item.product?.basePrice || 0)}</p>
                        {formData.inventoryItemId === item.id && (
                          <div className="mt-1 w-5 h-5 ml-auto rounded-full bg-blue-600 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredInventory.length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-8">No inventory items found</p>
                )}
              </div>
            </>
          )}

          {/* ── Mobile Step 3 ── */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Customer + Product summary pills */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-blue-500">Customer</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate">{selectedCustomer?.firstName} {selectedCustomer?.lastName}</p>
                  <p className="text-xs text-blue-600">{selectedCustomer?.membershipId}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-green-500">Product</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate">{selectedInventory?.product?.name}</p>
                  <p className="text-xs text-green-600 font-mono">{selectedInventory?.serialNumber}</p>
                </div>
              </div>

              {/* Device info */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-600 mb-2">Device Info (Optional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600">Lock Status</label>
                    <select
                      className="mt-1 flex h-9 w-full rounded-lg border border-gray-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.lockStatus}
                      onChange={(e) => setFormData({ ...formData, lockStatus: e.target.value as any })}
                    >
                      <option value="">Not specified</option>
                      <option value="UNLOCKED">Unlocked</option>
                      <option value="LOCKED">Locked</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Registered Under</label>
                    <Input className="mt-1 h-9 text-sm" placeholder="e.g., Name" value={formData.registeredUnder} onChange={(e) => setFormData({ ...formData, registeredUnder: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Price fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700">Total Price (GHS) *</label>
                  <Input type="number" step="0.01" className="mt-1 h-9 text-sm" value={formData.totalPrice} onChange={(e) => setFormData({ ...formData, totalPrice: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Deposit (GHS) *</label>
                  <Input type="number" step="0.01" className="mt-1 h-9 text-sm" value={formData.depositAmount} onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })} />
                </div>
              </div>

              {/* Payment terms */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-700">Frequency *</label>
                  <select
                    className="mt-1 flex h-9 w-full rounded-lg border border-gray-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.paymentFrequency}
                    onChange={(e) => setFormData({ ...formData, paymentFrequency: e.target.value as any })}
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Installments *</label>
                  <Input type="number" className="mt-1 h-9 text-sm" value={formData.totalInstallments} onChange={(e) => setFormData({ ...formData, totalInstallments: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Start Date *</label>
                  <Input type="date" className="mt-1 h-9 text-xs" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700">Grace Period (Days)</label>
                  <Input type="number" className="mt-1 h-9 text-sm" value={formData.gracePeriodDays} onChange={(e) => setFormData({ ...formData, gracePeriodDays: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Penalty (%)</label>
                  <Input type="number" step="0.01" className="mt-1 h-9 text-sm" value={formData.penaltyPercentage} onChange={(e) => setFormData({ ...formData, penaltyPercentage: e.target.value })} />
                </div>
              </div>

              {/* Payment method */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-3">
                <p className="text-xs font-semibold text-blue-800">Payment Method (Optional)</p>
                <div>
                  <select
                    className="flex h-9 w-full rounded-lg border border-blue-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any, mobileMoneyNetwork: "", mobileMoneyNumber: "" })}
                  >
                    <option value="">None (Manual)</option>
                    <option value="HUBTEL_REGULAR">Hubtel Regular (PIN)</option>
                    <option value="HUBTEL_DIRECT_DEBIT">Hubtel Direct Debit</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
                {(formData.paymentMethod === "HUBTEL_REGULAR" || formData.paymentMethod === "HUBTEL_DIRECT_DEBIT") && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-700">Network *</label>
                      <select
                        className="mt-1 flex h-9 w-full rounded-lg border border-gray-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.mobileMoneyNetwork}
                        onChange={(e) => setFormData({ ...formData, mobileMoneyNetwork: e.target.value as any })}
                      >
                        <option value="">Select</option>
                        <option value="MTN">MTN</option>
                        <option value="VODAFONE">Telecel</option>
                        {formData.paymentMethod === "HUBTEL_REGULAR" && <option value="AIRTELTIGO">AirtelTigo</option>}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700">MoMo Number *</label>
                      <Input type="tel" placeholder="0241234567" className="mt-1 h-9 text-sm" value={formData.mobileMoneyNumber} onChange={(e) => setFormData({ ...formData, mobileMoneyNumber: e.target.value })} />
                    </div>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-700 mb-2">Summary</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-gray-500">Total Price</span><span className="font-semibold">{formatCurrency(parseFloat(formData.totalPrice) || 0)}</span>
                  <span className="text-gray-500">Deposit</span><span className="font-semibold">{formatCurrency(parseFloat(formData.depositAmount) || 0)}</span>
                  <span className="text-gray-500">Finance Amount</span><span className="font-semibold text-blue-600">{formatCurrency(financeAmount)}</span>
                  <span className="text-gray-500">Installment</span><span className="font-semibold text-green-600">{formatCurrency(installmentAmount)}</span>
                  <span className="text-gray-500">Frequency</span><span className="font-semibold">{formData.paymentFrequency}</span>
                </div>
              </div>

              <GuardrailPanel guardrails={guardrails} isLoading={isGuardrailLoading} />

              {/* Preview schedule */}
              <button
                type="button"
                onClick={calculateInstallments}
                disabled={!formData.totalInstallments || !formData.totalPrice}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-300 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                <Calendar className="h-4 w-4" /> Preview Schedule
              </button>

              {installmentSchedule.length > 0 && (
                <div className="border rounded-xl p-3 max-h-40 overflow-y-auto">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Installment Schedule</p>
                  <div className="space-y-1">
                    {installmentSchedule.map((inst) => (
                      <div key={inst.installmentNo} className="flex justify-between text-xs text-gray-600">
                        <span>#{inst.installmentNo}</span>
                        <span>{inst.dueDate}</span>
                        <span className="font-medium">{formatCurrency(inst.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Signature */}
              <div>
                <label className="text-xs font-medium text-gray-700">Customer Signature (Optional)</label>
                <div
                  onDrop={handleSignatureDrop} onDragOver={handleSignatureDragOver} onDragLeave={handleSignatureDragLeave}
                  className={`mt-1 border-2 border-dashed rounded-xl p-4 text-center ${isDraggingSignature ? "border-blue-500 bg-blue-50" : "border-gray-300"}`}
                >
                  {signaturePreview ? (
                    <div className="space-y-2">
                      <img src={signaturePreview} alt="Signature" className="max-h-24 mx-auto rounded border border-gray-200" />
                      <button type="button" onClick={() => { setSignatureFile(null); setSignaturePreview(""); }} className="text-xs text-red-500 underline">Remove</button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2 justify-center">
                        <button type="button" onClick={() => document.getElementById("signature-input-mobile")?.click()} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50">Browse</button>
                        <button type="button" onClick={handleSignatureCamera} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50">Camera</button>
                      </div>
                      <p className="text-[10px] text-gray-400">JPEG / PNG, max 5MB</p>
                    </div>
                  )}
                  <input id="signature-input-mobile" type="file" accept="image/jpeg,image/jpg,image/png" onChange={handleSignatureFileInput} className="hidden" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky footer with action buttons */}
        <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3 safe-area-bottom">
          {step === 1 && (
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={() => setStep(2)} disabled={!step1Valid} className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">Next: Product →</button>
            </div>
          )}
          {step === 2 && (
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">← Back</button>
              <button onClick={() => setStep(3)} disabled={!step2Valid} className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">Next: Terms →</button>
            </div>
          )}
          {step === 3 && (
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">← Back</button>
              <button onClick={handleSubmit} disabled={!step3Valid} className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
                {isSubmitting ? "Creating…" : "Create Contract"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
