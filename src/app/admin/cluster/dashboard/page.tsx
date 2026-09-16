"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, AlertTriangle, ShieldAlert, Clock, Phone, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import api from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { useAuthStore } from "@/store/authStore";
import { AdminUser } from "@/types";

type ClusterAgent = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  assignedAt: string;
  customers: number;
  contracts: number;
  pendingVerification: number;
  contractsOverdue: number;
  outstanding: number;
  amountAtRisk: number;
  portfolioAtRisk: number;
};

type ClusterSummary = {
  agents: number;
  customers: number;
  contractsOverdue: number;
  pendingVerification: number;
  outstanding: number;
  amountAtRisk: number;
  portfolioAtRisk: number;
};

/** Amber from 15%, red from 30% — the thresholds collections treats as "needs a conversation". */
function parTone(par: number): string {
  if (par >= 30) return "bg-red-100 text-red-800";
  if (par >= 15) return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-800";
}

export default function ClusterDashboardPage() {
  const { user } = useAuthStore();
  const adminUser = user as AdminUser | null;
  const { toast } = useToast();

  const [agents, setAgents] = useState<ClusterAgent[]>([]);
  const [summary, setSummary] = useState<ClusterSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/cluster/my-agents");
        setAgents(res.data.agents || []);
        setSummary(res.data.summary || null);
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.response?.data?.error || "Failed to load your agents",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
          {adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : "Cluster"}
        </h1>
        <p className="mt-0.5 text-sm text-gray-500">Cluster Agent · Your team and their portfolio</p>
      </div>

      {agents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p className="text-sm font-medium text-gray-700">No agents assigned to you yet</p>
            <p className="mt-1 text-xs text-gray-500">
              Until an administrator assigns agents, you will only see your own customers and contracts.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 sm:text-sm">Agents</p>
                    <p className="mt-1 text-2xl font-bold">{summary?.agents ?? 0}</p>
                  </div>
                  <Users className="h-7 w-7 shrink-0 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 sm:text-sm">Contracts Overdue</p>
                    <p className="mt-1 text-2xl font-bold text-red-600">{summary?.contractsOverdue ?? 0}</p>
                  </div>
                  <AlertTriangle className="h-7 w-7 shrink-0 text-red-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="min-w-0 p-4">
                <p className="text-xs text-gray-600 sm:text-sm">Amount at Risk</p>
                <p className="mt-1 truncate text-2xl font-bold text-red-600" title={formatCurrency(summary?.amountAtRisk ?? 0)}>
                  {formatCurrency(summary?.amountAtRisk ?? 0)}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">of {formatCurrency(summary?.outstanding ?? 0)} outstanding</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 sm:text-sm">Portfolio at Risk</p>
                    <p className="mt-1 text-2xl font-bold">{(summary?.portfolioAtRisk ?? 0).toFixed(1)}%</p>
                  </div>
                  <ShieldAlert className="h-7 w-7 shrink-0 text-amber-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                My Agents ({agents.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Mobile */}
              <div className="divide-y divide-gray-100 sm:hidden">
                {agents.map((a) => (
                  <div key={a.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{a.name}</p>
                        <p className="truncate text-xs text-gray-500">{a.email}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${parTone(a.portfolioAtRisk)}`}>
                        {a.portfolioAtRisk.toFixed(1)}% PAR
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>{a.customers} customers</span>
                      <span>{a.contracts} contracts</span>
                      <span className={a.contractsOverdue > 0 ? "font-semibold text-red-600" : ""}>
                        {a.contractsOverdue} overdue
                      </span>
                      {a.pendingVerification > 0 && (
                        <span className="text-amber-600">{a.pendingVerification} awaiting approval</span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-xs">
                      {a.phone ? (
                        <a href={`tel:${a.phone}`} className="flex items-center gap-1.5 font-medium text-cyan-700">
                          <Phone className="h-3.5 w-3.5" />
                          {a.phone}
                        </a>
                      ) : (
                        <span className="text-gray-400">No phone</span>
                      )}
                      <span className="text-gray-500">{formatCurrency(a.amountAtRisk)} at risk</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop */}
              <div className="hidden overflow-x-auto sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-right">Customers</TableHead>
                      <TableHead className="text-right">Contracts</TableHead>
                      <TableHead className="text-right">Overdue</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead className="text-right">At Risk</TableHead>
                      <TableHead>PAR</TableHead>
                      <TableHead>Since</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <p className="font-medium text-gray-900">{a.name}</p>
                          {!a.isActive && <p className="text-xs text-gray-400">Inactive</p>}
                          {a.pendingVerification > 0 && (
                            <p className="flex items-center gap-1 text-xs text-amber-600">
                              <Clock className="h-3 w-3" />
                              {a.pendingVerification} awaiting approval
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {a.phone && (
                            <a href={`tel:${a.phone}`} className="flex items-center gap-1.5 text-cyan-700 hover:underline">
                              <Phone className="h-3.5 w-3.5" />
                              {a.phone}
                            </a>
                          )}
                          <a href={`mailto:${a.email}`} className="flex items-center gap-1.5 text-xs text-gray-500 hover:underline">
                            <Mail className="h-3 w-3" />
                            {a.email}
                          </a>
                        </TableCell>
                        <TableCell className="text-right">{a.customers}</TableCell>
                        <TableCell className="text-right">{a.contracts}</TableCell>
                        <TableCell className={`text-right font-medium ${a.contractsOverdue > 0 ? "text-red-600" : ""}`}>
                          {a.contractsOverdue}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(a.outstanding)}</TableCell>
                        <TableCell className="text-right font-medium text-red-600">
                          {formatCurrency(a.amountAtRisk)}
                        </TableCell>
                        <TableCell>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${parTone(a.portfolioAtRisk)}`}>
                            {a.portfolioAtRisk.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{formatDate(a.assignedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/admin/contracts"
          className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-800">Contracts</div>
            <div className="text-xs text-gray-500">Your cluster&apos;s contracts and your own</div>
          </div>
        </Link>
        <Link
          href="/admin/customers"
          className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-purple-300 hover:shadow-md"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50">
            <Users className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-800">Customers</div>
            <div className="text-xs text-gray-500">Everyone registered across your cluster</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
