"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  TrendingUp,
  Banknote,
  Trophy,
  ArrowLeft,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import Link from "next/link";

interface AgentStat {
  agentId: string;
  agentName: string;
  roleName: string;
  totalContracts: number;
  pendingContracts: number;
  activeContracts: number;
  completedContracts: number;
  revisionRequestedContracts: number;
  approvedContracts: number;
  totalRevisionRequests: number;
  resubmissionCount: number;
  totalSalesValue: number;
  totalDepositsCollected: number;
  totalPaymentsCollected: number;
  outstandingBalance: number;
  averageApprovalHours: number;
  averageFirstDecisionHours: number;
  approvalRate: number;
}

interface ReportSummary {
  totalAgents: number;
  totalContracts: number;
  totalSalesValue: number;
  totalPaymentsCollected: number;
  totalRevisionRequests: number;
  approvedContracts: number;
  averageApprovalRate: number;
}

interface AgentReport {
  agents: AgentStat[];
  summary: ReportSummary;
}

const MEDAL = ["🥇", "🥈", "🥉"];

export default function AgentReportPage() {
  const { toast } = useToast();
  const [report, setReport] = useState<AgentReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortField, setSortField] = useState<keyof AgentStat>("totalSalesValue");
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await api.get("/reports/agents", { params });
      setReport(res.data);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.error || "Failed to load agent report",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, toast]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const toggleSort = (field: keyof AgentStat) => {
    if (sortField === field) {
      setSortAsc((a) => !a);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sorted = report
    ? [...report.agents].sort((a, b) => {
        const av = a[sortField] as number;
        const bv = b[sortField] as number;
        return sortAsc ? av - bv : bv - av;
      })
    : [];

  const SortIcon = ({ field }: { field: keyof AgentStat }) =>
    sortField === field ? (
      sortAsc ? (
        <ChevronUp className="h-3 w-3 inline ml-0.5" />
      ) : (
        <ChevronDown className="h-3 w-3 inline ml-0.5" />
      )
    ) : null;

  const thCls =
    "text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-900 whitespace-nowrap";

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          href="/admin/reports"
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900">Agent Performance</h1>
          <p className="text-sm text-gray-500">Sales leaderboard and payments attributed to agents</p>
        </div>
        <button
          onClick={loadReport}
          disabled={isLoading}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
              <input
                type="date"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
              <input
                type="date"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(""); setEndDate(""); }}
                className="px-3 py-2 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg"
              >
                Clear
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary stats */}
      {report && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
                  <Users className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{report.summary.totalAgents}</p>
                  <p className="text-xs text-gray-500">Agents</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                  <TrendingUp className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{report.summary.totalContracts}</p>
                  <p className="text-xs text-gray-500">Contracts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-100">
                  <Banknote className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(report.summary.totalSalesValue)}</p>
                  <p className="text-xs text-gray-500">Total Sales</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100">
                  <Banknote className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(report.summary.totalPaymentsCollected)}</p>
                  <p className="text-xs text-gray-500">Payments Collected</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100">
                  <RefreshCw className="h-4 w-4 text-rose-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{report.summary.totalRevisionRequests}</p>
                  <p className="text-xs text-gray-500">Revision Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                  <Trophy className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{report.summary.averageApprovalRate.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">Avg Approval Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table / cards */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-base">Leaderboard</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">No data found</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting the date range</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-8">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Agent</th>
                      <th
                        className={`px-4 py-3 text-right ${thCls}`}
                        onClick={() => toggleSort("totalContracts")}
                      >
                        Contracts <SortIcon field="totalContracts" />
                      </th>
                      <th
                        className={`px-4 py-3 text-right ${thCls}`}
                        onClick={() => toggleSort("totalSalesValue")}
                      >
                        Sales Value <SortIcon field="totalSalesValue" />
                      </th>
                      <th
                        className={`px-4 py-3 text-right ${thCls}`}
                        onClick={() => toggleSort("totalDepositsCollected")}
                      >
                        Deposits <SortIcon field="totalDepositsCollected" />
                      </th>
                      <th
                        className={`px-4 py-3 text-right ${thCls}`}
                        onClick={() => toggleSort("totalPaymentsCollected")}
                      >
                        Payments <SortIcon field="totalPaymentsCollected" />
                      </th>
                      <th
                        className={`px-4 py-3 text-right ${thCls}`}
                        onClick={() => toggleSort("approvalRate")}
                      >
                        Approval Rate <SortIcon field="approvalRate" />
                      </th>
                      <th
                        className={`px-4 py-3 text-right ${thCls}`}
                        onClick={() => toggleSort("outstandingBalance")}
                      >
                        Outstanding <SortIcon field="outstandingBalance" />
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Status Split</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sorted.map((agent, idx) => (
                      <tr key={agent.agentId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-base font-bold text-gray-400">
                          {idx < 3 ? MEDAL[idx] : <span className="text-sm">{idx + 1}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">{agent.agentName}</p>
                          <Badge variant="outline" className="text-[10px] mt-0.5 text-gray-500 border-gray-200">
                            {agent.roleName}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-semibold text-gray-900">{agent.totalContracts}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-semibold text-gray-900">{formatCurrency(agent.totalSalesValue)}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {formatCurrency(agent.totalDepositsCollected)}
                        </td>
                        <td className="px-4 py-3 text-right text-green-700 font-medium">
                          {formatCurrency(agent.totalPaymentsCollected)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="space-y-1">
                            <p className="font-semibold text-gray-900">{agent.approvalRate.toFixed(1)}%</p>
                            <p className="text-[11px] text-gray-400">
                              {agent.approvedContracts} approved
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500">
                          {formatCurrency(agent.outstandingBalance)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 text-xs flex-wrap">
                            {agent.activeContracts > 0 && (
                              <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5">
                                {agent.activeContracts} active
                              </span>
                            )}
                            {agent.pendingContracts > 0 && (
                              <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5">
                                {agent.pendingContracts} pending
                              </span>
                            )}
                            {agent.completedContracts > 0 && (
                              <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5">
                                {agent.completedContracts} done
                              </span>
                            )}
                            {agent.revisionRequestedContracts > 0 && (
                              <span className="rounded-full bg-orange-100 text-orange-700 px-2 py-0.5">
                                {agent.revisionRequestedContracts} revision
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-[11px] text-gray-400">
                            {agent.totalRevisionRequests} requests · {agent.resubmissionCount} resubmits
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3 p-4">
                {sorted.map((agent, idx) => (
                  <div
                    key={agent.agentId}
                    className="rounded-xl border border-gray-200 overflow-hidden"
                  >
                    {/* Card header */}
                    <button
                      className="w-full flex items-center gap-3 p-4 bg-white text-left hover:bg-gray-50"
                      onClick={() =>
                        setExpandedAgent((prev) => (prev === agent.agentId ? null : agent.agentId))
                      }
                    >
                      <span className="text-xl w-7 shrink-0 font-bold text-center">
                        {idx < 3 ? MEDAL[idx] : <span className="text-sm text-gray-400">{idx + 1}</span>}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{agent.agentName}</p>
                        <p className="text-xs text-gray-400">{agent.roleName}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-gray-900">{formatCurrency(agent.totalSalesValue)}</p>
                        <p className="text-xs text-gray-400">{agent.totalContracts} contracts</p>
                      </div>
                      {expandedAgent === agent.agentId ? (
                        <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                      )}
                    </button>

                    {/* Expanded details */}
                    {expandedAgent === agent.agentId && (
                      <div className="border-t border-gray-100 bg-gray-50 p-4 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-gray-400">Deposits Collected</p>
                          <p className="font-semibold text-gray-900">{formatCurrency(agent.totalDepositsCollected)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Payments Collected</p>
                          <p className="font-semibold text-green-700">{formatCurrency(agent.totalPaymentsCollected)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Outstanding Balance</p>
                          <p className="font-semibold text-gray-700">{formatCurrency(agent.outstandingBalance)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Approval Rate</p>
                          <p className="font-semibold text-gray-900">{agent.approvalRate.toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Approval Turnaround</p>
                          <p className="font-semibold text-gray-900">
                            {agent.averageApprovalHours > 0 ? `${agent.averageApprovalHours.toFixed(1)}h` : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">First Decision</p>
                          <p className="font-semibold text-gray-900">
                            {agent.averageFirstDecisionHours > 0 ? `${agent.averageFirstDecisionHours.toFixed(1)}h` : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Revision Load</p>
                          <p className="font-semibold text-gray-900">
                            {agent.totalRevisionRequests} requests / {agent.resubmissionCount} resubmits
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Status</p>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {agent.activeContracts > 0 && (
                              <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5">
                                {agent.activeContracts} active
                              </span>
                            )}
                            {agent.pendingContracts > 0 && (
                              <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5">
                                {agent.pendingContracts} pending
                              </span>
                            )}
                            {agent.completedContracts > 0 && (
                              <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5">
                                {agent.completedContracts} done
                              </span>
                            )}
                            {agent.revisionRequestedContracts > 0 && (
                              <span className="rounded-full bg-orange-100 text-orange-700 px-2 py-0.5">
                                {agent.revisionRequestedContracts} revision
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
