"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Lock,
  RefreshCw,
  Shield,
  Smartphone,
  Unlock,
} from "lucide-react";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import { PERMISSIONS } from "@/lib/permissions";
import api from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { adminHasPermission } from "@/lib/permissions";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import type { AdminUser } from "@/types";

interface CustomerExperienceDefaults {
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

interface KnoxHealth {
  devices: number;
  pendingCommands: number;
  policy: {
    lockAfterOverdueDays: number;
    countUnpaidPenalties: boolean;
    penaltyBlockingEnabled: boolean;
    maxCommandRetries: number;
    supportPhone: string | null;
    customerExperienceDefaults: CustomerExperienceDefaults;
    knoxGuard: {
      configured: boolean;
      dryRun: boolean;
      liveActionsEnabled: boolean;
      baseUrlConfigured: boolean;
      apiTokenConfigured: boolean;
      configuredPaths: Record<string, boolean>;
      webhookSignatureConfigured: boolean;
      webhookTokenConfigured: boolean;
      webhookValidationConfigured: boolean;
    };
  };
}

interface ManagedDevice {
  id: string;
  provider: string;
  deviceUid: string;
  deviceUidType: string;
  approveId: string;
  knoxObjectId?: string | null;
  knoxTenantDomain?: string | null;
  enrollmentStatus: string;
  desiredState: string;
  actualState: string;
  isActive: boolean;
  lastLockedAt?: string | null;
  lastUnlockedAt?: string | null;
  lastEvaluatedAt?: string | null;
  lastSyncedAt?: string | null;
  lastError?: string | null;
  createdAt: string;
  customerExperience?: CustomerExperienceDefaults & {
    disclosureAccepted: boolean;
    disclosureAcceptedAt?: string | null;
    disclosureAcceptedByAdminId?: string | null;
  };
  contract: {
    id: string;
    contractNumber: string;
    status: string;
    outstandingBalance: number;
  };
  customer: {
    membershipId: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  inventoryItem?: {
    serialNumber: string;
    lockStatus?: string | null;
    status: string;
  } | null;
  commands?: Array<{
    id: string;
    type: string;
    status: string;
    createdAt: string;
  }>;
}

interface ManagedCommand {
  id: string;
  type: string;
  status: string;
  attempts: number;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  managedDevice: {
    approveId: string;
    deviceUid: string;
    actualState: string;
    desiredState: string;
    contract: {
      contractNumber: string;
    };
  };
}

const emptyEnrollForm = {
  contractId: "",
  deviceUid: "",
  deviceUidType: "SERIAL_NUMBER",
  approveId: "",
  knoxObjectId: "",
  knoxTenantDomain: "DEVICE_FINANCING",
  disclosureAccepted: false,
  disclosureVersion: "",
  termsReference: "",
  supportPhone: "",
  supportMessage: "",
  warningMessage: "",
  paymentAppPackage: "",
  paymentAppLabel: "",
  paymentUssd: "",
  refreshActionLabel: "Refresh account status",
};

function withEnrollmentDefaults(
  current: typeof emptyEnrollForm,
  defaults?: CustomerExperienceDefaults | null
) {
  if (!defaults) {
    return current;
  }

  return {
    ...current,
    disclosureVersion: current.disclosureVersion || defaults.disclosureVersion || "",
    termsReference: current.termsReference || defaults.termsReference || "",
    supportPhone: current.supportPhone || defaults.supportPhone || "",
    supportMessage: current.supportMessage || defaults.supportMessage || "",
    warningMessage: current.warningMessage || defaults.warningMessage || "",
    paymentAppPackage: current.paymentAppPackage || defaults.paymentAppPackage || "",
    paymentAppLabel: current.paymentAppLabel || defaults.paymentAppLabel || "",
    paymentUssd: current.paymentUssd || defaults.paymentUssd || "",
    refreshActionLabel: current.refreshActionLabel || defaults.refreshActionLabel || "Refresh account status",
  };
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusPillClasses(status: string) {
  const normalized = status.toUpperCase();
  if (["LOCKED", "FAILED", "OVERDUE"].includes(normalized)) {
    return "bg-red-100 text-red-700 border-red-200";
  }
  if (["SUCCEEDED", "UNLOCKED", "ACTIVE", "APPROVED"].includes(normalized)) {
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  }
  if (["PENDING", "PROCESSING", "APPROVAL_QUEUED", "UNKNOWN"].includes(normalized)) {
    return "bg-amber-100 text-amber-700 border-amber-200";
  }
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export default function DeviceControlPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const adminUser = user as AdminUser | null;
  const canManage = useMemo(
    () => adminHasPermission(adminUser, PERMISSIONS.MANAGE_DEVICE_CONTROL),
    [adminUser]
  );

  const [health, setHealth] = useState<KnoxHealth | null>(null);
  const [devices, setDevices] = useState<ManagedDevice[]>([]);
  const [commands, setCommands] = useState<ManagedCommand[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingCommands, setProcessingCommands] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [enrollForm, setEnrollForm] = useState(emptyEnrollForm);

  useEffect(() => {
    void loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [healthResponse, devicesResponse, commandsResponse] = await Promise.all([
        api.get("/knox-guard/health"),
        api.get("/knox-guard/devices"),
        api.get("/knox-guard/commands", { params: { limit: 20 } }),
      ]);

      setHealth(healthResponse.data);
      setDevices(devicesResponse.data.devices || []);
      setCommands(commandsResponse.data.commands || []);
      setEnrollForm((current) => withEnrollmentDefaults(current, healthResponse.data.policy?.customerExperienceDefaults));
    } catch (error: any) {
      console.error("Failed to load Knox Guard data:", error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to load Knox Guard dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProcessCommands = async () => {
    try {
      setProcessingCommands(true);
      const response = await api.post("/knox-guard/commands/process", { limit: 10 });
      toast({
        title: "Commands processed",
        description: `Processed ${response.data.result.processed} command(s).`,
      });
      await loadAll();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to process Knox Guard commands",
        variant: "destructive",
      });
    } finally {
      setProcessingCommands(false);
    }
  };

  const handleEnroll = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!enrollForm.contractId.trim()) {
      toast({ title: "Contract ID required", description: "Enter a contract ID to enroll", variant: "destructive" });
      return;
    }

    if (!enrollForm.disclosureAccepted) {
      toast({
        title: "Disclosure required",
        description: "Confirm that the customer was informed about device restriction terms before enrollment.",
        variant: "destructive",
      });
      return;
    }

    try {
      const customerExperienceDefaults = health?.policy.customerExperienceDefaults;
      const allowCustomerAppOnLockScreen = customerExperienceDefaults?.allowCustomerAppOnLockScreen ?? true;
      const allowSupportOnLockScreen = customerExperienceDefaults?.allowSupportOnLockScreen ?? true;
      const allowPaymentUssdOnLockScreen = (customerExperienceDefaults?.allowPaymentUssdOnLockScreen ?? true)
        && Boolean(enrollForm.paymentUssd.trim());

      setBusyKey("enroll");
      await api.post(`/knox-guard/contracts/${enrollForm.contractId.trim()}/enroll`, {
        deviceUid: enrollForm.deviceUid.trim() || undefined,
        deviceUidType: enrollForm.deviceUidType,
        approveId: enrollForm.approveId.trim() || undefined,
        knoxObjectId: enrollForm.knoxObjectId.trim() || undefined,
        knoxTenantDomain: enrollForm.knoxTenantDomain.trim() || undefined,
        metadata: {
          customerExperience: {
            disclosureAccepted: enrollForm.disclosureAccepted,
            disclosureVersion: enrollForm.disclosureVersion.trim() || undefined,
            termsReference: enrollForm.termsReference.trim() || undefined,
            supportPhone: enrollForm.supportPhone.trim() || undefined,
            supportMessage: enrollForm.supportMessage.trim() || undefined,
            warningMessage: enrollForm.warningMessage.trim() || undefined,
            paymentAppPackage: enrollForm.paymentAppPackage.trim() || undefined,
            paymentAppLabel: enrollForm.paymentAppLabel.trim() || undefined,
            paymentUssd: enrollForm.paymentUssd.trim() || undefined,
            refreshActionLabel: enrollForm.refreshActionLabel.trim() || undefined,
            allowCustomerAppOnLockScreen,
            allowSupportOnLockScreen,
            allowPaymentUssdOnLockScreen,
          },
        },
      });
      toast({
        title: "Enrollment queued",
        description: "The contract device was enrolled and queued for Knox Guard approval.",
      });
      setEnrollForm((current) => withEnrollmentDefaults({ ...emptyEnrollForm }, health?.policy.customerExperienceDefaults));
      await loadAll();
    } catch (error: any) {
      toast({
        title: "Enrollment failed",
        description: error.response?.data?.error || "Failed to enroll contract device",
        variant: "destructive",
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleContractAction = async (
    contractId: string,
    action: "evaluate" | "lock" | "unlock"
  ) => {
    try {
      setBusyKey(`${action}:${contractId}`);
      await api.post(`/knox-guard/contracts/${contractId}/${action}`, {});
      toast({
        title: action === "evaluate" ? "Device evaluated" : action === "lock" ? "Lock queued" : "Unlock queued",
        description: `Contract ${action} request completed successfully.`,
      });
      await loadAll();
    } catch (error: any) {
      toast({
        title: "Action failed",
        description: error.response?.data?.error || `Failed to ${action} device`,
        variant: "destructive",
      });
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <ProtectedRoute permissions={[PERMISSIONS.VIEW_DEVICE_CONTROL, PERMISSIONS.MANAGE_DEVICE_CONTROL]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Knox Guard Device Control</h1>
            <p className="mt-2 text-sm text-gray-600">
              Monitor financed Samsung devices, queue control actions, and track Knox Guard command flow.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => void loadAll()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            {canManage && (
              <button
                onClick={handleProcessCommands}
                disabled={processingCommands}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {processingCommands ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                Process Commands
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">Managed devices</span>
              <Smartphone className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-3 text-3xl font-bold text-slate-900">{health?.devices ?? 0}</div>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-amber-700">Pending commands</span>
              <Activity className="h-5 w-5 text-amber-600" />
            </div>
            <div className="mt-3 text-3xl font-bold text-amber-900">{health?.pendingCommands ?? 0}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">Knox config</span>
              <Shield className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-3">
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${health?.policy.knoxGuard.configured ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-red-200 bg-red-100 text-red-700"}`}>
                {health?.policy.knoxGuard.configured ? "Configured" : "Not configured"}
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">Mode</span>
              <AlertTriangle className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-3">
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${health?.policy.knoxGuard.dryRun ? "border-amber-200 bg-amber-100 text-amber-700" : "border-emerald-200 bg-emerald-100 text-emerald-700"}`}>
                {health?.policy.knoxGuard.dryRun ? "Dry run" : "Live"}
              </span>
            </div>
          </div>
        </div>

        {canManage && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Enroll contract device</h2>
              <p className="mt-1 text-sm text-slate-600">
                Queue a contract for Knox Guard enrollment. Capture disclosure and the exact locked-screen payment/support experience before approval.
              </p>
            </div>

            <form onSubmit={handleEnroll} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Contract ID</span>
                <input
                  value={enrollForm.contractId}
                  onChange={(e) => setEnrollForm((current) => ({ ...current, contractId: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-0 focus:border-blue-500"
                  placeholder="e.g. contract UUID"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Device UID override</span>
                <input
                  value={enrollForm.deviceUid}
                  onChange={(e) => setEnrollForm((current) => ({ ...current, deviceUid: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-0 focus:border-blue-500"
                  placeholder="IMEI or serial if needed"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Device UID type</span>
                <select
                  value={enrollForm.deviceUidType}
                  onChange={(e) => setEnrollForm((current) => ({ ...current, deviceUidType: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-0 focus:border-blue-500"
                >
                  <option value="SERIAL_NUMBER">SERIAL_NUMBER</option>
                  <option value="IMEI">IMEI</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Approve ID override</span>
                <input
                  value={enrollForm.approveId}
                  onChange={(e) => setEnrollForm((current) => ({ ...current, approveId: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-0 focus:border-blue-500"
                  placeholder="Defaults to contract number"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Knox object ID</span>
                <input
                  value={enrollForm.knoxObjectId}
                  onChange={(e) => setEnrollForm((current) => ({ ...current, knoxObjectId: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-0 focus:border-blue-500"
                  placeholder="Optional existing object ID"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Tenant domain</span>
                <input
                  value={enrollForm.knoxTenantDomain}
                  onChange={(e) => setEnrollForm((current) => ({ ...current, knoxTenantDomain: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-0 focus:border-blue-500"
                />
              </label>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="device-control-disclosure"
                    checked={enrollForm.disclosureAccepted}
                    onCheckedChange={(checked) =>
                      setEnrollForm((current) => ({ ...current, disclosureAccepted: checked === true }))
                    }
                    className="mt-0.5"
                  />
                  <div className="space-y-1">
                    <label htmlFor="device-control-disclosure" className="text-sm font-medium text-slate-900">
                      Customer disclosure confirmed
                    </label>
                    <p className="text-sm text-slate-600">
                      Confirm the customer was told that overdue payments can trigger device restriction while payment and support options remain available.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Disclosure version</span>
                  <input
                    value={enrollForm.disclosureVersion}
                    onChange={(e) => setEnrollForm((current) => ({ ...current, disclosureVersion: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-0 focus:border-blue-500"
                    placeholder="e.g. v1"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Terms reference or URL</span>
                  <input
                    value={enrollForm.termsReference}
                    onChange={(e) => setEnrollForm((current) => ({ ...current, termsReference: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-0 focus:border-blue-500"
                    placeholder="Policy link or internal signed-terms reference"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Support phone</span>
                  <input
                    value={enrollForm.supportPhone}
                    onChange={(e) => setEnrollForm((current) => ({ ...current, supportPhone: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-0 focus:border-blue-500"
                    placeholder="Customer service phone"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Payment app package</span>
                  <input
                    value={enrollForm.paymentAppPackage}
                    onChange={(e) => setEnrollForm((current) => ({ ...current, paymentAppPackage: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-0 focus:border-blue-500"
                    placeholder="e.g. com.aidootech.customer"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Payment app label</span>
                  <input
                    value={enrollForm.paymentAppLabel}
                    onChange={(e) => setEnrollForm((current) => ({ ...current, paymentAppLabel: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-0 focus:border-blue-500"
                    placeholder="Visible app name"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Payment USSD</span>
                  <input
                    value={enrollForm.paymentUssd}
                    onChange={(e) => setEnrollForm((current) => ({ ...current, paymentUssd: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-0 focus:border-blue-500"
                    placeholder="e.g. *170#"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Refresh action label</span>
                  <input
                    value={enrollForm.refreshActionLabel}
                    onChange={(e) => setEnrollForm((current) => ({ ...current, refreshActionLabel: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-0 focus:border-blue-500"
                    placeholder="Refresh account status"
                  />
                </label>
                <label className="block md:col-span-2 xl:col-span-3">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Support message on lock screen</span>
                  <Textarea
                    value={enrollForm.supportMessage}
                    onChange={(e) => setEnrollForm((current) => ({ ...current, supportMessage: e.target.value }))}
                    placeholder="Guidance shown to the customer on the lock screen."
                    className="min-h-[90px]"
                  />
                </label>
                <label className="block md:col-span-2 xl:col-span-3">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Warning message before restriction</span>
                  <Textarea
                    value={enrollForm.warningMessage}
                    onChange={(e) => setEnrollForm((current) => ({ ...current, warningMessage: e.target.value }))}
                    placeholder="Message used in warning and lock context."
                    className="min-h-[90px]"
                  />
                </label>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={busyKey === "enroll"}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {busyKey === "enroll" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
                  Enroll contract device
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Managed devices</h2>
                <p className="mt-1 text-sm text-slate-600">Current financed-device records linked to Knox Guard.</p>
              </div>
            </div>

            {loading ? (
              <div className="flex h-48 items-center justify-center text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading devices...
              </div>
            ) : devices.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
                No managed devices enrolled yet.
              </div>
            ) : (
              <div className="space-y-4">
                {devices.map((device) => (
                  <div key={device.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-semibold text-slate-900">{device.contract?.contractNumber ?? '—'}</span>
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusPillClasses(device.actualState)}`}>
                            actual: {device.actualState}
                          </span>
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusPillClasses(device.desiredState)}`}>
                            desired: {device.desiredState}
                          </span>
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusPillClasses(device.enrollmentStatus)}`}>
                            enrollment: {device.enrollmentStatus}
                          </span>
                        </div>
                        <div className="grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
                          <div>Customer: {device.customer?.firstName ?? '—'} {device.customer?.lastName ?? ''}</div>
                          <div>Phone: {device.customer?.phone ?? '—'}</div>
                          <div>Approve ID: {device.approveId}</div>
                          <div>Device UID: {device.deviceUid}</div>
                          <div>Outstanding: GHS {device.contract?.outstandingBalance?.toFixed(2) ?? '—'}</div>
                          <div>Inventory lock: {device.inventoryItem?.lockStatus || "—"}</div>
                        </div>
                        {device.customerExperience && (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                            <div className="grid gap-1 sm:grid-cols-2">
                              <div>Disclosure: {device.customerExperience.disclosureAccepted ? "Confirmed" : "Missing"}</div>
                              <div>Disclosure version: {device.customerExperience.disclosureVersion}</div>
                              <div>Support phone: {device.customerExperience.supportPhone || "—"}</div>
                              <div>Payment app: {device.customerExperience.paymentAppLabel} {device.customerExperience.paymentAppPackage ? `(${device.customerExperience.paymentAppPackage})` : ""}</div>
                              <div>Payment USSD: {device.customerExperience.paymentUssd || "—"}</div>
                              <div>Refresh label: {device.customerExperience.refreshActionLabel}</div>
                            </div>
                          </div>
                        )}
                        {device.lastError && (
                          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            Last error: {device.lastError}
                          </div>
                        )}
                        <div className="grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
                          <div>Last evaluated: {formatDate(device.lastEvaluatedAt)}</div>
                          <div>Last synced: {formatDate(device.lastSyncedAt)}</div>
                          <div>Last locked: {formatDate(device.lastLockedAt)}</div>
                          <div>Last unlocked: {formatDate(device.lastUnlockedAt)}</div>
                        </div>
                      </div>

                      {canManage && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => device.contract?.id && handleContractAction(device.contract.id, "evaluate")}
                            disabled={!device.contract?.id || busyKey === `evaluate:${device.contract?.id}`}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                          >
                            {busyKey === `evaluate:${device.contract?.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            Evaluate
                          </button>
                          <button
                            onClick={() => device.contract?.id && handleContractAction(device.contract.id, "lock")}
                            disabled={!device.contract?.id || busyKey === `lock:${device.contract?.id}`}
                            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                          >
                            {busyKey === `lock:${device.contract?.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                            Lock
                          </button>
                          <button
                            onClick={() => device.contract?.id && handleContractAction(device.contract.id, "unlock")}
                            disabled={!device.contract?.id || busyKey === `unlock:${device.contract?.id}`}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {busyKey === `unlock:${device.contract?.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
                            Unlock
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Recent commands</h2>
              <p className="mt-1 text-sm text-slate-600">Latest queued and processed Knox Guard commands.</p>

              <div className="mt-4 space-y-3">
                {commands.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                    No Knox Guard commands yet.
                  </div>
                ) : (
                  commands.map((command) => (
                    <div key={command.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{command.type}</div>
                          <div className="text-xs text-slate-500">{command.managedDevice?.contract?.contractNumber ?? '—'}</div>
                        </div>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusPillClasses(command.status)}`}>
                          {command.status}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        Attempts: {command.attempts} • Updated: {formatDate(command.updatedAt)}
                      </div>
                      {command.errorMessage && (
                        <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                          {command.errorMessage}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Policy snapshot</h2>
              <div className="mt-4 grid gap-3 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-4">
                  <span>Lock after overdue days</span>
                  <span className="font-semibold">{health?.policy.lockAfterOverdueDays ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Penalty blocking enabled</span>
                  <span className="font-semibold">{health?.policy.penaltyBlockingEnabled ? "Yes" : "No"}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Support phone</span>
                  <span className="font-semibold">{health?.policy.supportPhone || "Not set"}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Live actions enabled</span>
                  <span className="font-semibold">{health?.policy.knoxGuard.liveActionsEnabled ? "Yes" : "No"}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Webhook validation configured</span>
                  <span className="font-semibold">{health?.policy.knoxGuard.webhookValidationConfigured ? "Yes" : "No"}</span>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
                <div className="mb-2 font-semibold text-slate-800">Configured endpoint paths</div>
                <div className="grid gap-1">
                  {Object.entries(health?.policy.knoxGuard.configuredPaths || {}).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between gap-3">
                      <span>{key}</span>
                      <span className={`inline-flex items-center gap-1 font-medium ${value ? "text-emerald-700" : "text-slate-500"}`}>
                        {value ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                        {value ? "set" : "missing"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
