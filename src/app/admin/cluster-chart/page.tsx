'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AlertTriangle, Mail, Phone, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Person {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

interface ClusterAgent extends Person {
  agentCount: number;
  agents: Person[];
}

export default function ClusterChartPage() {
  const [clusterAgents, setClusterAgents] = useState<ClusterAgent[]>([]);
  const [unassigned, setUnassigned] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/cluster/coverage');
      setClusterAgents(res.data.clusterAgents ?? []);
      setUnassigned(res.data.unassignedAgents ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-cyan-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10 sm:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Cluster Coverage</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Which cluster agent supervises whom, and who is supervised by nobody
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Orphans first — this is the reason to open the page. */}
      {unassigned.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900">
                {unassigned.length} agent{unassigned.length === 1 ? '' : 's'} report to no cluster agent
              </p>
              <p className="mt-1 text-xs text-amber-800">
                Nobody is accountable for their portfolio, and no one can request a temporary unlock for
                their customers.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {unassigned.map((agent) => (
                  <div key={agent.id} className="rounded-lg border border-amber-200 bg-white px-3 py-2">
                    <p className="truncate text-sm font-medium text-gray-900">{agent.name}</p>
                    <p className="truncate text-xs text-gray-500">{agent.phone || agent.email}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {clusterAgents.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white py-12 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-700">No cluster agents yet</p>
          <p className="mt-1 text-xs text-gray-500">
            Create a user with the Cluster Agent role, then assign agents to them from the Users page.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {clusterAgents.map((cluster) => (
            <div key={cluster.id} className="rounded-xl border border-gray-100 bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{cluster.name}</p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    {cluster.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {cluster.phone}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {cluster.email}
                    </span>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    cluster.agentCount === 0
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {cluster.agentCount} agent{cluster.agentCount === 1 ? '' : 's'}
                </span>
              </div>

              {cluster.agents.length > 0 ? (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {cluster.agents.map((agent) => (
                    <div key={agent.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                      <p className="truncate text-sm text-gray-900">{agent.name}</p>
                      <p className="truncate text-xs text-gray-500">{agent.phone || agent.email}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-gray-500">
                  Supervises nobody — they still sell, but no team reports to them.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
