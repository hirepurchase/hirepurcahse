'use client';

import { Fragment, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  Lock,
  Radio,
  RefreshCw,
  Search,
  Smartphone,
  Trash2,
  Unlock,
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { adminHasPermission, PERMISSIONS } from '@/lib/permissions';
import { Pagination } from '@/components/ui/pagination';
import type { AdminUser } from '@/types';

interface ManagedDevice {
  id: string;
  provider: string;
  deviceUid: string;
  deviceUidType: string;
  approveId: string;
  knoxObjectId?: string | null;
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
  customerExperience?: {
    disclosureAccepted: boolean;
    disclosureVersion: string;
    supportPhone?: string | null;
    paymentAppLabel: string;
    paymentAppPackage?: string | null;
    paymentUssd?: string | null;
    refreshActionLabel: string;
  } | null;
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
}

interface KnoxUploadPortal {
  visible: boolean;
  status?: string | null;
  objectId?: string | null;
  model?: string | null;
  portalSerial?: string | null;
  createDate?: string | null;
  modifiedDate?: string | null;
  syncState: string;
  lookupStatusCode?: number | null;
  lookupError?: string | null;
}

interface KnoxUploadItem {
  id: string;
  serialNumber: string;
  status: string;
  lockStatus?: string | null;
  knoxUploadStatus?: string | null;
  knoxUploadId?: string | null;
  knoxUploadError?: string | null;
  knoxUploadRetries: number;
  updatedAt: string;
  product: {
    id: string;
    name: string;
  };
  contract?: {
    id: string;
    contractNumber: string;
    status: string;
  } | null;
  managedDevice?: {
    id: string;
    approveId: string;
    knoxObjectId?: string | null;
    knoxStatus?: string | null;
    enrollmentStatus: string;
    actualState: string;
    desiredState: string;
    isActive: boolean;
  } | null;
  portal?: KnoxUploadPortal | null;
}

interface KnoxUploadSummary {
  visible: number;
  notVisible: number;
  missingInKnox: number;
  lookupFailed: number;
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}


interface PortalCheckDevice {
  managedDeviceId: string;
  deviceUid: string;
  contractNumber: string | null;
  customer: string | null;
  localState: string;
  localEnrollmentStatus: string;
  portalFound: boolean;
  portalStatus: string | null;
  portalObjectId: string | null;
  portalModel: string | null;
  dryRun: boolean;
  error: string | null;
}

interface PortalCheckResult {
  summary: {
    total: number;
    foundOnPortal: number;
    notFoundOnPortal: number;
    lookupErrors: number;
    dryRun: boolean;
  };
  devices: PortalCheckDevice[];
}

function statusPill(status: string) {
  const s = status.toUpperCase();
  if (['LOCKED', 'FAILED', 'OVERDUE'].includes(s)) return 'bg-red-100 text-red-700 border-red-200';
  if (['SUCCEEDED', 'UNLOCKED', 'ACTIVE', 'APPROVED'].includes(s)) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (['PENDING', 'PROCESSING', 'APPROVAL_QUEUED', 'UNKNOWN'].includes(s)) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function syncStatePill(state: string) {
  const s = state.toUpperCase();
  if (['SYNCED'].includes(s)) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (['MISSING_IN_KNOX', 'VISIBLE_WITH_LOCAL_MISMATCH'].includes(s)) return 'bg-red-100 text-red-700 border-red-200';
  if (['LOOKUP_FAILED'].includes(s)) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function syncStateLabel(state: string) {
  switch (state) {
    case 'SYNCED':
      return 'Visible in Knox';
    case 'MISSING_IN_KNOX':
      return 'Missing in Knox';
    case 'VISIBLE_WITH_LOCAL_MISMATCH':
      return 'Portal/local mismatch';
    case 'LOOKUP_FAILED':
      return 'Lookup failed';
    default:
      return 'Not visible';
  }
}

function fmt(v?: string | null) {
  if (!v) return '—';
  return new Date(v).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function KnoxDevicesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const canManage = useMemo(() => adminHasPermission(user as AdminUser | null, PERMISSIONS.MANAGE_DEVICE_CONTROL), [user]);

  const [devices, setDevices] = useState<ManagedDevice[]>([]);
  const [uploads, setUploads] = useState<KnoxUploadItem[]>([]);
  const [uploadSummary, setUploadSummary] = useState<KnoxUploadSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [pollingId, setPollingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [devicePagination, setDevicePagination] = useState<PaginationState>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [uploadPagination, setUploadPagination] = useState<PaginationState>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });


  // Managed devices search + filter
  const [deviceQuery, setDeviceQuery] = useState('');
  const [deviceActualStateFilter, setDeviceActualStateFilter] = useState('');
  const [deviceEnrollmentFilter, setDeviceEnrollmentFilter] = useState('');
  const deferredDeviceQuery = useDeferredValue(deviceQuery.trim());

  // Upload table search + filter (independent from the global search)
  const [uploadQuery, setUploadQuery] = useState('');
  const [uploadStatusFilter, setUploadStatusFilter] = useState('');
  const [uploadSyncFilter, setUploadSyncFilter] = useState('');
  const deferredUploadQuery = useDeferredValue(uploadQuery.trim());

  // Knox portal live check
  const [portalCheck, setPortalCheck] = useState<PortalCheckResult | null>(null);
  const [portalCheckLoading, setPortalCheckLoading] = useState(false);
  const [portalCheckError, setPortalCheckError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deferredQuery = useDeferredValue(query.trim());

  const fetchDevices = useCallback(async (page = devicePagination.page): Promise<{ devices: ManagedDevice[]; pagination: PaginationState }> => {
    const res = await api.get('/knox-guard/devices', {
      params: {
        page,
        limit: devicePagination.limit,
        q: deferredDeviceQuery || undefined,
      },
    });
    return {
      devices: res.data.devices || [],
      pagination: res.data.pagination || {
        page,
        limit: devicePagination.limit,
        total: 0,
        totalPages: 1,
      },
    };
  }, [deferredDeviceQuery, devicePagination.limit, devicePagination.page]);

  const fetchUploads = useCallback(async (page = uploadPagination.page): Promise<{ items: KnoxUploadItem[]; portalSummary: KnoxUploadSummary | null; pagination: PaginationState }> => {
    const res = await api.get('/knox-guard/upload/status', {
      params: {
        page,
        limit: uploadPagination.limit,
        includePortal: true,
        q: deferredUploadQuery || undefined,
        status: uploadStatusFilter || undefined,
      },
    });
    return {
      items: res.data.items || [],
      portalSummary: res.data.portalSummary || null,
      pagination: res.data.pagination || {
        page,
        limit: uploadPagination.limit,
        total: 0,
        totalPages: 1,
      },
    };
  }, [deferredUploadQuery, uploadStatusFilter, uploadPagination.limit, uploadPagination.page]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [nextDevices, nextUploads] = await Promise.all([
        fetchDevices(devicePagination.page),
        fetchUploads(uploadPagination.page),
      ]);
      setDevices(nextDevices.devices);
      setDevicePagination(nextDevices.pagination);
      setUploads(nextUploads.items);
      setUploadSummary(nextUploads.portalSummary);
      setUploadPagination(nextUploads.pagination);
    } catch {
      toast({ title: 'Error', description: 'Failed to load devices', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [devicePagination.page, fetchDevices, fetchUploads, toast, uploadPagination.page]);

  useEffect(() => { void load(); }, [load]);

  const fetchPortalCheck = useCallback(async () => {
    setPortalCheckLoading(true);
    setPortalCheckError(null);
    try {
      const res = await api.get('/knox-guard/devices/portal-check');
      setPortalCheck(res.data);
    } catch (err: any) {
      setPortalCheckError(err.response?.data?.error || 'Failed to check Knox portal');
    } finally {
      setPortalCheckLoading(false);
    }
  }, []);

  // Stop any in-progress poll on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const startPolling = (contractId: string, prevState: string) => {
    setPollingId(contractId);
    let attempts = 0;
    const MAX = 15;
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const updated = await fetchDevices(devicePagination.page);
        setDevices(updated.devices);
        setDevicePagination(updated.pagination);
        const device = updated.devices.find((d) => d.contract.id === contractId);
        const stateChanged = device && device.actualState !== prevState;
        if (stateChanged || attempts >= MAX) {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setPollingId(null);
          if (attempts >= MAX && !stateChanged) {
            toast({ title: 'No response yet', description: 'Command is still processing — check back shortly.' });
          }
        }
      } catch {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        setPollingId(null);
      }
    }, 4000);
  };

  const handleAction = async (contractId: string, action: 'evaluate' | 'lock' | 'unlock') => {
    const key = `${action}:${contractId}`;
    const prevDevice = devices.find((d) => d.contract.id === contractId);
    const prevState = prevDevice?.actualState ?? 'UNKNOWN';
    try {
      setBusyKey(key);
      await api.post(`/knox-guard/contracts/${contractId}/${action}`, {});
      toast({
        title: action === 'evaluate' ? 'Evaluation queued' : action === 'lock' ? 'Lock queued' : 'Unlock queued',
        description: 'Waiting for Knox to respond…',
      });
      startPolling(contractId, prevState);
    } catch (err: any) {
      toast({ title: 'Action failed', description: err.response?.data?.error || `Failed to ${action} device`, variant: 'destructive' });
    } finally {
      setBusyKey(null);
    }
  };

  const handleApprove = async (contractId: string) => {
    const key = `approve:${contractId}`;
    try {
      setBusyKey(key);
      await api.post(`/knox-guard/contracts/${contractId}/approve`, {});
      toast({ title: 'Approval queued', description: 'Knox Guard will approve the device on the next command cycle.' });
      await load();
    } catch (err: any) {
      toast({ title: 'Approval failed', description: err.response?.data?.error || 'Failed to queue approval', variant: 'destructive' });
    } finally {
      setBusyKey(null);
    }
  };

  const handleResync = async (inventoryItemId: string) => {
    const key = `resync:${inventoryItemId}`;
    try {
      setBusyKey(key);
      const res = await api.post('/knox-guard/upload/retry', { inventoryItemIds: [inventoryItemId] });
      toast({
        title: res.data?.dryRun ? 'Dry-run: resync simulated' : 'Resync submitted',
        description: res.data?.message || 'Device queued for re-upload to Knox.',
      });
      await load();
    } catch (err: any) {
      toast({ title: 'Resync failed', description: err.response?.data?.error || 'Failed to resync device', variant: 'destructive' });
    } finally {
      setBusyKey(null);
    }
  };

  const handleReset = async (serialNumber: string) => {
    if (!confirm(`Reset Knox upload state for ${serialNumber}?\nThis clears the upload record in the local database so it can be re-uploaded fresh.`)) return;
    const key = `reset:${serialNumber}`;
    try {
      setBusyKey(key);
      const res = await api.post('/knox-guard/devices/reset', { imei: serialNumber });
      toast({ title: 'Reset successful', description: res.data?.message || `${serialNumber} reset for re-upload.` });
      await load();
    } catch (err: any) {
      toast({ title: 'Reset failed', description: err.response?.data?.error || 'Failed to reset device', variant: 'destructive' });
    } finally {
      setBusyKey(null);
    }
  };

  const handleDelete = async (deviceUid: string) => {
    if (!confirm(`Remove device ${deviceUid} from the Knox tenant?\nThis does not delete the local Knox record.`)) return;
    const key = `delete:${deviceUid}`;
    try {
      setBusyKey(key);
      const res = await api.delete('/knox-guard/devices/delete', { data: { imeis: [deviceUid] } });
      const txId: string | null = res.data?.transactionId ?? null;
      toast({
        title: res.data?.dryRun ? 'Dry-run: delete simulated' : 'Deletion queued',
        description: txId ? `Transaction ID: ${txId}` : 'Device removal submitted.',
      });
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err.response?.data?.error || 'Failed to delete device', variant: 'destructive' });
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search contract, customer, IMEI…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setExpandedId(null);
              setDevicePagination((current) => ({ ...current, page: 1 }));
              setUploadPagination((current) => ({ ...current, page: 1 }));
            }}
            className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-4 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-slate-500">
            {devicePagination.total} managed · {uploadPagination.total} uploaded
          </span>
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <Link
            href="/admin/knox/enroll"
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
          >
            <Smartphone className="h-4 w-4" /> Enroll device
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Managed devices</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{devicePagination.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Uploaded rows</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{uploadPagination.total}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Visible on page</p>
          <p className="mt-2 text-2xl font-bold text-emerald-900">{uploadSummary?.visible ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-red-700">Missing on page</p>
          <p className="mt-2 text-2xl font-bold text-red-900">{uploadSummary?.missingInKnox ?? 0}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Managed Devices</h2>
            <p className="text-sm text-slate-500">Active financed-device records enrolled for Knox Guard control.</p>
          </div>
        </div>

        {/* Search + Knox state filters */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Contract, customer, IMEI…"
              value={deviceQuery}
              onChange={(e) => {
                setDeviceQuery(e.target.value);
                setExpandedId(null);
                setDevicePagination((c) => ({ ...c, page: 1 }));
              }}
              className="w-full rounded-xl border border-slate-300 py-1.5 pl-9 pr-4 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
            />
          </div>
          <select
            value={deviceActualStateFilter}
            onChange={(e) => { setDeviceActualStateFilter(e.target.value); setDevicePagination((c) => ({ ...c, page: 1 })); }}
            className="rounded-xl border border-slate-300 py-1.5 pl-3 pr-8 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
          >
            <option value="">All states</option>
            <option value="LOCKED">Locked</option>
            <option value="UNLOCKED">Unlocked</option>
            <option value="PENDING">Pending</option>
            <option value="UNKNOWN">Unknown</option>
          </select>
          <select
            value={deviceEnrollmentFilter}
            onChange={(e) => { setDeviceEnrollmentFilter(e.target.value); setDevicePagination((c) => ({ ...c, page: 1 })); }}
            className="rounded-xl border border-slate-300 py-1.5 pl-3 pr-8 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
          >
            <option value="">All enrollment</option>
            <option value="ACTIVE">Active</option>
            <option value="APPROVED">Approved</option>
            <option value="APPROVAL_QUEUED">Approval queued</option>
            <option value="PENDING">Pending</option>
            <option value="COMPLETING">Completing</option>
            <option value="COMPLETE">Complete</option>
          </select>
          {(deviceQuery || deviceActualStateFilter || deviceEnrollmentFilter) && (
            <button
              onClick={() => {
                setDeviceQuery('');
                setDeviceActualStateFilter('');
                setDeviceEnrollmentFilter('');
                setDevicePagination((c) => ({ ...c, page: 1 }));
              }}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              Clear filters
            </button>
          )}
          <span className="ml-auto text-xs text-slate-500">{devicePagination.total} devices</span>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading managed devices…
          </div>
        ) : devices.filter((d) =>
            (!deviceActualStateFilter || d.actualState === deviceActualStateFilter) &&
            (!deviceEnrollmentFilter || d.enrollmentStatus === deviceEnrollmentFilter)
          ).length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            {deviceQuery || deviceActualStateFilter || deviceEnrollmentFilter ? 'No managed devices match your filters.' : 'No managed devices enrolled yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Contract</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Device</th>
                  <th className="px-4 py-3 font-medium">Knox state</th>
                  <th className="px-4 py-3 font-medium">Balance</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {devices.filter((d) =>
                  (!deviceActualStateFilter || d.actualState === deviceActualStateFilter) &&
                  (!deviceEnrollmentFilter || d.enrollmentStatus === deviceEnrollmentFilter)
                ).map((device) => {
                  const expanded = expandedId === device.id;
                  return (
                    <Fragment key={device.id}>
                      <tr className="align-top">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{device.contract.contractNumber}</div>
                          <div className="mt-1 text-xs text-slate-500">{device.contract.status}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-900">{device.customer.firstName} {device.customer.lastName}</div>
                          <div className="mt-1 text-xs text-slate-500">{device.customer.phone}</div>
                          <div className="mt-1 text-xs text-slate-400">{device.customer.membershipId || '—'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs text-slate-900">{device.deviceUid}</div>
                          <div className="mt-1 text-xs text-slate-500">Approve ID: {device.approveId}</div>
                          <div className="mt-1 text-xs text-slate-500">Inventory: {device.inventoryItem?.serialNumber || '—'}</div>
                        </td>
                        <td className="px-4 py-3">
                          {pollingId === device.contract.id ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              processing…
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusPill(device.actualState)}`}>
                                {device.actualState}
                              </span>
                              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusPill(device.enrollmentStatus)}`}>
                                {device.enrollmentStatus}
                              </span>
                              {device.actualState !== device.desiredState && (
                                <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-[11px] font-semibold text-orange-700">
                                  desired: {device.desiredState}
                                </span>
                              )}
                            </div>
                          )}
                          {device.lastError && (
                            <p className="mt-2 max-w-xs text-xs text-red-600">{device.lastError}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-900">
                          GHS {device.contract.outstandingBalance.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {canManage && device.enrollmentStatus === 'APPROVAL_QUEUED' && (
                              <button
                                onClick={() => handleApprove(device.contract.id)}
                                disabled={!!busyKey}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                                title="Queue Knox Guard approval — succeeds once the Knox Guard app connects on the device"
                              >
                                {busyKey === `approve:${device.contract.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                                Approve
                              </button>
                            )}
                            {canManage && (
                              <>
                                <button
                                  onClick={() => handleAction(device.contract.id, 'evaluate')}
                                  disabled={!!busyKey}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                >
                                  {busyKey === `evaluate:${device.contract.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                                  Evaluate
                                </button>
                                <button
                                  onClick={() => handleAction(device.contract.id, 'lock')}
                                  disabled={!!busyKey}
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                                >
                                  {busyKey === `lock:${device.contract.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                                  Lock
                                </button>
                                <button
                                  onClick={() => handleAction(device.contract.id, 'unlock')}
                                  disabled={!!busyKey}
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                                >
                                  {busyKey === `unlock:${device.contract.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlock className="h-3.5 w-3.5" />}
                                  Unlock
                                </button>
                                <button
                                  onClick={() => handleDelete(device.deviceUid)}
                                  disabled={!!busyKey}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                                >
                                  {busyKey === `delete:${device.deviceUid}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                  Remove
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => setExpandedId(expanded ? null : device.id)}
                              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
                            >
                              {expanded ? 'Hide' : 'Details'}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="grid gap-4 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
                              <div className="space-y-1">
                                <p className="font-semibold text-slate-800">Device</p>
                                <p>Approve ID: {device.approveId}</p>
                                <p>UID type: {device.deviceUidType}</p>
                                <p>Knox Object ID: {device.knoxObjectId || '—'}</p>
                                <p>Inventory lock: {device.inventoryItem?.lockStatus || '—'}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="font-semibold text-slate-800">Timestamps</p>
                                <p>Last evaluated: {fmt(device.lastEvaluatedAt)}</p>
                                <p>Last synced: {fmt(device.lastSyncedAt)}</p>
                                <p>Last locked: {fmt(device.lastLockedAt)}</p>
                                <p>Last unlocked: {fmt(device.lastUnlockedAt)}</p>
                                <p>Enrolled: {fmt(device.createdAt)}</p>
                              </div>
                              {device.customerExperience && (
                                <div className="space-y-1">
                                  <p className="font-semibold text-slate-800">Lock screen</p>
                                  <p className="flex items-center gap-1">
                                    Disclosure:
                                    {device.customerExperience.disclosureAccepted
                                      ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                      : <span className="text-red-600">Missing</span>
                                    }
                                    {device.customerExperience.disclosureVersion && ` (${device.customerExperience.disclosureVersion})`}
                                  </p>
                                  <p>Support: {device.customerExperience.supportPhone || '—'}</p>
                                  <p>App: {device.customerExperience.paymentAppLabel}</p>
                                  <p>USSD: {device.customerExperience.paymentUssd || '—'}</p>
                                  <p>Refresh label: {device.customerExperience.refreshActionLabel}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && devicePagination.totalPages > 1 && (
          <Pagination
            currentPage={devicePagination.page}
            totalPages={devicePagination.totalPages}
            onPageChange={(page) => setDevicePagination((current) => ({ ...current, page }))}
            totalItems={devicePagination.total}
            itemsPerPage={devicePagination.limit}
          />
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Knox Upload Status</h2>
            <p className="text-sm text-slate-500">
              Local upload records enriched with a live Knox portal lookup per serial number.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
              Lookup failures: {uploadSummary?.lookupFailed ?? 0}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
              Not visible: {uploadSummary?.notVisible ?? 0}
            </span>
          </div>
        </div>

        {/* Search + filters */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Serial, contract, product…"
              value={uploadQuery}
              onChange={(e) => {
                setUploadQuery(e.target.value);
                setUploadPagination((c) => ({ ...c, page: 1 }));
              }}
              className="w-full rounded-xl border border-slate-300 py-1.5 pl-9 pr-4 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
            />
          </div>
          <select
            value={uploadStatusFilter}
            onChange={(e) => {
              setUploadStatusFilter(e.target.value);
              setUploadPagination((c) => ({ ...c, page: 1 }));
            }}
            className="rounded-xl border border-slate-300 py-1.5 pl-3 pr-8 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
          >
            <option value="">All upload statuses</option>
            <option value="UPLOADED">Uploaded</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="DELETED">Deleted</option>
            <option value="DELETE_PENDING">Delete pending</option>
            <option value="SKIPPED">Skipped</option>
          </select>
          <select
            value={uploadSyncFilter}
            onChange={(e) => {
              setUploadSyncFilter(e.target.value);
              setUploadPagination((c) => ({ ...c, page: 1 }));
            }}
            className="rounded-xl border border-slate-300 py-1.5 pl-3 pr-8 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
          >
            <option value="">All sync states</option>
            <option value="SYNCED">Visible in Knox</option>
            <option value="MISSING_IN_KNOX">Missing in Knox</option>
            <option value="VISIBLE_WITH_LOCAL_MISMATCH">Portal/local mismatch</option>
            <option value="LOOKUP_FAILED">Lookup failed</option>
            <option value="NOT_VISIBLE">Not visible</option>
          </select>
          {(uploadQuery || uploadStatusFilter || uploadSyncFilter) && (
            <button
              onClick={() => {
                setUploadQuery('');
                setUploadStatusFilter('');
                setUploadSyncFilter('');
                setUploadPagination((c) => ({ ...c, page: 1 }));
              }}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              Clear filters
            </button>
          )}
          <span className="ml-auto text-xs text-slate-500">{uploadPagination.total} records</span>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Checking Knox upload visibility…
          </div>
        ) : uploads.filter((item) => !uploadSyncFilter || item.portal?.syncState === uploadSyncFilter).length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            {uploadQuery || uploadStatusFilter || uploadSyncFilter ? 'No upload records match your filters.' : 'No Knox upload records found.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Serial / Contract</th>
                  <th className="px-4 py-3 font-medium">Local status</th>
                  <th className="px-4 py-3 font-medium">Portal status</th>
                  <th className="px-4 py-3 font-medium">Sync</th>
                  <th className="px-4 py-3 font-medium">Device</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  {canManage && <th className="px-4 py-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {uploads.filter((item) => !uploadSyncFilter || item.portal?.syncState === uploadSyncFilter).map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-slate-900">{item.serialNumber}</div>
                      <div className="mt-1 text-xs text-slate-500">{item.product.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {item.contract ? `${item.contract.contractNumber} · ${item.contract.status}` : 'No contract linked'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusPill(item.knoxUploadStatus || 'UNKNOWN')}`}>
                        {item.knoxUploadStatus || 'UNKNOWN'}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">Inventory: {item.status}</div>
                      <div className="mt-1 text-xs text-slate-500">Lock: {item.lockStatus || '—'}</div>
                      {item.knoxUploadError && (
                        <p className="mt-2 max-w-xs text-xs text-red-600">{item.knoxUploadError}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusPill(item.portal?.status || (item.portal?.visible ? 'VISIBLE' : 'NOT_VISIBLE'))}`}>
                        {item.portal?.status || (item.portal?.visible ? 'VISIBLE' : 'NOT_VISIBLE')}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        {item.portal?.model || 'Model unavailable'}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Portal serial: {item.portal?.portalSerial || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${syncStatePill(item.portal?.syncState || 'NOT_VISIBLE')}`}>
                        {syncStateLabel(item.portal?.syncState || 'NOT_VISIBLE')}
                      </div>
                      {item.portal?.lookupError && (
                        <p className="mt-2 max-w-xs text-xs text-amber-700">{item.portal.lookupError}</p>
                      )}
                      {item.managedDevice && (
                        <div className="mt-2 text-xs text-slate-500">
                          Managed: {item.managedDevice.actualState} / {item.managedDevice.enrollmentStatus}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      <div>{item.portal?.objectId ? `Object ID: ${item.portal.objectId}` : 'Object ID: —'}</div>
                      <div className="mt-1">{item.managedDevice?.approveId ? `Approve ID: ${item.managedDevice.approveId}` : 'Approve ID: —'}</div>
                      <div className="mt-1">Retries: {item.knoxUploadRetries}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      <div>Local: {fmt(item.updatedAt)}</div>
                      <div className="mt-1">Portal: {fmt(item.portal?.modifiedDate)}</div>
                    </td>
                    {canManage && (() => {
                      const isFailed = item.knoxUploadStatus === 'FAILED';
                      const isNotVisible = item.portal?.syncState === 'MISSING_IN_KNOX' || item.portal?.syncState === 'NOT_VISIBLE';
                      const showActions = isFailed || isNotVisible;
                      return (
                        <td className="px-4 py-3">
                          {showActions ? (
                            <div className="flex flex-col gap-1.5">
                              {isFailed && (
                                <button
                                  onClick={() => void handleResync(item.id)}
                                  disabled={!!busyKey}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-cyan-700 disabled:opacity-60"
                                  title="Re-upload this device to Knox"
                                >
                                  {busyKey === `resync:${item.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                  Resync
                                </button>
                              )}
                              <button
                                onClick={() => void handleReset(item.serialNumber)}
                                disabled={!!busyKey}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                title="Clear Knox upload state in local DB"
                              >
                                {busyKey === `reset:${item.serialNumber}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                Reset
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })()}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && uploadPagination.totalPages > 1 && (
          <Pagination
            currentPage={uploadPagination.page}
            totalPages={uploadPagination.totalPages}
            onPageChange={(page) => setUploadPagination((current) => ({ ...current, page }))}
            totalItems={uploadPagination.total}
            itemsPerPage={uploadPagination.limit}
          />
        )}
      </div>

      {/* ── Knox Portal Live Check ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Radio className="h-5 w-5 text-cyan-600" />
              Knox Portal Live Check
            </h2>
            <p className="text-sm text-slate-500">
              Queries the Samsung Knox Guard portal for every active enrolled device and shows real-time status.
            </p>
          </div>
          <button
            onClick={() => void fetchPortalCheck()}
            disabled={portalCheckLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-60"
          >
            {portalCheckLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
            {portalCheck ? 'Re-check portal' : 'Check portal now'}
          </button>
        </div>

        {!portalCheck && !portalCheckLoading && !portalCheckError && (
          <div className="flex flex-col items-center justify-center gap-3 p-12 text-center text-slate-500">
            <Radio className="h-10 w-10 text-slate-300" />
            <p className="text-sm">Click <span className="font-medium text-cyan-600">Check portal now</span> to query Samsung Knox Guard for all enrolled active devices.</p>
          </div>
        )}

        {portalCheckLoading && (
          <div className="flex h-40 items-center justify-center text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Querying Knox Guard portal…
          </div>
        )}

        {portalCheckError && (
          <div className="flex items-center gap-3 p-6 text-sm text-red-600">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {portalCheckError}
          </div>
        )}

        {portalCheck && !portalCheckLoading && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3 border-b border-slate-100 p-4 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total checked</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{portalCheck.summary.total}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Found on portal</p>
                <p className="mt-1 text-2xl font-bold text-emerald-900">{portalCheck.summary.foundOnPortal}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Not on portal</p>
                <p className="mt-1 text-2xl font-bold text-amber-900">{portalCheck.summary.notFoundOnPortal}</p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-red-700">Lookup errors</p>
                <p className="mt-1 text-2xl font-bold text-red-900">{portalCheck.summary.lookupErrors}</p>
              </div>
            </div>

            {portalCheck.summary.dryRun && (
              <div className="mx-4 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Dry-run mode active — results are simulated, not from the live Knox portal.
              </div>
            )}

            {portalCheck.devices.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">No active enrolled devices to check.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Device / Contract</th>
                      <th className="px-4 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 font-medium">Local state</th>
                      <th className="px-4 py-3 font-medium">Portal status</th>
                      <th className="px-4 py-3 font-medium">Object ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {portalCheck.devices.map((d) => (
                      <tr key={d.managedDeviceId} className="align-top">
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs text-slate-900">{d.deviceUid}</div>
                          <div className="mt-1 text-xs text-slate-500">{d.contractNumber ?? '—'}</div>
                          {d.portalModel && <div className="mt-1 text-xs text-slate-400">{d.portalModel}</div>}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-700">{d.customer ?? '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex w-fit rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusPill(d.localState)}`}>
                              {d.localState}
                            </span>
                            <span className={`inline-flex w-fit rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusPill(d.localEnrollmentStatus)}`}>
                              {d.localEnrollmentStatus}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {d.error ? (
                            <div className="flex items-center gap-1.5 text-xs text-red-600">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              {d.error}
                            </div>
                          ) : d.portalFound ? (
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusPill(d.portalStatus ?? 'UNKNOWN')}`}>
                                {d.portalStatus ?? 'UNKNOWN'}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs text-amber-700">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              Not found on portal
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">
                          {d.portalObjectId ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
