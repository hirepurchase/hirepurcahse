'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Smartphone } from 'lucide-react';
import api from '@/lib/api';

/** Shown to agents and cluster leaders who have not set where their commission goes. */
export default function PayoutNumberPrompt() {
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    api.get('/admin-users/me/payout-account')
      .then(({ data }) => setMissing(!data.payoutAccount?.number))
      .catch(() => setMissing(false));
  }, []);

  if (!missing) return null;
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <Smartphone className="h-5 w-5 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1">Add your MoMo number so your commission can be paid to you.</p>
      <Link href="/admin/account/payout" className="inline-flex min-h-10 items-center rounded-lg bg-amber-600 px-3 font-semibold text-white hover:bg-amber-700">
        Add number
      </Link>
    </div>
  );
}
