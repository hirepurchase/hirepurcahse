"use client";

import { useEffect, useState } from "react";
import { Phone, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import api from "@/lib/api";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";

interface Attempt {
  id: string;
  purpose: string;
  outcome: string;
  verificationResult: string | null;
  notes: string | null;
  promiseToPayDate: string | null;
  promiseToPayAmount: number | null;
  nextFollowUpAt: string | null;
  contactedAt: string;
  customer: { id: string; membershipId: string; firstName: string; lastName: string; phone: string };
  contract: { id: string; contractNumber: string } | null;
  officer: { id: string; firstName: string; lastName: string } | null;
}

const OUTCOMES = [
  "REACHED",
  "NO_ANSWER",
  "WRONG_NUMBER",
  "UNREACHABLE",
  "PROMISE_TO_PAY",
  "REFUSED",
  "CALLBACK_REQUESTED",
];

function outcomeClass(outcome: string): string {
  if (outcome === "REACHED" || outcome === "PROMISE_TO_PAY") return "bg-green-100 text-green-800";
  if (outcome === "REFUSED" || outcome === "WRONG_NUMBER") return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-700";
}

export default function CallLogsPage() {
  const { toast } = useToast();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [officers, setOfficers] = useState<{ id: string; name: string; role: string; calls: number }[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState("");
  const [purpose, setPurpose] = useState("");
  const [outcome, setOutcome] = useState("");
  const [officerId, setOfficerId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const itemsPerPage = 20;

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, purpose, outcome, officerId, from, to]);

  useEffect(() => {
    api
      .get("/contact-attempts/officers")
      .then((r) => setOfficers(r.data.officers || []))
      .catch(() => setOfficers([]));
  }, []);

  const load = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/contact-attempts", {
        params: {
          page,
          limit: itemsPerPage,
          search: search || undefined,
          purpose: purpose || undefined,
          outcome: outcome || undefined,
          officerId: officerId || undefined,
          from: from || undefined,
          to: to || undefined,
        },
      });
      setAttempts(res.data.attempts || []);
      setSummary(res.data.summary || {});
      setTotalPages(res.data.pagination?.totalPages || 1);
      setTotalItems(res.data.pagination?.total || 0);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to load call logs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const reached = (summary.REACHED || 0) + (summary.PROMISE_TO_PAY || 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Call Logs</h1>
        <p className="text-sm text-gray-500">
          Every verification and collection call logged by customer service
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500">Calls (filtered)</p>
            <p className="text-2xl font-bold">{totalItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500">Customer reached</p>
            <p className="text-2xl font-bold text-green-600">{reached}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500">Promises to pay</p>
            <p className="text-2xl font-bold text-amber-600">{summary.PROMISE_TO_PAY || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500">No answer</p>
            <p className="text-2xl font-bold text-gray-600">{summary.NO_ANSWER || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Search customer, phone, contract or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  load();
                }
              }}
            />
            <Button
              variant="outline"
              onClick={() => {
                setPage(1);
                load();
              }}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={officerId}
              onChange={(e) => {
                setOfficerId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All officers</option>
              {officers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.calls})
                </option>
              ))}
            </select>

            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={purpose}
              onChange={(e) => {
                setPurpose(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All purposes</option>
              <option value="VERIFICATION">Verification</option>
              <option value="COLLECTION">Collection</option>
              <option value="FOLLOW_UP">Follow up</option>
              <option value="OTHER">Other</option>
            </select>

            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={outcome}
              onChange={(e) => {
                setOutcome(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All outcomes</option>
              {OUTCOMES.map((o) => (
                <option key={o} value={o}>
                  {o.replace(/_/g, " ")}
                </option>
              ))}
            </select>

            <Input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
            <Input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : attempts.length === 0 ? (
            <p className="text-center text-gray-500 py-12 text-sm">No calls logged yet.</p>
          ) : (
            <>
              {/* Mobile */}
              <div className="sm:hidden divide-y divide-gray-100">
                {attempts.map((a) => (
                  <div key={a.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {a.customer.firstName} {a.customer.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{a.customer.phone}</p>
                      </div>
                      <Badge className={cn("shrink-0", outcomeClass(a.outcome))}>
                        {a.outcome.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      {a.purpose.replace(/_/g, " ")}
                      {a.contract ? ` · ${a.contract.contractNumber}` : ""}
                    </p>
                    {a.notes && <p className="text-sm text-gray-600">{a.notes}</p>}
                    {a.promiseToPayDate && (
                      <p className="text-xs text-amber-700">
                        Promised{" "}
                        {a.promiseToPayAmount ? formatCurrency(a.promiseToPayAmount) : "payment"}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      {formatDateTime(a.contactedAt)}
                      {a.officer ? ` · ${a.officer.firstName} ${a.officer.lastName}` : ""}
                    </p>
                  </div>
                ))}
              </div>

              {/* Desktop */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Officer</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Outcome</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attempts.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {formatDateTime(a.contactedAt)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {a.officer ? `${a.officer.firstName} ${a.officer.lastName}` : "—"}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">
                            {a.customer.firstName} {a.customer.lastName}
                          </p>
                          <p className="text-xs text-gray-400">
                            {a.customer.phone}
                            {a.contract ? ` · ${a.contract.contractNumber}` : ""}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{a.purpose.replace(/_/g, " ")}</Badge>
                          {a.verificationResult && (
                            <Badge
                              className={cn(
                                "ml-1",
                                a.verificationResult === "VERIFIED"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              )}
                            >
                              {a.verificationResult}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={outcomeClass(a.outcome)}>
                            {a.outcome.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {a.notes && <p className="text-sm text-gray-600">{a.notes}</p>}
                          {a.promiseToPayDate && (
                            <p className="text-xs text-amber-700">
                              Promised{" "}
                              {a.promiseToPayAmount
                                ? formatCurrency(a.promiseToPayAmount)
                                : "payment"}
                            </p>
                          )}
                          {!a.notes && !a.promiseToPayDate && (
                            <span className="text-gray-300">—</span>
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

        {!isLoading && attempts.length > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
          />
        )}
      </Card>
    </div>
  );
}
