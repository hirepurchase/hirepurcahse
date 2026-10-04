'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/useToast';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { PERMISSIONS } from '@/lib/permissions';
import { IndicatorDefinition, IndicatorRule, PAYOUT_LABEL, PayoutType, ScorecardSettings, errorText, ghs, thisMonth } from '../types';

const PRIMARY = 'bg-emerald-600 text-white hover:bg-emerald-700';

interface Configuration {
  definitions: IndicatorDefinition[];
  rules: IndicatorRule[];
  settings: ScorecardSettings;
}

export default function ScorecardRatesPage() {
  return (
    <ProtectedRoute permissions={[PERMISSIONS.MANAGE_COMMISSION_SETTINGS]}>
      <RatesEditor />
    </ProtectedRoute>
  );
}

function RatesEditor() {
  const { toast } = useToast();
  const [defs, setDefs] = useState<IndicatorDefinition[]>([]);
  const [rules, setRules] = useState<IndicatorRule[] | null>(null);
  const [settings, setSettings] = useState<ScorecardSettings | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ total: number; leaders: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = () =>
    api
      .get('/cluster-scorecard', { params: { month: thisMonth() } })
      .then(({ data }) => setPreview({ total: data.totals.total, leaders: data.leaders.length }))
      .catch(() => setPreview(null));

  const apply = (c: Configuration) => {
    setDefs(c.definitions);
    setRules(c.rules);
    setSettings(c.settings);
    setDirty(false);
  };

  useEffect(() => {
    api
      .get('/cluster-scorecard/configuration')
      .then(({ data }) => apply(data))
      .catch((err) => setError(errorText(err, 'Could not load rates')));
    loadPreview();
  }, []);

  const update = (key: string, patch: Partial<IndicatorRule>) => {
    setRules((prev) => (prev ? prev.map((r) => (r.key === key ? { ...r, ...patch } : r)) : prev));
    setDirty(true);
  };
  const updateSettings = (patch: Partial<ScorecardSettings>) => {
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
    setDirty(true);
  };

  const save = async () => {
    if (!rules || !settings) return;
    setBusy(true);
    try {
      await api.put('/cluster-scorecard/settings', settings);
      const { data } = await api.put('/cluster-scorecard/indicators', { indicators: rules });
      apply({ ...data, settings });
      toast({ title: 'Rates saved', description: 'They apply to this month and to any month not yet closed.' });
      loadPreview();
    } catch (err) {
      toast({ title: 'Not saved', description: errorText(err, 'Request failed'), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  if (error) return <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>;
  if (!rules || !settings) return <p className="py-10 text-center text-sm text-gray-400">Loading…</p>;

  const defByKey = new Map(defs.map((d) => [d.key, d]));

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        Switch on the indicators management wants to pay for, then set a rate or an amount for each. A negative amount is a deduction.
        Closed months keep the rates they were closed with.
        {preview && (
          <span className="mt-1 block font-semibold">
            With the saved rates, this month would pay {ghs(preview.total)} across {preview.leaders} leader{preview.leaders === 1 ? '' : 's'} so far.
          </span>
        )}
      </div>

      <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Base pay and PAR gate</h2>
        <Field label="Monthly base amount per leader (GHS)">
          <NumberInput value={settings.baseAmount} onChange={(v) => updateSettings({ baseAmount: v ?? 0 })} />
        </Field>
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-0.5 h-4 w-4" checked={settings.parGateEnabled} onChange={(e) => updateSettings({ parGateEnabled: e.target.checked })} />
          <span className="text-sm text-gray-800">
            Withhold variable pay when the cluster&apos;s PAR30 is above a ceiling
            <span className="block text-xs text-gray-500">The same idea as the PAR block that stops agents selling.</span>
          </span>
        </label>
        {settings.parGateEnabled && (
          <div className="space-y-3 pl-7">
            <Field label="PAR30 ceiling (%)">
              <NumberInput value={settings.parGateCeiling} onChange={(v) => updateSettings({ parGateCeiling: v ?? 0 })} />
            </Field>
            <label className="flex items-center gap-2 text-sm text-gray-800">
              <input type="checkbox" className="h-4 w-4" checked={settings.gateWithholdsBase} onChange={(e) => updateSettings({ gateWithholdsBase: e.target.checked })} />
              Withhold the base amount too
            </label>
          </div>
        )}
        <Field label="Days an agent has to remit a deposit (for “Deposits remitted on time”)">
          <NumberInput value={settings.depositRemitDays} onChange={(v) => updateSettings({ depositRemitDays: Math.round(v ?? 0) })} />
        </Field>
      </section>

      {rules.map((rule) => {
        const def = defByKey.get(rule.key);
        if (!def) return null;
        const unitLabel = def.unit === 'GHS' ? 'GHS' : def.unit === 'PERCENT' ? '%' : def.key === 'ACTIVE_AGENTS' ? 'agents' : 'count';
        return (
          <section key={rule.key} className={`rounded-xl border bg-white ${rule.enabled ? 'border-emerald-200' : 'border-gray-200'}`}>
            <label className="flex cursor-pointer items-start gap-3 px-4 py-3">
              <input type="checkbox" className="mt-1 h-4 w-4" checked={rule.enabled} onChange={(e) => update(rule.key, { enabled: e.target.checked })} />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-gray-900">{def.label}</span>
                <span className="block text-xs text-gray-500">{def.description}</span>
              </span>
            </label>

            {rule.enabled && (
              <div className="space-y-3 border-t border-gray-100 px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  {def.payoutTypes.map((t) => (
                    <button
                      key={t}
                      onClick={() => update(rule.key, { payoutType: t as PayoutType })}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium ${rule.payoutType === t ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      {PAYOUT_LABEL[t as PayoutType]}
                    </button>
                  ))}
                </div>

                {rule.payoutType === 'RATE' && (
                  <Field label={`Pay this % of the ${unitLabel === 'GHS' ? 'GHS value' : 'value'}`}>
                    <NumberInput value={rule.rate} onChange={(v) => update(rule.key, { rate: v ?? 0 })} />
                  </Field>
                )}
                {rule.payoutType === 'PER_UNIT' && (
                  <Field label={`GHS per ${unitLabel === 'agents' ? 'active agent' : 'one'} (negative to deduct)`}>
                    <NumberInput value={rule.unitAmount} onChange={(v) => update(rule.key, { unitAmount: v ?? 0 })} />
                  </Field>
                )}
                {(rule.payoutType === 'TARGET' || rule.payoutType === 'TIERS') && (
                  <Field label="Good result is">
                    <select
                      className="h-10 rounded-lg border border-gray-300 bg-white px-2 text-sm"
                      value={rule.targetDirection}
                      onChange={(e) => update(rule.key, { targetDirection: e.target.value as 'GTE' | 'LTE' })}
                    >
                      <option value="GTE">at or above the target</option>
                      <option value="LTE">at or below the target</option>
                    </select>
                  </Field>
                )}
                {rule.payoutType === 'TARGET' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={`Target (${unitLabel})`}>
                      <NumberInput value={rule.target} allowEmpty onChange={(v) => update(rule.key, { target: v })} />
                    </Field>
                    <Field label="Bonus (GHS)">
                      <NumberInput value={rule.targetAmount} onChange={(v) => update(rule.key, { targetAmount: v ?? 0 })} />
                    </Field>
                  </div>
                )}
                {rule.payoutType === 'TIERS' && (
                  <div className="space-y-2">
                    {(rule.tiers || []).map((tier, i) => (
                      <div key={i} className="flex items-end gap-2">
                        <Field label={i === 0 ? `Threshold (${unitLabel})` : ''}>
                          <NumberInput
                            value={tier.threshold}
                            onChange={(v) => update(rule.key, { tiers: (rule.tiers || []).map((t, j) => (j === i ? { ...t, threshold: v ?? 0 } : t)) })}
                          />
                        </Field>
                        <Field label={i === 0 ? 'Bonus (GHS)' : ''}>
                          <NumberInput
                            value={tier.amount}
                            onChange={(v) => update(rule.key, { tiers: (rule.tiers || []).map((t, j) => (j === i ? { ...t, amount: v ?? 0 } : t)) })}
                          />
                        </Field>
                        <button
                          className="mb-1 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                          onClick={() => update(rule.key, { tiers: (rule.tiers || []).filter((_, j) => j !== i) })}
                          aria-label="Remove tier"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => update(rule.key, { tiers: [...(rule.tiers || []), { threshold: 0, amount: 0 }] })}>
                      <Plus className="h-3.5 w-3.5" /> Add tier
                    </Button>
                    <p className="text-xs text-gray-500">The best tier reached pays. Only one tier pays per month.</p>
                  </div>
                )}
                <Field label="Cap per month (GHS, optional)">
                  <NumberInput value={rule.cap} allowEmpty onChange={(v) => update(rule.key, { cap: v })} />
                </Field>
              </div>
            )}
          </section>
        );
      })}

      {dirty && (
        <div className="sticky bottom-20 z-10 lg:bottom-3">
          <Button className={`w-full shadow-lg ${PRIMARY}`} onClick={save} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Save rates
          </Button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block flex-1">
      {label && <span className="mb-1 block text-xs font-medium text-gray-700">{label}</span>}
      {children}
    </label>
  );
}

function NumberInput({ value, onChange, allowEmpty }: { value: number | null; onChange: (v: number | null) => void; allowEmpty?: boolean }) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      step="any"
      value={value === null || value === undefined ? '' : value}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === '') onChange(allowEmpty ? null : 0);
        else if (Number.isFinite(Number(raw))) onChange(Number(raw));
      }}
    />
  );
}
