"use client";

import { useEffect, useState } from "react";
import { CheckCircle, AlertTriangle, XCircle, HelpCircle, Loader2 } from "lucide-react";
import api from "@/lib/api";

export type PhoneCheckStatus = "MATCHED" | "PARTIAL" | "MISMATCH" | "NOT_REGISTERED" | "UNAVAILABLE";

interface PhoneCheckResult {
  status: PhoneCheckStatus;
  registeredName: string | null;
  reason?: string;
  mode?: "enforce" | "warn" | "off";
}

const STYLES: Record<PhoneCheckStatus, { icon: typeof CheckCircle; className: string }> = {
  MATCHED: { icon: CheckCircle, className: "text-green-700 bg-green-50 border-green-200" },
  PARTIAL: { icon: AlertTriangle, className: "text-amber-700 bg-amber-50 border-amber-200" },
  MISMATCH: { icon: AlertTriangle, className: "text-red-700 bg-red-50 border-red-200" },
  NOT_REGISTERED: { icon: XCircle, className: "text-red-700 bg-red-50 border-red-200" },
  UNAVAILABLE: { icon: HelpCircle, className: "text-gray-600 bg-gray-50 border-gray-200" },
};

function describe(status: PhoneCheckStatus, registeredName: string | null, mode?: string): string {
  switch (status) {
    case "MATCHED":
      return `Registered to ${registeredName}`;
    case "PARTIAL":
      return `Registered to ${registeredName}, which only partly matches`;
    case "MISMATCH":
      return `Registered to ${registeredName}, a different name. Confirm who owns this number`;
    case "NOT_REGISTERED":
      return mode === "warn"
        ? "Not registered to anyone on the network"
        : "Not registered to anyone on the network. Check the number, it can't be saved";
    default:
      return "Could not check this number now";
  }
}

/** A saved check, as stored on the customer. Renders nothing when never checked. */
export function PhoneCheckBadge({
  status,
  registeredName,
}: {
  status?: string | null;
  registeredName?: string | null;
}) {
  if (!status || !(status in STYLES)) return null;
  const s = STYLES[status as PhoneCheckStatus];
  const Icon = s.icon;
  return (
    <span className={`mt-1 inline-flex items-start gap-1 rounded-md border px-2 py-0.5 text-xs ${s.className}`}>
      <Icon className="h-3.5 w-3.5 shrink-0 mt-px" />
      <span className="break-words">{describe(status as PhoneCheckStatus, registeredName ?? null, "warn")}</span>
    </span>
  );
}

const isGhanaNumber = (phone: string) => /^0[235]\d{8}$/.test(phone.replace(/\D/g, "").replace(/^233/, "0"));

/**
 * Checks the number against the network as staff type, once it is a full
 * Ghana number and a name has been entered. The server checks again on save.
 */
export function LivePhoneCheck({
  phone,
  name,
  enabled = true,
}: {
  phone: string;
  name: string;
  /** Each check is billed, so the edit form checks only what was changed. */
  enabled?: boolean;
}) {
  const [result, setResult] = useState<PhoneCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const ready = enabled && isGhanaNumber(phone) && name.trim().length > 1;

  useEffect(() => {
    if (!ready) {
      setResult(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await api.post("/customers/verify-phone", { phone, name });
        if (!cancelled) setResult(response.data);
      } catch {
        if (!cancelled) setResult({ status: "UNAVAILABLE", registeredName: null });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 700);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phone, name, ready]);

  if (!ready) return null;
  if (loading) {
    return (
      <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking with the network…
      </p>
    );
  }
  if (!result || result.mode === "off") return null;
  const s = STYLES[result.status] || STYLES.UNAVAILABLE;
  const Icon = s.icon;
  return (
    <p className={`mt-1 flex items-start gap-1 rounded-md border px-2 py-1 text-xs ${s.className}`}>
      <Icon className="h-3.5 w-3.5 shrink-0 mt-px" />
      <span className="break-words">
        {describe(result.status, result.registeredName, result.mode)}
        {result.status === "UNAVAILABLE" && ". You can still save; the approver will see it wasn't checked"}
      </span>
    </p>
  );
}
