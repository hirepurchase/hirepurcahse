"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { FREQUENCY_LABEL, RescheduleDecisionDialog, RescheduleRow, STATUS_BADGE } from "@/components/admin/RescheduleBalance";

const TABS = [
  { key: "PENDING", label: "Waiting" },
  { key: "APPLIED", label: "Applied" },
  { key: "REJECTED", label: "Turned down" },
] as const;

/** Reschedule requests for expired contracts, for the people who approve them. */
export default function ReschedulesPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("PENDING");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ reschedules: RescheduleRow[]; total: number; pages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/reschedules", { params: { status: tab, page } });
      setData(res.data);
    } catch (error: any) {
      toast({ title: "Could not load requests", description: error?.response?.data?.error || "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [tab, page, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-5 pb-10">
      <header className="workspace-heading workspace-heading--work">
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900 sm:text-2xl">
          <CalendarClock className="h-6 w-6" aria-hidden="true" /> Reschedule requests
        </h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Expired contracts whose balance is to be spread over a new schedule with interest. Nothing changes until approved.
        </p>
      </header>

      <div role="tablist" aria-label="Request status" className="flex gap-1 overflow-x-auto rounded-lg border bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => { setTab(t.key); setPage(1); }}
            className={cn("min-h-10 flex-1 whitespace-nowrap rounded-md px-3 text-sm font-medium",
              tab === t.key ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100")}
          >
            {t.label}{t.key === tab && data ? ` (${data.total})` : ""}
          </button>
        ))}
      </div>

      <section className="operations-panel min-w-0">
        {loading && !data ? (
          <div className="flex min-h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
        ) : !data || data.reschedules.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-600">
            {tab === "PENDING" ? "Nothing is waiting for approval." : "None yet."}
          </p>
        ) : (
          <ul className={cn("divide-y", loading && "opacity-60")}>
            {data.reschedules.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    {r.contract ? (
                      <Link href={`/admin/contracts/${r.contract.id}`} className="text-blue-700 hover:underline">{r.contract.contractNumber}</Link>
                    ) : null}
                    {r.contract?.customer && <span className="font-normal text-slate-600"> · {r.contract.customer.firstName} {r.contract.customer.lastName}</span>}
                  </p>
                  <p className="text-sm text-slate-700">
                    {formatCurrency(r.principal)} owed → <strong>{formatCurrency(r.newTotal)}</strong> in {r.installments} {FREQUENCY_LABEL[r.frequency]?.adj} payments of {formatCurrency(r.installmentAmount)} ({r.monthlyRate}% a month)
                  </p>
                  <p className="text-xs text-slate-500">
                    {r.source === "AUTO" ? "Raised automatically" : `Asked by ${r.requestedBy ?? "unknown"}`} on {formatDate(r.createdAt)}
                    {r.decidedBy ? ` · ${STATUS_BADGE[r.status]?.label.toLowerCase()} by ${r.decidedBy}` : ""}
                    {r.rejectReason ? ` · ${r.rejectReason}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {r.source === "AUTO" && <Badge variant="outline">Automatic</Badge>}
                  <Button size="sm" variant={r.status === "PENDING" ? "default" : "outline"} onClick={() => setOpen(r.id)}>
                    {r.status === "PENDING" ? "Review" : "Details"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data && data.pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-center gap-3 text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span>Page {page} of {data.pages}</span>
          <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </nav>
      )}

      <RescheduleDecisionDialog id={open} onClose={() => setOpen(null)} onDecided={() => void load()} />
    </div>
  );
}
