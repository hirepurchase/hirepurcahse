'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/hooks/useToast';
import { formatCurrency } from '@/lib/utils';
import { DollarSign, Save } from 'lucide-react';
import api from '@/lib/api';

interface CommissionSettings {
  id: string;
  fixedAmount: number;
  deferredAmount: number;
  completionBonus: number;
  effectiveDate: string;
  updatedAt: string;
}

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const INPUT = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function CommissionSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<CommissionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fixedAmount: '', deferredAmount: '0', completionBonus: '0', effectiveDate: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      setLoading(true);
      const res = await api.get('/commission-settings');
      const data = res.data as CommissionSettings;
      setSettings(data);
      setForm({
        fixedAmount: String(data.fixedAmount),
        deferredAmount: String(data.deferredAmount ?? 0),
        completionBonus: String(data.completionBonus ?? 0),
        effectiveDate: data.effectiveDate.split('T')[0],
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to load commission settings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  const amounts = {
    atSale: parseFloat(form.fixedAmount),
    held: parseFloat(form.deferredAmount || '0'),
    bonus: parseFloat(form.completionBonus || '0'),
  };
  const valid = [amounts.atSale, amounts.held, amounts.bonus].every((n) => Number.isFinite(n) && n >= 0);
  const atCompletion = valid ? amounts.held + amounts.bonus : 0;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) {
      toast({ title: 'Validation Error', description: 'Every amount must be a non-negative number', variant: 'destructive' });
      return;
    }
    if (!form.effectiveDate) {
      toast({ title: 'Validation Error', description: 'Effective date is required', variant: 'destructive' });
      return;
    }
    try {
      setSaving(true);
      const res = await api.put('/commission-settings', {
        fixedAmount: amounts.atSale,
        deferredAmount: amounts.held,
        completionBonus: amounts.bonus,
        effectiveDate: form.effectiveDate,
      });
      setSettings(res.data as CommissionSettings);
      toast({ title: 'Saved', description: 'New amounts apply to sales approved from now on.' });
    } catch (err) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast({ title: 'Error', description: message || 'Failed to save commission settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
          <DollarSign className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Commission Settings</h1>
          <p className="text-sm text-gray-500">What an agent earns per sale, and when</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm sm:p-6">
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kept at sale (GHS)</label>
            <input type="number" min="0" step="0.01" value={form.fixedAmount} onChange={(e) => setForm({ ...form, fixedAmount: e.target.value })} className={INPUT} required />
            <p className="text-xs text-gray-500 mt-1">The agent keeps this out of the deposit and remits the rest to the company.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Held until completion</label>
              <input type="number" min="0" step="0.01" value={form.deferredAmount} onChange={(e) => setForm({ ...form, deferredAmount: e.target.value })} className={INPUT} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Completion bonus</label>
              <input type="number" min="0" step="0.01" value={form.completionBonus} onChange={(e) => setForm({ ...form, completionBonus: e.target.value })} className={INPUT} />
            </div>
          </div>
          <p className="-mt-3 text-xs text-gray-500">
            Paid together when the customer completes the contract. Forfeited if the contract is cancelled or written off. Leave both at 0 to pay
            everything at sale, as before.
          </p>

          {valid && (
            <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
              {atCompletion > 0 ? (
                <>
                  An agent earns <span className="font-semibold">{formatCurrency(amounts.atSale + atCompletion)}</span> per completed sale:{' '}
                  {formatCurrency(amounts.atSale)} at sale and {formatCurrency(atCompletion)} when the customer completes.
                </>
              ) : (
                <>An agent earns {formatCurrency(amounts.atSale)} per sale, all of it at sale.</>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label>
            <input
              type="date"
              value={form.effectiveDate}
              max={todayIso()}
              onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
              className={INPUT}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Recorded for reference. New amounts apply to sales approved from the moment you save; sales already approved keep the amounts
              they were approved with.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>

        {settings && (
          <div className="mt-6 pt-5 border-t border-gray-100 space-y-2">
            <p className="text-xs text-gray-500 font-medium">Current Setting</p>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Kept at sale</span><span className="font-semibold">{formatCurrency(settings.fixedAmount)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Paid at completion</span><span className="font-semibold">{formatCurrency((settings.deferredAmount ?? 0) + (settings.completionBonus ?? 0))}</span></div>
            </div>
            <p className="text-xs text-gray-400">
              Last updated: {new Date(settings.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ·{' '}
              <Link href="/admin/agent/completion-commissions" className="text-blue-600 hover:underline">Completion commissions</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
