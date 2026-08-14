"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Phone, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import LogCallModal from "@/components/admin/LogCallModal";
import api from "@/lib/api";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";

interface OverdueRow {
  contractId: string;
  contractNumber: string;
  installmentId: string;
  installmentNo: number;
  customer: { id: string; name: string; phone: string; membershipId: string };
  agent: string | null;
  product: string | null;
  amountOverdue: number;
  dueDate: string;
  daysOverdue: number;
  lastPaymentDate: string | null;
  lastCallAt: string | null;
  lastCallOutcome: string | null;
}

// Matches the agent overdue page so the same ageing reads the same everywhere.
function daysOverdueClass(days: number): string {
  if (days >= 14) return "bg-red-100 text-red-800";
  if (days >= 7) return "bg-orange-100 text-orange-800";
  return "bg-amber-100 text-amber-800";
}

export default function CallQueuePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [rows, setRows] = useState<OverdueRow[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [callTarget, setCallTarget] = useState<OverdueRow | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/customer-service/call-queue");
      setRows(res.data.installments || []);
      setTotal(res.data.totalOverdueAmount || 0);
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
        r.contractNumber.toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Call Queue</h1>
        <p className="text-sm text-gray-500">Overdue customers, longest overdue first</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500">Overdue installments</p>
            <p className="text-2xl font-bold">{rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500">Total overdue</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(total)}</p>
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
                  <div key={r.installmentId} className="p-4 space-y-2">
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
                    <p className="text-sm font-semibold text-red-600">
                      {formatCurrency(r.amountOverdue)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {r.contractNumber} · #{r.installmentNo} · due {formatDate(r.dueDate)}
                    </p>
                    <p className="text-xs text-gray-400">
                      Agent: {r.agent ?? "—"}
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/admin/contracts/${r.contractId}`)}
                      >
                        <FileText className="h-4 w-4 mr-1" /> Contract
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Contract</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Last call</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => (
                      <TableRow key={r.installmentId}>
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
                          <p className="text-sm">{r.contractNumber}</p>
                          <p className="text-xs text-gray-400">
                            #{r.installmentNo} · due {formatDate(r.dueDate)}
                          </p>
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
                        <TableCell className="text-sm">{r.agent ?? "—"}</TableCell>
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
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/admin/contracts/${r.contractId}`)}
                              title="View contract"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setCallTarget(r)}>
                              <Phone className="h-4 w-4 mr-1" /> Log
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
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
          contractId={callTarget.contractId}
          contractNumber={callTarget.contractNumber}
          installmentId={callTarget.installmentId}
          defaultPurpose="COLLECTION"
          onClose={() => setCallTarget(null)}
          onLogged={load}
        />
      )}
    </div>
  );
}
