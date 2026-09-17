"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Calculator, Save, Play, ShieldAlert } from "lucide-react";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";

interface PenaltySettings {
  id: string;
  expiryPenaltyEnabled: boolean;
  expiryPenaltyMode: "FIXED" | "DAILY";
  expiryPenaltyRate: number;
  expiryGraceDays: number;
  maxPenaltyPercentage: number;
  activatedAt: string | null;
  notifyCustomer: boolean;
  blockUnlockOnPenalty: boolean;
}

interface Stats {
  unpaidPenaltyTotal: number;
  contractsPastTerm: number;
  outstandingPastTerm: number;
}

interface Preview {
  contractsExamined: number;
  contractsCharged: number;
  penaltiesCreated: number;
  totalCharged: number;
  details: Array<{ contractNumber: string; charges: number; amount: number }>;
}

const inputCls =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500";

export default function PenaltySettingsPage() {
  const { toast } = useToast();
  const [form, setForm] = useState<PenaltySettings | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/settings/penalties");
      setForm(res.data.settings);
      setStats(res.data.stats);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to load penalty settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const set = <K extends keyof PenaltySettings>(key: K, value: PenaltySettings[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    // The preview describes the values that produced it, so it stops being
    // true the moment any of them change.
    setPreview(null);
  };

  const runPreview = async () => {
    if (!form) return;
    setPreviewing(true);
    try {
      const res = await api.post("/settings/penalties/preview", {
        expiryPenaltyMode: form.expiryPenaltyMode,
        expiryPenaltyRate: form.expiryPenaltyRate,
        expiryGraceDays: form.expiryGraceDays,
        maxPenaltyPercentage: form.maxPenaltyPercentage,
      });
      setPreview(res.data);
    } catch (error: any) {
      toast({
        title: "Preview failed",
        description: error.response?.data?.error || "Could not build the preview",
        variant: "destructive",
      });
    } finally {
      setPreviewing(false);
    }
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const res = await api.put("/settings/penalties", form);
      setForm(res.data.settings);
      toast({ title: "Saved", description: "Penalty settings updated." });
      await load();
    } catch (error: any) {
      toast({
        title: "Could not save",
        description: error.response?.data?.error || "Failed to save",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const res = await api.post("/settings/penalties/run");
      toast({
        title: "Accrual complete",
        description: `${res.data.contractsCharged} contracts charged, ${formatCurrency(res.data.totalCharged)} in total.`,
      });
      setPreview(null);
      await load();
    } catch (error: any) {
      toast({
        title: "Run failed",
        description: error.response?.data?.error || "Could not run the accrual",
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  if (loading || !form) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-cyan-600" />
      </div>
    );
  }

  const isDaily = form.expiryPenaltyMode === "DAILY";
  const rateCeiling = isDaily ? 5 : 100;

  return (
    <div className="max-w-3xl space-y-5 pb-10 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Expiry Penalties</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Charges applied when a contract runs past its agreed term with money still owing
        </p>
      </div>

      {/* What is out there right now */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-xs text-gray-600">Contracts past term</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{stats?.contractsPastTerm ?? 0}</p>
        </div>
        <div className="min-w-0 rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-xs text-gray-600">Still owed on them</p>
          <p className="mt-1 truncate text-2xl font-bold text-red-600">
            {formatCurrency(stats?.outstandingPastTerm ?? 0)}
          </p>
        </div>
        <div className="min-w-0 rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-xs text-gray-600">Penalties unpaid</p>
          <p className="mt-1 truncate text-2xl font-bold text-gray-900">
            {formatCurrency(stats?.unpaidPenaltyTotal ?? 0)}
          </p>
        </div>
      </div>

      {!form.activatedAt && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">This has never been switched on.</p>
            <p className="mt-1">
              When you enable it, charges start from that day — never backdated to when each contract
              actually expired. The {stats?.contractsPastTerm ?? 0} contracts already past term will not be
              billed for the time that has already passed. Use Preview first to see what the first run
              would charge.
            </p>
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 sm:p-6">
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Charge penalties on expired contracts</p>
              <p className="mt-0.5 text-xs text-gray-500">
                {form.activatedAt
                  ? `Active since ${new Date(form.activatedAt).toLocaleDateString()}`
                  : "Not yet switched on"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => set("expiryPenaltyEnabled", !form.expiryPenaltyEnabled)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                form.expiryPenaltyEnabled ? "bg-cyan-600" : "bg-gray-300"
              }`}
              aria-pressed={form.expiryPenaltyEnabled}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  form.expiryPenaltyEnabled ? "translate-x-[22px]" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">How it is charged</label>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => set("expiryPenaltyMode", "FIXED")}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  !isDaily ? "border-cyan-500 bg-cyan-50" : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <p className="text-sm font-medium text-gray-900">One-off</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Charged once on the balance outstanding when the term ended.
                </p>
              </button>
              <button
                type="button"
                onClick={() => set("expiryPenaltyMode", "DAILY")}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  isDaily ? "border-cyan-500 bg-cyan-50" : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <p className="text-sm font-medium text-gray-900">Daily</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Charged every day the contract stays past term, on that day&apos;s balance.
                </p>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Rate ({isDaily ? "% per day" : "% once"})
              </label>
              <input
                type="number"
                min={0}
                max={rateCeiling}
                step={0.1}
                value={form.expiryPenaltyRate}
                onChange={(e) => set("expiryPenaltyRate", parseFloat(e.target.value) || 0)}
                className={`mt-1.5 ${inputCls}`}
              />
              <p className="mt-1 text-xs text-gray-500">Max {rateCeiling}%</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Grace days</label>
              <input
                type="number"
                min={0}
                max={180}
                value={form.expiryGraceDays}
                onChange={(e) => set("expiryGraceDays", parseInt(e.target.value) || 0)}
                className={`mt-1.5 ${inputCls}`}
              />
              <p className="mt-1 text-xs text-gray-500">Days after term before charging</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Cap (% of balance)</label>
              <input
                type="number"
                min={1}
                max={100}
                value={form.maxPenaltyPercentage}
                onChange={(e) => set("maxPenaltyPercentage", parseInt(e.target.value) || 50)}
                className={`mt-1.5 ${inputCls}`}
              />
              <p className="mt-1 text-xs text-gray-500">
                Of the balance owed when the contract expired
              </p>
            </div>
          </div>

          {isDaily && form.expiryPenaltyRate > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-800">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {form.expiryPenaltyRate}% per day is roughly{" "}
                <strong>{Math.round(form.expiryPenaltyRate * 365)}% a year</strong> on the outstanding
                balance, charged to customers who are already struggling to pay. The cap is what stops it
                running away.
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Tell the customer when they are first charged</p>
              <p className="mt-0.5 text-xs text-gray-500">
                One SMS the first time a contract is charged — not per charge, so daily mode does not
                message them every morning.
              </p>
            </div>
            <button
              type="button"
              onClick={() => set("notifyCustomer", !form.notifyCustomer)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                form.notifyCustomer ? "bg-cyan-600" : "bg-gray-300"
              }`}
              aria-pressed={form.notifyCustomer}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  form.notifyCustomer ? "translate-x-[22px]" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Keep device locked while penalties are unpaid</p>
              <p className="mt-0.5 text-xs text-gray-500">
                Holds the phone even once the installments themselves are up to date. This is the same
                setting as &ldquo;Block unlock on unpaid penalties&rdquo; on the Knox Guard page.
              </p>
            </div>
            <button
              type="button"
              onClick={() => set("blockUnlockOnPenalty", !form.blockUnlockOnPenalty)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                form.blockUnlockOnPenalty ? "bg-cyan-600" : "bg-gray-300"
              }`}
              aria-pressed={form.blockUnlockOnPenalty}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  form.blockUnlockOnPenalty ? "translate-x-[22px]" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Preview</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              What the next run would charge at these settings. Nothing is written.
            </p>
          </div>
          <button
            onClick={runPreview}
            disabled={previewing || form.expiryPenaltyRate <= 0}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Calculator className="h-4 w-4" />
            {previewing ? "Calculating…" : "Calculate"}
          </button>
        </div>

        {preview && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-600">Contracts charged</p>
                <p className="mt-0.5 text-lg font-bold text-gray-900">
                  {preview.contractsCharged}
                  <span className="text-sm font-normal text-gray-400"> / {preview.contractsExamined}</span>
                </p>
              </div>
              <div className="min-w-0 rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-600">Total{isDaily ? " per day" : ""}</p>
                <p className="mt-0.5 truncate text-lg font-bold text-red-600">
                  {formatCurrency(preview.totalCharged)}
                </p>
              </div>
              <div className="min-w-0 rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-600">Penalty rows</p>
                <p className="mt-0.5 text-lg font-bold text-gray-900">{preview.penaltiesCreated}</p>
              </div>
            </div>

            {isDaily && preview.totalCharged > 0 && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                At this rate that is about{" "}
                <strong>{formatCurrency(preview.totalCharged * 30)}</strong> a month across these
                customers, and it keeps growing until they pay or the cap is reached.
              </p>
            )}

            {preview.details.length > 0 && (
              <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Contract</th>
                      <th className="px-3 py-2 text-right font-medium">Charges</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {preview.details.map((row) => (
                      <tr key={row.contractNumber}>
                        <td className="px-3 py-2 text-gray-700">{row.contractNumber}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{row.charges}</td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900">
                          {formatCurrency(row.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save settings"}
        </button>
        {form.expiryPenaltyEnabled && (
          <button
            onClick={runNow}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            {running ? "Running…" : "Run accrual now"}
          </button>
        )}
        <p className="w-full text-xs text-gray-500">
          The accrual runs automatically each day at 8:15 AM. Running it here only brings that forward.
        </p>
      </div>
    </div>
  );
}
