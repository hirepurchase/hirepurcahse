'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { KeyRound, Phone, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { PinDialog, Section, errorText } from '../shared';

interface IssueRow {
  deviceId: string;
  imei: string;
  contractId: string | null;
  contractNumber: string | null;
  customer: string | null;
  customerPhone: string | null;
  agent: string | null;
  agentPhone: string | null;
  lastPayment: { amount: number; createdAt: string } | null;
  needsKeyCode: boolean;
  lastError: string | null;
  lastConnectAt: string | null;
  waitingMinutes?: number;
  amount?: number | null;
  days?: number | null;
}

interface Issues {
  paidStillLocked: IssueRow[];
  heldForDeposit: IssueRow[];
  ledgerMissing: Array<{ contractId: string; contractNumber: string; approvedAt: string }>;
  unconfirmedLocks: IssueRow[];
  unenforceable: IssueRow[];
  failing: IssueRow[];
  stale: IssueRow[];
  soldNotEnrolled?: Array<{ inventoryItemId: string; imei: string; contractId: string | null; contractNumber: string | null; contractStatus: string | null; customer: string | null; customerPhone: string | null; enrolment: string | null }>;
  callbackErrors?: Array<{ id: string; imei: string; notifyType: string; error: string | null; createdAt: string }>;
  sweep: { lastSweepAt: string | null; late: boolean };
}

const waited = (m?: number) => (m === undefined ? '' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`);

export default function PayTriggerIssues() {
  const role = (useAuthStore((s) => s.user) as { role?: string } | null)?.role;
  const canPin = role === 'ADMIN' || role === 'SUPER_ADMIN';
  const [issues, setIssues] = useState<Issues | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pinFor, setPinFor] = useState<IssueRow | null>(null);

  const load = () =>
    api
      .get('/paytrigger/issues')
      .then(({ data }) => {
        setIssues(data);
        setError(null);
      })
      .catch((err) => setError(errorText(err, 'Could not load issues')));

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  if (error) return <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>;
  if (!issues) return <p className="py-10 text-center text-sm text-gray-400">Loading…</p>;

  return (
    <div className="space-y-4">
      {issues.sweep.late && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The 08:36 morning sweep has not run in over a day
          {issues.sweep.lastSweepAt ? ` (last ${formatDateTime(issues.sweep.lastSweepAt)})` : ''}. Overdue phones still lock themselves,
          but missed payments may not have reached their phones.
        </p>
      )}

      <Section
        title={`Paid — still locked (${issues.paidStillLocked.length})`}
        subtitle="The customer paid, the phone has no data, so it could not hear about it. Read them a PIN."
        right={<Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-3.5 w-3.5" /></Button>}
      >
        {issues.paidStillLocked.length === 0 ? (
          <Empty />
        ) : (
          <ul className="divide-y divide-gray-100">
            {issues.paidStillLocked.map((r) => (
              <li key={r.deviceId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{r.customer || r.imei}</p>
                  <p className="text-xs text-gray-500">
                    <ContractLink row={r} /> · waiting {waited(r.waitingMinutes)}
                    {r.lastPayment && <> · paid {formatCurrency(r.lastPayment.amount)}</>}
                  </p>
                  {r.customerPhone && <PhoneLink number={r.customerPhone} />}
                </div>
                {canPin ? (
                  <Button size="sm" onClick={() => setPinFor(r)} className="shrink-0 bg-indigo-600 text-white hover:bg-indigo-700">
                    <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Issue PIN
                  </Button>
                ) : (
                  <span className="text-xs text-gray-500">An Admin must issue the PIN.</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Held for agent deposit (${issues.heldForDeposit.length})`} subtitle="Phone stays locked until the agent remits the deposit — same rule as Samsung.">
        {issues.heldForDeposit.length === 0 ? (
          <Empty />
        ) : (
          <ul className="divide-y divide-gray-100">
            {issues.heldForDeposit.map((r) => (
              <li key={r.deviceId} className="py-3">
                <p className="text-sm font-semibold text-gray-900">{r.agent || 'Unknown agent'}</p>
                <p className="text-xs text-gray-500">
                  <ContractLink row={r} /> · {r.customer}
                  {r.amount != null && <> · owes {formatCurrency(r.amount)}</>}
                  {r.days != null && <> · {r.days} day(s)</>}
                </p>
                {r.agentPhone && <PhoneLink number={r.agentPhone} />}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {issues.ledgerMissing.length > 0 && (
        <Section title={`Approved, no deposit ledger (${issues.ledgerMissing.length})`} subtitle="The ledger entry should appear within a minute of approval. Until it does the phone is held locked.">
          <ul className="divide-y divide-gray-100">
            {issues.ledgerMissing.map((c) => (
              <li key={c.contractId} className="py-2 text-sm">
                <Link href={`/admin/contracts/${c.contractId}`} className="font-medium text-blue-600 hover:underline">{c.contractNumber}</Link>
                <span className="ml-2 text-xs text-gray-500">approved {formatDateTime(c.approvedAt)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(issues.soldNotEnrolled?.length ?? 0) > 0 && (
        <Section
          title={`Sold but not enrolled (${issues.soldNotEnrolled!.length})`}
          subtitle="These phones are on a contract but PayTrigger does not hold them, so nothing can lock them. Enrol each one from Inventory; it only takes effect when the phone is next set up or reset."
        >
          <ul className="divide-y divide-gray-100">
            {issues.soldNotEnrolled!.map((r) => (
              <li key={r.inventoryItemId} className="py-2.5">
                <p className="text-sm font-semibold text-gray-900">{r.customer || r.imei}</p>
                <p className="text-xs text-gray-500">
                  {r.contractId ? (
                    <Link href={`/admin/contracts/${r.contractId}`} className="font-medium text-blue-600 hover:underline">{r.contractNumber}</Link>
                  ) : (
                    'No contract'
                  )}{' '}
                  · IMEI {r.imei} · {r.enrolment === 'FAILED' ? 'enrolment failed' : r.enrolment === 'CANCELLED' ? 'enrolment cancelled' : 'never enrolled'}
                </p>
                {r.customerPhone && <PhoneLink number={r.customerPhone} />}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(issues.callbackErrors?.length ?? 0) > 0 && (
        <Section
          title={`Messages from PayTrigger we could not use (${issues.callbackErrors!.length})`}
          subtitle="Usually a phone active on our PayTrigger account that is not in our inventory. Last 14 days."
        >
          <ul className="divide-y divide-gray-100">
            {issues.callbackErrors!.map((e) => (
              <li key={e.id} className="py-2 text-sm">
                <span className="font-medium text-gray-900">IMEI {e.imei || 'unknown'}</span>
                <span className="ml-2 text-xs text-gray-500">{formatDateTime(e.createdAt)}</span>
                {e.error && <p className="text-xs text-red-700">{e.error}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <DeviceList title="Lock not confirmed" subtitle="Past its lock date for over a day, but the phone has not reported locked." rows={issues.unconfirmedLocks} />
      <DeviceList title="Errors from PayTrigger" subtitle="The last request for these phones failed." rows={issues.failing} showError />
      <DeviceList title="Cannot enforce" subtitle="PayTrigger cannot control these phones." rows={issues.unenforceable} />
      <DeviceList title="Not seen for 14+ days" subtitle="The phone has not connected to PayTrigger in two weeks." rows={issues.stale} showSeen />

      {pinFor && (
        <PinDialog
          deviceId={pinFor.deviceId}
          needsKeyCode={pinFor.needsKeyCode}
          customer={pinFor.customer}
          onClose={() => {
            setPinFor(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function DeviceList({ title, subtitle, rows, showError, showSeen }: { title: string; subtitle: string; rows: IssueRow[]; showError?: boolean; showSeen?: boolean }) {
  if (rows.length === 0) return null;
  return (
    <Section title={`${title} (${rows.length})`} subtitle={subtitle}>
      <ul className="divide-y divide-gray-100">
        {rows.map((r) => (
          <li key={r.deviceId} className="py-2.5">
            <Link href={`/admin/paytrigger/devices/${r.deviceId}`} className="text-sm font-medium text-blue-600 hover:underline">
              {r.customer || r.imei}
            </Link>
            <p className="text-xs text-gray-500">
              {r.contractNumber || 'No contract'} · IMEI {r.imei}
              {showSeen && r.lastConnectAt && <> · last seen {formatDateTime(r.lastConnectAt)}</>}
            </p>
            {showError && r.lastError && <p className="mt-0.5 text-xs text-red-700">{r.lastError}</p>}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function ContractLink({ row }: { row: IssueRow }) {
  return row.contractId ? (
    <Link href={`/admin/paytrigger/devices/${row.deviceId}`} className="font-medium text-blue-600 hover:underline">
      {row.contractNumber}
    </Link>
  ) : (
    <span>{row.imei}</span>
  );
}

function PhoneLink({ number }: { number: string }) {
  return (
    <a href={`tel:${number}`} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-indigo-700">
      <Phone className="h-3 w-3" /> {number}
    </a>
  );
}

function Empty() {
  return <p className="py-3 text-center text-sm text-gray-400">None right now.</p>;
}
