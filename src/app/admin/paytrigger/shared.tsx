'use client';

import { useState } from 'react';
import { KeyRound, Loader2, X } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

/** Shared pieces for the PayTrigger (Transsion) admin screens. */

export interface PtDevice {
  id: string;
  imei: string;
  deviceTag: string | null;
  contractId: string | null;
  enrollmentStatus: 'QUEUED' | 'ACTIVE' | 'UNENFORCEABLE' | 'CANCELLED' | 'REMOVED';
  committedState: 'LOCKED' | 'UNLOCKED' | 'PENDING' | 'UNKNOWN';
  scheduleExpiresAt: string | null;
  providerExpiresAt: string | null;
  releaseAfter: string | null;
  releaseHeld: boolean;
  holdMessageShown: boolean;
  lastConnectAt: string | null;
  apkVersion: string | null;
  licenceConsumedAt: string | null;
  pinUnlocksUsed: number;
  awaitingPinSince: string | null;
  lastError: string | null;
  updatedAt: string;
  contractNumber?: string | null;
  contractStatus?: string | null;
  customer?: string | null;
  customerPhone?: string | null;
  needsKeyCode?: boolean;
}

export const errorText = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback;

const ENROL_TONE: Record<string, string> = {
  QUEUED: 'bg-slate-100 text-slate-700',
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  UNENFORCEABLE: 'bg-red-50 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  REMOVED: 'bg-gray-100 text-gray-500',
};
const ENROL_LABEL: Record<string, string> = {
  QUEUED: 'Waiting to activate',
  ACTIVE: 'Active',
  UNENFORCEABLE: 'Cannot enforce',
  CANCELLED: 'Cancelled',
  REMOVED: 'Released',
};

export function EnrolmentBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold', ENROL_TONE[status] || 'bg-gray-100 text-gray-600')}>
      {ENROL_LABEL[status] || status}
    </span>
  );
}

/** Has the lock date we gave PayTrigger not yet passed? */
export function isOpenUntil(expiresAt: string | null | undefined): boolean {
  return !!expiresAt && new Date(expiresAt).getTime() > Date.now();
}

/** What the phone should be doing, read from the lock date we last gave PayTrigger. */
export function PhoneStateBadge({ device }: { device: Pick<PtDevice, 'enrollmentStatus' | 'providerExpiresAt' | 'awaitingPinSince' | 'holdMessageShown'> }) {
  if (device.enrollmentStatus === 'REMOVED') return <Tag tone="gray">Released</Tag>;
  if (device.enrollmentStatus !== 'ACTIVE') return <Tag tone="gray">Not active</Tag>;
  if (device.awaitingPinSince) return <Tag tone="red">Paid — still locked</Tag>;
  if (device.holdMessageShown) return <Tag tone="amber">Held for agent deposit</Tag>;
  return isOpenUntil(device.providerExpiresAt) ? <Tag tone="green">Open until {formatDateTime(device.providerExpiresAt)}</Tag> : <Tag tone="red">Locked</Tag>;
}

function Tag({ tone, children }: { tone: 'green' | 'red' | 'amber' | 'gray'; children: React.ReactNode }) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-800',
    gray: 'bg-gray-100 text-gray-600',
  };
  return <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold', tones[tone])}>{children}</span>;
}

/**
 * Offline unlock. The backend pushes the contract's current lock date first and
 * only then asks PayTrigger for the 9-digit code, so the code carries the new
 * date onto a phone that has no data.
 */
export function PinDialog({
  deviceId,
  needsKeyCode,
  customer,
  onClose,
  onIssued,
}: {
  deviceId: string;
  needsKeyCode?: boolean;
  customer?: string | null;
  onClose: () => void;
  onIssued?: () => void;
}) {
  const [keyCode, setKeyCode] = useState('');
  const [askKey, setAskKey] = useState(!!needsKeyCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState<{ pin: string; opensUntil: string; dryRun: boolean } | null>(null);

  const request = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post(`/paytrigger/devices/${deviceId}/pin`, askKey ? { keyCode } : {});
      if (data.needsKeyCode) {
        setAskKey(true);
        setError(data.error);
      } else {
        setPin(data);
        onIssued?.();
      }
    } catch (err) {
      setError(errorText(err, 'Could not issue a PIN'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
              <KeyRound className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Offline unlock PIN</h2>
              {customer && <p className="text-xs text-gray-500">{customer}</p>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {pin ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Read this code to the customer. They enter it on the lock screen — no data needed.</p>
            <p className="rounded-xl bg-gray-900 py-4 text-center font-mono text-3xl font-bold tracking-[0.3em] text-white">{pin.pin}</p>
            <p className="text-xs text-gray-500">
              Opens the phone until <span className="font-semibold text-gray-700">{formatDateTime(pin.opensUntil)}</span>.
              {pin.dryRun && <span className="ml-1 font-semibold text-amber-700">Dry run — not a real code.</span>}
            </p>
            <Button className="bg-indigo-600 text-white hover:bg-indigo-700 w-full" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Only for a customer who has paid but whose phone has no data. The system first moves the phone&apos;s lock date
              to match the contract, then issues the code.
            </p>
            {askKey && (
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">4-digit key shown on the customer&apos;s lock screen</label>
                <Input inputMode="numeric" maxLength={4} value={keyCode} onChange={(e) => setKeyCode(e.target.value.replace(/\D/g, ''))} placeholder="0000" />
                <p className="mt-1 text-[11px] text-gray-500">Older phones (PayTrigger app below V2.2.6.004) need this.</p>
              </div>
            )}
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <Button className="bg-indigo-600 text-white hover:bg-indigo-700 w-full" onClick={request} disabled={loading || (askKey && keyCode.length !== 4)}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
              Issue PIN
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function Section({ title, subtitle, children, right }: { title: string; subtitle?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
        </div>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
