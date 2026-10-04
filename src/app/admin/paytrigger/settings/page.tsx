'use client';

import { useEffect, useRef, useState } from 'react';
import { ImageUp, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/useToast';
import { Section, errorText } from '../shared';

interface Settings {
  defaultRuleNum: number;
  lockAfterOverdueDays: number;
  lockOnUnpaidAgentDeposit: boolean;
  holdOnUnpaidPenalties: boolean;
  maxUnlockHorizonDays: number;
  releaseHoldHours: number;
  extendBreakerPercent: number;
  lockTitle: string | null;
  lockTips: string | null;
  depositHoldTitle: string;
  depositHoldTips: string;
  payDeeplink: string | null;
  operatorOfflineTimerHours: number;
  morningSweepCron: string;
}

export default function PayTriggerSettingsPage() {
  const { toast } = useToast();
  const [s, setS] = useState<Settings | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [brand, setBrand] = useState({ companyName: 'Aidoo Tech Solutions', logoUrl: '', supportNumber: '' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/paytrigger/settings')
      .then(({ data }) => setS(data.settings))
      .catch((err) => setError(errorText(err, 'Could not load settings')));
  }, []);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setS((prev) => (prev ? { ...prev, [key]: value } : prev));
    setDirty(true);
  };

  const save = async () => {
    if (!s) return;
    setBusy(true);
    try {
      const { operatorOfflineTimerHours, morningSweepCron, ...editable } = s;
      void operatorOfflineTimerHours;
      void morningSweepCron;
      const { data } = await api.put('/paytrigger/settings', editable);
      setS(data.settings);
      setDirty(false);
      toast({ title: 'Settings saved' });
    } catch (err) {
      toast({ title: 'Not saved', description: errorText(err, 'Request failed'), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const saveBrand = async () => {
    try {
      const { data } = await api.put('/paytrigger/branding', {
        companyName: brand.companyName,
        logoUrl: brand.logoUrl || undefined,
        customerServiceNumbers: brand.supportNumber ? [{ countryName: 'Ghana', number: brand.supportNumber }] : undefined,
      });
      toast({ title: data.dryRun ? 'Saved (dry run — not sent)' : 'Branding sent to PayTrigger' });
    } catch (err) {
      toast({ title: 'Not saved', description: errorText(err, 'PayTrigger refused the branding'), variant: 'destructive' });
    }
  };

  if (error) return <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>;
  if (!s) return <p className="py-10 text-center text-sm text-gray-400">Loading…</p>;

  return (
    <div className="space-y-4">
      <Section title="When a phone locks">
        <div className="space-y-4">
          <NumberField
            label="Lock this many days after the due date + grace"
            help="Same rule as Samsung (default 1)."
            value={s.lockAfterOverdueDays}
            min={0}
            max={30}
            onChange={(v) => set('lockAfterOverdueDays', v)}
          />
          <Toggle
            label="Keep the phone locked until the agent remits the deposit"
            help="As with Samsung. The customer sees “contact your agent” instead of a payment demand."
            checked={s.lockOnUnpaidAgentDeposit}
            onChange={(v) => set('lockOnUnpaidAgentDeposit', v)}
          />
          <Toggle
            label="Unpaid late charges keep a lock in place"
            help="Charges never start a lock; with this on, they stop one from lifting."
            checked={s.holdOnUnpaidPenalties}
            onChange={(v) => set('holdOnUnpaidPenalties', v)}
          />
        </div>
      </Section>

      <Section title="Lock-screen text">
        <div className="space-y-3">
          <Input placeholder="Overdue title (blank = PayTrigger portal default)" value={s.lockTitle || ''} onChange={(e) => set('lockTitle', e.target.value)} />
          <Textarea rows={2} maxLength={400} placeholder="Overdue message" value={s.lockTips || ''} onChange={(e) => set('lockTips', e.target.value)} />
          <p className="pt-2 text-xs font-semibold text-gray-700">While waiting for the agent&apos;s deposit</p>
          <Input value={s.depositHoldTitle} onChange={(e) => set('depositHoldTitle', e.target.value)} />
          <Textarea rows={3} maxLength={400} value={s.depositHoldTips} onChange={(e) => set('depositHoldTips', e.target.value)} />
          <p className="text-[11px] text-gray-500">{'{agentName}'} and {'{agentPhone}'} are filled in for each phone.</p>
          <Input placeholder="Pay link opened from the lock screen (optional)" value={s.payDeeplink || ''} onChange={(e) => set('payDeeplink', e.target.value)} />
        </div>
      </Section>

      <Section title="Safety limits">
        <div className="space-y-4">
          <NumberField label="Never open a phone for longer than (days)" help="Caps any single lock date." value={s.maxUnlockHorizonDays} min={7} max={120} onChange={(v) => set('maxUnlockHorizonDays', v)} />
          <NumberField label="Wait before releasing a paid-off phone (hours)" help="Release is permanent. The wait lets a mistaken completion be reversed." value={s.releaseHoldHours} min={0} max={720} onChange={(v) => set('releaseHoldHours', v)} />
          <NumberField label="Stop the morning sweep if it would open more than (% of phones)" help="Guards against a fault opening every phone at once." value={s.extendBreakerPercent} min={1} max={100} onChange={(v) => set('extendBreakerPercent', v)} />
        </div>
      </Section>

      <Section title="Set by Transsion" subtitle="These cannot be changed from here.">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-gray-500">Offline lock timer</dt>
            <dd className="font-medium text-gray-900">{Math.round(s.operatorOfflineTimerHours / 24)} days</dd>
          </div>
          <p className="text-xs text-gray-500">
            A phone kept offline this long locks itself even if paid up. PayTrigger has no API for it — email the Transsion operator to change it.
          </p>
          <div className="flex justify-between gap-3 pt-2">
            <dt className="text-gray-500">Morning sweep</dt>
            <dd className="font-medium text-gray-900">08:36 daily</dd>
          </div>
        </dl>
      </Section>

      {dirty && (
        <div className="sticky bottom-20 z-10 lg:bottom-3">
          <Button className="bg-indigo-600 text-white hover:bg-indigo-700 w-full shadow-lg" onClick={save} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save settings
          </Button>
        </div>
      )}

      <Section title="Branding on the phone" subtitle="Company name, logo and support number shown in the PayTrigger app.">
        <div className="space-y-3">
          <Input placeholder="Company name" value={brand.companyName} onChange={(e) => setBrand({ ...brand, companyName: e.target.value })} />
          <LogoPicker url={brand.logoUrl} onChange={(logoUrl) => setBrand({ ...brand, logoUrl })} />
          <Input placeholder="Customer service number" value={brand.supportNumber} onChange={(e) => setBrand({ ...brand, supportNumber: e.target.value })} />
          <Button variant="outline" onClick={saveBrand}>Send branding</Button>
        </div>
      </Section>
    </div>
  );
}

function NumberField({ label, help, value, min, max, onChange }: { label: string; help?: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span>
        <span className="block text-sm text-gray-800">{label}</span>
        {help && <span className="block text-xs text-gray-500">{help}</span>}
      </span>
      <Input
        type="number"
        min={min}
        max={max}
        className="w-24 shrink-0"
        value={value}
        onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value || String(min), 10))))}
      />
    </label>
  );
}

function Toggle({ label, help, checked, onChange }: { label: string; help?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" className="mt-0.5 h-4 w-4" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-sm text-gray-800">{label}</span>
        {help && <span className="block text-xs text-gray-500">{help}</span>}
      </span>
    </label>
  );
}

/**
 * Logo for the PayTrigger app: choose an image from this device, or paste an
 * address. A chosen image is fitted by the server to PayTrigger's limits
 * (PNG, up to 512×512, 50 KB) and stored at a public address, which fills the
 * field below; "Send branding" then passes it to PayTrigger.
 */
function LogoPicker({ url, onChange }: { url: string; onChange: (url: string) => void }) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);

  const choose = async (file: File | undefined) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      toast({ title: 'Choose a PNG or JPEG image', variant: 'destructive' });
      return;
    }
    setUploading(true);
    setNote(null);
    try {
      const form = new FormData();
      form.append('logo', file);
      const { data } = await api.post('/paytrigger/branding/logo', form);
      onChange(data.url);
      setBroken(false);
      setNote(`Saved as PNG, ${data.width}×${data.height}, ${Math.ceil(data.bytes / 1024)} KB. Press “Send branding” to use it.`);
    } catch (err) {
      toast({ title: 'Logo not uploaded', description: errorText(err, 'Upload failed'), variant: 'destructive' });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
          {url && !broken ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Logo preview" className="h-full w-full object-contain" onError={() => setBroken(true)} />
          ) : (
            <ImageUp className="h-6 w-6 text-gray-300" />
          )}
        </div>
        <div className="min-w-0 space-y-1">
          <input
            ref={inputRef}
            id="paytrigger-logo-file"
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => choose(e.target.files?.[0])}
          />
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}
            {uploading ? 'Uploading…' : url ? 'Choose another image' : 'Choose image'}
          </Button>
          <p className="text-xs text-gray-500">PNG or JPEG. It is resized to fit PayTrigger&apos;s limit (512×512, 50 KB).</p>
        </div>
      </div>
      <Input
        placeholder="…or paste a logo address"
        value={url}
        onChange={(e) => {
          onChange(e.target.value);
          setBroken(false);
          setNote(null);
        }}
      />
      {broken && url && <p className="text-xs text-amber-700">That address does not load as an image.</p>}
      {note && <p className="text-xs text-emerald-700">{note}</p>}
    </div>
  );
}
