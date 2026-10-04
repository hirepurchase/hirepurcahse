'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Gift } from 'lucide-react';
import api from '@/lib/api';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { PERMISSIONS } from '@/lib/permissions';
import { ExportButtons } from '@/components/admin/ExportButtons';
import type { ExportOptions } from '@/lib/exportUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/useToast';
import { formatCurrency, formatDate } from '@/lib/utils';

type Status = 'PENDING' | 'PAYABLE' | 'ON_HOLD' | 'FORFEITED' | 'PAID';

interface Row {
  id: string;
  contractId: string;
  contractNumber: string | null;
  contractStatus: string | null;
  customerName: string | null;
  completedAt: string | null;
  agentId: string;
  agentName: string | null;
  upfrontAmount: number;
  deferredAmount: number;
  bonusAmount: number;
  total: number;
  status: Status;
  needsReview: boolean;
  soldAt: string;
  paidAt: string | null;
  reference: string | null;
}

interface Response {
  rows: Row[];
  totals: Record<Status, { count: number; amount: number }>;
  needsReview: number;
}

const TABS: Array<{ value: Status; label: string }> = [
  { value: 'PAYABLE', label: 'Ready to pay' },
  { value: 'PENDING', label: 'Waiting' },
  { value: 'ON_HOLD', label: 'Defaulted' },
  { value: 'PAID', label: 'Paid' },
  { value: 'FORFEITED', label: 'Forfeited' },
];

const PRIMARY = 'bg-emerald-600 text-white hover:bg-emerald-700';
const errorText = (err: unknown, fallback: string) => (err as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback;

export default function CompletionCommissionsPage() {
  return (
    <ProtectedRoute permissions={[PERMISSIONS.MANAGE_AGENT_LEDGER]}>
      <CompletionCommissions />
    </ProtectedRoute>
  );
}

function CompletionCommissions() {
  const { toast } = useToast();
  const [status, setStatus] = useState<Status>('PAYABLE');
  const [month, setMonth] = useState('');
  const [agentId, setAgentId] = useState('');
  const [data, setData] = useState<Response | null>(null);
  const [all, setAll] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [payFor, setPayFor] = useState<Row | null>(null);
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    const params = { status, month: month || undefined, agentId: agentId || undefined };
    Promise.all([
      api.get('/agent-deposits/completion-commissions', { params }),
      api.get('/agent-deposits/completion-commissions'),
    ])
      .then(([filtered, everything]) => {
        setData(filtered.data);
        setAll(everything.data.rows);
        setError(null);
      })
      .catch((err) => setError(errorText(err, 'Could not load completion commissions')));
  }, [status, month, agentId]);

  useEffect(() => {
    load();
  }, [load]);

  const agents = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of all) m.set(r.agentId, r.agentName || 'Unknown agent');
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [all]);

  const pay = async (paid: boolean, row: Row) => {
    setBusy(true);
    try {
      await api.post(`/agent-deposits/completion-commissions/${row.id}/${paid ? 'paid' : 'unpaid'}`, paid ? { reference } : undefined);
      toast({ title: paid ? 'Payment recorded' : 'Marked unpaid' });
      setPayFor(null);
      load();
    } catch (err) {
      toast({ title: 'Not done', description: errorText(err, 'Request failed'), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const exportOptions: ExportOptions<Row> | null = data
    ? {
        title: `Completion commissions — ${TABS.find((t) => t.value === status)?.label}${month ? ` · completed ${month}` : ''}`,
        filename: `completion-commissions-${status.toLowerCase()}${month ? `-${month}` : ''}`,
        summary: [
          { label: 'Contracts', value: data.rows.length },
          { label: 'Total', value: formatCurrency(data.rows.reduce((s, r) => s + r.total, 0)) },
        ],
        columns: [
          { header: 'Agent', accessor: (r) => r.agentName || '' },
          { header: 'Contract', accessor: (r) => r.contractNumber || '' },
          { header: 'Customer', accessor: (r) => r.customerName || '' },
          { header: 'Completed', accessor: (r) => (r.completedAt ? formatDate(r.completedAt) : '') },
          { header: 'Held (GHS)', accessor: (r) => r.deferredAmount.toFixed(2), align: 'right' },
          { header: 'Bonus (GHS)', accessor: (r) => r.bonusAmount.toFixed(2), align: 'right' },
          { header: 'Total (GHS)', accessor: (r) => r.total.toFixed(2), align: 'right' },
          { header: 'Reference', accessor: (r) => r.reference || '' },
        ],
        data: data.rows,
      }
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
          <Gift className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Completion commissions</h1>
          <p className="text-sm text-gray-500">
            Commission held back at sale plus the completion bonus, owed once the customer completes.{' '}
            <Link href="/admin/settings/commission" className="text-blue-600 hover:underline">Amounts</Link>
          </p>
        </div>
      </div>

      {data && data.needsReview > 0 && (
        <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {data.needsReview} paid commission{data.needsReview === 1 ? ' is' : 's are'} on a contract that is no longer completed (a payment was
          reversed). Check them under Paid.
        </p>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setStatus(t.value)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${status === t.value ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {t.label}
            {data && <span className="ml-1 opacity-80">{data.totals[t.value].count}</span>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <select className="h-10 rounded-lg border border-gray-300 bg-white px-2 text-sm" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
          <option value="">All agents</option>
          {agents.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Completed in month" />
        {exportOptions && <ExportButtons exportOptions={exportOptions as unknown as ExportOptions} showPrint={false} />}
      </div>

      {data && (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">{TABS.find((t) => t.value === status)?.label}</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.rows.reduce((s, r) => s + r.total, 0))}</p>
          <p className="text-xs text-gray-500">{data.rows.length} contract{data.rows.length === 1 ? '' : 's'}</p>
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {!data && !error && <p className="py-10 text-center text-sm text-gray-400">Loading…</p>}

      {data && data.rows.length === 0 && (
        <p className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500">Nothing here.</p>
      )}

      {data && data.rows.length > 0 && (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {data.rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">{r.agentName || 'Unknown agent'}</p>
                <p className="text-xs text-gray-500">
                  <Link href={`/admin/contracts/${r.contractId}`} className="font-medium text-blue-600 hover:underline">{r.contractNumber}</Link>
                  {' · '}
                  {r.customerName}
                  {r.completedAt && <> · completed {formatDate(r.completedAt)}</>}
                </p>
                <p className="text-xs text-gray-500">
                  {formatCurrency(r.deferredAmount)} held + {formatCurrency(r.bonusAmount)} bonus
                  {r.status === 'PAID' && r.reference && <> · paid {r.paidAt ? formatDate(r.paidAt) : ''}, ref {r.reference}</>}
                </p>
                {r.needsReview && <p className="text-xs font-semibold text-red-700">Contract is no longer completed ({r.contractStatus})</p>}
              </div>
              <div className="flex items-center gap-3 sm:justify-end">
                <p className="text-base font-bold text-gray-900">{formatCurrency(r.total)}</p>
                {r.status === 'PAYABLE' && (
                  <Button size="sm" className={PRIMARY} onClick={() => { setPayFor(r); setReference(''); }}>Mark paid</Button>
                )}
                {r.status === 'PAID' && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => pay(false, r)}>Undo</Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {payFor && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPayFor(null)} />
          <div className="relative z-10 w-full max-w-md space-y-3 rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
            <h2 className="text-base font-semibold text-gray-900">Pay {payFor.agentName}</h2>
            <p className="text-sm text-gray-600">
              {formatCurrency(payFor.total)} for {payFor.contractNumber} ({payFor.customerName}).
            </p>
            <Input placeholder="MoMo or bank reference" value={reference} maxLength={100} onChange={(e) => setReference(e.target.value)} />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setPayFor(null)}>Cancel</Button>
              <Button className={`flex-1 ${PRIMARY}`} disabled={!reference.trim() || busy} onClick={() => pay(true, payFor)}>Record payment</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
