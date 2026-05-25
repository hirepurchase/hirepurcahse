'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
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
    <label className="relative inline-flex cursor-pointer items-center">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-cyan-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-disabled:opacity-50 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300" />
    </label>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 border-b border-gray-200 pb-4">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

const inputCls = 'w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-cyan-500';
const textareaCls = `${inputCls} resize-y`;

export default function KnoxSettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const canManage = isSuperAdmin() || hasPermission(PERMISSIONS.MANAGE_DEVICE_CONTROL);

  const [settings, setSettings] = useState<KnoxGuardSettings | null>(null);
  const [form, setForm] = useState<Partial<KnoxGuardSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!canManage) { router.replace('/admin/knox'); return; }
    void fetchSettings();
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
      toast({ title: 'Saved', description: 'Knox Guard settings updated successfully.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Failed to save settings', variant: 'destructive' });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            These settings apply globally to <strong>all enrolled devices</strong>. Changes take effect on the next command cycle.
          </p>
          {settings?.updatedAt && (
            <p className="mt-1 text-xs text-gray-400">Last saved: {new Date(settings.updatedAt).toLocaleString()}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => settings && setForm(settings)}
            disabled={saving}
            className="rounded-xl border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Lock Policy */}
      <Section
        title="Lock Policy"
        description="Controls when and how devices are restricted for overdue accounts. Applies to all enrolled devices."
      >
        <Field label="Lock after overdue (days)" hint="Days an instalment can be overdue before the device is restricted.">
          <input
            type="number" min={1} max={365}
            value={form.lockAfterOverdueDays ?? 7}
            onChange={(e) => set('lockAfterOverdueDays', parseInt(e.target.value) || 7)}
            className={inputCls}
          />
        </Field>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Block unlock on unpaid penalties</p>
            <p className="mt-0.5 text-xs text-gray-500">Keep device restricted even after instalments are current if penalties remain unpaid.</p>
          </div>
          <Toggle checked={form.blockOnUnpaidPenalties ?? false} onChange={(v) => set('blockOnUnpaidPenalties', v)} />
        </div>
      </Section>

      {/* Command Scheduler */}
      <Section
        title="Command Scheduler"
        description="Controls how often and how many commands are dispatched to Samsung Knox."
      >
        <Field label="Cron schedule" hint="Standard cron expression for how often pending commands are processed.">
          <input
            type="text"
            value={form.commandCron ?? '*/5 * * * *'}
            onChange={(e) => set('commandCron', e.target.value)}
            placeholder="*/5 * * * *"
            className={inputCls}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Batch size" hint="Maximum commands processed per scheduler run (1–100).">
            <input
              type="number" min={1} max={100}
              value={form.commandBatchSize ?? 10}
              onChange={(e) => set('commandBatchSize', parseInt(e.target.value) || 10)}
              className={inputCls}
            />
          </Field>
          <Field label="Max command retries" hint="Times a failed command is retried before marking it permanently failed (0–10).">
            <input
              type="number" min={0} max={10}
              value={form.maxCommandRetries ?? 3}
              onChange={(e) => set('maxCommandRetries', parseInt(e.target.value))}
              className={inputCls}
            />
          </Field>
        </div>
      </Section>

      {/* Payment & Support */}
      <Section
        title="Payment & Support"
        description="These defaults are pre-filled when enrolling a device and shown on the lock screen."
      >
        <Field label="Support phone" hint="Phone number displayed on the restricted device screen.">
          <input
            type="tel"
            value={form.supportPhone ?? ''}
            onChange={(e) => set('supportPhone', e.target.value || null)}
            placeholder="e.g. 0246462398"
            className={inputCls}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
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
      </Section>

      {/* Lock-Screen Visibility */}
      <Section
        title="Lock-Screen Visibility"
        description="Choose which shortcuts remain accessible when a device is restricted."
      >
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
              <p className="mt-0.5 text-xs text-gray-500">{hint}</p>
            </div>
            <Toggle
              checked={(form[key] as boolean) ?? true}
              onChange={(v) => set(key, v as KnoxGuardSettings[typeof key])}
            />
          </div>
        ))}
      </Section>

      {/* Customer Messages */}
      <Section
        title="Customer Messages"
        description="Text shown to customers during the restriction lifecycle. Applies to all enrolled devices by default."
      >
        <Field label="Warning message" hint="Shown before restriction is applied — a pre-lock notice sent via blink.">
          <textarea
            rows={3}
            value={form.warningMessage ?? ''}
            onChange={(e) => set('warningMessage', e.target.value)}
            className={textareaCls}
          />
        </Field>
        <Field label="Support message" hint="Shown on the lock screen to guide customers to resolve their account.">
          <textarea
            rows={3}
            value={form.supportMessage ?? ''}
            onChange={(e) => set('supportMessage', e.target.value)}
            className={textareaCls}
          />
        </Field>
      </Section>

      {/* Customer Disclosure */}
      <Section
        title="Customer Disclosure"
        description="Disclosure recorded when a device is enrolled. This version and summary are pre-filled on the Enroll page."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Disclosure version" hint="Version tag stored with each enrolled device for audit purposes.">
            <input
              type="text"
              value={form.disclosureVersion ?? ''}
              onChange={(e) => set('disclosureVersion', e.target.value)}
              placeholder="v1"
              className={inputCls}
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
        <Field label="Disclosure summary" hint="Summary of what the customer was informed about when enrolling.">
          <textarea
            rows={4}
            value={form.disclosureSummary ?? ''}
            onChange={(e) => set('disclosureSummary', e.target.value)}
            className={textareaCls}
          />
        </Field>
      </Section>

      {/* Sticky save bar at bottom */}
      <div className="flex justify-end gap-3 pb-8">
        <button
          onClick={() => settings && setForm(settings)}
          disabled={saving}
          className="rounded-xl border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
