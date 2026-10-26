'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CreditCard } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { summariseDue, DueInstallment } from '@/lib/paymentDue';

interface PayableContract {
  id: string;
  status: string;
  outstandingBalance: number;
  penaltyOutstanding?: number;
  totalDue?: number;
  installments?: DueInstallment[];
}

/**
 * "Pay" stays on screen on every customer page, so paying never means
 * scrolling to the bottom of a long schedule. It goes straight to the
 * payment screen when there is one contract to pay (or the contract being
 * viewed), and to the list when there are several.
 */
export default function FloatingPayButton() {
  const pathname = usePathname() || '';
  const router = useRouter();
  const [contracts, setContracts] = useState<PayableContract[]>([]);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/customers/me/contracts')
      .then((res) => {
        if (cancelled) return;
        const list: PayableContract[] = res.data.contracts || res.data || [];
        setContracts(list.filter((c) => c.status === 'ACTIVE' && summariseDue(c).totalDue > 0));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // Refreshed on navigation, so it disappears once everything is paid.
  }, [pathname]);

  // The payment screen has its own pay bar.
  if (pathname.startsWith('/customer/payments/') || contracts.length === 0) return null;

  const viewing = pathname.match(/^\/customer\/contracts\/([^/]+)/)?.[1];
  const target = contracts.find((c) => c.id === viewing) || (contracts.length === 1 ? contracts[0] : null);
  const dueNow = target ? summariseDue(target).dueNow : contracts.reduce((s, c) => s + summariseDue(c).dueNow, 0);

  return (
    <button
      type="button"
      onClick={() => router.push(target ? `/customer/payments/${target.id}` : '/customer/payments')}
      className="fixed right-4 z-30 flex items-center gap-2 rounded-full bg-teal-600 px-5 py-3.5 text-white shadow-lg shadow-teal-900/20 transition hover:bg-teal-700 active:scale-95 lg:right-8 lg:bottom-8 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))]"
      aria-label="Make payment"
    >
      <CreditCard className="h-5 w-5" />
      <span className="text-sm font-semibold">
        Pay{dueNow > 0 ? ` ${formatCurrency(dueNow)}` : ' now'}
      </span>
      {dueNow > 0 && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" />}
    </button>
  );
}
