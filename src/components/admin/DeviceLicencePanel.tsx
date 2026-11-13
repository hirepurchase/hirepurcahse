'use client';

import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Loader2, Pencil, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/hooks/useToast';

interface Licences {
  knox: { purchased: number | null; inUse: number; onContracts: number; inStock: number; remaining: number | null };
  payTrigger: { total?: number | null; used?: number | null; remaining?: number | null; activeDevices: number; error?: string; checkedAt?: string };
}

/** Low when under 10% of the total, or under 50 seats. */
function tone(remaining: number | null | undefined, total: number | null | undefined) {
  if (remaining === null || remaining === undefined) return 'text-gray-500';
  if (remaining <= 0) return 'text-red-600';
  if (remaining < 50 || (total && remaining / total < 0.1)) return 'text-amber-600';
  return 'text-emerald-600';
}

/**
 * Device-lock licences left for Samsung (Knox Guard) and Transsion
 * (PayTrigger). Super admins only — the endpoint refuses everyone else.
 */
export function DeviceLicencePanel() {
  const { toast } = useToast();
  const [data, setData] = useState<Licences | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [seats, setSeats] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    try {
      const res = await api.get(`/licences${refresh ? '?refresh=1' : ''}`);
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveSeats = async () => {
    setSaving(true);
    try {
      const res = await api.put('/licences/knox', { purchased: Number(seats) });
      setData((prev) => (prev ? { ...prev, knox: res.data.knox } : prev));
      setEditing(false);
      toast({ title: 'Saved', description: 'Knox Guard seats bought updated.' });
    } catch (error: any) {
      toast({ title: 'Not saved', description: error?.response?.data?.error || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!data && !loading) return null;

  const knox = data?.knox;
  const pt = data?.payTrigger;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <KeyRound className="h-4 w-4 text-gray-500" />
          Device licences remaining
        </p>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-50"
          title="Check again"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Samsung — Knox Guard */}
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-500">Samsung · Knox Guard</p>
          {knox && (
            <>
              <p className={`mt-1 text-2xl font-bold ${tone(knox.remaining, knox.purchased)}`}>
                {knox.remaining === null ? '—' : knox.remaining.toLocaleString()}
                {knox.purchased !== null && <span className="ml-1 text-sm font-normal text-gray-500">of {knox.purchased.toLocaleString()} left</span>}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {knox.inUse.toLocaleString()} in use: {knox.onContracts.toLocaleString()} on contracts, {knox.inStock.toLocaleString()} in stock
              </p>
              {editing ? (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={seats}
                    onChange={(e) => setSeats(e.target.value)}
                    aria-label="Knox Guard seats bought"
                    className="w-28 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                    placeholder="Seats bought"
                  />
                  <button
                    type="button"
                    onClick={() => void saveSeats()}
                    disabled={saving || seats === ''}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button type="button" onClick={() => setEditing(false)} className="text-xs text-gray-500">
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSeats(knox.purchased !== null ? String(knox.purchased) : '');
                    setEditing(true);
                  }}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                >
                  <Pencil className="h-3 w-3" />
                  {knox.purchased === null ? 'Enter seats bought' : 'Change seats bought'}
                </button>
              )}
              <p className="mt-2 text-[11px] leading-snug text-gray-400">
                Knox gives no licence count, so seats in use are counted from enrolled phones. Enter the total bought
                from the Knox portal&apos;s licence page.
              </p>
            </>
          )}
        </div>

        {/* Transsion — PayTrigger */}
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-500">Transsion · PayTrigger</p>
          {pt &&
            (pt.error ? (
              <>
                <p className="mt-1 text-2xl font-bold text-gray-400">—</p>
                <p className="mt-1 text-xs text-red-600">{pt.error}</p>
                <p className="mt-1 text-xs text-gray-500">{pt.activeDevices.toLocaleString()} phones active</p>
              </>
            ) : (
              <>
                <p className={`mt-1 text-2xl font-bold ${tone(pt.remaining, pt.total)}`}>
                  {pt.remaining?.toLocaleString() ?? '—'}
                  {pt.total !== null && pt.total !== undefined && (
                    <span className="ml-1 text-sm font-normal text-gray-500">of {pt.total.toLocaleString()} left</span>
                  )}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {pt.used?.toLocaleString() ?? '—'} used · {pt.activeDevices.toLocaleString()} phones active here
                </p>
                <p className="mt-2 text-[11px] leading-snug text-gray-400">Live from PayTrigger.</p>
              </>
            ))}
        </div>
      </div>
    </div>
  );
}
