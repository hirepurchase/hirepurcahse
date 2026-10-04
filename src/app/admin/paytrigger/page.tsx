'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Clock, KeyRound, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils';
import { Section, errorText } from './shared';

interface Health {
  config: { configured: boolean; dryRun: boolean; liveActionsEnabled: boolean; canaryContracts: number };
  registry: { loaded: boolean; contracts: number };
  devices: Record<string, number>;
  lastSweepAt: string | null;
  lastSweepSummary: { reconciled?: number; sent?: number; released?: number; errors?: number; breakerTripped?: boolean } | null;
  sweepLate: boolean;
  eventsToday: number;
  paidStillLocked: number;
  openIssues: number;
}

export default function PayTriggerOverview() {
  const [health, setHealth] = useState<Health | null>(null);
  const [licence, setLicence] = useState<{ totalAmountOfLicense?: number; amountUsedOfLicense?: number; remainingAmountOfLicense?: number; dryRun?: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/paytrigger/health');
      setHealth(data);
      api.get('/paytrigger/licence').then(({ data }) => setLicence(data)).catch(() => setLicence(null));
    } catch (err) {
      setError(errorText(err, 'Could not load PayTrigger status'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (error) return <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>;
  if (!health) return <p className="py-10 text-center text-sm text-gray-400">{loading ? 'Loading…' : 'No data'}</p>;

  const d = health.devices;
  return (
    <div className="space-y-4">
      {health.config.dryRun && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="font-semibold">Dry run.</span>{' '}
          {health.config.configured
            ? 'Nothing is sent to phones — actions are simulated and recorded.'
            : 'No PayTrigger API key is configured. Everything is simulated.'}
        </div>
      )}
      {!health.config.dryRun && health.config.canaryContracts > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <span className="font-semibold">Canary.</span> Live actions only for {health.config.canaryContracts} listed contract(s).
        </div>
      )}

      {health.paidStillLocked > 0 && (
        <Link href="/admin/paytrigger/issues" className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800 hover:bg-red-100">
          <KeyRound className="h-5 w-5 shrink-0" />
          <span className="text-sm">
            <span className="font-semibold">{health.paidStillLocked} customer(s) paid but their phone is still locked</span> — the phone has no data.
            Issue a PIN.
          </span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active phones" value={d.ACTIVE || 0} />
        <Stat label="Waiting to activate" value={d.QUEUED || 0} />
        <Stat label="Released" value={d.REMOVED || 0} />
        <Stat label="Open issues" value={health.openIssues} tone={health.openIssues ? 'amber' : undefined} href="/admin/paytrigger/issues" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section
          title="Morning sweep"
          subtitle="Runs once a day at 08:36, after Knox. Catches anything an event missed."
          right={<Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-3.5 w-3.5" /></Button>}
        >
          {health.lastSweepAt ? (
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2">
                {health.sweepLate ? <AlertTriangle className="h-4 w-4 text-amber-600" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                Last run {formatDateTime(health.lastSweepAt)}
                {health.sweepLate && <span className="font-semibold text-amber-700">— missed a morning</span>}
              </p>
              {health.lastSweepSummary && (
                <p className="text-gray-600">
                  {health.lastSweepSummary.reconciled ?? 0} checked · {health.lastSweepSummary.sent ?? 0} updated ·{' '}
                  {health.lastSweepSummary.released ?? 0} released · {health.lastSweepSummary.errors ?? 0} errors
                  {health.lastSweepSummary.breakerTripped && <span className="ml-1 font-semibold text-red-700">· breaker tripped</span>}
                </p>
              )}
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-gray-500"><Clock className="h-4 w-4" /> Has not run yet.</p>
          )}
          <p className="mt-3 text-xs text-gray-500">{health.eventsToday} PayTrigger actions recorded today.</p>
        </Section>

        <Section title="Licences" subtitle="One is used when a phone activates. Cancelling before activation gives it back.">
          {licence && licence.totalAmountOfLicense !== undefined ? (
            <div className="grid grid-cols-3 gap-3 text-center">
              <Mini label="Bought" value={licence.totalAmountOfLicense} />
              <Mini label="Used" value={licence.amountUsedOfLicense ?? 0} />
              <Mini label="Left" value={licence.remainingAmountOfLicense ?? 0} strong />
            </div>
          ) : (
            <p className="text-sm text-gray-500">{licence?.dryRun ? 'Not available in dry run.' : 'Could not read licence balance.'}</p>
          )}
        </Section>
      </div>
    </div>
  );
}

function Stat({ label, value, tone, href }: { label: string; value: number; tone?: 'amber'; href?: string }) {
  const body = (
    <div className={`rounded-xl border bg-white px-4 py-3 ${tone === 'amber' && value ? 'border-amber-200' : 'border-gray-200'}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone === 'amber' && value ? 'text-amber-700' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function Mini({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="rounded-lg bg-gray-50 py-2">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className={`text-lg font-bold ${strong ? 'text-indigo-700' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}
