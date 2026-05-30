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
    <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
      <p className="text-sm text-slate-500">
        Lock-screen settings are inherited from{' '}
        <a href="/admin/knox/settings" className="text-cyan-600 hover:underline">Knox settings</a> automatically.
      </p>

      {/* Contract ID */}
      <div className="border border-slate-200 bg-white p-5 shadow-sm">
        <Field label="Contract ID" required hint="Paste the hire-purchase contract UUID to link this device to.">
          <input
            type="text"
            value={form.contractId}
            onChange={(e) => set('contractId', e.target.value)}
            placeholder="e.g. 4f7c2a…"
            className={inputCls}
            autoFocus
          />
        </Field>
      </div>

      {/* Device UID */}
      <div className="border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Device UID" hint="Leave blank to use the serial from the contract's inventory item.">
            <input
              type="text"
              value={form.deviceUid}
              onChange={(e) => set('deviceUid', e.target.value)}
              placeholder="IMEI or serial number"
              className={inputCls}
            />
          </Field>
          <Field label="UID type">
            <select
              value={form.deviceUidType}
              onChange={(e) => set('deviceUidType', e.target.value)}
              className={inputCls}
            >
              <option value="SERIAL_NUMBER">Serial Number</option>
              <option value="IMEI">IMEI</option>
            </select>
          </Field>
        </div>
      </div>

      {/* Customer disclosure */}
      <div className="border border-slate-200 bg-white p-5 shadow-sm">
        <label className="flex cursor-pointer items-start gap-4 border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100">
          <input
            type="checkbox"
            checked={form.disclosureAccepted}
            onChange={(e) => set('disclosureAccepted', e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-cyan-600"
          />
          <div>
            <p className="text-sm font-medium text-slate-900">
              Customer disclosure confirmed <span className="text-red-500">*</span>
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              I confirm the customer was informed that overdue payments may trigger device restriction, and that payment and support options will remain accessible on the lock screen.
            </p>
          </div>
        </label>

        <div className="mt-4">
          <Field label="Disclosure version" hint="Version tag for audit trail. Pre-filled from settings.">
            <input
              type="text"
              value={form.disclosureVersion}
              onChange={(e) => set('disclosureVersion', e.target.value)}
              placeholder="e.g. v1"
              className={inputCls}
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
          className="border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 bg-cyan-600 px-7 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
          {submitting ? 'Enrolling…' : 'Enroll device'}
        </button>
      </div>
    </form>
  );
}
