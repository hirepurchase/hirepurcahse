'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, SlidersHorizontal, Target } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ExportButtons } from '@/components/admin/ExportButtons';
import type { ExportOptions } from '@/lib/exportUtils';
import { cn } from '@/lib/utils';
import { errorText, formatValue, monthLabel, shiftMonth, thisMonth } from '../cluster-scorecard/types';
import { OwnCard, PersonRow, TargetsDialog } from './components';
import { GROUP_LABEL, KpiCard, KpiGroup, MonthMeta, MyKpis, PeopleKpis, ROLE_LABEL, STATUS_STYLE } from './types';

/** The figure shown in each person's row, and what the list is ranked on after targets. */
const HEADLINE: Record<KpiGroup, string> = { AGENT: 'COLLECTIONS', TEAM: 'COLLECTIONS', CSO: 'COLLECTED_AFTER_CALL' };

export default function KpiPage() {
  const [month, setMonth] = useState(thisMonth);
  // Each result is kept with the month it is for, so switching months shows
  // "Calculating…" rather than the previous month's figures.
  const [loaded, setLoaded] = useState<{ month: string; data?: MyKpis; error?: string } | null>(null);
  const me = loaded?.month === month ? loaded.data ?? null : null;
  const error = loaded?.month === month ? loaded.error ?? null : null;

  useEffect(() => {
    let live = true;
    api
      .get('/kpi/me', { params: { month } })
      .then(({ data }) => live && setLoaded({ month, data }))
      .catch((err) => live && setLoaded({ month, error: errorText(err, 'Could not load the KPIs') }));
    return () => {
      live = false;
    };
  }, [month]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
          <Target className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{me?.seesEveryone ? 'KPIs' : 'My KPIs'}</h1>
          <p className="text-sm text-gray-500">Monthly performance against target.</p>
        </div>
      </div>

      <MonthPicker month={month} onChange={setMonth} meta={me} />

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {!me && !error && <p className="py-10 text-center text-sm text-gray-400">Calculating…</p>}

      {me && (me.seesEveryone ? <EveryoneView month={month} me={me} /> : <PersonalView me={me} month={month} />)}
    </div>
  );
}

function MonthPicker({ month, onChange, meta }: { month: string; onChange: (m: string) => void; meta: MonthMeta | null }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-2 py-2">
      <div className="flex items-center justify-between gap-2">
        <button className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Previous month">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="text-base font-semibold text-gray-900">{monthLabel(month)}</p>
        <button
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
          onClick={() => onChange(shiftMonth(month, 1))}
          disabled={month >= thisMonth()}
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      {meta?.inProgress && (
        <p className="px-2 pb-1 text-center text-xs text-gray-500">
          {Math.round(meta.elapsed * 100)}% of the month gone. Sales, collections and calls are judged against the share of the target due by today.
        </p>
      )}
    </div>
  );
}

function Tabs<T extends string>({ value, options, onChange }: { value: T; options: Array<{ value: T; label: string }>; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium',
            value === o.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function PeopleList({ people, group }: { people: KpiCard[]; group: KpiGroup }) {
  if (!people.length) return <p className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500">Nobody to show for this month.</p>;
  return (
    <ul className="space-y-2">
      {people.map((p, i) => (
        <PersonRow key={p.userId} card={p} rank={i + 1} headline={HEADLINE[group]} />
      ))}
    </ul>
  );
}

// ─── Agents, cluster leaders and officers: their own page ───────────────────

function PersonalView({ me, month }: { me: MyKpis; month: string }) {
  const [tab, setTab] = useState<'own' | 'team' | 'agents'>('own');

  if (me.kind === 'NONE' || !me.own) {
    return <p className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500">There are no KPIs for your role.</p>;
  }
  if (me.kind === 'CLUSTER') {
    return (
      <div className="space-y-3">
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            { value: 'own', label: 'My sales' },
            { value: 'team', label: 'My team' },
            { value: 'agents', label: `My agents (${me.agents?.length ?? 0})` },
          ]}
        />
        {tab === 'own' && <OwnCard card={me.own} title="Your own customers" />}
        {tab === 'team' && me.team && <OwnCard card={me.team} title={`Your team — ${me.team.agentCount ?? 0} agent${me.team.agentCount === 1 ? '' : 's'}`} />}
        {tab === 'agents' && (
          <>
            <p className="text-xs text-gray-500">Ranked by share of targets met, then collections. Open an agent to see every figure.</p>
            <PeopleList people={me.agents ?? []} group="AGENT" />
            {(me.agents?.length ?? 0) > 0 && <ExportPeople people={me.agents!} group="AGENT" month={month} />}
          </>
        )}
      </div>
    );
  }
  return <OwnCard card={me.own} title={me.kind === 'CSO' ? 'Your calls this month' : 'Your customers'} />;
}

// ─── Administrators: everyone, by group ─────────────────────────────────────

function EveryoneView({ month, me }: { month: string; me: MyKpis }) {
  const [group, setGroup] = useState<KpiGroup>('AGENT');
  const key = `${group}|${month}`;
  const [loaded, setLoaded] = useState<{ key: string; data?: PeopleKpis; error?: string } | null>(null);
  const [reload, setReload] = useState(0);
  const [targetsError, setTargetsError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, number> | null>(null);
  const data = loaded?.key === key ? loaded.data ?? null : null;
  const error = (loaded?.key === key ? loaded.error : null) ?? targetsError;

  useEffect(() => {
    let live = true;
    api
      .get('/kpi/people', { params: { group, month } })
      .then(({ data }) => live && setLoaded({ key: `${group}|${month}`, data }))
      .catch((err) => live && setLoaded({ key: `${group}|${month}`, error: errorText(err, 'Could not load the KPIs') }));
    return () => {
      live = false;
    };
  }, [group, month, reload]);

  const openTargets = async () => {
    setTargetsError(null);
    try {
      const { data: t } = await api.get('/kpi/targets');
      setEditing(t.targets[group] || {});
    } catch (err) {
      setTargetsError(errorText(err, 'Could not load the targets'));
    }
  };

  const summary = useMemo(() => {
    if (!data) return null;
    const scored = data.people.filter((p) => p.score.percent !== null);
    return {
      people: data.people.length,
      onTarget: scored.filter((p) => (p.score.percent ?? 0) >= 75).length,
      scored: scored.length,
    };
  }, [data]);

  return (
    <div className="space-y-3">
      <Tabs value={group} onChange={setGroup} options={(['AGENT', 'TEAM', 'CSO'] as KpiGroup[]).map((g) => ({ value: g, label: GROUP_LABEL[g] }))} />

      <div className="flex flex-wrap items-center gap-2">
        {summary && (
          <p className="text-sm text-gray-600">
            {summary.people} {summary.people === 1 ? 'person' : 'people'}
            {summary.scored > 0 && <> · <span className="font-semibold text-emerald-700">{summary.onTarget}</span> meeting 3 in 4 targets or more</>}
          </p>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          {me.canSetTargets && (
            <Button variant="outline" size="sm" onClick={openTargets}>
              <SlidersHorizontal className="mr-2 h-4 w-4" /> Targets
            </Button>
          )}
          {data && data.people.length > 0 && <ExportPeople people={data.people} group={group} month={month} />}
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {!data && !error && <p className="py-10 text-center text-sm text-gray-400">Calculating…</p>}
      {data && data.people.every((p) => p.score.targeted === 0) && data.people.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No targets are set for {GROUP_LABEL[group].toLowerCase()} yet, so nobody is ranked.{' '}
          {me.canSetTargets ? (
            <button className="font-semibold underline" onClick={openTargets}>Set the targets</button>
          ) : (
            'Ask an administrator to set them.'
          )}
        </div>
      )}
      {data && <PeopleList people={data.people} group={group} />}

      {editing && (
        <TargetsDialog
          group={group}
          definitions={me.definitions[group]}
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setReload((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}

function ExportPeople({ people, group, month }: { people: KpiCard[]; group: KpiGroup; month: string }) {
  const options = useMemo(() => {
    const lines = people[0]?.lines ?? [];
    return {
      title: `KPIs — ${GROUP_LABEL[group]} — ${monthLabel(month)}`,
      filename: `kpi-${group.toLowerCase()}-${month}`,
      summary: [{ label: 'People', value: people.length }],
      columns: [
        { header: '#', accessor: (r: KpiCard) => people.indexOf(r) + 1 },
        { header: 'Name', accessor: (r: KpiCard) => r.name },
        { header: 'Role', accessor: (r: KpiCard) => ROLE_LABEL[r.role] || r.role },
        { header: 'On target', accessor: (r: KpiCard) => (r.score.targeted ? `${r.score.met}/${r.score.targeted}` : '') },
        ...lines.map((l) => ({
          header: l.label,
          accessor: (r: KpiCard) => {
            const x = r.lines.find((y) => y.key === l.key);
            if (!x) return '';
            const status = x.status === 'NO_TARGET' || x.status === 'NOT_MEASURED' ? '' : ` (${STATUS_STYLE[x.status].label})`;
            return `${formatValue(x.unit, x.value)}${status}`;
          },
        })),
      ],
      data: people,
    };
  }, [people, group, month]);
  return <ExportButtons exportOptions={options as unknown as ExportOptions} showPrint={false} />;
}
