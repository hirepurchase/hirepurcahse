'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { EnrolmentBadge, PhoneStateBadge, PtDevice, errorText } from '../shared';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'QUEUED', label: 'Waiting to activate' },
  { value: 'REMOVED', label: 'Released' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function PayTriggerDevices() {
  const [devices, setDevices] = useState<PtDevice[] | null>(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      api
        .get('/paytrigger/devices', { params: { status: status || undefined, search: search || undefined } })
        .then(({ data }) => {
          setDevices(data.devices);
          setError(null);
        })
        .catch((err) => setError(errorText(err, 'Could not load devices')));
    }, 250);
    return () => clearTimeout(t);
  }, [status, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input className="pl-9" placeholder="Search IMEI" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatus(f.value)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${status === f.value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {!devices ? (
        <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
      ) : devices.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500">
          No phones yet. <Link href="/admin/paytrigger/enrol" className="font-medium text-indigo-700">Enrol Transsion stock</Link>.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {devices.map((d) => (
            <li key={d.id}>
              <Link href={`/admin/paytrigger/devices/${d.id}`} className="flex flex-col gap-1.5 px-4 py-3 hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{d.customer || 'Not sold yet'}</p>
                  <p className="text-xs text-gray-500">
                    {d.contractNumber || 'No contract'} · IMEI {d.imei}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <EnrolmentBadge status={d.enrollmentStatus} />
                  {d.enrollmentStatus === 'ACTIVE' && <PhoneStateBadge device={d} />}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
