"use client";

import { useEffect, useState } from "react";
import { Phone, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LogCallModal from "@/components/admin/LogCallModal";
import api from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";

interface FollowUp {
  id: string;
  customer: { id: string; name: string; phone: string; membershipId: string };
  contract: { id: string; contractNumber: string; outstandingBalance: number } | null;
  purpose: string;
  outcome: string;
  notes: string | null;
  promiseToPayDate: string | null;
  promiseToPayAmount: number | null;
  nextFollowUpAt: string | null;
  contactedAt: string;
  loggedBy: string | null;
}

export default function FollowUpsPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<FollowUp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [callTarget, setCallTarget] = useState<FollowUp | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/customer-service/follow-ups");
      setRows(res.data.followUps || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to load follow-ups",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isOverdue = (date: string | null) =>
    !!date && new Date(date).getTime() < new Date().setHours(0, 0, 0, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Follow-ups</h1>
        <p className="text-sm text-gray-500">
          Payment promises and callbacks that are due
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {rows.length} due{rows.length === 1 ? "" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-center text-gray-500 py-12 text-sm">
              Nothing due. Promises and callbacks appear here on their due date.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {rows.map((row) => (
                <div key={row.id} className="p-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{row.customer.name}</p>
                      <a href={`tel:${row.customer.phone}`} className="text-sm text-blue-600 hover:underline">
                        {row.customer.phone}
                      </a>
                      {row.contract && (
                        <span className="text-xs text-gray-400">{row.contract.contractNumber}</span>
                      )}
                    </div>

                    {row.promiseToPayDate && (
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            isOverdue(row.promiseToPayDate)
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                          }
                        >
                          <CalendarClock className="h-3 w-3 mr-1" />
                          Promised{" "}
                          {row.promiseToPayAmount ? formatCurrency(row.promiseToPayAmount) : "payment"} by{" "}
                          {formatDate(row.promiseToPayDate)}
                        </Badge>
                      </div>
                    )}

                    {row.nextFollowUpAt && !row.promiseToPayDate && (
                      <Badge className="bg-blue-100 text-blue-800">
                        <CalendarClock className="h-3 w-3 mr-1" />
                        Callback due {formatDate(row.nextFollowUpAt)}
                      </Badge>
                    )}

                    {row.notes && <p className="text-sm text-gray-600">{row.notes}</p>}

                    <p className="text-xs text-gray-400">
                      Last call {formatDate(row.contactedAt)}
                      {row.loggedBy ? ` by ${row.loggedBy}` : ""}
                      {" · "}
                      {row.outcome.replace(/_/g, " ").toLowerCase()}
                    </p>
                  </div>

                  <Button size="sm" variant="outline" onClick={() => setCallTarget(row)}>
                    <Phone className="h-4 w-4 mr-1" /> Log Call
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {callTarget && (
        <LogCallModal
          customerId={callTarget.customer.id}
          customerName={callTarget.customer.name}
          customerPhone={callTarget.customer.phone}
          contractId={callTarget.contract?.id}
          contractNumber={callTarget.contract?.contractNumber}
          defaultPurpose="FOLLOW_UP"
          onClose={() => setCallTarget(null)}
          onLogged={load}
        />
      )}
    </div>
  );
}
