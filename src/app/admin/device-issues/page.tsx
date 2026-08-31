'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, ShieldAlert, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/lib/api';
import { useToast } from '@/hooks/useToast';

interface DeviceIssue {
  contractId: string;
  contractNumber: string;
  contractStatus: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  deviceUid: string;
  deviceUidType: string;
  desiredState: string;
  actualState: string;
  lastError: string | null;
  reason: string;
}

interface DeviceIssuesResponse {
  categoryA: DeviceIssue[];
  categoryB: DeviceIssue[];
  categoryC: DeviceIssue[];
  counts: { categoryA: number; categoryB: number; categoryC: number; urgent: number; total: number };
}

function IssueTable({
  title, subtitle, icon: Icon, tone, issues, onRetry, retrying,
}: {
  title: string; subtitle: string; icon: React.ElementType; tone: 'red' | 'amber' | 'slate';
  issues: DeviceIssue[]; onRetry: (contractId: string) => void; retrying: string | null;
}) {
  const toneClasses = {
    red: 'text-red-600 bg-red-50',
    amber: 'text-amber-600 bg-amber-50',
    slate: 'text-slate-500 bg-slate-100',
  }[tone];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${toneClasses}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">{title} ({issues.length})</CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {issues.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">None right now.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contract</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue) => (
                  <TableRow key={issue.contractId}>
                    <TableCell>
                      <Link href={`/admin/contracts/${issue.contractId}`} className="text-blue-600 hover:underline font-medium">
                        {issue.contractNumber}
                      </Link>
                      <div className="text-xs text-gray-400">{issue.contractStatus}</div>
                    </TableCell>
                    <TableCell>{issue.customerName}</TableCell>
                    <TableCell>
                      <a href={`tel:${issue.customerPhone}`} className="text-blue-600 hover:underline">
                        {issue.customerPhone}
                      </a>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{issue.reason}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={retrying === issue.contractId}
                        onClick={() => onRetry(issue.contractId)}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${retrying === issue.contractId ? 'animate-spin' : ''}`} />
                        {retrying === issue.contractId ? 'Retrying…' : 'Retry'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DeviceIssuesPage() {
  const [data, setData] = useState<DeviceIssuesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/knox-guard/device-issues');
      setData(res.data);
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to load device issues', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRetry = async (contractId: string) => {
    setRetrying(contractId);
    try {
      const res = await api.post(`/knox-guard/contracts/${contractId}/evaluate`);
      const success = res.data?.result?.actionSuccess;
      toast({
        title: success ? 'Retried successfully' : 'Retry did not resolve it',
        description: success
          ? 'The device state has been corrected.'
          : (res.data?.result?.actionError || 'Knox rejected the request again — may need manual follow-up.'),
        variant: success ? undefined : 'destructive',
      });
      load();
    } catch (error: any) {
      toast({ title: 'Retry failed', description: error.response?.data?.error || 'Failed to retry', variant: 'destructive' });
    } finally {
      setRetrying(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            Device Lock Issues
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Contracts where the device&apos;s intended lock state doesn&apos;t match what Knox Guard actually shows.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isLoading && !data ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : data ? (
        <div className="space-y-6">
          <IssueTable
            title="Should be LOCKED, isn't"
            subtitle="Overdue customers whose device failed to lock — usually Knox has no connection to the physical device."
            icon={ShieldAlert}
            tone="red"
            issues={data.categoryA}
            onRetry={handleRetry}
            retrying={retrying}
          />
          <IssueTable
            title="Should be UNLOCKED, still shows LOCKED"
            subtitle="Customers who may be wrongly restricted despite clearing their arrears — call to confirm."
            icon={AlertTriangle}
            tone="amber"
            issues={data.categoryB}
            onRetry={handleRetry}
            retrying={retrying}
          />
          <IssueTable
            title="Should be UNLOCKED, state unknown"
            subtitle="Device has never connected to Knox Guard. Lower urgency."
            icon={HelpCircle}
            tone="slate"
            issues={data.categoryC}
            onRetry={handleRetry}
            retrying={retrying}
          />
        </div>
      ) : null}
    </div>
  );
}
