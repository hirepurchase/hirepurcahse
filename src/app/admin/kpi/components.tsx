'use client';

import { useState } from 'react';
import { ChevronDown, Loader2, X } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/useToast';
import { errorText, formatValue } from '../cluster-scorecard/types';
import { GROUP_LABEL, KpiCard, KpiDefinition, KpiGroup, KpiLine, ROLE_LABEL, STATUS_STYLE } from './types';

export function StatusBadge({ line }: { line: KpiLine }) {
  const s = STATUS_STYLE[line.status];
  return <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.className}`}>{s.label}</span>;
}

/** Share of targets met, as a coloured pill. */
export function ScorePill({ card }: { card: KpiCard }) {
  const { targeted, met, percent } = card.score;
  if (!targeted || percent === null) return <span className="text-[11px] text-gray-400">No targets</span>;
  const tone = percent >= 75 ? 'bg-emerald-50 text-emerald-700' : percent >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
      {met}/{targeted} on target
    </span>
  );
}

function Progress({ line }: { line: KpiLine }) {
  if (line.target === null || line.value === null || !line.higherIsBetter || line.target <= 0) return null;
  const pct = Math.min(100, (line.value / line.target) * 100);
  const mark = line.expected !== null ? Math.min(100, (line.expected / line.target) * 100) : null;
  const tone = line.status === 'MET' || line.status === 'ON_TRACK' ? 'bg-emerald-500' : line.status === 'NEAR' ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="relative mt-1.5 h-1.5 w-full rounded-full bg-gray-100">
      <div className={`h-1.5 rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      {mark !== null && <div className="absolute -top-0.5 h-2.5 w-0.5 rounded bg-gray-500" style={{ left: `${mark}%` }} title="Due by today" />}
    </div>
  );
}

function targetText(line: KpiLine): string | null {
  if (line.target === null) return null;
  const t = formatValue(line.unit, line.target);
  if (!line.higherIsBetter) return `Limit ${t}`;
  return line.expected !== null ? `Target ${t} · ${formatValue(line.unit, line.expected)} due by today` : `Target ${t}`;
}

export function KpiLines({ card }: { card: KpiCard }) {
  return (
    <ul className="divide-y divide-gray-100">
      {card.lines.map((line) => {
        const target = targetText(line);
        return (
          <li key={line.key} className="py-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800">{line.label}</p>
                <p className="text-xs text-gray-500">{line.description}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-gray-900">{formatValue(line.unit, line.value)}</p>
                <StatusBadge line={line} />
              </div>
            </div>
            {target && <p className="mt-1 text-[11px] text-gray-500">{target}</p>}
            <Progress line={line} />
          </li>
        );
      })}
    </ul>
  );
}

/** A person's card: the headline in the row, every KPI when opened. */
export function PersonRow({ card, rank, headline, defaultOpen = false }: { card: KpiCard; rank?: number; headline: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const head = card.lines.find((l) => l.key === headline);
  return (
    <li className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <button className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
        {rank !== undefined && <span className="w-6 shrink-0 text-center text-sm font-bold text-gray-400">{rank}</span>}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">{card.name}</p>
          <p className="text-xs text-gray-500">
            {ROLE_LABEL[card.role] || card.role}
            {card.agentCount !== undefined && ` · ${card.agentCount} agent${card.agentCount === 1 ? '' : 's'}`}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {head && <p className="text-sm font-bold text-gray-900">{formatValue(head.unit, head.value)}</p>}
          <ScorePill card={card} />
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-gray-100 px-4 pb-2">
          <KpiLines card={card} />
        </div>
      )}
    </li>
  );
}

/** One person's own page: their score, then every KPI. */
export function OwnCard({ card, title }: { card: KpiCard; title: string }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <ScorePill card={card} />
      </div>
      <div className="px-4 pb-2">
        <KpiLines card={card} />
      </div>
    </section>
  );
}

/** Set the monthly targets for one group. An empty box removes that target. */
export function TargetsDialog({
  group,
  definitions,
  initial,
  onClose,
  onSaved,
}: {
  group: KpiGroup;
  definitions: KpiDefinition[];
  initial: Record<string, number>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(definitions.map((d) => [d.key, initial[d.key] !== undefined ? String(initial[d.key]) : ''])),
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/kpi/targets', {
        group,
        targets: definitions.map((d) => ({ key: d.key, target: values[d.key].trim() === '' ? null : Number(values[d.key]) })),
      });
      toast({ title: 'Targets saved' });
      onSaved();
    } catch (err) {
      toast({ title: 'Not saved', description: errorText(err, 'Could not save the targets'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const unitHint = (d: KpiDefinition) => (d.unit === 'GHS' ? 'GHS' : d.unit === 'PERCENT' ? '%' : 'count');

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Monthly targets — {GROUP_LABEL[group]}</h2>
            <p className="text-xs text-gray-500">Leave a box empty for no target. Each person is held to the same target.</p>
          </div>
          <button className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {definitions.map((d) => (
            <label key={d.key} className="block">
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-gray-800">{d.label}</span>
                <span className="text-[11px] text-gray-400">{d.higherIsBetter ? 'at least' : 'at most'} · {unitHint(d)}</span>
              </span>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                max={d.unit === 'PERCENT' ? 100 : undefined}
                step={d.unit === 'COUNT' ? 1 : 0.01}
                placeholder="No target"
                value={values[d.key]}
                onChange={(e) => setValues((v) => ({ ...v, [d.key]: e.target.value }))}
                className="mt-1"
              />
            </label>
          ))}
        </div>
        <div className="flex gap-2 border-t border-gray-100 px-5 py-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-indigo-600 text-white hover:bg-indigo-700" disabled={saving} onClick={save}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save targets
          </Button>
        </div>
      </div>
    </div>
  );
}
