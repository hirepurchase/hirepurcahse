'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, LockOpen, Lock, Banknote } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import api from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';

interface UnlockOption {
  percent: number;
  hours: number;
  /** Towards the overdue instalments. */
  amount: number;
  /** The tier's charge as a percentage of the arrears, added to `percent`. */
  feePercent: number;
  /** The tier's charge in GHS, kept by the company. */
  fee: number;
  /** What the customer pays. */
  total: number;
}

interface TemporaryUnlockOffer {
  available: boolean;
  message: string;
  overdue: number;
  options: UnlockOption[];
  activeUntil: string | null;
  usesLeft: number;
}

function period(hours: number): string {
  if (hours % 24 === 0) return hours === 24 ? '1 day' : `${hours / 24} days`;
  return hours === 1 ? '1 hour' : `${hours} hours`;
}

/**
 * Paid temporary unlock, for office staff: what the customer can pay to open a
 * locked phone for a while, and taking that payment in cash. Shows nothing
 * when there is nothing to offer (feature off, phone not locked, no device).
 */
export function TemporaryUnlockCard({ contractId, onPaid }: { contractId: string; onPaid?: () => void }) {
  const { toast } = useToast();
  const [offer, setOffer] = useState<TemporaryUnlockOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<UnlockOption | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/contracts/${contractId}/temporary-unlock-offer`);
      setOffer(res.data.offer ?? null);
    } catch {
      setOffer(null);
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    void load();
  }, [load]);

  const takeCash = async () => {
    if (!confirm) return;
    setSaving(true);
    try {
      const res = await api.post(`/contracts/${contractId}/temporary-unlock-offer`, {
        percent: confirm.percent,
        expectedAmount: confirm.total,
      });
      toast({
        title: 'Cash recorded',
        description: res.data.expiresAt
          ? `The phone is opening now and stays open until ${formatDateTime(res.data.expiresAt)}.`
          : res.data.message,
      });
      setConfirm(null);
      setOffer(res.data.offer ?? null);
      onPaid?.();
    } catch (error: any) {
      toast({ title: 'Not recorded', description: error?.response?.data?.error || 'Please try again.', variant: 'destructive' });
      setConfirm(null);
      void load();
    } finally {
      setSaving(false);
    }
  };

  if (loading || !offer) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            {offer.activeUntil ? <LockOpen className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
            Temporary unlock
          </CardTitle>
          <Badge variant="outline" className={offer.activeUntil ? 'border-green-300 text-green-700' : 'border-red-300 text-red-700'}>
            {offer.activeUntil ? `Open until ${formatDateTime(offer.activeUntil)}` : 'Phone locked'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-500">Overdue (instalments only)</p>
            <p className="text-lg font-semibold">{formatCurrency(offer.overdue)}</p>
          </div>
          <div>
            <p className="text-gray-500">Unlocks left</p>
            <p className="text-lg font-semibold">{offer.usesLeft}</p>
          </div>
        </div>

        {offer.available ? (
          <>
            <p className="text-sm text-gray-600">
              The customer pays part of what is overdue and the phone opens for that long. It locks again when the time
              is up unless everything overdue has been paid. Take cash only at the office — agents cannot take it.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {offer.options.map((o) => (
                <Button key={o.percent} variant="outline" className="h-auto min-w-0 justify-between gap-3 whitespace-normal py-3" onClick={() => setConfirm(o)}>
                  <span className="flex min-w-0 flex-col items-start text-left">
                    <span className="flex items-center gap-2 font-semibold">
                      <Banknote className="h-4 w-4" />
                      {formatCurrency(o.total)}
                    </span>
                    {o.fee > 0 && <span className="text-xs text-gray-500">incl. {formatCurrency(o.fee)} charge</span>}
                  </span>
                  <span className="flex shrink-0 flex-col items-end text-sm text-gray-500">
                    <span>opens {period(o.hours)}</span>
                    <span className="text-xs">{o.feePercent > 0 ? `${o.percent}% + ${o.feePercent}% charge` : `${o.percent}%`}</span>
                  </span>
                </Button>
              ))}
            </div>
          </>
        ) : (
          <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">{offer.message}</p>
        )}
      </CardContent>

      <Dialog open={!!confirm} onOpenChange={(open) => !open && !saving && setConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Take cash for a temporary unlock</DialogTitle>
          </DialogHeader>
          {confirm && (
            <div className="space-y-4 text-sm">
              <p>
                Record <strong>{formatCurrency(confirm.total)}</strong> cash received from the customer. Their phone opens for{' '}
                <strong>{period(confirm.hours)}</strong> and locks again after that unless everything overdue is paid.
              </p>
              {confirm.fee > 0 && (
                <p className="rounded-md bg-gray-50 p-3 text-gray-700">
                  {formatCurrency(confirm.amount)} ({confirm.percent}%) goes towards the arrears and{' '}
                  {formatCurrency(confirm.fee)} ({confirm.feePercent}%) is the unlock charge, which does not reduce what the
                  customer owes.
                </p>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setConfirm(null)} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={() => void takeCash()} disabled={saving} className="bg-blue-600 text-white hover:bg-blue-700">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Cash received
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
