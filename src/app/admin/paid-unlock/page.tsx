'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import {
  PaidUnlockSettingsSection,
  PaidUnlockSettingsValue,
  normaliseTiers,
  unlockTiersProblem,
} from '@/components/admin/PaidUnlockSettingsSection';

/**
 * Paid temporary unlock settings on a page of their own (Administration →
 * Paid Temporary Unlock). The same settings also appear on Knox Guard →
 * Settings; both save to the device-lock settings row. Only these three
 * fields are sent, so nothing else on that row is touched from here.
 */
export default function PaidUnlockSettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const canManage = isSuperAdmin() || hasPermission(PERMISSIONS.MANAGE_DEVICE_CONTROL);

  const [saved, setSaved] = useState<PaidUnlockSettingsValue | null>(null);
  const [form, setForm] = useState<PaidUnlockSettingsValue>({});
  const [maxHours, setMaxHours] = useState(45 * 24);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const pick = (s: any): PaidUnlockSettingsValue => ({
    temporaryUnlockEnabled: Boolean(s.temporaryUnlockEnabled),
    temporaryUnlockMaxUses: s.temporaryUnlockMaxUses ?? 2,
    temporaryUnlockTiers: normaliseTiers(s.temporaryUnlockTiers),
  });

  useEffect(() => {
    if (!canManage) {
      router.replace('/admin');
      return;
    }
    api
      .get('/knox-guard/settings')
      .then(({ data }) => {
        setSaved(pick(data));
        setForm(pick(data));
        setUpdatedAt(data.updatedAt ?? null);
        if (data.temporaryUnlockMaxHours) setMaxHours(data.temporaryUnlockMaxHours);
      })
      .catch(() => toast({ title: 'Error', description: 'Failed to load the settings', variant: 'destructive' }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage]);

  const save = async () => {
    const problem = unlockTiersProblem(normaliseTiers(form.temporaryUnlockTiers), maxHours);
    if (problem) {
      toast({ title: 'Check the tiers', description: problem, variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.patch('/knox-guard/settings', {
        temporaryUnlockEnabled: form.temporaryUnlockEnabled,
        temporaryUnlockMaxUses: form.temporaryUnlockMaxUses,
        temporaryUnlockTiers: normaliseTiers(form.temporaryUnlockTiers),
      });
      setSaved(pick(data.settings));
      setForm(pick(data.settings));
      setUpdatedAt(data.settings?.updatedAt ?? null);
      toast({
        title: 'Saved',
        description: data.settings?.temporaryUnlockEnabled
          ? 'Paid temporary unlock is on. Locked customers can now pay part of their arrears to open their phone.'
          : 'Paid temporary unlock is off.',
      });
    } catch (err: any) {
      toast({ title: 'Not saved', description: err.response?.data?.error || 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading settings…
      </div>
    );
  }
  if (!canManage) return null;

  const changed = JSON.stringify(form) !== JSON.stringify(saved);

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Paid Temporary Unlock</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Let a locked customer pay part of their arrears to open their phone for a while.
          </p>
          {updatedAt && <p className="mt-1 text-xs text-gray-400">Last saved: {new Date(updatedAt).toLocaleString()}</p>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => saved && setForm(saved)}
            disabled={saving || !changed}
            className="rounded-xl border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Reset
          </button>
          <button
            onClick={() => void save()}
            disabled={saving || !changed}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <PaidUnlockSettingsSection value={form} maxHours={maxHours} onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))} />
    </div>
  );
}
