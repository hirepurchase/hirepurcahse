"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileText,
  Phone,
  Search,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import LogCallModal from "@/components/admin/LogCallModal";
import api from "@/lib/api";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";

interface OverdueContract {
  contractId: string;
  contractNumber: string;
  product: string | null;
  overdueCount: number;
  amountOverdue: number;
  daysOverdue: number;
  installments: {
    installmentId: string;
    installmentNo: number;
    dueDate: string;
    amountOverdue: number;
  }[];
}

interface QueueCustomer {
  customer: { id: string; name: string; phone: string; membershipId: string };
  agent: { id: string; name: string; phone: string | null; email: string } | null;
  overdueCount: number;
  amountOverdue: number;
  daysOverdue: number;
  oldestDueDate: string | null;
  lastPaymentDate: string | null;
  lastCallAt: string | null;
  lastCallOutcome: string | null;
  promiseToPayDate: string | null;
  contracts: OverdueContract[];
}

// Matches the agent overdue page so the same ageing reads the same everywhere.
function daysOverdueClass(days: number): string {
  if (days >= 14) return "bg-red-100 text-red-800";
  if (days >= 7) return "bg-orange-100 text-orange-800";
  return "bg-amber-100 text-amber-800";
}

/** Outcomes that mean the officer could not speak to the customer. */
const UNREACHABLE_OUTCOMES = ["WRONG_NUMBER", "UNREACHABLE", "NO_ANSWER"];

/** Ghana mobile number. Many agent records hold "0" or a blank. */
function isDialable(phone: string | null | undefined): boolean {
  return /^0[235][0-9]{8}$/.test((phone || "").replace(/\s/g, ""));
}

export default function CallQueuePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [rows, setRows] = useState<QueueCustomer[]>([]);
  const [totals, setTotals] = useState({ customers: 0, installments: 0, amount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [callTarget, setCallTarget] = useState<QueueCustomer | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Shown after a call that did not reach the customer, so the officer can ask
  // the agent for correct details.
  const [agentPrompt, setAgentPrompt] = useState<QueueCustomer | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/customer-service/call-queue");
      setRows(res.data.customers || []);
      setTotals({
        customers: res.data.count || 0,
        installments: res.data.overdueInstallmentCount || 0,
        amount: res.data.totalOverdueAmount || 0,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to load call queue",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.customer.name.toLowerCase().includes(q) ||
        r.customer.phone.includes(q) ||
        r.customer.membershipId.toLowerCase().includes(q) ||
        r.contracts.some((c) => c.contractNumber.toLowerCase().includes(q))
    );
  }, [rows, search]);

  const toggle = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  // A call that did not reach the customer means their number may be wrong —
  // the agent who registered them is the one who can correct it.
  const handleLogged = (outcome?: string) => {
    const target = callTarget;
    load();
    if (target?.agent && outcome && UNREACHABLE_OUTCOMES.includes(outcome)) {
      setAgentPrompt(target);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Call Queue</h1>
        <p className="text-sm text-gray-500">
          One row per customer, longest overdue first
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500">Customers to call</p>
            <p className="text-2xl font-bold">{totals.customers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500">Overdue payments</p>
            <p className="text-2xl font-bold">{totals.installments}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500">Total overdue</p>
            <p className="text-base sm:text-2xl font-bold text-red-600 leading-tight wrap-break-word">
              {formatCurrency(totals.amount)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="text-base">
            {filtered.length} customer{filtered.length === 1 ? "" : "s"} to call
          </CardTitle>
          <div className="flex gap-2">
            <Input
              placeholder="Search name, phone, contract..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button variant="outline" onClick={() => load()}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-500 py-12 text-sm">
              {rows.length === 0 ? "No overdue payments — nothing to chase." : "No matches."}
            </p>
          ) : (
            <>
              {/* Mobile */}
              <div className="sm:hidden divide-y divide-gray-100">
                {filtered.map((r) => (
                  <div key={r.customer.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{r.customer.name}</p>
                        <a href={`tel:${r.customer.phone}`} className="text-sm text-blue-600">
                          {r.customer.phone}
                        </a>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                          daysOverdueClass(r.daysOverdue)
                        )}
                      >
                        {r.daysOverdue}d overdue
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-red-600">
                        {formatCurrency(r.amountOverdue)}
                      </span>
                      <Badge variant="outline">
                        {r.overdueCount} payment{r.overdueCount === 1 ? "" : "s"} behind
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400">
                      Agent: {r.agent?.name ?? "—"}
                      {r.lastCallAt ? ` · last called ${formatDate(r.lastCallAt)}` : " · never called"}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => setCallTarget(r)}>
                        <Phone className="h-4 w-4 mr-1" /> Log Call
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/admin/customers/${r.customer.id}`)}
                      >
                        <User className="h-4 w-4 mr-1" /> Customer
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggle(r.customer.id)}>
                        <FileText className="h-4 w-4 mr-1" />
                        {r.contracts.length} contract{r.contracts.length === 1 ? "" : "s"}
                      </Button>
                    </div>
                    {expanded.has(r.customer.id) && (
                      <div className="mt-2 space-y-2 rounded-lg bg-gray-50 p-3">
                        {r.contracts.map((c) => (
                          <div key={c.contractId} className="text-xs">
                            <button
                              onClick={() => router.push(`/admin/contracts/${c.contractId}`)}
                              className="font-medium text-blue-600"
                            >
                              {c.contractNumber}
                            </button>
                            <span className="text-gray-500">
                              {" "}
                              · {c.overdueCount} overdue · {formatCurrency(c.amountOverdue)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Overdue</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Last call</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => (
                      <>
                        <TableRow key={r.customer.id}>
                          <TableCell className="pr-0">
                            <button
                              onClick={() => toggle(r.customer.id)}
                              className="text-gray-400 hover:text-gray-700"
                              aria-label="Show contracts"
                            >
                              {expanded.has(r.customer.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{r.customer.name}</p>
                            <p className="text-xs text-gray-400">{r.customer.membershipId}</p>
                          </TableCell>
                          <TableCell>
                            <a href={`tel:${r.customer.phone}`} className="text-blue-600 hover:underline">
                              {r.customer.phone}
                            </a>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{r.overdueCount}</Badge>
                            {r.contracts.length > 1 && (
                              <span className="ml-1 text-xs text-gray-400">
                                / {r.contracts.length} contracts
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-semibold text-red-600">
                            {formatCurrency(r.amountOverdue)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-xs font-medium",
                                daysOverdueClass(r.daysOverdue)
                              )}
                            >
                              {r.daysOverdue}d
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{r.agent?.name ?? "—"}</TableCell>
                          <TableCell className="text-xs text-gray-500">
                            {r.lastCallAt ? (
                              <>
                                {formatDate(r.lastCallAt)}
                                <br />
                                <span className="text-gray-400">
                                  {r.lastCallOutcome?.replace(/_/g, " ")}
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-400">Never</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => router.push(`/admin/customers/${r.customer.id}`)}
                                title="View customer"
                              >
                                <User className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setCallTarget(r)}>
                                <Phone className="h-4 w-4 mr-1" /> Log
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {expanded.has(r.customer.id) && (
                          <TableRow key={`${r.customer.id}-detail`} className="bg-gray-50">
                            <TableCell />
                            <TableCell colSpan={8} className="py-3">
                              <div className="space-y-2">
                                {r.contracts.map((c) => (
                                  <div key={c.contractId} className="text-sm">
                                    <button
                                      onClick={() => router.push(`/admin/contracts/${c.contractId}`)}
                                      className="font-medium text-blue-600 hover:underline"
                                    >
                                      {c.contractNumber}
                                    </button>
                                    <span className="text-gray-500">
                                      {" "}
                                      · {c.product ?? "—"} · {c.overdueCount} overdue ·{" "}
                                      {formatCurrency(c.amountOverdue)}
                                    </span>
                                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                                      {c.installments.map((i) => (
                                        <span key={i.installmentId}>
                                          #{i.installmentNo} due {formatDate(i.dueDate)} —{" "}
                                          {formatCurrency(i.amountOverdue)}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {callTarget && (
        <LogCallModal
          customerId={callTarget.customer.id}
          customerName={callTarget.customer.name}
          customerPhone={callTarget.customer.phone}
          contractId={callTarget.contracts[0]?.contractId}
          contractNumber={callTarget.contracts[0]?.contractNumber}
          defaultPurpose="COLLECTION"
          onClose={() => setCallTarget(null)}
          onLogged={handleLogged}
        />
      )}

      {agentPrompt?.agent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-900">Could not reach the customer</h2>
                <p className="text-sm text-gray-500">
                  Call the agent to confirm {agentPrompt.customer.name}&apos;s details.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Registering agent</p>
              <p className="font-semibold text-gray-900">{agentPrompt.agent.name}</p>
              {/* A third of agents have no usable number on file. Showing "0"
                  as a dialable link would waste the officer's time. */}
              {isDialable(agentPrompt.agent.phone) ? (
                <a
                  href={`tel:${agentPrompt.agent.phone}`}
                  className="mt-1 inline-flex items-center gap-2 text-lg font-bold text-blue-600"
                >
                  <Phone className="h-4 w-4" />
                  {agentPrompt.agent.phone}
                </a>
              ) : (
                <>
                  <p className="mt-1 text-sm text-amber-700">
                    No valid phone number on file for this agent.
                  </p>
                  <a
                    href={`mailto:${agentPrompt.agent.email}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {agentPrompt.agent.email}
                  </a>
                  <p className="mt-1 text-xs text-gray-500">
                    Ask an administrator to add their number under Users.
                  </p>
                </>
              )}
            </div>

            <p className="mt-3 text-xs text-gray-500">
              Once you have the correct number, update it on the customer&apos;s profile. Their
              password becomes the new number.
            </p>

            <div className="mt-5 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setAgentPrompt(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  const id = agentPrompt.customer.id;
                  setAgentPrompt(null);
                  router.push(`/admin/customers/${id}`);
                }}
              >
                Update customer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
