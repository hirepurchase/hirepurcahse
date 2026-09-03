"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Phone, CalendarClock, Search } from "lucide-react";
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

type UpcomingRow = {
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
  amountDue: number;
  dueDate: string;
};

export default function AgentUpcomingInstallmentsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [rows, setRows] = useState<UpcomingRow[]>([]);
  const [totalUpcomingAmount, setTotalUpcomingAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/reports/agent-dashboard/upcoming-installments");
      setRows(res.data.installments || []);
      setTotalUpcomingAmount(res.data.totalUpcomingAmount || 0);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.error || "Failed to load upcoming payments",
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
          <h1 className="truncate text-xl sm:text-2xl font-bold text-gray-900">Upcoming Payments</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Due tomorrow — follow up before they go overdue</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs sm:text-sm text-gray-600">Due Tomorrow</p>
            <p className="text-xl sm:text-3xl font-bold mt-1 text-amber-600">{rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 min-w-0">
            <p className="text-xs sm:text-sm text-gray-600">Total Upcoming</p>
            <p className="text-lg sm:text-3xl font-bold mt-1 text-amber-600 truncate" title={formatCurrency(totalUpcomingAmount)}>
              {formatCurrency(totalUpcomingAmount)}
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
            <div className="py-12 text-center text-gray-400 text-sm">Loading upcoming payments...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <CalendarClock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                {rows.length === 0 ? "No payments due tomorrow." : "No results match your search."}
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
                      <span className="text-sm font-bold text-amber-600 shrink-0">{formatCurrency(r.amountDue)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <a
                        href={`tel:${r.customer.phone}`}
                        className="flex items-center gap-1.5 text-sm font-medium text-cyan-700"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {r.customer.phone}
                      </a>
                      <span className="text-xs text-gray-400">Due {formatDate(r.dueDate)}</span>
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
                      <TableHead className="text-right">Amount Due</TableHead>
                      <TableHead>Due Date</TableHead>
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
                        <TableCell className="text-right text-amber-600 font-semibold">
                          {formatCurrency(r.amountDue)}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{formatDate(r.dueDate)}</p>
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
