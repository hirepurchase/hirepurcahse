'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, KeyRound, Loader2, PauseCircle, PlayCircle, RefreshCw, Unlock } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/useToast';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { EnrolmentBadge, PhoneStateBadge, PinDialog, PtDevice, Section, errorText } from '../../shared';

interface Detail {
  device: PtDevice;
  contract: {
    id: string;
    contractNumber: string;
    status: string;
    totalPrice: number;
    totalPaid: number;
    outstandingBalance: number;
    customer: { firstName: string; lastName: string; phone: string };
    createdBy: { firstName: string; lastName: string; phone: string | null };
    agentLedger: { outstandingBalance: number; status: string } | null;
    inventoryItem: { product: { name: string } } | null;
  } | null;
  logs: Array<{ id: string; action: string; success: boolean; dryRun: boolean; skippedReason: string | null; providerCode: string | null; createdAt: string; request: { nextRepayTime?: number | string } | null }>;
  canIssuePin: boolean;
}

const ACTION_LABEL: Record<string, string> = {
  ENROL: 'Enrolled',
  LINK: 'Linked to contract',
  ACTIVATED: 'Activated on the phone',
  EXTEND: 'Lock date moved later (open)',
  LOCK: 'Told to lock',
  SYNC: 'Lock-screen text updated',
  STATUS_READ: 'Status read',
  PIN: 'Offline PIN issued',
  RELEASE: 'Released — lock removed',
  RELEASE_SCHEDULED: 'Release scheduled',
  RELEASE_HELD: 'Release paused',
  RELEASE_UNHELD: 'Release resumed',
  CANCEL: 'Enrolment cancelled',
  CALLBACK_1000: 'Phone reported its state',
  CALLBACK_2000: 'Phone finished removal',
  CALLBACK_4000: 'Restriction over the limit',
};

export default function PayTriggerDeviceDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const load = useCallback(() => {
    api
      .get(`/paytrigger/devices/${id}`)
      .then(({ data }) => {
        setDetail(data);
        setError(null);
      })
      .catch((err) => setError(errorText(err, 'Could not load device')));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (key: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(key);
    try {
      await fn();
      toast({ title: done });
      load();
    } catch (err) {
      toast({ title: 'Failed', description: errorText(err, 'Request failed'), variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  if (error) return <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>;
  if (!detail) return <p className="py-10 text-center text-sm text-gray-400">Loading…</p>;

  const { device, contract } = detail;
  const canManage = hasPermission(PERMISSIONS.MANAGE_DEVICE_CONTROL);
  const canRelease = hasPermission(PERMISSIONS.WRITE_OFF_CONTRACT);
  const active = device.enrollmentStatus === 'ACTIVE';
  const customer = contract ? `${contract.customer.firstName} ${contract.customer.lastName}` : null;

  return (
    <div className="space-y-4">
      <Link href="/admin/paytrigger/devices" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft className="h-4 w-4" /> Devices
      </Link>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-lg font-bold text-gray-900">{customer || 'Not sold yet'}</p>
            <p className="text-sm text-gray-500">
              {contract?.inventoryItem?.product.name || 'Transsion phone'} · IMEI {device.imei}
              {device.deviceTag && <> · tag {device.deviceTag}</>}
            </p>
            {contract && (
              <p className="mt-1 text-sm">
                <Link href={`/admin/contracts/${contract.id}`} className="font-medium text-blue-600 hover:underline">{contract.contractNumber}</Link>
                <span className="ml-2 text-gray-500">{contract.status}</span>
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <EnrolmentBadge status={device.enrollmentStatus} />
            {active && <PhoneStateBadge device={device} />}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {detail.canIssuePin && active && (
            <Button className="bg-indigo-600 text-white hover:bg-indigo-700" size="sm" onClick={() => setPinOpen(true)}>
              <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Offline PIN
            </Button>
          )}
          {canManage && contract && (
            <Button size="sm" variant="outline" disabled={busy === 'rec'} onClick={() => act('rec', () => api.post(`/paytrigger/devices/${id}/reconcile`), 'Phone brought in line with the contract')}>
              {busy === 'rec' ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
              Reconcile now
            </Button>
          )}
          {canManage && device.releaseAfter && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy === 'hold'}
              onClick={() => act('hold', () => api.post(`/paytrigger/devices/${id}/hold-release`, { held: !device.releaseHeld }), device.releaseHeld ? 'Release resumed' : 'Release paused')}
            >
              {device.releaseHeld ? <PlayCircle className="mr-1.5 h-3.5 w-3.5" /> : <PauseCircle className="mr-1.5 h-3.5 w-3.5" />}
              {device.releaseHeld ? 'Resume release' : 'Pause release'}
            </Button>
          )}
          {canRelease && active && contract?.status === 'COMPLETED' && (
            <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => setReleaseOpen(true)}>
              <Unlock className="mr-1.5 h-3.5 w-3.5" /> Release now
            </Button>
          )}
          {canManage && device.enrollmentStatus === 'QUEUED' && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy === 'cancel'}
              onClick={() => act('cancel', () => api.post(`/paytrigger/devices/${id}/cancel-enrolment`), 'Enrolment cancelled — licence kept')}
            >
              Cancel enrolment
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Lock date">
          <dl className="space-y-2 text-sm">
            <Row label="Phone open until" value={device.providerExpiresAt ? formatDateTime(device.providerExpiresAt) : 'Locked since activation'} />
            <Row label="Contract says" value={device.scheduleExpiresAt ? formatDateTime(device.scheduleExpiresAt) : '—'} />
            {device.releaseAfter && <Row label="Release after" value={`${formatDateTime(device.releaseAfter)}${device.releaseHeld ? ' (paused)' : ''}`} />}
            <Row label="Phone reports" value={device.committedState === 'PENDING' ? 'Not confirmed yet' : device.committedState.toLowerCase()} />
            <Row label="Last seen online" value={device.lastConnectAt ? formatDateTime(device.lastConnectAt) : '—'} />
            <Row label="App version" value={device.apkVersion || '—'} />
            <Row label="PINs issued" value={String(device.pinUnlocksUsed)} />
          </dl>
          {device.lastError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{device.lastError}</p>}
        </Section>

        {contract && (
          <Section title="Contract">
            <dl className="space-y-2 text-sm">
              <Row label="Paid" value={`${formatCurrency(contract.totalPaid)} of ${formatCurrency(contract.totalPrice)}`} />
              <Row label="Outstanding" value={formatCurrency(contract.outstandingBalance)} />
              <Row label="Customer phone" value={contract.customer.phone} href={`tel:${contract.customer.phone}`} />
              <Row label="Agent" value={`${contract.createdBy.firstName} ${contract.createdBy.lastName}`} />
              <Row
                label="Agent deposit"
                value={contract.agentLedger ? (contract.agentLedger.outstandingBalance > 0 ? `${formatCurrency(contract.agentLedger.outstandingBalance)} owed` : 'Remitted') : 'No ledger'}
                tone={contract.agentLedger && contract.agentLedger.outstandingBalance > 0 ? 'amber' : undefined}
              />
            </dl>
          </Section>
        )}
      </div>

      <Section title="Timeline" subtitle="Everything asked of PayTrigger for this phone. PayTrigger keeps no history of its own.">
        {detail.logs.length === 0 ? (
          <p className="text-sm text-gray-400">Nothing yet.</p>
        ) : (
          <ol className="space-y-3">
            {detail.logs.map((l) => (
              <li key={l.id} className="flex gap-3 text-sm">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${l.success ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">
                    {ACTION_LABEL[l.action] || l.action}
                    {l.dryRun && <span className="ml-1.5 rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-800">DRY RUN</span>}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDateTime(l.createdAt)}
                    {l.request?.nextRepayTime && <> · lock date {formatDateTime(new Date(Number(l.request.nextRepayTime) * 1000))}</>}
                    {l.providerCode && l.providerCode !== '200' && <> · code {l.providerCode}</>}
                  </p>
                  {l.skippedReason && <p className="text-xs text-gray-600">{l.skippedReason}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Section>

      {pinOpen && <PinDialog deviceId={device.id} needsKeyCode={device.needsKeyCode} customer={customer} onClose={() => setPinOpen(false)} onIssued={load} />}

      {releaseOpen && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setReleaseOpen(false)} />
          <div className="relative z-10 w-full max-w-md space-y-3 rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
            <h2 className="text-base font-semibold text-gray-900">Release this phone permanently?</h2>
            <p className="text-sm text-gray-600">
              The PayTrigger app uninstalls itself and the phone can never be locked again. This cannot be undone. Releases normally happen
              automatically 24 hours after the contract is paid off.
            </p>
            <Input placeholder="Type RELEASE" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setReleaseOpen(false)}>Keep</Button>
              <Button
                className="flex-1 bg-red-600 text-white hover:bg-red-700"
                disabled={confirmText.trim().toUpperCase() !== 'RELEASE' || busy === 'release'}
                onClick={() =>
                  act('release', () => api.post(`/paytrigger/devices/${id}/release`, { confirmation: confirmText }), 'Phone released').then(() => setReleaseOpen(false))
                }
              >
                Release
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, href, tone }: { label: string; value: string; href?: string; tone?: 'amber' }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-500">{label}</dt>
      <dd className={`text-right font-medium ${tone === 'amber' ? 'text-amber-700' : 'text-gray-900'}`}>
        {href ? <a href={href} className="text-indigo-700">{value}</a> : value}
      </dd>
    </div>
  );
}
