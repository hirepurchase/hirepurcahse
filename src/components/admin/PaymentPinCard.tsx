'use client';

import { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import api from '@/lib/api';

/**
 * The agent's own payment PIN, for paying in deposits on the short code from
 * any phone. Only agents get one; for anyone else the endpoint refuses and the
 * card shows nothing.
 */
export function PaymentPinCard() {
  const [pin, setPin] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api
      .get('/agent-deposits/my-pin')
      .then((res) => live && setPin(res.data?.pin ?? null))
      .catch(() => live && setPin(null));
    return () => {
      live = false;
    };
  }, []);

  if (!pin) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <KeyRound className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">Your payment PIN</p>
          <p className="mt-1 font-mono text-3xl font-bold tracking-[0.3em] text-gray-900 sm:text-4xl" aria-label={`Payment PIN ${pin.split('').join(' ')}`}>
            {pin}
          </p>
          <p className="mt-2 text-sm text-gray-600">
            To pay in your deposits, dial the short code, choose <strong>3. Agent deposits</strong> and enter this PIN.
            Keep it to yourself.
          </p>
        </div>
      </div>
    </div>
  );
}
