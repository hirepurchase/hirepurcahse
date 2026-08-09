"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle, Phone, Users, Clock, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";

interface CsoDashboard {
  assignedAgents: number;
  customers: number;
  verification: { pending: number; awaitingCall: number; readyToApprove: number };
  collections: { contractsOverdue: number; totalOverdueAmount: number };
  activity: { callsLoggedToday: number; promisesDueToday: number };
}

export default function CustomerServiceDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<CsoDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/customer-service/dashboard");
      setData(res.data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to load dashboard",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!data) return null;

  const hasNoAgents = data.assignedAgents === 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Customer Service</h1>
        <p className="text-sm text-gray-500">
          Verify new registrations and follow up on overdue payments
        </p>
      </div>

      {hasNoAgents && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900">No agents assigned yet</p>
            <p className="text-sm text-amber-700">
              You will not see any customers or contracts until an administrator assigns
              agents to your account.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          onClick={() => router.push("/admin/customer-service/verification")}
          className="text-left"
        >
          <Card className="hover:border-blue-300 transition-colors h-full">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Clock className="h-4 w-4" />
                Awaiting your call
              </div>
              <p className="text-3xl font-bold mt-2">{data.verification.awaitingCall}</p>
              <p className="text-xs text-gray-500 mt-1">
                {data.verification.pending} pending approval in total
              </p>
            </CardContent>
          </Card>
        </button>

        <button
          onClick={() => router.push("/admin/customer-service/verification")}
          className="text-left"
        >
          <Card className="hover:border-green-300 transition-colors h-full">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <CheckCircle className="h-4 w-4" />
                Ready to approve
              </div>
              <p className="text-3xl font-bold mt-2 text-green-600">
                {data.verification.readyToApprove}
              </p>
              <p className="text-xs text-gray-500 mt-1">Verified by phone</p>
            </CardContent>
          </Card>
        </button>

        <button
          onClick={() => router.push("/admin/customer-service/call-queue")}
          className="text-left"
        >
          <Card className="hover:border-red-300 transition-colors h-full">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Phone className="h-4 w-4" />
                Customers to call
              </div>
              <p className="text-3xl font-bold mt-2 text-red-600">
                {data.collections.contractsOverdue}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatCurrency(data.collections.totalOverdueAmount)} overdue
              </p>
            </CardContent>
          </Card>
        </button>

        <button
          onClick={() => router.push("/admin/customer-service/follow-ups")}
          className="text-left"
        >
          <Card className="hover:border-amber-300 transition-colors h-full">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Wallet className="h-4 w-4" />
                Promises due today
              </div>
              <p className="text-3xl font-bold mt-2 text-amber-600">
                {data.activity.promisesDueToday}
              </p>
              <p className="text-xs text-gray-500 mt-1">Follow up on payment promises</p>
            </CardContent>
          </Card>
        </button>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Phone className="h-4 w-4" />
              Calls logged today
            </div>
            <p className="text-3xl font-bold mt-2">{data.activity.callsLoggedToday}</p>
            <p className="text-xs text-gray-500 mt-1">By you</p>
          </CardContent>
        </Card>

        <button
          onClick={() => router.push("/admin/customer-service/my-agents")}
          className="text-left"
        >
          <Card className="hover:border-blue-300 transition-colors h-full">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Users className="h-4 w-4" />
                My portfolio
              </div>
              <p className="text-3xl font-bold mt-2">{data.customers}</p>
              <p className="text-xs text-gray-500 mt-1">
                across {data.assignedAgents} agent{data.assignedAgents === 1 ? "" : "s"} — view list
              </p>
            </CardContent>
          </Card>
        </button>
      </div>
    </div>
  );
}
