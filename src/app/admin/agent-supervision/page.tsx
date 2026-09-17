"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Search, ShieldCheck, Users } from "lucide-react";
import api from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface Person { id: string; name: string; email: string; area?: string | null; district?: string | null }
interface AgentRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  canHaveClusterAgent: boolean;
  area: string | null;
  district: string | null;
  clusterAgentId: string | null;
  csoIds: string[];
  customers: number;
  contracts: number;
}
interface Settings { requireClusterAgent: boolean; requireCso: boolean }

type Filter = "all" | "no-cluster" | "no-cso";

export default function AgentSupervisionPage() {
  const { toast } = useToast();
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [clusterAgents, setClusterAgents] = useState<Person[]>([]);
  const [officers, setOfficers] = useState<Person[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [summary, setSummary] = useState<{ total: number; withoutClusterAgent: number; withoutCso: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("no-cluster");

  const load = useCallback(async () => {
    try {
      const res = await api.get("/admin-users/agent-supervision");
      setAgents(res.data.agents ?? []);
      setClusterAgents(res.data.clusterAgents ?? []);
      setOfficers(res.data.customerServiceOfficers ?? []);
      setSettings(res.data.settings ?? null);
      setSummary(res.data.summary ?? null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to load agents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const save = async (agent: AgentRow, patch: Partial<Pick<AgentRow, "clusterAgentId" | "csoIds" | "area" | "district">>) => {
    setSavingId(agent.id);
    // Applied locally first so the row does not snap back while the request is
    // in flight; reverted from the server's answer if it refuses.
    const previous = agents;
    setAgents((rows) => rows.map((r) => (r.id === agent.id ? { ...r, ...patch } : r)));
    try {
      await api.put("/admin-users/agent-supervision", { agentId: agent.id, ...patch });
      setSavedId(agent.id);
      setTimeout(() => setSavedId((id) => (id === agent.id ? null : id)), 1500);
      const res = await api.get("/admin-users/agent-supervision");
      setSummary(res.data.summary ?? null);
    } catch (error: any) {
      setAgents(previous);
      toast({
        title: "Could not save",
        description: error.response?.data?.error || "Failed to update",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const toggleRule = async (key: keyof Settings, value: boolean) => {
    try {
      const res = await api.put("/admin-users/agent-supervision/settings", { [key]: value });
      setSettings(res.data.settings);
      toast({
        title: value ? "Rule switched on" : "Rule switched off",
        description: value
          ? "Agents without this link can no longer create contracts."
          : "The link is no longer required to create contracts.",
      });
    } catch (error: any) {
      toast({
        title: "Not switched on",
        description: error.response?.data?.error || "Failed to update the rule",
        variant: "destructive",
      });
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return agents.filter((a) => {
      if (filter === "no-cluster" && (!a.canHaveClusterAgent || a.clusterAgentId)) return false;
      if (filter === "no-cso" && a.csoIds.length > 0) return false;
      if (!term) return true;
      return a.name.toLowerCase().includes(term) || a.email.toLowerCase().includes(term);
    });
  }, [agents, search, filter]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-cyan-600" />
      </div>
    );
  }

  const noCluster = summary?.withoutClusterAgent ?? 0;
  const noCso = summary?.withoutCso ?? 0;

  return (
    <div className="space-y-5 pb-10 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Agent Supervision</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Who supervises each agent, and who handles their customers
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-xs text-gray-600">Agents</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{summary?.total ?? 0}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-xs text-gray-600">No cluster agent</p>
          <p className={`mt-1 text-2xl font-bold ${noCluster ? "text-amber-600" : "text-emerald-600"}`}>{noCluster}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-xs text-gray-600">No officer</p>
          <p className={`mt-1 text-2xl font-bold ${noCso ? "text-amber-600" : "text-emerald-600"}`}>{noCso}</p>
        </div>
      </div>

      {clusterAgents.length === 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">There are no cluster agents yet.</p>
            <p className="mt-1">
              Give a user the Cluster Agent role on the Users page first — until then there is nobody to
              assign these agents to.
            </p>
          </div>
        </div>
      )}

      {/* The rules */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <ShieldCheck className="h-4 w-4 text-gray-400" />
          Requirements for creating contracts
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Switching a rule on blocks unassigned agents immediately, so it is refused until everyone is
          covered.
        </p>
        <div className="mt-4 space-y-4">
          <RuleToggle
            label="Must be assigned to a cluster agent"
            hint="An unsupervised agent's portfolio has nobody accountable for it, and nobody can request a temporary unlock for their customers."
            checked={settings?.requireClusterAgent ?? false}
            blockedBy={noCluster}
            onChange={(v) => toggleRule("requireClusterAgent", v)}
          />
          <RuleToggle
            label="Must be assigned to a customer service officer"
            hint="Without an officer, this agent's contracts sit in a verification queue no one can see."
            checked={settings?.requireCso ?? false}
            blockedBy={noCso}
            onChange={(v) => toggleRule("requireCso", v)}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents by name or email…"
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div className="flex gap-2">
          {([
            ["no-cluster", `Needs cluster (${noCluster})`],
            ["no-cso", `Needs officer (${noCso})`],
            ["all", `All (${summary?.total ?? 0})`],
          ] as [Filter, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                filter === key ? "bg-gray-900 text-white" : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white py-12 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-700">
            {filter === "no-cluster" && noCluster === 0
              ? "Every agent has a cluster agent"
              : filter === "no-cso" && noCso === 0
                ? "Every agent has an officer"
                : "No agent matches"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((agent) => (
            <div key={agent.id} className="rounded-xl border border-gray-100 bg-white p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="min-w-0 lg:w-56">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-gray-900">{agent.name}</p>
                    {savedId === agent.id && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
                  </div>
                  <p className="truncate text-xs text-gray-500">{agent.email}</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {agent.role.replace(/_/g, " ").toLowerCase()} · {agent.contracts} contracts
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <input
                      defaultValue={agent.area ?? ""}
                      placeholder="Area"
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v !== (agent.area ?? "")) save(agent, { area: v || null });
                      }}
                      className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:border-cyan-500 focus:outline-none"
                    />
                    <input
                      defaultValue={agent.district ?? ""}
                      placeholder="District"
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v !== (agent.district ?? "")) save(agent, { district: v || null });
                      }}
                      className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Cluster agent</label>
                  {agent.canHaveClusterAgent ? (
                    <SearchableSelect
                      options={clusterAgents.map((c) => ({
                        value: c.id,
                        label: c.name,
                        // Area first: grouping is meant to follow geography, so
                        // that is the useful thing to see while choosing.
                        sublabel: [c.area, c.district].filter(Boolean).join(", ") || c.email,
                      }))}
                      value={agent.clusterAgentId ?? ""}
                      onChange={(v) => save(agent, { clusterAgentId: v || null })}
                      placeholder="Not assigned"
                      searchPlaceholder="Search cluster agents…"
                      emptyText="No cluster agents exist yet"
                      allowClear
                      clearLabel="Not assigned"
                      disabled={savingId === agent.id}
                    />
                  ) : (
                    <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                      Cluster agents are not supervised by other cluster agents
                    </p>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Customer service officer</label>
                  <SearchableSelect
                    options={officers.map((c) => ({ value: c.id, label: c.name, sublabel: c.email }))}
                    value={agent.csoIds[0] ?? ""}
                    onChange={(v) => save(agent, { csoIds: v ? [v] : [] })}
                    placeholder="Not assigned"
                    searchPlaceholder="Search officers…"
                    emptyText="No officers match"
                    allowClear
                    clearLabel="Not assigned"
                    disabled={savingId === agent.id}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RuleToggle({
  label, hint, checked, blockedBy, onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  blockedBy: number;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-gray-100 pt-4 first:border-0 first:pt-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="mt-0.5 text-xs text-gray-500">{hint}</p>
        {!checked && blockedBy > 0 && (
          <p className="mt-1 text-xs text-amber-700">
            {blockedBy} agent{blockedBy === 1 ? "" : "s"} would be blocked — assign them before switching this on.
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-cyan-600" : "bg-gray-300"}`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
