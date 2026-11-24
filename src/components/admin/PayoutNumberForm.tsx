'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Loader2, Smartphone } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/useToast';
import { formatDateTime } from '@/lib/utils';

export interface PayoutAccount {
  number: string | null;
  network: string | null;
  registeredName: string | null;
  check: string | null;
  updatedAt: string | null;
}

const NETWORK_LABEL: Record<string, string> = { MTN: 'MTN MoMo', TELECEL: 'Telecel Cash', AIRTELTIGO: 'AirtelTigo Money' };

/** A guess from the number's prefix; the person still chooses (numbers can be moved between networks). */
function guessNetwork(n: string): string | null {
  const p = n.replace(/\D/g, '').replace(/^233/, '0').slice(0, 3);
  if (['024', '025', '053', '054', '055', '059'].includes(p)) return 'MTN';
  if (['020', '050'].includes(p)) return 'TELECEL';
  if (['026', '027', '056', '057'].includes(p)) return 'AIRTELTIGO';
  return null;
}

export function payoutCheckText(check: string | null | undefined, registeredName: string | null | undefined): { ok: boolean; text: string } | null {
  if (!check) return null;
  if (check === 'MATCHED') return { ok: true, text: `Registered to ${registeredName}` };
  if (check === 'PARTIAL') return { ok: true, text: `Registered to ${registeredName} (partly matches your name)` };
  if (check === 'MISMATCH') return { ok: false, text: `Registered to ${registeredName}, a different name` };
  if (check === 'NOT_REGISTERED') return { ok: false, text: 'Not registered on the network' };
  return { ok: true, text: 'Name could not be checked' };
}

/** The signed-in person's own payout MoMo number: view and change it (password needed). */
export default function PayoutNumberForm({ onSaved }: { onSaved?: (a: PayoutAccount) => void }) {
  const { toast } = useToast();
  const [account, setAccount] = useState<PayoutAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [number, setNumber] = useState('');
  const [network, setNetwork] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get('/admin-users/me/payout-account')
      .then(({ data }) => { setAccount(data.payoutAccount); setEditing(!data.payoutAccount?.number); })
      .catch(() => setError('Could not load your payout number.'))
      .finally(() => setLoading(false));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.put('/admin-users/me/payout-account', { number, network, currentPassword: password });
      setAccount(data.payoutAccount);
      setEditing(false);
      setPassword('');
      toast({ title: 'Payout number saved', description: 'An SMS confirming the change has been sent to your phone.' });
      onSaved?.(data.payoutAccount);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex min-h-24 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>;

  const check = payoutCheckText(account?.check, account?.registeredName);

  return (
    <div className="space-y-4">
      {account?.number && !editing && (
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-start gap-3">
            <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold tabular-nums text-slate-900">{account.number}</p>
              <p className="text-sm text-slate-600">{NETWORK_LABEL[account.network || ''] ?? account.network}</p>
              {check && (
                <p className={`mt-1 flex items-center gap-1.5 text-sm ${check.ok ? 'text-emerald-700' : 'text-amber-800'}`}>
                  {check.ok ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <AlertTriangle className="h-4 w-4" aria-hidden="true" />}
                  {check.text}
                </p>
              )}
              {account.updatedAt && <p className="mt-1 text-xs text-slate-500">Last changed {formatDateTime(account.updatedAt)}</p>}
            </div>
          </div>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => { setNumber(account.number || ''); setNetwork(account.network || ''); setEditing(true); }}>
            Change number
          </Button>
        </div>
      )}

      {editing && (
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="payout-number">MoMo number</Label>
            <Input id="payout-number" inputMode="tel" autoComplete="tel" placeholder="0241234567" value={number}
              onChange={(e) => { setNumber(e.target.value); const g = guessNetwork(e.target.value); if (g && !network) setNetwork(g); }} required />
          </div>
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium text-slate-900">Network</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {Object.entries(NETWORK_LABEL).map(([key, label]) => (
                <label key={key} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm ${network === key ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}>
                  <input type="radio" name="payout-network" value={key} checked={network === key} onChange={() => setNetwork(key)} className="h-4 w-4" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="payout-password">Your password, to confirm</Label>
            <Input id="payout-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <p className="text-xs text-slate-500">
            Use a wallet in your own name. We check the name the network has on the number, and send an SMS to your phone whenever it changes.
          </p>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {account?.number && <Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>}
            <Button type="submit" disabled={saving || !number || !network || !password} className="bg-emerald-600 text-white hover:bg-emerald-700">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save payout number
            </Button>
          </div>
        </form>
      )}
      {!editing && error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
