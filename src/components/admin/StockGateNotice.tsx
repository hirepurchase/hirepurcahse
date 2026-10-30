"use client";

import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import api from "@/lib/api";
import { Textarea } from "@/components/ui/textarea";

/**
 * Agents below their sales or quality target last month are not given new
 * devices. The server enforces it; this shows it before anyone presses Save,
 * and collects the reason an administrator must give to assign anyway.
 */

export interface StockGateStatus {
  month: string;
  active: boolean;
  canOverride: boolean;
  blocked: Record<string, { reasons: string[] }>;
}

export function useStockGate(): StockGateStatus | null {
  const [status, setStatus] = useState<StockGateStatus | null>(null);
  useEffect(() => {
    let live = true;
    api
      .get("/kpi/stock-gate")
      .then(({ data }) => live && setStatus(data))
      .catch(() => {}); // fails open, like the rule itself
    return () => {
      live = false;
    };
  }, []);
  return status;
}

export const BELOW_TARGET_LABEL = "Below target last month";

/** Shown under the agent picker when the chosen agent is blocked. */
export function StockGateNotice({
  gate,
  agentId,
  reason,
  onReasonChange,
}: {
  gate: StockGateStatus | null;
  agentId: string;
  reason: string;
  onReasonChange: (v: string) => void;
}) {
  const block = agentId ? gate?.blocked[agentId] : undefined;
  if (!block) return null;
  return (
    <div className="mt-2 space-y-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
      <p className="flex items-start gap-2 text-xs text-red-800">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          This agent was below target last month, so they cannot be given devices. {block.reasons.join(" ")}
        </span>
      </p>
      {gate?.canOverride ? (
        <Textarea
          rows={2}
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="Reason for assigning anyway (required, recorded in the audit log)"
          className="bg-white text-sm"
        />
      ) : (
        <p className="text-xs font-medium text-red-800">Choose an agent who is on target.</p>
      )}
    </div>
  );
}

/** True when the chosen agent is blocked and nothing allows the assignment yet. */
export function stockGateStops(gate: StockGateStatus | null, agentId: string, reason: string): boolean {
  if (!agentId || !gate?.blocked[agentId]) return false;
  return !gate.canOverride || !reason.trim();
}
