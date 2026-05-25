'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, Smartphone } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';

interface CustomerExperienceDefaults {
  disclosureVersion: string;
  disclosureSummary: string;
  termsReference?: string | null;
  supportPhone?: string | null;
  supportMessage: string;
  warningMessage: string;
  paymentAppPackage?: string | null;
  paymentAppLabel: string;
  paymentUssd?: string | null;
  refreshActionLabel: string;
  allowCustomerAppOnLockScreen: boolean;
  allowSupportOnLockScreen: boolean;
  allowPaymentUssdOnLockScreen: boolean;
}

const emptyForm = {
  contractId: '',
  deviceUid: '',
  deviceUidType: 'SERIAL_NUMBER',
  approveId: '',
  knoxObjectId: '',
  knoxTenantDomain: 'DEVICE_FINANCING',
  disclosureAccepted: false,
  disclosureVersion: '',
  termsReference: '',
  supportPhone: '',
  supportMessage: '',
  warningMessage: '',
  paymentAppPackage: '',
  paymentAppLabel: '',
  paymentUssd: '',
  refreshActionLabel: 'Refresh account status',
};

type EnrollForm = typeof emptyForm;

function fillFromDefaults(form: EnrollForm, d?: CustomerExperienceDefaults | null): EnrollForm {
  if (!d) return form;
  return {
    ...form,
    disclosureVersion: form.disclosureVersion || d.disclosureVersion || '',
    termsReference: form.termsReference || d.termsReference || '',
    supportPhone: form.supportPhone || d.supportPhone || '',
    supportMessage: form.supportMessage || d.supportMessage || '',
    warningMessage: form.warningMessage || d.warningMessage || '',
    paymentAppPackage: form.paymentAppPackage || d.paymentAppPackage || '',
    paymentAppLabel: form.paymentAppLabel || d.paymentAppLabel || '',
    paymentUssd: form.paymentUssd || d.paymentUssd || '',
    refreshActionLabel: form.refreshActionLabel || d.refreshActionLabel || 'Refresh account status',
  };
}

function Field({ label, hint, children, required }: { label: string; hint?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

const inputCls = 'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200';
const textareaCls = `${inputCls} min-h-[80px] resize-y`;

export default function KnoxEnrollPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const canManage = isSuperAdmin() || hasPermission(PERMISSIONS.MANAGE_DEVICE_CONTROL);

  const [defaults, setDefaults] = useState<CustomerExperienceDefaults | null>(null);
  const [form, setForm] = useState<EnrollForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!canManage) { router.replace('/admin/knox'); return; }
    void loadDefaults();
  }, [canManage]);

  const loadDefaults = async () => {
    try {
      const res = await api.get('/knox-guard/health');
      const d: CustomerExperienceDefaults = res.data.policy?.customerExperienceDefaults;
      setDefaults(d);
      setForm((f) => fillFromDefaults(f, d));
    } catch {
      // health call failing shouldn't block the form
    } finally {
      setLoading(false);
    }
  };

  const set = <K extends keyof EnrollForm>(key: K, value: EnrollForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.contractId.trim()) {
      toast({ title: 'Contract ID required', description: 'Enter the contract ID to enroll.', variant: 'destructive' });
      return;
    }
    if (!form.disclosureAccepted) {
      toast({ title: 'Disclosure required', description: 'Confirm the customer was informed about device restriction terms.', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);
      const allowUssd = (defaults?.allowPaymentUssdOnLockScreen ?? true) && Boolean(form.paymentUssd.trim());

      await api.post(`/knox-guard/contracts/${form.contractId.trim()}/enroll`, {
        deviceUid: form.deviceUid.trim() || undefined,
        deviceUidType: form.deviceUidType,
        approveId: form.approveId.trim() || undefined,
        knoxObjectId: form.knoxObjectId.trim() || undefined,
        knoxTenantDomain: form.knoxTenantDomain.trim() || undefined,
        metadata: {
          customerExperience: {
            disclosureAccepted: form.disclosureAccepted,
            disclosureVersion: form.disclosureVersion.trim() || undefined,
            termsReference: form.termsReference.trim() || undefined,
            supportPhone: form.supportPhone.trim() || undefined,
            supportMessage: form.supportMessage.trim() || undefined,
            warningMessage: form.warningMessage.trim() || undefined,
            paymentAppPackage: form.paymentAppPackage.trim() || undefined,
            paymentAppLabel: form.paymentAppLabel.trim() || undefined,
            paymentUssd: form.paymentUssd.trim() || undefined,
            refreshActionLabel: form.refreshActionLabel.trim() || undefined,
            allowCustomerAppOnLockScreen: defaults?.allowCustomerAppOnLockScreen ?? true,
            allowSupportOnLockScreen: defaults?.allowSupportOnLockScreen ?? true,
            allowPaymentUssdOnLockScreen: allowUssd,
          },
        },
      });

      setDone(true);
      toast({ title: 'Enrolled', description: 'Device queued for Knox Guard approval.' });
    } catch (err: any) {
      toast({ title: 'Enrollment failed', description: err.response?.data?.error || 'Failed to enroll device', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnrollAnother = () => {
    setDone(false);
    setForm((f) => fillFromDefaults({ ...emptyForm }, defaults));
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }
  if (!canManage) return null;

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Device enrolled</h2>
        <p className="mt-2 text-sm text-slate-500">The contract device has been queued for Knox Guard approval.</p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleEnrollAnother}
            className="rounded-xl bg-cyan-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700"
          >
            Enroll another
          </button>
          <button
            onClick={() => router.push('/admin/knox/devices')}
            className="rounded-xl border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            View devices
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-sm text-slate-500">
        Fields pre-filled from{' '}
        <a href="/admin/knox/settings" className="text-cyan-600 hover:underline">Knox settings</a>.
        Override per device where needed.
      </p>

      {/* Step 1 — Contract & Device identity */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base font-semibold text-slate-900">1. Contract & device identity</h2>
        <p className="mb-5 text-xs text-slate-500">Identify the contract and the physical device being enrolled.</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contract ID" required hint="The internal contract UUID to enroll.">
            <input
              type="text"
              value={form.contractId}
              onChange={(e) => set('contractId', e.target.value)}
              placeholder="e.g. 4f7c2a…"
              className={inputCls}
            />
          </Field>

          <Field label="Device UID type">
            <select
              value={form.deviceUidType}
              onChange={(e) => set('deviceUidType', e.target.value)}
              className={inputCls}
            >
              <option value="SERIAL_NUMBER">Serial Number</option>
              <option value="IMEI">IMEI</option>
            </select>
          </Field>

          <Field label="Device UID" hint="Leave blank to use the device UID from the contract's inventory item.">
            <input
              type="text"
              value={form.deviceUid}
              onChange={(e) => set('deviceUid', e.target.value)}
              placeholder="IMEI or serial number"
              className={inputCls}
            />
          </Field>

          <Field label="Approve ID" hint="Defaults to the contract number if left blank.">
            <input
              type="text"
              value={form.approveId}
              onChange={(e) => set('approveId', e.target.value)}
              placeholder="Defaults to contract number"
              className={inputCls}
            />
          </Field>

          <Field label="Knox Object ID" hint="Only needed if re-linking an existing Knox Guard object.">
            <input
              type="text"
              value={form.knoxObjectId}
              onChange={(e) => set('knoxObjectId', e.target.value)}
              placeholder="Optional"
              className={inputCls}
            />
          </Field>

          <Field label="Tenant domain" hint="Samsung Knox tenant domain for this device.">
            <input
              type="text"
              value={form.knoxTenantDomain}
              onChange={(e) => set('knoxTenantDomain', e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      {/* Step 2 — Customer disclosure */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base font-semibold text-slate-900">2. Customer disclosure</h2>
        <p className="mb-5 text-xs text-slate-500">Confirm the customer was informed and record the disclosure version.</p>

        {/* Disclosure checkbox — prominent */}
        <label className="flex cursor-pointer items-start gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100">
          <input
            type="checkbox"
            checked={form.disclosureAccepted}
            onChange={(e) => set('disclosureAccepted', e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-cyan-600"
          />
          <div>
            <p className="text-sm font-medium text-slate-900">Customer disclosure confirmed <span className="text-red-500">*</span></p>
            <p className="mt-0.5 text-xs text-slate-500">
              The customer was informed that overdue payments may trigger device restriction, and that payment and support options remain available on the lock screen.
            </p>
          </div>
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Disclosure version" hint="Version tag stored with this enrolment for audit.">
            <input
              type="text"
              value={form.disclosureVersion}
              onChange={(e) => set('disclosureVersion', e.target.value)}
              placeholder="e.g. v1"
              className={inputCls}
            />
          </Field>
          <Field label="Terms reference URL" hint="Link to full T&Cs or internal signed-terms reference.">
            <input
              type="text"
              value={form.termsReference}
              onChange={(e) => set('termsReference', e.target.value)}
              placeholder="https://… or internal ref"
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      {/* Step 3 — Lock-screen experience */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base font-semibold text-slate-900">3. Lock-screen experience</h2>
        <p className="mb-5 text-xs text-slate-500">Pre-filled from global settings. Override here only if this device needs different values.</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Support phone">
            <input
              type="tel"
              value={form.supportPhone}
              onChange={(e) => set('supportPhone', e.target.value)}
              placeholder="Customer service phone"
              className={inputCls}
            />
          </Field>
          <Field label="Payment app package">
            <input
              type="text"
              value={form.paymentAppPackage}
              onChange={(e) => set('paymentAppPackage', e.target.value)}
              placeholder="com.aidootech.customer"
              className={inputCls}
            />
          </Field>
          <Field label="Payment app label">
            <input
              type="text"
              value={form.paymentAppLabel}
              onChange={(e) => set('paymentAppLabel', e.target.value)}
              placeholder="Visible app name"
              className={inputCls}
            />
          </Field>
          <Field label="Payment USSD">
            <input
              type="text"
              value={form.paymentUssd}
              onChange={(e) => set('paymentUssd', e.target.value)}
              placeholder="e.g. *170#"
              className={inputCls}
            />
          </Field>
          <Field label="Refresh action label" hint="Button label to re-evaluate account status.">
            <input
              type="text"
              value={form.refreshActionLabel}
              onChange={(e) => set('refreshActionLabel', e.target.value)}
              placeholder="Refresh account status"
              className={inputCls}
            />
          </Field>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Support message on lock screen">
            <textarea
              value={form.supportMessage}
              onChange={(e) => set('supportMessage', e.target.value)}
              placeholder="Guidance shown to the customer on the lock screen."
              className={textareaCls}
            />
          </Field>
          <Field label="Warning message before restriction">
            <textarea
              value={form.warningMessage}
              onChange={(e) => set('warningMessage', e.target.value)}
              placeholder="Message used in warning and lock context."
              className={textareaCls}
            />
          </Field>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 pb-8">
        <button
          type="button"
          onClick={() => setForm(fillFromDefaults({ ...emptyForm }, defaults))}
          disabled={submitting}
          className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-7 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
          {submitting ? 'Enrolling…' : 'Enroll device'}
        </button>
      </div>
    </form>
  );
}
