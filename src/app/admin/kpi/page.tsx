'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Search, SlidersHorizontal, Target, X } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExportButtons } from '@/components/admin/ExportButtons';
import type { ExportOptions } from '@/lib/exportUtils';
import { cn } from '@/lib/utils';
import { errorText, formatValue, monthLabel, thisMonth } from '../cluster-scorecard/types';
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

/** Data goes back to the first imported contracts; earlier years would be empty. */
const FIRST_YEAR = 2024;
const MONTH_NAMES = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString('en-GB', { month: 'long' }));

function MonthPicker({ month, onChange, meta }: { month: string; onChange: (m: string) => void; meta: MonthMeta | null }) {
  const [year, mon] = month.split('-').map(Number);
  const current = thisMonth();
  const [currentYear, currentMon] = current.split('-').map(Number);
  const years = Array.from({ length: currentYear - FIRST_YEAR + 1 }, (_, i) => currentYear - i);
  // A month that has not started has nothing to show, so moving to this year keeps the month in range.
  const pick = (y: number, m: number) => onChange(`${y}-${String(y === currentYear ? Math.min(m, currentMon) : m).padStart(2, '0')}`);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <CalendarDays className="hidden h-5 w-5 shrink-0 text-gray-400 sm:block" />
        <Select value={String(mon)} onValueChange={(v) => pick(year, Number(v))}>
          <SelectTrigger aria-label="Month" className="min-w-0 flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_NAMES.map((name, i) => (
              <SelectItem key={name} value={String(i + 1)} disabled={year === currentYear && i + 1 > currentMon}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(v) => pick(Number(v), mon)}>
          <SelectTrigger aria-label="Year" className="w-24 shrink-0 sm:w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {month !== current && (
          <Button variant="outline" size="sm" className="shrink-0" onClick={() => onChange(current)}>
            This month
          </Button>
        )}
      </div>
      {meta?.inProgress && (
        <p className="pt-2 text-center text-xs text-gray-500">
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

const SEARCH_PLACEHOLDER: Record<KpiGroup, string> = {
  AGENT: 'Search agents by name or phone…',
  TEAM: 'Search cluster leaders by name or phone…',
  CSO: 'Search officers by name or phone…',
};

/** Name or phone; a phone matches with or without spaces and the leading 0 / 233. */
function matches(card: KpiCard, term: string): boolean {
  const t = term.trim().toLowerCase();
  if (!t) return true;
  if (card.name.toLowerCase().includes(t)) return true;
  const digits = t.replace(/\D/g, '').replace(/^(233|0)/, '');
  return digits.length >= 3 && (card.phone ?? '').replace(/\D/g, '').includes(digits);
}

function SearchBox({ value, onChange, group }: { value: string; onChange: (v: string) => void; group: KpiGroup }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={SEARCH_PLACEHOLDER[group]}
        aria-label={SEARCH_PLACEHOLDER[group]}
        className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-9 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:bg-gray-100" onClick={() => onChange('')} aria-label="Clear search">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/** Ranked people, narrowed by the search. Everyone keeps their place in the full ranking. */
function PeopleList({ people, group, search = '' }: { people: KpiCard[]; group: KpiGroup; search?: string }) {
  if (!people.length) return <p className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500">Nobody to show for this month.</p>;
  const shown = people.map((p, i) => ({ p, rank: i + 1 })).filter(({ p }) => matches(p, search));
  if (!shown.length) return <p className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500">No one matches “{search.trim()}”.</p>;
  return (
    <ul className="space-y-2">
      {shown.map(({ p, rank }) => (
        <PersonRow key={p.userId} card={p} rank={rank} headline={HEADLINE[group]} />
      ))}
    </ul>
  );
}

// ─── Agents, cluster leaders and officers: their own page ───────────────────

function PersonalView({ me, month }: { me: MyKpis; month: string }) {
  const [tab, setTab] = useState<'own' | 'team' | 'agents'>('own');
  const [search, setSearch] = useState('');

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
            {(me.agents?.length ?? 0) > 0 && <SearchBox value={search} onChange={setSearch} group="AGENT" />}
            <PeopleList people={me.agents ?? []} group="AGENT" search={search} />
            {(me.agents?.length ?? 0) > 0 && <ExportPeople people={me.agents!} group="AGENT" month={month} search={search} />}
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
  const [search, setSearch] = useState('');
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
      matching: data.people.filter((p) => matches(p, search)).length,
      onTarget: scored.filter((p) => (p.score.percent ?? 0) >= 75).length,
      scored: scored.length,
    };
  }, [data, search]);

  return (
    <div className="space-y-3">
      <Tabs value={group} onChange={(g) => { setGroup(g); setSearch(''); }} options={(['AGENT', 'TEAM', 'CSO'] as KpiGroup[]).map((g) => ({ value: g, label: GROUP_LABEL[g] }))} />

      <div className="flex flex-wrap items-center gap-2">
        {summary && (
          <p className="text-sm text-gray-600">
            {search.trim() ? `${summary.matching} of ` : ''}
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
          {data && data.people.length > 0 && <ExportPeople people={data.people} group={group} month={month} search={search} />}
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
      {data && data.people.length > 0 && <SearchBox value={search} onChange={setSearch} group={group} />}
      {data && <PeopleList people={data.people} group={group} search={search} />}

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

function ExportPeople({ people, group, month, search = '' }: { people: KpiCard[]; group: KpiGroup; month: string; search?: string }) {
  const options = useMemo(() => {
    const lines = people[0]?.lines ?? [];
    const shown = people.filter((p) => matches(p, search));
    return {
      title: `KPIs — ${GROUP_LABEL[group]} — ${monthLabel(month)}`,
      filename: `kpi-${group.toLowerCase()}-${month}`,
      summary: [
        { label: 'People', value: shown.length },
        ...(search.trim() ? [{ label: 'Search', value: search.trim() }] : []),
      ],
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
      data: shown,
    };
  }, [people, group, month, search]);
  return <ExportButtons exportOptions={options as unknown as ExportOptions} showPrint={false} />;
}
