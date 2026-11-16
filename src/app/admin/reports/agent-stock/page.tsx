'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Boxes, Clock, PackageCheck, RefreshCw, Search, TrendingUp, Users, Warehouse } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ExportButtons } from '@/components/admin/ExportButtons';
import { ExportOptions } from '@/lib/exportUtils';

interface AgentRow {
  id: string;
  name: string;
  phone: string | null;
  role: string | null;
  area: string | null;
  district: string | null;
  isActive: boolean;
  clusterLeader: string | null;
  inStock: number;
  reserved: number;
  total: number;
  value: number;
  oldestDays: number | null;
  over30: number;
  over60: number;
  soldThisMonth: number;
  products: Array<{ name: string; count: number }>;
}

interface DeviceRow {
  id: string;
  serialNumber: string;
  product: string;
  category: string | null;
  status: string;
  lockStatus: string | null;
  value: number;
  agentId: string;
  agent: string;
  withAgentSince: string;
  daysHeld: number;
  sinceIsEstimate: boolean;
}

interface Report {
  generatedAt: string;
  scope: 'all' | 'cluster';
  summary: { unassigned: { count: number; value: number } | null };
  agents: AgentRow[];
  devices: DeviceRow[];
  filters: { leaders: Array<{ id: string; name: string }>; products: Array<{ id: string; name: string }> };
}

const PAGE_SIZE = 50;

const ageClass = (days: number | null) =>
  days === null ? 'text-slate-400' : days >= 60 ? 'text-red-600 font-semibold' : days >= 30 ? 'text-amber-600 font-semibold' : 'text-slate-700';

function Tile({ icon: Icon, label, value, note, tone = 'blue' }: { icon: typeof Users; label: string; value: string | number; note?: string; tone?: 'blue' | 'emerald' | 'amber' | 'slate' | 'violet' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-100 text-slate-600',
    violet: 'bg-violet-50 text-violet-600',
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] text-slate-500">{label}</p>
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        {note && <p className="mt-0.5 text-xs text-slate-500">{note}</p>}
      </CardContent>
    </Card>
  );
}

export default function AgentStockReportPage() {
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Server-side filters.
  const [leaderId, setLeaderId] = useState('');
  const [productId, setProductId] = useState('');
  // Client-side filters.
  const [agentId, setAgentId] = useState('');
  const [hideEmpty, setHideEmpty] = useState(false);
  const [onlyAged, setOnlyAged] = useState(false);
  const [serialSearch, setSerialSearch] = useState('');
  const [tab, setTab] = useState<'agents' | 'devices'>('agents');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/reports/agent-stock', {
        params: { clusterLeaderId: leaderId || undefined, productId: productId || undefined },
      });
      setReport(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load the report');
    } finally {
      setLoading(false);
    }
  }, [leaderId, productId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => setPage(1), [agentId, onlyAged, serialSearch, tab, leaderId, productId]);

  const agents = useMemo(() => {
    let rows = report?.agents ?? [];
    if (agentId) rows = rows.filter((a) => a.id === agentId);
    if (hideEmpty) rows = rows.filter((a) => a.total > 0);
    if (onlyAged) rows = rows.filter((a) => a.over30 > 0);
    return rows;
  }, [report, agentId, hideEmpty, onlyAged]);

  const devices = useMemo(() => {
    let rows = report?.devices ?? [];
    if (agentId) rows = rows.filter((d) => d.agentId === agentId);
    if (onlyAged) rows = rows.filter((d) => d.daysHeld >= 30);
    const term = serialSearch.trim().toLowerCase();
    if (term) rows = rows.filter((d) => d.serialNumber.toLowerCase().includes(term) || d.product.toLowerCase().includes(term));
    return rows;
  }, [report, agentId, onlyAged, serialSearch]);

  // Totals follow the agent filter, so a single agent's figures can be read off the tiles.
  const totals = useMemo(() => {
    const scoped = (report?.agents ?? []).filter((a) => !agentId || a.id === agentId);
    const held = (report?.devices ?? []).filter((d) => !agentId || d.agentId === agentId);
    return {
      agents: scoped.length,
      holding: scoped.filter((a) => a.total > 0).length,
      devices: held.length,
      reserved: held.filter((d) => d.status === 'RESERVED').length,
      value: held.reduce((s, d) => s + d.value, 0),
      over30: held.filter((d) => d.daysHeld >= 30).length,
      over60: held.filter((d) => d.daysHeld >= 60).length,
      sold: scoped.reduce((s, a) => s + a.soldThisMonth, 0),
    };
  }, [report, agentId]);

  const agentOptions = useMemo(
    () => (report?.agents ?? []).map((a) => ({ value: a.id, label: a.name, sublabel: [a.phone, a.clusterLeader && `Leader: ${a.clusterLeader}`].filter(Boolean).join(' · ') })),
    [report],
  );

  const today = new Date().toISOString().slice(0, 10);
  const exportAgents: ExportOptions = {
    title: 'Agent Stock Report — by agent',
    filename: `agent-stock-by-agent-${today}`,
    summary: [
      { label: 'Devices with agents', value: totals.devices },
      { label: 'Stock value (GHS)', value: formatCurrency(totals.value) },
      { label: 'Held 30+ days', value: totals.over30 },
      { label: 'Sold this month', value: totals.sold },
    ],
    columns: [
      { header: 'Agent', accessor: (r: any) => r.name },
      { header: 'Phone', accessor: (r: any) => r.phone ?? '' },
      { header: 'Cluster leader', accessor: (r: any) => r.clusterLeader ?? '' },
      { header: 'Area', accessor: (r: any) => [r.area, r.district].filter(Boolean).join(', ') },
      { header: 'In stock', accessor: (r: any) => r.inStock },
      { header: 'Reserved', accessor: (r: any) => r.reserved },
      { header: 'Value (GHS)', accessor: (r: any) => formatCurrency(r.value) },
      { header: 'Oldest (days)', accessor: (r: any) => r.oldestDays ?? '' },
      { header: '30+ days', accessor: (r: any) => r.over30 },
      { header: 'Sold this month', accessor: (r: any) => r.soldThisMonth },
      { header: 'Products', accessor: (r: any) => r.products.map((p: any) => `${p.name} ×${p.count}`).join('; ') },
    ],
    data: agents as any[],
  };
  const exportDevices: ExportOptions = {
    title: 'Agent Stock Report — devices',
    filename: `agent-stock-devices-${today}`,
    summary: [
      { label: 'Devices', value: devices.length },
      { label: 'Stock value (GHS)', value: formatCurrency(devices.reduce((s, d) => s + d.value, 0)) },
    ],
    columns: [
      { header: 'Serial / IMEI', accessor: (r: any) => r.serialNumber },
      { header: 'Product', accessor: (r: any) => r.product },
      { header: 'Agent', accessor: (r: any) => r.agent },
      { header: 'Status', accessor: (r: any) => r.status },
      { header: 'With agent since', accessor: (r: any) => `${r.sinceIsEstimate ? '≈ ' : ''}${formatDate(r.withAgentSince)}` },
      { header: 'Days held', accessor: (r: any) => r.daysHeld },
      { header: 'Value (GHS)', accessor: (r: any) => formatCurrency(r.value) },
    ],
    data: devices as any[],
  };

  const pagedDevices = devices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(devices.length / PAGE_SIZE));
  const pagedAgents = agents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const agentPages = Math.max(1, Math.ceil(agents.length / PAGE_SIZE));
  const currentPages = tab === 'agents' ? agentPages : pages;

  const selectClass = 'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/15';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <button onClick={() => router.push('/admin/reports')} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Back to reports">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Agent Stock Report</h1>
          <p className="mt-1 text-sm text-slate-500">
            Devices each agent is holding, what they are worth and how long they have had them
            {report ? ` · as at ${new Date(report.generatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {(report?.filters.leaders.length ?? 0) > 0 && (
            <label className="block text-xs font-medium text-slate-600">
              Cluster leader
              <select className={`mt-1 ${selectClass}`} value={leaderId} onChange={(e) => { setLeaderId(e.target.value); setAgentId(''); }}>
                <option value="">All clusters</option>
                {report!.filters.leaders.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-xs font-medium text-slate-600">
            Product
            <select className={`mt-1 ${selectClass}`} value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">All products</option>
              {(report?.filters.products ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <div className="text-xs font-medium text-slate-600">
            Agent
            <SearchableSelect
              className="mt-1"
              options={agentOptions}
              value={agentId}
              onChange={setAgentId}
              placeholder="All agents"
              allowClear
              clearLabel="All agents"
            />
          </div>
          <div className="flex flex-col justify-end gap-1.5 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
              Hide agents with no stock
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={onlyAged} onChange={(e) => setOnlyAged(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
              Only stock held 30+ days
            </label>
          </div>
        </CardContent>
      </Card>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile icon={Boxes} label="Devices with agents" value={totals.devices} note={totals.reserved ? `${totals.reserved} reserved for a sale` : undefined} />
        <Tile icon={TrendingUp} label="Stock value" value={formatCurrency(totals.value)} note="At cash price" tone="emerald" />
        <Tile icon={Users} label="Agents holding stock" value={totals.holding} note={`of ${totals.agents} agent${totals.agents === 1 ? '' : 's'}`} tone="violet" />
        <Tile icon={Clock} label="Held 30+ days" value={totals.over30} note={totals.over60 ? `${totals.over60} over 60 days` : 'None over 60 days'} tone="amber" />
        {report?.summary.unassigned && !agentId ? (
          <Tile icon={Warehouse} label="Not given to an agent" value={report.summary.unassigned.count} note={formatCurrency(report.summary.unassigned.value)} tone="slate" />
        ) : (
          <Tile icon={PackageCheck} label="Sold this month" value={totals.sold} note="From agents' stock" tone="slate" />
        )}
      </div>

      {/* Tables */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5" role="tablist">
            {(['agents', 'devices'] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {t === 'agents' ? `By agent (${agents.length})` : `Devices (${devices.length})`}
              </button>
            ))}
          </div>
          <ExportButtons exportOptions={tab === 'agents' ? exportAgents : exportDevices} />
        </div>

        {tab === 'devices' && (
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={serialSearch}
                onChange={(e) => setSerialSearch(e.target.value)}
                placeholder="Search IMEI / serial or product"
                className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/15"
              />
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          {loading && !report ? (
            <p className="px-4 py-16 text-center text-sm text-slate-500">Loading…</p>
          ) : tab === 'agents' ? (
            agents.length === 0 ? (
              <p className="px-4 py-16 text-center text-sm text-slate-500">No agents match these filters.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5">Agent</th>
                    <th className="px-3 py-2.5">Cluster leader</th>
                    <th className="px-3 py-2.5">Area</th>
                    <th className="px-3 py-2.5 text-right">In stock</th>
                    <th className="px-3 py-2.5 text-right">Reserved</th>
                    <th className="px-3 py-2.5 text-right">Value</th>
                    <th className="px-3 py-2.5 text-right">Oldest</th>
                    <th className="px-3 py-2.5 text-right">30+ days</th>
                    <th className="px-3 py-2.5 text-right">Sold this month</th>
                    <th className="px-3 py-2.5">Products held</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedAgents.map((a) => (
                    <tr
                      key={a.id}
                      onClick={() => { setAgentId(a.id); setTab('devices'); }}
                      className="cursor-pointer hover:bg-slate-50"
                      title="Show this agent's devices"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">
                          {a.name}
                          {!a.isActive && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">Inactive</span>}
                        </p>
                        <p className="text-xs text-slate-500">{[a.phone, a.role?.replace(/_/g, ' ').toLowerCase()].filter(Boolean).join(' · ')}</p>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{a.clusterLeader ?? '—'}</td>
                      <td className="px-3 py-3 text-slate-600">{[a.area, a.district].filter(Boolean).join(', ') || '—'}</td>
                      <td className="px-3 py-3 text-right font-semibold text-slate-900">{a.inStock}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{a.reserved || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right text-slate-700">{a.total ? formatCurrency(a.value) : '—'}</td>
                      <td className={`whitespace-nowrap px-3 py-3 text-right ${ageClass(a.oldestDays)}`}>{a.oldestDays === null ? '—' : `${a.oldestDays} d`}</td>
                      <td className={`px-3 py-3 text-right ${a.over30 ? 'font-semibold text-amber-600' : 'text-slate-400'}`}>{a.over30 || '—'}</td>
                      <td className="px-3 py-3 text-right text-slate-700">{a.soldThisMonth || '—'}</td>
                      <td className="px-3 py-3">
                        <div className="flex max-w-xs flex-wrap gap-1">
                          {a.products.slice(0, 3).map((p) => (
                            <span key={p.name} className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600">
                              {p.name} ×{p.count}
                            </span>
                          ))}
                          {a.products.length > 3 && <span className="text-[11px] text-slate-500">+{a.products.length - 3} more</span>}
                          {a.products.length === 0 && <span className="text-xs text-slate-400">—</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : devices.length === 0 ? (
            <p className="px-4 py-16 text-center text-sm text-slate-500">No devices match these filters.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">IMEI / serial</th>
                  <th className="px-3 py-2.5">Product</th>
                  <th className="px-3 py-2.5">Agent</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">With agent since</th>
                  <th className="px-3 py-2.5 text-right">Days held</th>
                  <th className="px-3 py-2.5 text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedDevices.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[13px] text-slate-800">{d.serialNumber}</td>
                    <td className="px-3 py-2.5 text-slate-700">{d.product}</td>
                    <td className="px-3 py-2.5 text-slate-700">{d.agent}</td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${d.status === 'RESERVED' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                        {d.status === 'RESERVED' ? 'Reserved' : 'In stock'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600" title={d.sinceIsEstimate ? 'No transfer record to this agent: date the device was added or last moved' : undefined}>
                      {d.sinceIsEstimate ? '≈ ' : ''}
                      {formatDate(d.withAgentSince)}
                    </td>
                    <td className={`px-3 py-2.5 text-right ${ageClass(d.daysHeld)}`}>{d.daysHeld}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right text-slate-700">{formatCurrency(d.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {currentPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
            <span>
              Page {page} of {currentPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= currentPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      <p className="text-xs leading-5 text-slate-500">
        Counts unsold devices only: in stock, or reserved for a sale that is not through yet. Value is each product&apos;s cash price.
        &ldquo;≈&rdquo; marks a device with no transfer record to its current agent; the date shown is when it was added or last moved.
        Click an agent to see their devices.
      </p>
    </div>
  );
}
