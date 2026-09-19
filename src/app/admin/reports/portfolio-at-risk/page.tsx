"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ShieldAlert,
  Unlock,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";

interface AgentRisk {
  id: string;
  name: string;
  roleName: string;
  area: string | null;
  district: string | null;
  isActive: boolean;
  clusterAgentId: string | null;
  clusterAgentName: string | null;
  activeContracts: number;
  outstanding: number;
  atRisk1: number;
  atRisk30: number;
  contractsAtRisk30: number;
  par1: number;
  par30: number;
  overLimit: boolean;
  judged: boolean;
}

interface ClusterRisk {
  id: string | null;
  name: string;
  agents: number;
  activeContracts: number;
  outstanding: number;
  atRisk30: number;
  overLimit: number;
  par30: number;
}

interface Bucket {
  key: string;
  label: string;
  contracts: number;
  amount: number;
}

interface Summary {
  agents: number;
  activeContracts: number;
  outstanding: number;
  atRisk1: number;
  atRisk30: number;
  par1: number;
  par30: number;
  overLimit: number;
  underUnlockWindow: { contracts: number; amount: number };
  unattributed: { contracts: number; outstanding: number; atRisk30: number };
}

interface ParReport {
  summary: Summary | null;
  settings: { enabled: boolean; threshold: number; minContracts: number };
  buckets: Bucket[];
  agents: AgentRisk[];
  clusters: ClusterRisk[];
}

interface LateContract {
  id: string;
  contractNumber: string;
  customerName: string;
  phone: string;
  membershipId: string | null;
  daysLate: number;
  overdueAmount: number;
  missedInstallments: number;
  outstanding: number;
  penaltyOutstanding: number;
  deviceState: string | null;
  unlockWindowEnds: string | null;
}

type SortField = "par30" | "atRisk30" | "outstanding" | "activeContracts" | "name";

// Red only once a third of the book is at risk — at this portfolio's levels a
// lower cutoff would paint almost every row and stop meaning anything.
function parTone(par: number) {
  if (par >= 30) return "text-red-600";
  if (par >= 15) return "text-amber-600";
  return "text-emerald-600";
}

function bucketTone(key: string) {
  switch (key) {
    case "current":
      return "bg-emerald-500";
    case "d1_30":
      return "bg-yellow-500";
    case "d31_60":
      return "bg-amber-500";
    case "d61_90":
      return "bg-orange-500";
    default:
      return "bg-red-600";
  }
}

export default function PortfolioAtRiskPage() {
  const { toast } = useToast();
  const [report, setReport] = useState<ParReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [onlyOverLimit, setOnlyOverLimit] = useState(false);
  const [cluster, setCluster] = useState("all");
  const [sortField, setSortField] = useState<SortField>("par30");
  const [sortAsc, setSortAsc] = useState(false);

  const [openAgent, setOpenAgent] = useState<string | null>(null);
  const [lateContracts, setLateContracts] = useState<Record<string, LateContract[]>>({});
  const [loadingAgent, setLoadingAgent] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/reports/portfolio-at-risk");
      setReport(res.data);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.error || "Failed to load the portfolio at risk report",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const toggleAgent = async (agentId: string) => {
    if (openAgent === agentId) {
      setOpenAgent(null);
      return;
    }
    setOpenAgent(agentId);
    if (lateContracts[agentId]) return;
    setLoadingAgent(agentId);
    try {
      const res = await api.get(`/reports/portfolio-at-risk/${agentId}`);
      setLateContracts((prev) => ({ ...prev, [agentId]: res.data.contracts }));
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.error || "Failed to load this agent's late customers",
        variant: "destructive",
      });
      setOpenAgent(null);
    } finally {
      setLoadingAgent(null);
    }
  };

  const sortBy = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === "name");
    }
  };

  const visibleAgents = useMemo(() => {
    if (!report) return [];
    const term = search.trim().toLowerCase();
    const rows = report.agents.filter((a) => {
      if (onlyOverLimit && !a.overLimit) return false;
      if (cluster !== "all" && (a.clusterAgentId ?? "none") !== cluster) return false;
      if (!term) return true;
      return (
        a.name.toLowerCase().includes(term) ||
        (a.area ?? "").toLowerCase().includes(term) ||
        (a.district ?? "").toLowerCase().includes(term) ||
        (a.clusterAgentName ?? "").toLowerCase().includes(term)
      );
    });
    return [...rows].sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      if (sortField === "name") return a.name.localeCompare(b.name) * dir;
      return ((a[sortField] as number) - (b[sortField] as number)) * dir;
    });
  }, [report, search, onlyOverLimit, cluster, sortField, sortAsc]);

  const summary = report?.summary;
  const maxBucket = Math.max(1, ...(report?.buckets ?? []).map((b) => b.amount));

  const SortHead = ({ field, label, className = "" }: { field: SortField; label: string; className?: string }) => (
    <th className={`px-3 py-2 ${className}`}>
      <button onClick={() => sortBy(field)} className="inline-flex items-center gap-1 hover:text-gray-900">
        {label}
        {sortField === field && (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </button>
    </th>
  );

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/reports">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold">Portfolio at Risk</h1>
            <p className="text-sm text-gray-500">
              Outstanding balance on contracts carrying a late installment, as a share of the book
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadReport} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {isLoading && !report && <p className="py-10 text-center text-sm text-gray-500">Loading…</p>}

      {summary && (
        <>
          {/* Headline figures cover every active contract, so they tie back to
              the ageing table below. */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500">PAR 30</p>
                <p className={`text-2xl font-semibold ${parTone(summary.par30)}`}>{summary.par30}%</p>
                <p className="mt-1 text-xs text-gray-500">{formatCurrency(summary.atRisk30)} over 30 days late</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500">PAR 1</p>
                <p className={`text-2xl font-semibold ${parTone(summary.par1)}`}>{summary.par1}%</p>
                <p className="mt-1 text-xs text-gray-500">{formatCurrency(summary.atRisk1)} any days late</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500">Book outstanding</p>
                <p className="text-2xl font-semibold">{formatCurrency(summary.outstanding)}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {summary.activeContracts.toLocaleString()} active contracts
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500">Agents over the limit</p>
                <p className="text-2xl font-semibold">{summary.overLimit}</p>
                <p className="mt-1 text-xs text-gray-500">of {summary.agents} with an active book</p>
              </CardContent>
            </Card>
          </div>

          {/* The block rule, stated in the same place the numbers are read. */}
          <Card className={report?.settings.enabled ? "border-amber-300 bg-amber-50" : ""}>
            <CardContent className="flex flex-wrap items-start gap-3 p-4">
              <ShieldAlert
                className={`mt-0.5 h-5 w-5 shrink-0 ${report?.settings.enabled ? "text-amber-600" : "text-gray-400"}`}
              />
              <div className="min-w-[16rem] flex-1 text-sm">
                {report?.settings.enabled ? (
                  <p>
                    <span className="font-medium">New contracts are blocked</span> for agents whose PAR 30 is above{" "}
                    {report.settings.threshold}% once they hold at least {report.settings.minContracts} active
                    contracts. {summary.overLimit} {summary.overLimit === 1 ? "agent is" : "agents are"} blocked right
                    now.
                  </p>
                ) : (
                  <p>
                    <span className="font-medium">The PAR block is off.</span> Nothing here stops an agent selling. It
                    would block above {report?.settings.threshold}% PAR 30 on {report?.settings.minContracts}+ active
                    contracts — {summary.overLimit}{" "}
                    {summary.overLimit === 1 ? "agent is" : "agents are"} over that line today.
                  </p>
                )}
                <Link
                  href="/admin/agent-supervision"
                  className="mt-1 inline-block text-xs font-medium text-blue-600 hover:underline"
                >
                  Change this in Agent Supervision →
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Two exclusions that would otherwise make the agent table look wrong. */}
          <div className="grid gap-3 md:grid-cols-2">
            {summary.unattributed.contracts > 0 && (
              <Card className="border-gray-300">
                <CardContent className="flex items-start gap-3 p-4 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                  <p className="text-gray-700">
                    <span className="font-medium">
                      {summary.unattributed.contracts.toLocaleString()} contracts have no agent recorded
                    </span>{" "}
                    — created under an admin login. They carry {formatCurrency(summary.unattributed.atRisk30)} of the
                    PAR 30 total, and appear in nobody&apos;s figures below.
                  </p>
                </CardContent>
              </Card>
            )}
            {summary.underUnlockWindow.contracts > 0 && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="flex items-start gap-3 p-4 text-sm">
                  <Unlock className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <p className="text-blue-900">
                    <span className="font-medium">
                      {summary.underUnlockWindow.contracts} contracts are inside an approved unlock window
                    </span>{" "}
                    ({formatCurrency(summary.underUnlockWindow.amount)}). They are excluded until the window closes.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Ageing */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">How late the book is</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {report!.buckets.map((b) => (
                <div key={b.key}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-gray-700">{b.label}</span>
                    <span className="text-gray-500">
                      {b.contracts.toLocaleString()} · {formatCurrency(b.amount)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${bucketTone(b.key)}`}
                      style={{ width: `${Math.max(1, (b.amount / maxBucket) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Cluster roll-up */}
          {report!.clusters.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">By cluster leader</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {report!.clusters.map((c) => (
                  <button
                    key={c.id ?? "none"}
                    onClick={() => setCluster(cluster === (c.id ?? "none") ? "all" : c.id ?? "none")}
                    className={`rounded-lg border p-3 text-left transition hover:border-gray-400 ${
                      cluster === (c.id ?? "none") ? "border-blue-500 bg-blue-50" : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium">{c.name}</span>
                      <span className={`text-lg font-semibold ${parTone(c.par30)}`}>{c.par30}%</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {c.agents} agents · {c.activeContracts} contracts · {formatCurrency(c.outstanding)}
                    </p>
                    {c.overLimit > 0 && (
                      <p className="mt-1 text-xs font-medium text-red-600">{c.overLimit} over the limit</p>
                    )}
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Agents */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base">
                  By agent
                  <span className="ml-2 text-sm font-normal text-gray-500">{visibleAgents.length}</span>
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search agent, area, cluster…"
                    className="h-9 w-full sm:w-64"
                  />
                  <Button
                    variant={onlyOverLimit ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOnlyOverLimit(!onlyOverLimit)}
                  >
                    Over the limit
                  </Button>
                  {cluster !== "all" && (
                    <Button variant="ghost" size="sm" onClick={() => setCluster("all")}>
                      Clear cluster
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {visibleAgents.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-500">No agents match those filters.</p>
              ) : (
                <>
                  {/* Desktop */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                        <tr>
                          <SortHead field="name" label="Agent" />
                          <th className="px-3 py-2">Cluster</th>
                          <SortHead field="activeContracts" label="Active" className="text-right" />
                          <SortHead field="outstanding" label="Outstanding" className="text-right" />
                          <SortHead field="atRisk30" label="At risk (30)" className="text-right" />
                          <SortHead field="par30" label="PAR 30" className="text-right" />
                          <th className="px-3 py-2 text-right">PAR 1</th>
                          <th className="px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {visibleAgents.map((a) => (
                          <Fragment key={a.id}>
                            <tr
                              className="cursor-pointer hover:bg-gray-50"
                              onClick={() => toggleAgent(a.id)}
                            >
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{a.name}</span>
                                  {a.overLimit && (
                                    <Badge variant="destructive" className="text-[10px]">
                                      Over limit
                                    </Badge>
                                  )}
                                  {!a.isActive && (
                                    <Badge variant="secondary" className="text-[10px]">
                                      Inactive
                                    </Badge>
                                  )}
                                </div>
                                {(a.area || a.district) && (
                                  <p className="text-xs text-gray-500">
                                    {[a.area, a.district].filter(Boolean).join(" · ")}
                                  </p>
                                )}
                              </td>
                              <td className="px-3 py-2 text-gray-600">{a.clusterAgentName ?? "—"}</td>
                              <td className="px-3 py-2 text-right">{a.activeContracts}</td>
                              <td className="px-3 py-2 text-right">{formatCurrency(a.outstanding)}</td>
                              <td className="px-3 py-2 text-right">
                                {formatCurrency(a.atRisk30)}
                                <span className="block text-xs text-gray-500">
                                  {a.contractsAtRisk30} contracts
                                </span>
                              </td>
                              <td className={`px-3 py-2 text-right font-semibold ${parTone(a.par30)}`}>
                                {a.par30}%
                                {!a.judged && (
                                  <span className="block text-[10px] font-normal text-gray-400">
                                    below {report!.settings.minContracts}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-600">{a.par1}%</td>
                              <td className="px-3 py-2 text-right text-gray-400">
                                {openAgent === a.id ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </td>
                            </tr>
                            {openAgent === a.id && (
                              <tr>
                                <td colSpan={8} className="bg-gray-50 px-3 py-3">
                                  <LateList
                                    rows={lateContracts[a.id]}
                                    loading={loadingAgent === a.id}
                                  />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile */}
                  <div className="space-y-3 p-4 md:hidden">
                    {visibleAgents.map((a) => (
                      <div key={a.id} className="rounded-lg border border-gray-200">
                        <button
                          onClick={() => toggleAgent(a.id)}
                          className="flex w-full items-start justify-between gap-3 p-3 text-left"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{a.name}</span>
                              {a.overLimit && (
                                <Badge variant="destructive" className="text-[10px]">
                                  Over limit
                                </Badge>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-gray-500">
                              {a.clusterAgentName ?? "No cluster"} · {a.activeContracts} active
                            </p>
                            <p className="mt-1 text-xs text-gray-600">
                              {formatCurrency(a.atRisk30)} at risk of {formatCurrency(a.outstanding)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-semibold ${parTone(a.par30)}`}>{a.par30}%</p>
                            <p className="text-[10px] text-gray-400">PAR 30</p>
                          </div>
                        </button>
                        {openAgent === a.id && (
                          <div className="border-t bg-gray-50 p-3">
                            <LateList rows={lateContracts[a.id]} loading={loadingAgent === a.id} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!isLoading && report && !summary && (
        <Card>
          <CardContent className="flex items-center gap-3 p-6 text-sm text-gray-600">
            <Users className="h-5 w-5 text-gray-400" />
            No agents are in scope for you.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LateList({ rows, loading }: { rows?: LateContract[]; loading: boolean }) {
  if (loading) return <p className="py-3 text-center text-sm text-gray-500">Loading customers…</p>;
  if (!rows || rows.length === 0)
    return <p className="py-3 text-center text-sm text-gray-500">No late customers.</p>;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {rows.length} late {rows.length === 1 ? "customer" : "customers"}
      </p>
      {rows.map((c) => (
        <div
          key={c.id}
          className="flex flex-wrap items-start justify-between gap-2 rounded border border-gray-200 bg-white p-2 text-sm"
        >
          <div className="min-w-0">
            <Link href={`/admin/contracts/${c.id}`} className="font-medium text-blue-600 hover:underline">
              {c.customerName}
            </Link>
            <p className="text-xs text-gray-500">
              {c.contractNumber} · {c.phone}
            </p>
            {c.unlockWindowEnds && (
              <p className="text-xs text-blue-600">
                Unlock window until {formatDate(c.unlockWindowEnds)}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className={`font-semibold ${c.daysLate > 30 ? "text-red-600" : "text-amber-600"}`}>
              {c.daysLate} days late
            </p>
            <p className="text-xs text-gray-500">
              {formatCurrency(c.overdueAmount)} overdue · {c.missedInstallments} missed
            </p>
            {c.penaltyOutstanding > 0 && (
              <p className="text-xs text-gray-500">{formatCurrency(c.penaltyOutstanding)} penalties</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
