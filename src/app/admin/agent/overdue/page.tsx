"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Phone, AlertCircle, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";

type OverdueRow = {
  contractId: string;
  contractNumber: string;
  installmentId: string;
  installmentNo: number;
  customer: {
    id: string;
    name: string;
    phone: string;
    membershipId: string;
  };
  product: string | null;
  amountOverdue: number;
  dueDate: string;
  daysOverdue: number;
  lastPaymentDate: string | null;
  lastPaymentAmount: number | null;
};

function daysOverdueClass(days: number): string {
  if (days >= 14) return "bg-red-100 text-red-800";
  if (days >= 7) return "bg-orange-100 text-orange-800";
  return "bg-amber-100 text-amber-800";
}

export default function AgentOverdueInstallmentsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [rows, setRows] = useState<OverdueRow[]>([]);
  const [totalOverdueAmount, setTotalOverdueAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/reports/agent-dashboard/overdue-installments");
      setRows(res.data.installments || []);
      setTotalOverdueAmount(res.data.totalOverdueAmount || 0);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.error || "Failed to load overdue installments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      r.customer.name.toLowerCase().includes(q) ||
      r.customer.phone?.toLowerCase().includes(q) ||
      r.contractNumber.toLowerCase().includes(q) ||
      r.customer.membershipId?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/admin/agent/dashboard")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-xl sm:text-2xl font-bold text-gray-900">Overdue Installments</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Customers on your contracts with missed payments</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs sm:text-sm text-gray-600">Overdue Installments</p>
            <p className="text-xl sm:text-3xl font-bold mt-1 text-red-600">{rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 min-w-0">
            <p className="text-xs sm:text-sm text-gray-600">Total Overdue</p>
            <p className="text-lg sm:text-3xl font-bold mt-1 text-red-600 truncate" title={formatCurrency(totalOverdueAmount)}>
              {formatCurrency(totalOverdueAmount)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by customer, phone, or contract number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {loading ? "Loading..." : `${filtered.length} customer${filtered.length === 1 ? "" : "s"} to call`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-gray-400 text-sm">Loading overdue installments...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <AlertCircle className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                {rows.length === 0 ? "No overdue installments. Great work!" : "No results match your search."}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-gray-100">
                {filtered.map((r) => (
                  <div key={r.installmentId} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{r.customer.name}</p>
                        <p className="text-xs text-gray-500 font-mono truncate">{r.contractNumber}</p>
                        <p className="text-xs text-gray-400 truncate">{r.product || "—"}</p>
                      </div>
                      <Badge className={cn(daysOverdueClass(r.daysOverdue), "shrink-0")}>
                        {r.daysOverdue} day{r.daysOverdue === 1 ? "" : "s"}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <a
                        href={`tel:${r.customer.phone}`}
                        className="flex items-center gap-1.5 text-sm font-medium text-cyan-700"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {r.customer.phone}
                      </a>
                      <span className="text-sm font-bold text-red-600">{formatCurrency(r.amountOverdue)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-xs text-gray-400">
                      <span>Due {formatDate(r.dueDate)}</span>
                      <span>
                        Last payment:{" "}
                        {r.lastPaymentDate ? formatDate(r.lastPaymentDate) : "None yet"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Contract</TableHead>
                      <TableHead className="text-right">Amount Overdue</TableHead>
                      <TableHead>Days Overdue</TableHead>
                      <TableHead>Last Payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => (
                      <TableRow key={r.installmentId}>
                        <TableCell>
                          <p className="font-medium text-gray-900">{r.customer.name}</p>
                          <p className="text-xs text-gray-400">{r.customer.membershipId}</p>
                        </TableCell>
                        <TableCell>
                          <a
                            href={`tel:${r.customer.phone}`}
                            className="flex items-center gap-1.5 text-cyan-700 font-medium hover:underline"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {r.customer.phone}
                          </a>
                        </TableCell>
                        <TableCell>
                          <p className="font-mono text-sm">{r.contractNumber}</p>
                          <p className="text-xs text-gray-400">{r.product || "—"}</p>
                        </TableCell>
                        <TableCell className="text-right text-red-600 font-semibold">
                          {formatCurrency(r.amountOverdue)}
                        </TableCell>
                        <TableCell>
                          <Badge className={daysOverdueClass(r.daysOverdue)}>
                            {r.daysOverdue} day{r.daysOverdue === 1 ? "" : "s"}
                          </Badge>
                          <p className="text-xs text-gray-400 mt-1">Due {formatDate(r.dueDate)}</p>
                        </TableCell>
                        <TableCell>
                          {r.lastPaymentDate ? (
                            <>
                              <p className="text-sm">{formatDate(r.lastPaymentDate)}</p>
                              {r.lastPaymentAmount != null && (
                                <p className="text-xs text-gray-400">{formatCurrency(r.lastPaymentAmount)}</p>
                              )}
                            </>
                          ) : (
                            <span className="text-sm text-gray-400">None yet</span>
                          )}
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
    </div>
  );
}
