"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Award, Search } from "lucide-react";
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
import api from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";

type CompletedRow = {
  id: string;
  contractNumber: string;
  customer: { id: string; name: string; phone: string; membershipId: string };
  product: string | null;
  totalPrice: number;
  startDate: string;
  completedAt: string;
};

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Date(y, m - 1, 1).toLocaleString("en-GB", { month: "long", year: "numeric" });
}

export default function AgentCompletedContractsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState<CompletedRow[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/reports/agent-dashboard/completed-contracts", { params: { month } });
      setRows(res.data.contracts || []);
      setTotalValue(res.data.totalValue || 0);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.error || "Failed to load completed contracts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [month, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      r.customer.name.toLowerCase().includes(q) ||
      r.contractNumber.toLowerCase().includes(q) ||
      (r.product || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin/agent/dashboard")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-xl sm:text-2xl font-bold text-gray-900">Completed Contracts</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Contracts of yours paid off in the month — counts toward your bonus</p>
          </div>
        </div>
        <input
          type="month"
          value={month}
          max={currentMonth()}
          onChange={(e) => setMonth(e.target.value)}
          className="h-10 rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Completed in {monthLabel(month)}</p>
                <p className="text-xl sm:text-3xl font-bold mt-1 text-emerald-600">{rows.length}</p>
              </div>
              <Award className="h-7 w-7 text-emerald-600 shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 min-w-0">
            <p className="text-xs sm:text-sm text-gray-600">Total Value</p>
            <p className="text-lg sm:text-3xl font-bold mt-1 truncate" title={formatCurrency(totalValue)}>
              {formatCurrency(totalValue)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by customer, contract, or product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {loading ? "Loading..." : `${filtered.length} completed contract${filtered.length === 1 ? "" : "s"}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-gray-400 text-sm">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Award className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                {rows.length === 0
                  ? `No contracts of yours were completed in ${monthLabel(month)}.`
                  : "No results match your search."}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile */}
              <div className="sm:hidden divide-y divide-gray-100">
                {filtered.map((r) => (
                  <div key={r.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{r.customer.name}</p>
                        <p className="text-xs text-gray-500 font-mono truncate">{r.contractNumber}</p>
                        <p className="text-xs text-gray-400 truncate">{r.product || "—"}</p>
                      </div>
                      <span className="text-sm font-bold text-emerald-600 shrink-0">{formatCurrency(r.totalPrice)}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">Completed {formatDate(r.completedAt)}</p>
                  </div>
                ))}
              </div>

              {/* Desktop */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Contract</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead>Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <p className="font-medium text-gray-900">{r.customer.name}</p>
                          <p className="text-xs text-gray-400">{r.customer.membershipId}</p>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{r.contractNumber}</TableCell>
                        <TableCell className="text-sm">{r.product || "—"}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(r.totalPrice)}</TableCell>
                        <TableCell className="text-sm">{formatDate(r.completedAt)}</TableCell>
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
