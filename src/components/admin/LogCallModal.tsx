"use client";

import { useState } from "react";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { useToast } from "@/hooks/useToast";

export type CallPurpose = "VERIFICATION" | "COLLECTION" | "FOLLOW_UP" | "OTHER";

const OUTCOMES: { value: string; label: string }[] = [
  { value: "REACHED", label: "Reached — spoke to customer" },
  { value: "NO_ANSWER", label: "No answer" },
  { value: "WRONG_NUMBER", label: "Wrong number" },
  { value: "UNREACHABLE", label: "Unreachable / switched off" },
  { value: "PROMISE_TO_PAY", label: "Promised to pay" },
  { value: "REFUSED", label: "Refused to pay" },
  { value: "CALLBACK_REQUESTED", label: "Asked to be called back" },
];

const VERIFICATION_RESULTS: { value: string; label: string }[] = [
  { value: "VERIFIED", label: "Verified — details confirmed" },
  { value: "INCONCLUSIVE", label: "Inconclusive — could not confirm" },
  { value: "FAILED", label: "Failed — details do not match" },
];

interface LogCallModalProps {
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  contractId?: string | null;
  contractNumber?: string | null;
  installmentId?: string | null;
  defaultPurpose?: CallPurpose;
  onClose: () => void;
  onLogged?: () => void;
}

export default function LogCallModal({
  customerId,
  customerName,
  customerPhone,
  contractId,
  contractNumber,
  installmentId,
  defaultPurpose = "COLLECTION",
  onClose,
  onLogged,
}: LogCallModalProps) {
  const [purpose, setPurpose] = useState<CallPurpose>(defaultPurpose);
  const [outcome, setOutcome] = useState("REACHED");
  const [verificationResult, setVerificationResult] = useState("VERIFIED");
  const [notes, setNotes] = useState("");
  const [promiseToPayDate, setPromiseToPayDate] = useState("");
  const [promiseToPayAmount, setPromiseToPayAmount] = useState("");
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const isPromise = outcome === "PROMISE_TO_PAY";
  const isVerification = purpose === "VERIFICATION";
  const canSubmit = !isSubmitting && (!isPromise || !!promiseToPayDate);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await api.post("/contact-attempts", {
        customerId,
        contractId: contractId || undefined,
        installmentId: installmentId || undefined,
        purpose,
        outcome,
        verificationResult: isVerification ? verificationResult : undefined,
        notes: notes.trim() || undefined,
        promiseToPayDate: isPromise ? promiseToPayDate : undefined,
        promiseToPayAmount: isPromise && promiseToPayAmount ? promiseToPayAmount : undefined,
        nextFollowUpAt: nextFollowUpAt || undefined,
      });

      toast({
        title: "Call logged",
        description:
          isVerification && verificationResult === "VERIFIED"
            ? "Customer verified — this contract can now be approved"
            : `Recorded for ${customerName}`,
      });
      onLogged?.();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to log call",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <Phone className="h-5 w-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">Log Call — {customerName}</h2>
            <p className="text-sm text-gray-500">
              {customerPhone ? (
                <a href={`tel:${customerPhone}`} className="text-blue-600 hover:underline">
                  {customerPhone}
                </a>
              ) : (
                "No phone on file"
              )}
              {contractNumber ? ` · ${contractNumber}` : ""}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value as CallPurpose)}
            >
              <option value="VERIFICATION">Verification — confirm customer details</option>
              <option value="COLLECTION">Collection — chase overdue payment</option>
              <option value="FOLLOW_UP">Follow up</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Outcome</label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            >
              {OUTCOMES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {isVerification && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Verification result</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={verificationResult}
                onChange={(e) => setVerificationResult(e.target.value)}
              >
                {VERIFICATION_RESULTS.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Only a <strong>Verified</strong> result allows the contract to be approved.
              </p>
            </div>
          )}

          {isPromise && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Promised date *</label>
                <Input
                  type="date"
                  value={promiseToPayDate}
                  onChange={(e) => setPromiseToPayDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (GH₵)</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={promiseToPayAmount}
                  onChange={(e) => setPromiseToPayAmount(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              placeholder="What did the customer say?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Next follow-up (optional)</label>
            <Input
              type="date"
              value={nextFollowUpAt}
              onChange={(e) => setNextFollowUpAt(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-5">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting ? "Saving..." : "Log Call"}
          </Button>
        </div>
      </div>
    </div>
  );
}
