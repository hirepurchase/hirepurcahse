'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/useToast';
import { formatCurrency } from '@/lib/utils';
import { DollarSign, Save } from 'lucide-react';
import api from '@/lib/api';

interface CommissionSettings {
  id: string;
  fixedAmount: number;
  effectiveDate: string;
  updatedAt: string;
}

export default function CommissionSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<CommissionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fixedAmount: '', effectiveDate: '' });

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
        effectiveDate: data.effectiveDate.split('T')[0],
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to load commission settings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.fixedAmount);
    if (isNaN(amount) || amount < 0) {
      toast({ title: 'Validation Error', description: 'Commission amount must be a non-negative number', variant: 'destructive' });
      return;
    }
    if (!form.effectiveDate) {
      toast({ title: 'Validation Error', description: 'Effective date is required', variant: 'destructive' });
      return;
    }
    try {
      setSaving(true);
      const res = await api.put('/commission-settings', { fixedAmount: amount, effectiveDate: form.effectiveDate });
      setSettings(res.data as CommissionSettings);
      toast({ title: 'Saved', description: 'Commission settings updated successfully' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save commission settings', variant: 'destructive' });
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
          <p className="text-sm text-gray-500">Configure the fixed commission paid to agents per contract</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fixed Commission Amount (GHS)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.fixedAmount}
              onChange={(e) => setForm({ ...form, fixedAmount: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 50.00"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Each agent earns this fixed amount when a contract they created becomes active.
              They remit the deposit minus this commission to the company.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Effective Date
            </label>
            <input
              type="date"
              value={form.effectiveDate}
              onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              New contracts created on or after this date will use the updated commission amount.
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
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-500 font-medium mb-2">Current Setting</p>
            <div className="bg-blue-50 rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm text-gray-700">Commission per contract</span>
              <span className="text-sm font-semibold text-blue-700">{formatCurrency(settings.fixedAmount)}</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Last updated: {new Date(settings.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
