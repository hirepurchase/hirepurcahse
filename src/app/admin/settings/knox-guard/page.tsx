'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';

interface KnoxGuardSettings {
  id: string;
  supportPhone: string | null;
  lockAfterOverdueDays: number;
  blockOnUnpaidPenalties: boolean;
  maxCommandRetries: number;
  commandCron: string;
  commandBatchSize: number;
  paymentAppPackage: string;
  paymentAppLabel: string;
  paymentUssd: string | null;
  refreshActionLabel: string;
  disclosureVersion: string;
  disclosureSummary: string;
  termsReference: string | null;
  supportMessage: string;
  warningMessage: string;
  allowCustomerAppOnLockScreen: boolean;
  allowSupportOnLockScreen: boolean;
  allowPaymentUssdOnLockScreen: boolean;
  updatedAt: string;
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600 peer-disabled:opacity-50" />
    </label>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="pb-4 border-b border-gray-200 mb-6">
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

const inputCls = 'w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent';
const textareaCls = `${inputCls} resize-y`;

export default function KnoxGuardSettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { hasPermission, isSuperAdmin } = usePermissions();

  const canManage = isSuperAdmin() || hasPermission(PERMISSIONS.MANAGE_DEVICE_CONTROL);

  const [settings, setSettings] = useState<KnoxGuardSettings | null>(null);
  const [form, setForm] = useState<Partial<KnoxGuardSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!canManage) {
      router.replace('/admin/device-control');
      return;
    }
    fetchSettings();
  }, [canManage]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/knox-guard/settings');
      setSettings(res.data);
      setForm(res.data);
    } catch {
      toast({ title: 'Error', description: 'Failed to load Knox Guard settings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const set = <K extends keyof KnoxGuardSettings>(key: K, value: KnoxGuardSettings[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.patch('/knox-guard/settings', form);
      setSettings(res.data.settings);
      setForm(res.data.settings);
      toast({ title: 'Saved', description: 'Knox Guard settings updated successfully' });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.error || 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (settings) setForm(settings);
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center h-64">
        <p className="text-gray-500">Loading settings…</p>
      </div>
    );
  }

  if (!canManage) return null;

  return (
    <div className="p-6 max-w-3xl space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Samsung Knox Guard Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure device restriction policies, lock-screen experience, and scheduler behaviour.
          </p>
          {settings?.updatedAt && (
            <p className="text-xs text-gray-400 mt-1">
              Last saved: {new Date(settings.updatedAt).toLocaleString()}
            </p>
          )}
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-800 border border-cyan-200">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
          Knox Guard
        </span>
      </div>

      {/* ── Lock Policy ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <SectionHeader
          title="Lock Policy"
          description="Controls when and how devices are restricted for overdue accounts."
        />
        <div className="space-y-5">
          <Field
            label="Lock after overdue (days)"
            hint="Number of days an installment can be overdue before the device is restricted."
          >
            <input
              type="number"
              min={1}
              max={365}
              value={form.lockAfterOverdueDays ?? 7}
              onChange={(e) => set('lockAfterOverdueDays', parseInt(e.target.value) || 7)}
              className={inputCls}
            />
          </Field>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Block unlock on unpaid penalties</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Keep device restricted even after installments are current if penalties remain unpaid.
              </p>
            </div>
            <Toggle
              checked={form.blockOnUnpaidPenalties ?? false}
              onChange={(v) => set('blockOnUnpaidPenalties', v)}
            />
          </div>
        </div>
      </div>

      {/* ── Command Scheduler ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <SectionHeader
          title="Command Scheduler"
          description="Controls how often and how many commands are dispatched to Samsung Knox."
        />
        <div className="space-y-5">
          <Field
            label="Cron schedule"
            hint="Standard cron expression for how often pending commands are processed."
          >
            <input
              type="text"
              value={form.commandCron ?? '*/5 * * * *'}
              onChange={(e) => set('commandCron', e.target.value)}
              placeholder="*/5 * * * *"
              className={inputCls}
            />
          </Field>

          <Field
            label="Batch size"
            hint="Maximum number of commands processed per scheduler run (1–100)."
          >
            <input
              type="number"
              min={1}
              max={100}
              value={form.commandBatchSize ?? 10}
              onChange={(e) => set('commandBatchSize', parseInt(e.target.value) || 10)}
              className={inputCls}
            />
          </Field>

          <Field
            label="Maximum command retries"
            hint="How many times a failed Knox command is retried before it is marked as permanently failed (0–10)."
          >
            <input
              type="number"
              min={0}
              max={10}
              value={form.maxCommandRetries ?? 3}
              onChange={(e) => set('maxCommandRetries', parseInt(e.target.value))}
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      {/* ── Payment & Support ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <SectionHeader
          title="Payment & Support"
          description="Details shown on the lock screen so customers can resolve their account."
        />
        <div className="space-y-5">
          <Field label="Support phone" hint="Phone number displayed on the restricted device screen.">
            <input
              type="tel"
              value={form.supportPhone ?? ''}
              onChange={(e) => set('supportPhone', e.target.value || null)}
              placeholder="e.g. 0246462398"
              className={inputCls}
            />
          </Field>

          <Field label="Payment app package" hint="Android package name of your payment app.">
            <input
              type="text"
              value={form.paymentAppPackage ?? ''}
              onChange={(e) => set('paymentAppPackage', e.target.value)}
              placeholder="com.aidootech.customer"
              className={inputCls}
            />
          </Field>

          <Field label="Payment app label" hint="Display name shown on the lock screen for the payment app button.">
            <input
              type="text"
              value={form.paymentAppLabel ?? ''}
              onChange={(e) => set('paymentAppLabel', e.target.value)}
              placeholder="AIDOO TECH"
              className={inputCls}
            />
          </Field>

          <Field label="Payment USSD code" hint="USSD code customers can dial to make a payment.">
            <input
              type="text"
              value={form.paymentUssd ?? ''}
              onChange={(e) => set('paymentUssd', e.target.value || null)}
              placeholder="*170#"
              className={inputCls}
            />
          </Field>

          <Field label="Refresh action label" hint="Label of the button that re-evaluates the account status on the lock screen.">
            <input
              type="text"
              value={form.refreshActionLabel ?? ''}
              onChange={(e) => set('refreshActionLabel', e.target.value)}
              placeholder="Refresh account status"
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      {/* ── Lock-Screen Visibility ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <SectionHeader
          title="Lock-Screen Visibility"
          description="Choose which shortcuts remain accessible when a device is restricted."
        />
        <div className="space-y-4">
          {(
            [
              ['allowCustomerAppOnLockScreen', 'Show payment app button', 'Allow customers to open the payment app directly from the lock screen.'],
              ['allowSupportOnLockScreen', 'Show support phone', 'Allow customers to call support directly from the lock screen.'],
              ['allowPaymentUssdOnLockScreen', 'Show payment USSD', 'Allow customers to dial the payment USSD from the lock screen.'],
            ] as [keyof KnoxGuardSettings, string, string][]
          ).map(([key, label, hint]) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{hint}</p>
              </div>
              <Toggle
                checked={(form[key] as boolean) ?? true}
                onChange={(v) => set(key, v as KnoxGuardSettings[typeof key])}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <SectionHeader
          title="Customer Messages"
          description="Text shown to customers during the restriction lifecycle."
        />
        <div className="space-y-5">
          <Field
            label="Warning message"
            hint="Shown before restriction is applied — a pre-lock notice sent via blink."
          >
            <textarea
              rows={3}
              value={form.warningMessage ?? ''}
              onChange={(e) => set('warningMessage', e.target.value)}
              className={textareaCls}
            />
          </Field>

          <Field
            label="Support message"
            hint="Shown on the lock screen to guide customers to resolve their account."
          >
            <textarea
              rows={3}
              value={form.supportMessage ?? ''}
              onChange={(e) => set('supportMessage', e.target.value)}
              className={textareaCls}
            />
          </Field>
        </div>
      </div>

      {/* ── Disclosure ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <SectionHeader
          title="Customer Disclosure"
          description="Disclosure text recorded when a device is enrolled in Knox Guard management."
        />
        <div className="space-y-5">
          <Field label="Disclosure version" hint="Version tag stored with each enrolled device for audit purposes.">
            <input
              type="text"
              value={form.disclosureVersion ?? ''}
              onChange={(e) => set('disclosureVersion', e.target.value)}
              placeholder="v1"
              className={inputCls}
            />
          </Field>

          <Field label="Disclosure summary" hint="Summary of what the customer was informed about when enrolling.">
            <textarea
              rows={4}
              value={form.disclosureSummary ?? ''}
              onChange={(e) => set('disclosureSummary', e.target.value)}
              className={textareaCls}
            />
          </Field>

          <Field label="Terms reference URL" hint="Link to the full terms and conditions for device management.">
            <input
              type="url"
              value={form.termsReference ?? ''}
              onChange={(e) => set('termsReference', e.target.value || null)}
              placeholder="https://yourdomain.example/knox-terms"
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      {/* Save / Reset */}
      <div className="flex justify-end gap-3 pb-8">
        <button
          onClick={handleReset}
          disabled={saving}
          className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-cyan-600 text-white rounded-lg text-sm font-semibold hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
