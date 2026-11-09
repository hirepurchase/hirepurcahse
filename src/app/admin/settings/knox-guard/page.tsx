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
  temporaryUnlockMaxWeeks: number;
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
  temporaryUnlockEnabled: boolean;
  temporaryUnlockMaxUses: number;
  temporaryUnlockTiers: UnlockTier[];
  updatedAt: string;
}

interface UnlockTier {
  percent: number;
  hours: number;
  /** The charge, as a percentage of the arrears added to the share. */
  feePercent: number;
}

const DEFAULT_TIERS: UnlockTier[] = [
  { percent: 25, hours: 24, feePercent: 0 },
  { percent: 50, hours: 72, feePercent: 0 },
  { percent: 75, hours: 120, feePercent: 0 },
  { percent: 90, hours: 168, feePercent: 0 },
];

/** Same rules the server applies; shown as the admin types. */
function tierProblem(tiers: UnlockTier[], maxHours: number): string | null {
  if (tiers.length < 4 || tiers.length > 6) return 'Set between 4 and 6 tiers.';
  for (let i = 0; i < tiers.length; i++) {
    const { percent, hours } = tiers[i];
    const charge = tiers[i].feePercent ?? 0;
    if (!Number.isInteger(percent) || percent < 1 || percent > 99) return `Tier ${i + 1}: the percentage must be a whole number from 1 to 99.`;
    if (!Number.isInteger(hours) || hours < 1) return `Tier ${i + 1}: the hours must be a whole number of at least 1.`;
    if (hours > maxHours) return `Tier ${i + 1}: no more than ${maxHours} hours — a phone cannot be opened further ahead.`;
    if (!Number.isInteger(charge) || charge < 0 || charge > 50) return `Tier ${i + 1}: the charge must be a whole percentage from 0 to 50.`;
    if (percent + charge >= 100) return `Tier ${i + 1}: the share and the charge together (${percent + charge}%) must be less than 100%.`;
    if (i > 0 && percent <= tiers[i - 1].percent) return `Tier ${i + 1} must ask for a higher percentage than tier ${i}.`;
    if (i > 0 && hours <= tiers[i - 1].hours) return `Tier ${i + 1} must give more hours than tier ${i}.`;
  }
  return null;
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
const tierInputCls = 'w-full min-w-0 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent';

export default function KnoxGuardSettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { hasPermission, isSuperAdmin } = usePermissions();

  const canManage = isSuperAdmin() || hasPermission(PERMISSIONS.MANAGE_DEVICE_CONTROL);

  const [settings, setSettings] = useState<KnoxGuardSettings | null>(null);
  const [form, setForm] = useState<Partial<KnoxGuardSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // The longest a paid unlock tier may run: PayTrigger's horizon, from the server.
  const [maxUnlockHours, setMaxUnlockHours] = useState(45 * 24);

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
      if (res.data.temporaryUnlockMaxHours) setMaxUnlockHours(res.data.temporaryUnlockMaxHours);
    } catch {
      toast({ title: 'Error', description: 'Failed to load Knox Guard settings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const set = <K extends keyof KnoxGuardSettings>(key: K, value: KnoxGuardSettings[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const tiers = (form.temporaryUnlockTiers ?? DEFAULT_TIERS).map((t) => ({ ...t, feePercent: t.feePercent ?? 0 }));
  const tiersError = tierProblem(tiers, maxUnlockHours);
  const setTier = (i: number, key: keyof UnlockTier, value: number) =>
    set('temporaryUnlockTiers', tiers.map((t, j) => (j === i ? { ...t, [key]: value } : t)));

  const handleSave = async () => {
    if (tiersError) {
      toast({ title: 'Check the unlock tiers', description: tiersError, variant: 'destructive' });
      return;
    }
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

          <Field
            label="Longest temporary unlock (weeks)"
            hint="The most a cluster agent may ask for when vouching that an overdue customer will pay. Admins can approve less, never more."
          >
            <input
              type="number"
              min={1}
              max={12}
              value={form.temporaryUnlockMaxWeeks ?? 4}
              onChange={(e) => set('temporaryUnlockMaxWeeks', parseInt(e.target.value) || 4)}
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

      {/* ── Paid temporary unlock ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
        <SectionHeader
          title="Paid temporary unlock"
          description="A customer whose phone has locked pays part of what is overdue, on the short code, in the app or in cash at the office, and the phone opens for a while. Applies to Samsung and Transsion phones."
        />
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Offer paid temporary unlocks</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Off until switched on. A Samsung phone that is offline when its time runs out locks when it next connects.
              </p>
            </div>
            <Toggle checked={form.temporaryUnlockEnabled ?? false} onChange={(v) => set('temporaryUnlockEnabled', v)} />
          </div>

          <Field
            label="Unlocks allowed per spell of arrears"
            hint="1 to 20. The count starts again once the customer clears everything overdue."
          >
            <input
              type="number"
              min={1}
              max={20}
              value={form.temporaryUnlockMaxUses ?? 2}
              onChange={(e) => set('temporaryUnlockMaxUses', parseInt(e.target.value) || 1)}
              className={inputCls}
            />
          </Field>

          <div>
            <p className="block text-sm font-medium text-gray-700 mb-1.5">Tiers</p>
            <p className="text-xs text-gray-500 mb-3">
              Each tier asks for a share of what is overdue and opens the phone for that many hours. 4 to 6 tiers, each
              asking more and giving longer than the one before, up to {maxUnlockHours} hours. The charge is a further
              percentage of the arrears added to the share — 25% with a 5% charge asks for 30% — and is kept by the
              company: it does not pay off any of the arrears. Use 0 for no charge.
            </p>
            <div className="space-y-2">
              <div className="grid grid-cols-[1.25rem_1fr_1fr_1fr_2rem] gap-2 text-xs font-medium text-gray-500">
                <span />
                <span>Share %</span>
                <span>Hours</span>
                <span>Charge %</span>
                <span />
              </div>
              {tiers.map((t, i) => (
                <div key={i} className="grid grid-cols-[1.25rem_1fr_1fr_1fr_2rem] items-center gap-2">
                  <span className="text-sm text-gray-500">{i + 1}.</span>
                  <label className="flex min-w-0 items-center gap-1 text-sm">
                    <input
                      type="number"
                      min={1}
                      max={99}
                      aria-label={`Tier ${i + 1} percent`}
                      value={t.percent}
                      onChange={(e) => setTier(i, 'percent', parseInt(e.target.value) || 0)}
                      className={tierInputCls}
                    />
                  </label>
                  <label className="flex min-w-0 items-center gap-1 text-sm">
                    <input
                      type="number"
                      min={1}
                      max={maxUnlockHours}
                      aria-label={`Tier ${i + 1} hours`}
                      value={t.hours}
                      onChange={(e) => setTier(i, 'hours', parseInt(e.target.value) || 0)}
                      className={tierInputCls}
                    />
                  </label>
                  <label className="flex min-w-0 items-center text-sm">
                    <input
                      type="number"
                      min={0}
                      max={50}
                      aria-label={`Tier ${i + 1} charge percent`}
                      value={t.feePercent ?? 0}
                      onChange={(e) => setTier(i, 'feePercent', parseInt(e.target.value) || 0)}
                      className={tierInputCls}
                    />
                  </label>
                  <button
                    type="button"
                    className="h-9 w-8 rounded-lg text-lg leading-none text-red-600 hover:bg-red-50 disabled:opacity-30"
                    disabled={tiers.length <= 4}
                    onClick={() => set('temporaryUnlockTiers', tiers.filter((_, j) => j !== i))}
                    aria-label={`Remove tier ${i + 1}`}
                    title="Remove tier"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40"
                disabled={tiers.length >= 6}
                onClick={() => {
                  const last = tiers[tiers.length - 1] ?? { percent: 0, hours: 0, feePercent: 0 };
                  set('temporaryUnlockTiers', [...tiers, { percent: Math.min(99, last.percent + 5), hours: Math.min(maxUnlockHours, last.hours + 24), feePercent: last.feePercent ?? 0 }]);
                }}
              >
                Add tier
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                onClick={() => set('temporaryUnlockTiers', DEFAULT_TIERS)}
              >
                Use the defaults
              </button>
            </div>
            {tiersError && <p className="mt-2 text-sm text-red-600">{tiersError}</p>}
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
              placeholder="e.g. 024XXXXXXX"
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
