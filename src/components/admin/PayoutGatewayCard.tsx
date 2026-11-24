'use client';

import { useEffect, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';

interface PayoutSettings {
  gateway: 'PAYSTACK' | 'HUBTEL';
  gatewayBlock: string | null;
  paystack: { configured: boolean };
  hubtel: { ready: boolean; reason: string | null };
}

/** Which gateway pays commission into agents' and cluster leaders' wallets. Saved on its own. */
export default function PayoutGatewayCard() {
  const { toast } = useToast();
  const [data, setData] = useState<PayoutSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/commission-payouts/settings').then(({ data }) => setData(data)).catch(() => setData(null));
  }, []);

  const choose = async (gateway: 'PAYSTACK' | 'HUBTEL') => {
    if (!data || gateway === data.gateway) return;
    setSaving(true);
    try {
      const { data: next } = await api.put('/commission-payouts/settings', { gateway });
      setData(next);
      toast({ title: `Commission payouts now go through ${gateway === 'PAYSTACK' ? 'Paystack' : 'Hubtel'}` });
    } catch (err: any) {
      toast({ title: 'Not changed', description: err?.response?.data?.error || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!data) return null;
  const options = [
    { key: 'PAYSTACK' as const, label: 'Paystack', note: data.paystack.configured ? 'Pays from your Paystack balance. Switch off "confirm transfers with OTP" in the Paystack dashboard.' : 'No Paystack key on the server.', ok: data.paystack.configured },
    { key: 'HUBTEL' as const, label: 'Hubtel', note: data.hubtel.ready ? 'Pays from the Hubtel prepaid (Send Money) account.' : data.hubtel.reason ?? 'Not ready.', ok: data.hubtel.ready },
  ];
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900"><Send className="h-4 w-4" aria-hidden="true" /> Commission payouts</h2>
          <p className="mt-0.5 text-sm text-slate-600">Sends approved agent completion commission and cluster leader pay to each person&apos;s MoMo wallet.</p>
        </div>
        <div role="radiogroup" aria-label="Payout gateway" className="grid gap-2 sm:grid-cols-2">
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={data.gateway === o.key}
              disabled={saving || (!o.ok && data.gateway !== o.key)}
              onClick={() => void choose(o.key)}
              className={`rounded-lg border p-3 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${data.gateway === o.key ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}
            >
              <span className="font-semibold text-slate-900">{o.label}{data.gateway === o.key && ' · in use'}</span>
              <span className="mt-0.5 block text-xs text-slate-600">{o.note}</span>
            </button>
          ))}
        </div>
        {saving && <p className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</p>}
      </CardContent>
    </Card>
  );
}
