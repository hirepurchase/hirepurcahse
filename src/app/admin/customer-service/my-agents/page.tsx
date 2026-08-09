"use client";

import { useEffect, useState } from "react";
import { Mail, Phone, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";

interface AssignedAgent {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  assignedAt: string;
  customers: number;
  contracts: number;
  pendingVerification: number;
  contractsOverdue: number;
}

export default function MyAgentsPage() {
  const { toast } = useToast();
  const [agents, setAgents] = useState<AssignedAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/customer-service/my-agents");
      setAgents(res.data.agents || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to load your agents",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">My Agents</h1>
        <p className="text-sm text-gray-500">
          You handle verification and collections for these agents&apos; customers
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            {agents.length} agent{agents.length === 1 ? "" : "s"} assigned to you
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-sm text-gray-500">No agents assigned to you yet.</p>
              <p className="text-sm text-gray-400 mt-1">
                Until an administrator assigns agents, you will not see any customers or
                contracts.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile */}
              <div className="sm:hidden divide-y divide-gray-100">
                {agents.map((a) => (
                  <div key={a.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{a.name}</p>
                      {!a.isActive && <Badge className="bg-gray-100 text-gray-700">Inactive</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <a href={`mailto:${a.email}`} className="text-blue-600 truncate">
                        {a.email}
                      </a>
                      {a.phone && (
                        <a href={`tel:${a.phone}`} className="text-blue-600">
                          {a.phone}
                        </a>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="text-gray-500">{a.customers} customers</span>
                      <span className="text-gray-500">{a.contracts} contracts</span>
                      {a.pendingVerification > 0 && (
                        <span className="text-amber-700 font-medium">
                          {a.pendingVerification} to verify
                        </span>
                      )}
                      {a.contractsOverdue > 0 && (
                        <span className="text-red-700 font-medium">
                          {a.contractsOverdue} overdue
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Customers</TableHead>
                      <TableHead>Contracts</TableHead>
                      <TableHead>To verify</TableHead>
                      <TableHead>Overdue</TableHead>
                      <TableHead>Assigned</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <p className="font-medium">{a.name}</p>
                          {!a.isActive && (
                            <Badge className="bg-gray-100 text-gray-700 mt-1">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <a
                            href={`mailto:${a.email}`}
                            className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                          >
                            <Mail className="h-3 w-3" /> {a.email}
                          </a>
                          {a.phone && (
                            <a
                              href={`tel:${a.phone}`}
                              className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                            >
                              <Phone className="h-3 w-3" /> {a.phone}
                            </a>
                          )}
                        </TableCell>
                        <TableCell>{a.customers}</TableCell>
                        <TableCell>{a.contracts}</TableCell>
                        <TableCell>
                          {a.pendingVerification > 0 ? (
                            <span className="font-semibold text-amber-700">
                              {a.pendingVerification}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {a.contractsOverdue > 0 ? (
                            <span className="font-semibold text-red-700">{a.contractsOverdue}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {formatDate(a.assignedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
