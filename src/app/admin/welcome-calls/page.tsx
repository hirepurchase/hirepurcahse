"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, ChevronDown, History, PhoneCall, PhoneIncoming, RefreshCw, ShieldAlert, Users } from "lucide-react";
import api from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import { PERMISSIONS } from "@/lib/permissions";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Officer {
  id: string;
  name: string;
  phone: string | null;
  role: string;
  agentCount: number;
  /** False when they hold agents but no longer have the permission, or are deactivated. */
  eligible: boolean;
}
interface Agent {
  id: string;
  name: string;
  phone: string | null;
  area: string | null;
  district: string | null;
  role: string;
  isActive: boolean;
  pendingContracts: number;
}
interface Transfer { id: string; agent: string; from: string; to: string; by: string; reason: string | null; at: string }
interface DayOfficer { id: string; name: string; total: number; called: number; byKind: Record<string, number> }

const NONE = "none";
const ROLE_NAMES: Record<string, string> = {
  CUSTOMER_SERVICE: "Customer service",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super admin",
  CLUSTER_AGENT: "Cluster leader",
  AGENT: "Agent",
};
const roleLabel = (role: string) => ROLE_NAMES[role] ?? role.replace(/_/g, " ").toLowerCase();
const KIND_LABEL: Record<string, string> = { RECOVERY: "Recovery", PROMISE: "Promise", FOLLOW_UP: "Follow-up", REMINDER: "Reminder" };
const errorText = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback;

export default function WelcomeCallsPage() {
  const [tab, setTab] = useState<"agents" | "calls">("agents");
  return (
    <ProtectedRoute permissions={[PERMISSIONS.MANAGE_CSO_ASSIGNMENTS]}>
      <div className="space-y-4 pb-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
            <PhoneIncoming className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Welcome calls</h1>
            <p className="text-sm text-gray-500">Who calls each agent’s new customers, and today’s shared recovery calls.</p>
          </div>
        </div>
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
          {([
            ["agents", "Agents"],
            ["calls", "Today’s calls"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-sm font-medium",
                tab === value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "agents" ? <AgentsTab /> : <TodaysCallsTab />}
      </div>
    </ProtectedRoute>
  );
}

// ─── Agents: who makes each agent's welcome calls, and moving them ──────────

function AgentsTab() {
  const { toast } = useToast();
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [unassigned, setUnassigned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [agents, setAgents] = useState<Record<string, Agent[]>>({});
  const [loadingAgents, setLoadingAgents] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [moveAll, setMoveAll] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [toId, setToId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<Transfer[]>([]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/welcome-calls/officers");
      setOfficers(data.officers ?? []);
      setUnassigned(data.unassignedCount ?? 0);
    } catch (err) {
      toast({ title: "Could not load", description: errorText(err, "Failed to load the welcome-call people"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openOfficer = async (id: string) => {
    setSelected(new Set());
    if (open === id) {
      setOpen(null);
      return;
    }
    setOpen(id);
    if (agents[id]) return;
    setLoadingAgents(id);
    try {
      const { data } = await api.get(`/welcome-calls/officers/${id}/agents`);
      setAgents((m) => ({ ...m, [id]: data.agents ?? [] }));
    } catch (err) {
      toast({ title: "Could not load", description: errorText(err, "Failed to load agents"), variant: "destructive" });
    } finally {
      setLoadingAgents(null);
    }
  };

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const source = open;
  const sourceAgents = source ? agents[source] ?? [] : [];
  const allSelected = sourceAgents.length > 0 && sourceAgents.every((a) => selected.has(a.id));
  const sourceName = source === NONE ? "Not assigned" : officers.find((o) => o.id === source)?.name ?? "";
  const moving = moveAll ? sourceAgents.length : selected.size;
  const recipients = useMemo(() => officers.filter((o) => o.eligible && o.id !== source), [officers, source]);

  const startMove = (all: boolean) => {
    setMoveAll(all);
    setToId("");
    setReason("");
    setDialog(true);
  };

  const move = async () => {
    if (!source) return;
    setBusy(true);
    try {
      const { data } = await api.post("/welcome-calls/transfer", {
        fromOfficerId: source === NONE ? null : source,
        ...(moveAll ? { all: true } : { agentIds: [...selected] }),
        toOfficerId: toId,
        reason: reason.trim() || undefined,
      });
      toast({ title: "Agents moved", description: data.message });
      setDialog(false);
      setSelected(new Set());
      setAgents({});
      setOpen(null);
      await load();
    } catch (err) {
      toast({ title: "Not moved", description: errorText(err, "Failed to move agents"), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const openHistory = async () => {
    setHistoryOpen(true);
    try {
      const { data } = await api.get("/welcome-calls/history");
      setHistory(data.transfers ?? []);
    } catch {
      setHistory([]);
    }
  };

  if (loading) return <p className="py-10 text-center text-sm text-gray-400">Loading…</p>;

  const rows: Array<Officer | { id: typeof NONE; name: string; agentCount: number; role: string; phone: null; eligible: true }> = [
    ...officers,
    ...(unassigned > 0 ? [{ id: NONE, name: "Not assigned", agentCount: unassigned, role: "", phone: null, eligible: true as const }] : []),
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-600">
          Give people the <strong>Welcome / activation calls</strong> permission on the Users page, then move agents to them here.
        </p>
        <Button variant="outline" size="sm" onClick={openHistory}>
          <History className="mr-2 h-4 w-4" /> History
        </Button>
      </div>

      {selected.size > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
          <p className="text-sm text-indigo-900">
            <strong>{selected.size}</strong> agent{selected.size === 1 ? "" : "s"} selected from {sourceName}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
            <Button size="sm" onClick={() => startMove(false)}>
              <ArrowRightLeft className="mr-1.5 h-4 w-4" /> Move
            </Button>
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {rows.map((o) => (
          <li key={o.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <button className="flex w-full items-center gap-3 p-4 text-left" onClick={() => openOfficer(o.id)} aria-expanded={open === o.id}>
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", o.id === NONE ? "bg-amber-50 text-amber-700" : "bg-indigo-50 text-indigo-700")}>
                <Users className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{o.name}</p>
                <p className="text-xs text-gray-500">
                  {o.id === NONE ? "Agents nobody makes welcome calls for" : roleLabel(o.role)}
                  {!o.eligible && <span className="ml-1 font-semibold text-red-700">· no longer has the permission</span>}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-lg font-bold text-indigo-700">{o.agentCount}</p>
                <p className="text-[11px] text-gray-400">agent{o.agentCount === 1 ? "" : "s"}</p>
              </div>
              <ChevronDown className={cn("h-4 w-4 shrink-0 text-gray-400 transition-transform", open === o.id && "rotate-180")} />
            </button>

            {open === o.id && (
              <div className="border-t border-gray-100 p-3">
                {loadingAgents === o.id ? (
                  <p className="py-4 text-center text-xs text-gray-400">Loading agents…</p>
                ) : sourceAgents.length === 0 ? (
                  <p className="py-4 text-center text-xs text-gray-400">No agents</p>
                ) : (
                  <>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300"
                          checked={allSelected}
                          onChange={() => setSelected(allSelected ? new Set() : new Set(sourceAgents.map((a) => a.id)))}
                        />
                        Select all ({sourceAgents.length})
                      </label>
                      <Button variant="outline" size="sm" onClick={() => startMove(true)}>
                        <ArrowRightLeft className="mr-1.5 h-4 w-4" /> Move all {sourceAgents.length}
                      </Button>
                    </div>
                    <div className="space-y-1.5">
                      {sourceAgents.map((a) => (
                        <label key={a.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-100 px-3 py-2 hover:bg-gray-50">
                          <input type="checkbox" className="h-4 w-4 shrink-0 rounded border-gray-300" checked={selected.has(a.id)} onChange={() => toggle(a.id)} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-gray-900">
                              {a.name}
                              {!a.isActive && <span className="ml-1 text-xs text-gray-400">(deactivated)</span>}
                            </span>
                            <span className="block truncate text-xs text-gray-500">
                              {[roleLabel(a.role), [a.area, a.district].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
                            </span>
                          </span>
                          {a.pendingContracts > 0 && (
                            <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                              {a.pendingContracts} awaiting call
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Move {moving} agent{moving === 1 ? "" : "s"} from {sourceName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Move to</Label>
              <SearchableSelect
                className="mt-1.5"
                options={recipients.map((r) => ({ value: r.id, label: r.name, sublabel: `${roleLabel(r.role)} · ${r.agentCount} agent${r.agentCount === 1 ? "" : "s"}` }))}
                value={toId}
                onChange={setToId}
                placeholder="Choose who will make the welcome calls"
                searchPlaceholder="Search people…"
                emptyText="Nobody else has the welcome-calls permission yet"
              />
            </div>
            <div>
              <Label htmlFor="move-reason">Reason (optional)</Label>
              <Textarea id="move-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1.5" placeholder="e.g. Moving welcome calls off customer service" />
            </div>
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
              The new person calls these agents’ new customers and approves their contracts from now on, including contracts already waiting. The move is recorded.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={move} disabled={busy || !toId}>{busy ? "Moving…" : "Move"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Moves</DialogTitle></DialogHeader>
          {history.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">No agents have been moved yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((t) => (
                <div key={t.id} className="rounded-lg border border-gray-100 p-3">
                  <p className="text-sm text-gray-900">{t.agent}</p>
                  <p className="mt-0.5 text-xs text-gray-600">
                    {t.from} → <strong>{t.to}</strong>
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {formatDate(t.at)} by {t.by}
                    {t.reason ? ` · ${t.reason}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Today's shared recovery and reminder calls ─────────────────────────────

function TodaysCallsTab() {
  const { toast } = useToast();
  const [day, setDay] = useState<string | null>(null);
  const [officers, setOfficers] = useState<DayOfficer[] | null>(null);
  const [working, setWorking] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const apply = (data: { day: string | null; officers: DayOfficer[] }) => {
    setDay(data.day);
    setOfficers(data.officers ?? []);
    setWorking(new Set((data.officers ?? []).map((o) => o.id)));
  };

  useEffect(() => {
    let live = true;
    api
      .get("/welcome-calls/allocations/today")
      .then(({ data }) => live && apply(data))
      .catch((err) => live && toast({ title: "Could not load", description: errorText(err, "Failed to load today’s calls"), variant: "destructive" }));
    return () => {
      live = false;
    };
  }, [toast]);

  const reshare = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/welcome-calls/allocations/reshare", { officerIds: [...working] });
      apply(data.summary);
      toast({ title: "Calls reshared", description: `${data.moved} call${data.moved === 1 ? "" : "s"} moved to the officers who are in.` });
    } catch (err) {
      toast({ title: "Not reshared", description: errorText(err, "Failed to reshare calls"), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (!officers) return <p className="py-10 text-center text-sm text-gray-400">Loading…</p>;
  const total = officers.reduce((s, o) => s + o.total, 0);
  const called = officers.reduce((s, o) => s + o.called, 0);
  const absent = officers.filter((o) => !working.has(o.id));

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Every morning at 08:20 the customers who need a call — behind on payments, promised to pay, or with a weekly or monthly payment due today or tomorrow — are shared out at random and evenly among customer service.
        Promises and follow-ups go back to the officer who arranged them.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">Calls {day ? `for ${formatDate(day)}` : ""}</p>
          <p className="mt-1 text-lg font-bold text-gray-900">{total}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">Called so far</p>
          <p className="mt-1 text-lg font-bold text-emerald-700">{called}</p>
        </div>
      </div>

      {officers.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500">There are no active customer service accounts.</p>
      ) : (
        <ul className="space-y-2">
          {officers.map((o) => (
            <li key={o.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  aria-label={`${o.name} is working today`}
                  className="h-4 w-4 rounded border-gray-300"
                  checked={working.has(o.id)}
                  onChange={() =>
                    setWorking((s) => {
                      const next = new Set(s);
                      if (next.has(o.id)) next.delete(o.id);
                      else next.add(o.id);
                      return next;
                    })
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{o.name}</p>
                  <p className="text-xs text-gray-500">
                    {Object.entries(o.byKind).map(([k, n]) => `${n} ${KIND_LABEL[k] ?? k}`.toLowerCase()).join(" · ") || "No calls"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-gray-900">
                    {o.called}/{o.total}
                  </p>
                  <p className="text-[11px] text-gray-400">called</p>
                </div>
              </div>
              {o.total > 0 && (
                <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
                  <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${Math.min(100, (o.called / o.total) * 100)}%` }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {officers.length > 0 && (
        <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="flex items-start gap-2 text-sm text-amber-900">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {absent.length
              ? `Untick anyone who is out, then reshare: ${absent.map((o) => o.name).join(", ")}’s calls not yet made will go to the officers who are in.`
              : "Someone out today? Untick them and reshare — their calls not yet made go to the officers who are in."}
          </p>
          <Button size="sm" variant="outline" disabled={busy || absent.length === 0 || working.size === 0} onClick={reshare}>
            <RefreshCw className={cn("mr-1.5 h-4 w-4", busy && "animate-spin")} /> Reshare among those who are in
          </Button>
        </div>
      )}
      <p className="flex items-center gap-1.5 text-xs text-gray-400">
        <PhoneCall className="h-3.5 w-3.5" /> Officers see their own share in their Call Queue.
      </p>
    </div>
  );
}
