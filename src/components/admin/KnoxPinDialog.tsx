'use client';

import { useState } from 'react';
import { KeyRound, Loader2, X } from 'lucide-react';
import api from '@/lib/api';

/**
 * Offline unlock PIN for a Samsung (Knox Guard) phone that is locked and has
 * no data. Admins and Super Admins only — the backend enforces it too.
 */
export default function KnoxPinDialog({
  contractId,
  customer,
  onClose,
}: {
  contractId: string;
  customer?: string | null;
  onClose: () => void;
}) {
  const [passkey, setPasskey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [result, setResult] = useState<{ pins: string[]; dryRun: boolean; notice: string } | null>(null);

  const request = async () => {
    setLoading(true);
    setError(null);
    setHint(null);
    try {
      const { data } = await api.post(`/knox-guard/contracts/${contractId}/pin`, passkey.trim() ? { passkey: passkey.trim() } : {});
      setResult(data);
    } catch (err) {
      const body = (err as { response?: { data?: { error?: string; hint?: string } } })?.response?.data;
      setError(body?.error || 'Could not get a PIN');
      setHint(body?.hint || null);
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
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50">
              <KeyRound className="h-4 w-4 text-cyan-700" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Knox offline unlock PIN</h2>
              {customer && <p className="text-xs text-gray-500">{customer}</p>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {result ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Read this to the customer. They enter it on the lock screen — no data needed.</p>
            {result.pins.map((pin) => (
              <p key={pin} className="rounded-xl bg-gray-900 py-4 text-center font-mono text-3xl font-bold tracking-[0.3em] text-white">{pin}</p>
            ))}
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">{result.notice}</p>
            {result.dryRun && <p className="text-xs font-semibold text-amber-700">Dry run — not a real code.</p>}
            <button onClick={onClose} className="w-full rounded-xl bg-cyan-600 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700">Done</button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              For a customer who has paid but whose phone is locked with no data. The contract is checked first; no PIN is issued while Knox
              still requires the phone to be locked.
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Passkey shown on the customer&apos;s lock screen</label>
              <input
                className="h-10 w-full rounded-lg border border-gray-300 px-3 font-mono text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-cyan-500"
                inputMode="numeric"
                maxLength={20}
                value={passkey}
                onChange={(e) => setPasskey(e.target.value.replace(/[^A-Za-z0-9]/g, ''))}
                placeholder="Leave blank if no passkey is shown"
              />
            </div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {hint && <p className="text-xs text-gray-600">{hint}</p>}
            <button
              onClick={request}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Get PIN
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
