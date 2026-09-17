"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Box, History, MapPin, Search, Package } from "lucide-react";
import api from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { formatDate } from "@/lib/utils";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Item {
  id: string;
  serialNumber: string;
  product: string | null;
  status: string;
  isMovable: boolean;
  contractNumber: string | null;
  addedAt: string;
}
interface AgentStock {
  id: string;
  name: string;
  phone: string | null;
  area: string | null;
  district: string | null;
  role: string;
  isSelf: boolean;
  inStock: number;
  sold: number;
  items: Item[];
}
interface Transfer {
  id: string; serialNumber: string | null; product: string | null;
  from: string; to: string; by: string | null; reason: string | null; at: string;
}

export default function ClusterStockPage() {
  const { toast } = useToast();
  const [agents, setAgents] = useState<AgentStock[]>([]);
  const [summary, setSummary] = useState<{ agents: number; inStock: number; sold: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [transferOpen, setTransferOpen] = useState(false);
  const [toAgentId, setToAgentId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<Transfer[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/cluster/stock");
      setAgents(res.data.agents ?? []);
      setSummary(res.data.summary ?? null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to load stock",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const openHistory = async () => {
    setHistoryOpen(true);
    try {
      const res = await api.get("/cluster/stock/history");
      setHistory(res.data.transfers ?? []);
    } catch {
      setHistory([]);
    }
  };

  const toggle = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const transfer = async () => {
    setSubmitting(true);
    try {
      const res = await api.post("/cluster/stock/transfer", {
        inventoryItemIds: [...selected],
        toAgentId,
        reason: reason.trim() || undefined,
      });
      toast({ title: "Transferred", description: res.data.message });
      setTransferOpen(false);
      setSelected(new Set());
      setToAgentId("");
      setReason("");
      await load();
    } catch (error: any) {
      const data = error.response?.data;
      toast({
        title: "Could not transfer",
        description: data?.serialNumbers?.length
          ? `${data.error}: ${data.serialNumbers.join(", ")}`
          : data?.error || "Failed to transfer",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return agents;
    return agents.filter(
      (a) =>
        a.name.toLowerCase().includes(term) ||
        (a.area ?? "").toLowerCase().includes(term) ||
        (a.district ?? "").toLowerCase().includes(term) ||
        a.items.some((i) => i.serialNumber.toLowerCase().includes(term))
    );
  }, [agents, search]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10 sm:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Stock by Agent</h1>
          <p className="mt-0.5 text-sm text-gray-500">What each of your agents is holding, and where they are</p>
        </div>
        <Button variant="outline" size="sm" onClick={openHistory}>
          <History className="mr-2 h-4 w-4" />
          Transfer history
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-xs text-gray-600">Agents</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{summary?.agents ?? 0}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-xs text-gray-600">Unsold stock</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{summary?.inStock ?? 0}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-xs text-gray-600">Sold</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{summary?.sold ?? 0}</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search agent, area, district or serial number…"
          className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {selected.size > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm text-blue-900">
            <strong>{selected.size}</strong> device{selected.size === 1 ? "" : "s"} selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
            <Button size="sm" onClick={() => setTransferOpen(true)}>
              <ArrowRightLeft className="mr-1.5 h-4 w-4" />
              Transfer
            </Button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white py-12 text-center">
          <Package className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-700">
            {agents.length === 0 ? "No agents assigned to you yet" : "No agent matches"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((agent) => (
            <div key={agent.id} className="rounded-xl border border-gray-100 bg-white">
              <button
                onClick={() => setExpanded((e) => (e === agent.id ? null : agent.id))}
                className="flex w-full items-center justify-between gap-3 p-4 text-left"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-gray-900">{agent.name}</p>
                    {agent.isSelf && (
                      <span className="rounded-full bg-cyan-100 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-800">
                        You
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-gray-500">
                    {(agent.area || agent.district) ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {[agent.area, agent.district].filter(Boolean).join(", ")}
                      </span>
                    ) : (
                      <span className="text-amber-600">Location not recorded</span>
                    )}
                    {agent.phone && <span>{agent.phone}</span>}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-bold text-blue-600">{agent.inStock}</p>
                  <p className="text-[11px] text-gray-400">in stock · {agent.sold} sold</p>
                </div>
              </button>

              {expanded === agent.id && (
                <div className="border-t border-gray-100 p-3">
                  {agent.items.length === 0 ? (
                    <p className="py-4 text-center text-xs text-gray-400">Holding nothing</p>
                  ) : (
                    <div className="space-y-1.5">
                      {agent.items.map((item) => (
                        <label
                          key={item.id}
                          className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                            item.isMovable
                              ? "cursor-pointer border-gray-100 hover:bg-gray-50"
                              : "border-gray-100 bg-gray-50 opacity-60"
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={!item.isMovable}
                            checked={selected.has(item.id)}
                            onChange={() => toggle(item.id)}
                            className="h-4 w-4 shrink-0 rounded border-gray-300"
                          />
                          <Box className="h-4 w-4 shrink-0 text-gray-400" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-gray-900">{item.product ?? "Device"}</span>
                            <span className="block truncate text-xs text-gray-500">{item.serialNumber}</span>
                          </span>
                          {!item.isMovable && (
                            <span className="shrink-0 text-[11px] text-gray-500">
                              {item.contractNumber ? `On ${item.contractNumber}` : item.status}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Transfer */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Transfer {selected.size} device{selected.size === 1 ? "" : "s"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Transfer to</Label>
              <SearchableSelect
                className="mt-1.5"
                options={agents.map((a) => ({
                  value: a.id,
                  label: a.isSelf ? `${a.name} (you)` : a.name,
                  sublabel: [a.area, a.district].filter(Boolean).join(", ") || "Location not recorded",
                }))}
                value={toAgentId}
                onChange={setToAgentId}
                placeholder="Choose an agent"
                searchPlaceholder="Search by name or area…"
              />
            </div>
            <div>
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this stock moving?"
                className="mt-1.5"
              />
            </div>
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
              Only the receiving agent will be able to create contracts with these devices. The move is
              recorded against both agents.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
            <Button onClick={transfer} disabled={submitting || !toAgentId}>
              {submitting ? "Transferring…" : "Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Transfer history</DialogTitle></DialogHeader>
          {history.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">No stock has been transferred yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((t) => (
                <div key={t.id} className="rounded-lg border border-gray-100 p-3">
                  <p className="text-sm text-gray-900">{t.product ?? "Device"} · {t.serialNumber}</p>
                  <p className="mt-0.5 text-xs text-gray-600">
                    {t.from} → <strong>{t.to}</strong>
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {formatDate(t.at)} by {t.by ?? "—"}{t.reason ? ` · ${t.reason}` : ""}
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
