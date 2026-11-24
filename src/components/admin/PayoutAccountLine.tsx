'use client';

import { AlertTriangle, Smartphone } from 'lucide-react';

export interface PayoutAccountInfo {
  number: string;
  network: string | null;
  registeredName: string | null;
  check: string | null;
}

const NET: Record<string, string> = { MTN: 'MTN', TELECEL: 'Telecel', AIRTELTIGO: 'AirtelTigo' };

/** Where to send someone's commission, with a warning when the wallet is in another name or missing. */
export default function PayoutAccountLine({ payout }: { payout: PayoutAccountInfo | null | undefined }) {
  if (!payout) {
    return (
      <p className="flex items-center gap-1.5 text-xs font-medium text-amber-800">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> No payout number yet — ask them to add it in their portal
      </p>
    );
  }
  const warn = payout.check === 'MISMATCH' || payout.check === 'NOT_REGISTERED';
  return (
    <p className={`flex flex-wrap items-center gap-1.5 text-xs ${warn ? 'text-amber-800' : 'text-slate-600'}`}>
      <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="font-semibold tabular-nums text-slate-900">{payout.number}</span>
      <span>{NET[payout.network || ''] ?? payout.network}</span>
      {payout.registeredName && <span>· registered to {payout.registeredName}</span>}
      {payout.check === 'MISMATCH' && <span className="font-semibold">· different name from the account</span>}
      {payout.check === 'NOT_REGISTERED' && <span className="font-semibold">· not registered on the network</span>}
    </p>
  );
}
