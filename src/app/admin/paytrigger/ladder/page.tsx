'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/useToast';
import { Section, errorText } from '../shared';

interface Stage {
  enabled: boolean;
  afterDays: number;
  title?: string;
  text?: string;
}

type StageKey = 'watermark' | 'autoPopup' | 'callsOut' | 'callsIn' | 'sms' | 'apps' | 'screen';
type Ladder = { ruleNum: number; description?: string } & Record<StageKey, Stage>;

const STAGES: Array<{ key: StageKey; label: string; help: string; title?: boolean; text?: boolean }> = [
  { key: 'autoPopup', label: 'Reminder pop-up', help: 'The phone shows this itself, even with no data.', title: true, text: true },
  { key: 'watermark', label: 'Watermark', help: 'Text over the screen. The phone still works.', text: true },
  { key: 'apps', label: 'Block apps', help: 'All apps except the whitelist (Mobile Money, our app) stop working.' },
  { key: 'screen', label: 'Full lock screen', help: 'The phone is locked. Calls to whitelisted numbers and payment still work.', title: true, text: true },
  { key: 'sms', label: 'Block SMS', help: '' },
  { key: 'callsOut', label: 'Block outgoing calls', help: 'Whitelisted numbers can still be called.' },
  { key: 'callsIn', label: 'Block incoming calls', help: '' },
];

export default function PayTriggerLadder() {
  const { toast } = useToast();
  const [ladder, setLadder] = useState<Ladder | null>(null);
  const [saved, setSaved] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/paytrigger/ladder')
      .then(({ data }) => {
        setLadder(data.ladder);
        setSaved(data.saved);
      })
      .catch((err) => setError(errorText(err, 'Could not load the ladder')));
  }, []);

  const update = (key: StageKey, patch: Partial<Stage>) => setLadder((l) => (l ? { ...l, [key]: { ...l[key], ...patch } } : l));

  const save = async () => {
    if (!ladder) return;
    setBusy(true);
    try {
      const { data } = await api.put('/paytrigger/ladder', ladder);
      setSaved(true);
      toast({ title: data.dryRun ? 'Saved (dry run — not sent to PayTrigger)' : 'Ladder sent to PayTrigger' });
    } catch (err) {
      toast({ title: 'Not saved', description: errorText(err, 'PayTrigger refused the ladder'), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  if (error) return <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>;
  if (!ladder) return <p className="py-10 text-center text-sm text-gray-400">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
        What a phone does once its lock date passes, step by step. <span className="font-semibold text-gray-800">Days are counted from the lock date</span>,
        which is already {`grace + 1 day`} after the instalment fell due. Changes reach every phone the next time it connects.
        {!saved && <span className="ml-1 font-semibold text-amber-700">Not yet sent — showing the suggested starting ladder.</span>}
      </div>

      {STAGES.map((s) => {
        const stage = ladder[s.key];
        return (
          <Section
            key={s.key}
            title={s.label}
            subtitle={s.help || undefined}
            right={
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" checked={stage.enabled} onChange={(e) => update(s.key, { enabled: e.target.checked })} />
                On
              </label>
            }
          >
            <div className={`space-y-3 ${stage.enabled ? '' : 'opacity-50'}`}>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                Starts
                <Input
                  type="number"
                  min={0}
                  max={90}
                  className="w-20"
                  value={stage.afterDays}
                  onChange={(e) => update(s.key, { afterDays: Math.max(0, Math.min(90, parseInt(e.target.value || '0', 10))) })}
                />
                day(s) after the lock date
              </label>
              {s.title && (
                <Input placeholder="Title" maxLength={80} value={stage.title || ''} onChange={(e) => update(s.key, { title: e.target.value })} />
              )}
              {s.text && (
                <Textarea placeholder="Message" maxLength={400} rows={2} value={stage.text || ''} onChange={(e) => update(s.key, { text: e.target.value })} />
              )}
            </div>
          </Section>
        );
      })}

      <div className="sticky bottom-20 z-10 lg:bottom-3">
        <Button className="bg-indigo-600 text-white hover:bg-indigo-700 w-full shadow-lg" onClick={save} disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save and send to PayTrigger
        </Button>
      </div>
    </div>
  );
}
