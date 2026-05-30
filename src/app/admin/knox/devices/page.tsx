'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Loader2,
  Lock,
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

function statusPill(status: string) {
  const s = status.toUpperCase();
  if (['LOCKED', 'FAILED', 'OVERDUE'].includes(s)) return 'bg-red-100 text-red-700 border-red-200';
  if (['SUCCEEDED', 'UNLOCKED', 'ACTIVE', 'APPROVED'].includes(s)) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (['PENDING', 'PROCESSING', 'APPROVAL_QUEUED', 'UNKNOWN'].includes(s)) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
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
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [pollingId, setPollingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDevices = useCallback(async (): Promise<ManagedDevice[]> => {
    const res = await api.get('/knox-guard/devices');
    return res.data.devices || [];
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setDevices(await fetchDevices());
    } catch {
      toast({ title: 'Error', description: 'Failed to load devices', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [fetchDevices]);

  useEffect(() => { void load(); }, [load]);

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
        const updated = await fetchDevices();
        setDevices(updated);
        const device = updated.find((d) => d.contract.id === contractId);
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

  const handleDelete = async (deviceUid: string) => {
    if (!confirm(`Remove device ${deviceUid} from the Devices API tenant?\nThis does not delete the local Knox record.`)) return;
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

  const filtered = useMemo(() => {
    if (!query.trim()) return devices;
    const q = query.toLowerCase();
    return devices.filter((d) =>
      d.contract.contractNumber.toLowerCase().includes(q) ||
      d.customer.firstName.toLowerCase().includes(q) ||
      d.customer.lastName.toLowerCase().includes(q) ||
      d.customer.phone.includes(q) ||
      d.deviceUid.toLowerCase().includes(q) ||
      d.approveId.toLowerCase().includes(q),
    );
  }, [devices, query]);

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
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-4 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-slate-500">{filtered.length} device{filtered.length !== 1 ? 's' : ''}</span>
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

      {/* List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading devices…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-16 text-center text-sm text-slate-500">
          {query ? 'No devices match your search.' : 'No managed devices enrolled yet.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((device) => {
            const expanded = expandedId === device.id;
            return (
              <div key={device.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                {/* Row */}
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{device.contract.contractNumber}</span>
                      {pollingId === device.contract.id ? (
                        <span className="inline-flex items-center gap-1.5 border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          processing…
                        </span>
                      ) : (
                        <>
                          <span className={`border px-2.5 py-0.5 text-[11px] font-semibold ${statusPill(device.actualState)}`}>
                            {device.actualState}
                          </span>
                          <span className={`border px-2.5 py-0.5 text-[11px] font-semibold ${statusPill(device.enrollmentStatus)}`}>
                            {device.enrollmentStatus}
                          </span>
                          {device.actualState !== device.desiredState && (
                            <span className="border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-[11px] font-semibold text-orange-700">
                              desired: {device.desiredState}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <div className="grid gap-x-6 gap-y-0.5 text-sm text-slate-600 sm:grid-cols-2">
                      <span>{device.customer.firstName} {device.customer.lastName}</span>
                      <span>{device.customer.phone}</span>
                      <span className="font-mono text-xs text-slate-400">{device.deviceUid}</span>
                      <span>Balance: GHS {device.contract.outstandingBalance.toFixed(2)}</span>
                    </div>
                    {device.lastError && (
                      <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700">
                        {device.lastError}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap shrink-0 items-center gap-2">
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
                      {expanded ? 'Less' : 'Details'}
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {expanded && (
                  <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                    <div className="grid gap-4 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-800">Device</p>
                        <p>Approve ID: {device.approveId}</p>
                        <p>UID type: {device.deviceUidType}</p>
                        {device.knoxObjectId && <p>Knox Object ID: {device.knoxObjectId}</p>}
                        {device.inventoryItem && <p>Serial: {device.inventoryItem.serialNumber}</p>}
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
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
