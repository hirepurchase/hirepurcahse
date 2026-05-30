'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Shield,
  Smartphone,
  PlusCircle,
  Settings,
  Lock,
  Unlock,
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';

interface KnoxHealth {
  devices: number;
  pendingCommands: number;
  policy: {
    lockAfterOverdueDays: number;
    penaltyBlockingEnabled: boolean;
    supportPhone: string | null;
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

interface RecentCommand {
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
    contract: { contractNumber: string };
  };
}

function statusPill(status: string) {
  const s = status.toUpperCase();
  if (['LOCKED', 'FAILED', 'OVERDUE'].includes(s)) return 'bg-red-100 text-red-700 border-red-200';
  if (['SUCCEEDED', 'UNLOCKED', 'ACTIVE', 'APPROVED'].includes(s)) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (['PENDING', 'PROCESSING', 'APPROVAL_QUEUED', 'UNKNOWN'].includes(s)) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function formatDate(v?: string | null) {
  if (!v) return '—';
  return new Date(v).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function KnoxOverviewPage() {
  const { toast } = useToast();
  const { hasAnyPermission } = usePermissions();
  const canManage = hasAnyPermission([PERMISSIONS.MANAGE_DEVICE_CONTROL]);

  const [health, setHealth] = useState<KnoxHealth | null>(null);
  const [commands, setCommands] = useState<RecentCommand[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [h, c] = await Promise.all([
        api.get('/knox-guard/health'),
        api.get('/knox-guard/commands', { params: { limit: 10 } }),
      ]);
      setHealth(h.data);
      setCommands(c.data.commands || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load Knox Guard overview', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleProcessCommands = async () => {
    try {
      setProcessing(true);
      const res = await api.post('/knox-guard/commands/process', { limit: 10 });
      toast({ title: 'Commands processed', description: `Processed ${res.data.result.processed} command(s).` });
      await load();
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Failed to process commands', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading overview…
      </div>
    );
  }

  const kg = health?.policy.knoxGuard;

  return (
    <div className="space-y-6">
      {/* Dry-run warning banner */}
      {kg?.dryRun && (
        <div className="flex items-start gap-3 border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="mt-0.5 text-lg leading-none">⚠</span>
          <div>
            <p className="font-semibold">Dry-run mode is active — no commands are being sent to Knox.</p>
            <p className="mt-0.5 text-xs text-amber-700">
              Set <code className="font-mono bg-amber-100 px-1">KNOX_GUARD_DRY_RUN=false</code> and <code className="font-mono bg-amber-100 px-1">KNOX_GUARD_ENABLE_LIVE_ACTIONS=true</code> in your environment to go live.
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">System status and recent activity at a glance.</p>
        <div className="flex gap-2">
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          {canManage && (
            <button
              onClick={handleProcessCommands}
              disabled={processing}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-60"
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
              Process Commands
            </button>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Managed devices</span>
            <Smartphone className="h-5 w-5 text-slate-400" />
          </div>
          <div className="mt-3 text-3xl font-bold text-slate-900">{health?.devices ?? 0}</div>
          <Link href="/admin/knox/devices" className="mt-2 inline-flex items-center gap-1 text-xs text-cyan-600 hover:underline">
            View all →
          </Link>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-amber-700">Pending commands</span>
            <Activity className="h-5 w-5 text-amber-600" />
          </div>
          <div className="mt-3 text-3xl font-bold text-amber-900">{health?.pendingCommands ?? 0}</div>
          {canManage && (
            <button onClick={handleProcessCommands} disabled={processing} className="mt-2 text-xs text-amber-700 hover:underline disabled:opacity-50">
              Run now →
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Knox API</span>
            <Shield className="h-5 w-5 text-slate-400" />
          </div>
          <div className="mt-3">
            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${kg?.configured ? 'border-emerald-200 bg-emerald-100 text-emerald-700' : 'border-red-200 bg-red-100 text-red-700'}`}>
              {kg?.configured ? 'Configured' : 'Not configured'}
            </span>
          </div>
          <Link href="/admin/knox/settings" className="mt-2 inline-flex items-center gap-1 text-xs text-cyan-600 hover:underline">
            Edit settings →
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Mode</span>
            <AlertTriangle className="h-5 w-5 text-slate-400" />
          </div>
          <div className="mt-3">
            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${kg?.dryRun ? 'border-amber-200 bg-amber-100 text-amber-700' : 'border-emerald-200 bg-emerald-100 text-emerald-700'}`}>
              {kg?.dryRun ? 'Dry run' : 'Live'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr_1fr]">
        {/* Policy snapshot */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Active policy</h2>
            <Link href="/admin/knox/settings" className="text-xs text-cyan-600 hover:underline">Edit</Link>
          </div>
          <div className="space-y-3 text-sm">
            {[
              ['Lock after overdue days', `${health?.policy.lockAfterOverdueDays ?? '—'} days`],
              ['Penalty blocking', health?.policy.penaltyBlockingEnabled ? 'Enabled' : 'Disabled'],
              ['Support phone', health?.policy.supportPhone || 'Not set'],
              ['Live actions', kg?.liveActionsEnabled ? 'Yes' : 'No'],
              ['Webhook validation', kg?.webhookValidationConfigured ? 'Configured' : 'Missing'],
            ].map(([label, val]) => (
              <div key={label} className="flex items-center justify-between gap-2">
                <span className="text-slate-500">{label}</span>
                <span className="font-medium text-slate-800">{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* API endpoint status */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">API endpoint paths</h2>
          <div className="space-y-2 text-sm">
            {Object.entries(kg?.configuredPaths || {}).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-slate-500 truncate">{key}</span>
                <span className={`inline-flex items-center gap-1 text-xs font-semibold ${value ? 'text-emerald-700' : 'text-red-600'}`}>
                  {value ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  {value ? 'set' : 'missing'}
                </span>
              </div>
            ))}
            {!kg?.configuredPaths || Object.keys(kg.configuredPaths).length === 0 ? (
              <p className="text-slate-400 text-xs">No path data available.</p>
            ) : null}
          </div>
        </div>

        {/* Quick actions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Quick actions</h2>
          <div className="space-y-2">
            <Link
              href="/admin/knox/enroll"
              className="flex items-center gap-3 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-medium text-cyan-800 hover:bg-cyan-100 transition-colors"
            >
              <PlusCircle className="h-4 w-4" /> Enroll a device
            </Link>
            <Link
              href="/admin/knox/devices"
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Smartphone className="h-4 w-4" /> View all devices
            </Link>
            <Link
              href="/admin/knox/settings"
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Settings className="h-4 w-4" /> Edit Knox settings
            </Link>
          </div>
        </div>
      </div>

      {/* Recent commands */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Recent commands</h2>
          <span className="text-xs text-slate-400">Last 10</span>
        </div>
        {commands.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            No Knox Guard commands yet.
          </div>
        ) : (
          <div className="space-y-2">
            {commands.map((cmd) => (
              <div key={cmd.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{cmd.type}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusPill(cmd.status)}`}>
                      {cmd.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {cmd.managedDevice.contract.contractNumber} · {cmd.managedDevice.deviceUid}
                  </div>
                  {cmd.errorMessage && (
                    <div className="mt-1 text-xs text-red-600 truncate">{cmd.errorMessage}</div>
                  )}
                </div>
                <div className="shrink-0 text-right text-xs text-slate-400">
                  <div>Attempts: {cmd.attempts}</div>
                  <div>{formatDate(cmd.updatedAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
