"use client";

import LoadingState from "@/components/shared/LoadingState";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Info, Loader2, Play, Save } from "lucide-react";
import api from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";

/**
 * How expired contracts are rescheduled: the interest rate, and whether a
 * daily job raises requests on its own. Every request still needs approval.
 */

type Frequency = "DAILY" | "WEEKLY" | "MONTHLY";

interface Settings {
  autoEnabled: boolean;
  autoAfterDays: number;
  defaultMonthlyRate: number;
  maxMonthlyRate: number;
  autoFrequency: Frequency;
  autoInstallments: number;
  maxReschedulesPerContract: number;
  updatedAt?: string | null;
}

const inputCls =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500";

export default function RescheduleSettingsPage() {
  const { toast } = useToast();
  const [form, setForm] = useState<Settings | null>(null);
  const [stats, setStats] = useState<{ waiting: number; candidates: number } | null>(null);
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/reschedules/settings");
      setForm(res.data.settings);
      setStats(res.data.stats);
      setUpdatedBy(res.data.updatedBy);
    } catch (error: any) {
      toast({ title: "Could not load the settings", description: error?.response?.data?.error || "Please try again.", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await api.put("/reschedules/settings", form);
      toast({ title: "Saved" });
      void load();
    } catch (error: any) {
      toast({ title: "Not saved", description: error?.response?.data?.error || "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const res = await api.post("/reschedules/settings/run");
      toast({
        title: res.data.enabled ? `${res.data.raised} request(s) raised` : "The automatic switch is off",
        description: res.data.enabled ? "They are waiting for approval." : "Switch it on and save first.",
      });
      void load();
    } catch (error: any) {
      toast({ title: "Not run", description: error?.response?.data?.error || "Please try again.", variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  if (!form) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingState label="Loading reschedule settings…" />
      </div>
    );
  }

  const perLabel = form.autoFrequency === "DAILY" ? "daily" : form.autoFrequency === "WEEKLY" ? "weekly" : "monthly";

  return (
    <div className="max-w-3xl space-y-5 pb-10 sm:space-y-6">
      <div className="workspace-heading workspace-heading--settings">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Rescheduling expired contracts</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Spread what is still owed after a contract&apos;s end date, plus unpaid late charges, over a new schedule with interest
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <Link href="/admin/reschedules" className="rounded-xl border border-gray-100 bg-white p-4 hover:border-cyan-300">
          <p className="text-xs text-gray-600">Waiting for approval</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{stats?.waiting ?? 0}</p>
        </Link>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-xs text-gray-600">Would be raised by the automatic job today</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{stats?.candidates ?? 0}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-5 sm:p-6">
        <h2 className="text-base font-semibold text-gray-900">Interest</h2>
        <p className="mt-1 text-sm text-gray-600">
          Flat: the new balance × the rate × the months from today to the last payment. Charged once, when the reschedule is applied.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="rs-default-rate" className="text-sm font-medium text-gray-700">Usual rate (% a month)</label>
            <input id="rs-default-rate" type="number" min={0} step={0.1} value={form.defaultMonthlyRate}
              onChange={(e) => set("defaultMonthlyRate", parseFloat(e.target.value) || 0)} className={`mt-1.5 ${inputCls}`} />
            <p className="mt-1 text-xs text-gray-500">Filled in on each request; the person asking can change it</p>
          </div>
          <div>
            <label htmlFor="rs-max-rate" className="text-sm font-medium text-gray-700">Highest rate allowed (% a month)</label>
            <input id="rs-max-rate" type="number" min={0} max={100} step={0.1} value={form.maxMonthlyRate}
              onChange={(e) => set("maxMonthlyRate", parseFloat(e.target.value) || 0)} className={`mt-1.5 ${inputCls}`} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Raise requests automatically</h2>
            <p className="mt-0.5 text-sm text-gray-600">
              Every morning at 8:20, for each contract past its end date by the days below. Each one still waits for approval.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.autoEnabled}
            aria-label="Raise requests automatically"
            onClick={() => set("autoEnabled", !form.autoEnabled)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${form.autoEnabled ? "bg-cyan-600" : "bg-gray-300"}`}
          >
            <span className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${form.autoEnabled ? "translate-x-[22px]" : "translate-x-0.5"}`} />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="rs-after" className="text-sm font-medium text-gray-700">Days past the end date</label>
            <input id="rs-after" type="number" min={0} max={365} value={form.autoAfterDays}
              onChange={(e) => set("autoAfterDays", parseInt(e.target.value) || 0)} className={`mt-1.5 ${inputCls}`} />
          </div>
          <div>
            <label htmlFor="rs-max-times" className="text-sm font-medium text-gray-700">Most times per contract</label>
            <input id="rs-max-times" type="number" min={1} max={10} value={form.maxReschedulesPerContract}
              onChange={(e) => set("maxReschedulesPerContract", parseInt(e.target.value) || 1)} className={`mt-1.5 ${inputCls}`} />
            <p className="mt-1 text-xs text-gray-500">After this, only by hand</p>
          </div>
          <div>
            <label htmlFor="rs-freq" className="text-sm font-medium text-gray-700">How often the customer pays</label>
            <select id="rs-freq" value={form.autoFrequency} onChange={(e) => set("autoFrequency", e.target.value as Frequency)} className={`mt-1.5 ${inputCls}`}>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>
          <div>
            <label htmlFor="rs-count" className="text-sm font-medium text-gray-700">Number of payments</label>
            <input id="rs-count" type="number" min={1} value={form.autoInstallments}
              onChange={(e) => set("autoInstallments", parseInt(e.target.value) || 1)} className={`mt-1.5 ${inputCls}`} />
            <p className="mt-1 text-xs text-gray-500">{form.autoInstallments} {perLabel} payments at {form.defaultMonthlyRate}% a month</p>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-cyan-50 px-3 py-2.5 text-xs text-cyan-900">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            A request that is turned down is not raised again until the contract&apos;s end date changes. A contract already
            rescheduled is raised again only once its new end date has passed.
          </span>
        </div>
      </div>

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gray-500">
          {form.updatedAt ? `Last changed ${formatDateTime(form.updatedAt)}${updatedBy ? ` by ${updatedBy}` : ""}` : "Never changed"}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => void runNow()} disabled={running || !form.autoEnabled}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Raise requests now
          </button>
          <button type="button" onClick={() => void save()} disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
