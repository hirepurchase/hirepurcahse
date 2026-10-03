'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Section, errorText } from '../shared';

interface Candidate {
  inventoryItemId: string;
  imei: string;
  product: string;
  status: string;
  assignedTo: string | null;
  validImei: boolean;
}

interface Result {
  inventoryItemId: string;
  imei: string;
  ok: boolean;
  message: string;
}

export default function PayTriggerEnrol() {
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Result[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    api
      .get('/paytrigger/enrolment/candidates')
      .then(({ data }) => {
        setCandidates(data.candidates);
        setSelected(new Set());
      })
      .catch((err) => setError(errorText(err, 'Could not load stock')));

  useEffect(() => {
    load();
  }, []);

  const valid = useMemo(() => (candidates || []).filter((c) => c.validImei), [candidates]);
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const enrol = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post('/paytrigger/enrolment', { inventoryItemIds: [...selected] });
      setResults(data.results);
      load();
    } catch (err) {
      setError(errorText(err, 'Enrolment failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
        Enrol phones when they arrive in stock. They lock themselves the first time they are switched on with data, and stay locked until
        the sale is approved and the agent has remitted the deposit. <span className="font-semibold">No licence is used until a phone activates.</span>
      </div>

      {results && (
        <Section title="Result" right={<button onClick={() => setResults(null)} className="text-xs text-gray-500">Dismiss</button>}>
          <ul className="space-y-1.5">
            {results.map((r) => (
              <li key={r.inventoryItemId} className="flex items-start gap-2 text-sm">
                {r.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />}
                <span>
                  <span className="font-mono text-xs">{r.imei}</span> — {r.message}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <Section
        title={`Transsion stock not enrolled (${candidates?.length ?? '…'})`}
        subtitle="Only products marked as Transsion appear here."
        right={
          valid.length > 0 && (
            <button
              className="text-xs font-medium text-indigo-700"
              onClick={() => setSelected(selected.size === valid.length ? new Set() : new Set(valid.map((c) => c.inventoryItemId)))}
            >
              {selected.size === valid.length ? 'Clear' : 'Select all'}
            </button>
          )
        }
      >
        {!candidates ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : candidates.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nothing to enrol. If phones are missing, check the product is marked on{' '}
            <Link href="/admin/paytrigger/products" className="font-medium text-indigo-700">Products</Link>.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {candidates.map((c) => (
              <li key={c.inventoryItemId}>
                <label className={`flex items-center gap-3 py-2.5 ${c.validImei ? 'cursor-pointer' : 'opacity-60'}`}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    disabled={!c.validImei}
                    checked={selected.has(c.inventoryItemId)}
                    onChange={() => toggle(c.inventoryItemId)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-gray-900">{c.product}</span>
                    <span className="block text-xs text-gray-500">
                      <span className="font-mono">{c.imei}</span>
                      {c.assignedTo && <> · with {c.assignedTo}</>}
                      {!c.validImei && <span className="ml-1 text-red-600">· not a valid IMEI</span>}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {selected.size > 0 && (
        <div className="sticky bottom-20 z-10 lg:bottom-3">
          <Button className="bg-indigo-600 text-white hover:bg-indigo-700 w-full shadow-lg" onClick={enrol} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enrol {selected.size} phone{selected.size === 1 ? '' : 's'}
          </Button>
        </div>
      )}
    </div>
  );
}
