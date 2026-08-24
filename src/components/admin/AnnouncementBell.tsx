'use client';

import { useEffect, useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useAnnouncements } from '@/hooks/useAnnouncements';

// Cleared on every successful login in useAuth.ts, so this only suppresses
// re-opening the modal on every page navigation within one login — not on
// the next login in the same tab.
const AUTO_SHOWN_KEY = 'announcements_auto_shown';

export default function AnnouncementBell({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const { data, count } = useAnnouncements();
  const [open, setOpen] = useState(false);

  // Auto-open once per login (not on every page navigation) whenever there's
  // at least one active announcement for this user's role.
  useEffect(() => {
    if (count === 0) return;

    let alreadyShown = false;
    try {
      alreadyShown = sessionStorage.getItem(AUTO_SHOWN_KEY) === 'true';
    } catch {
      // sessionStorage unavailable — fall back to showing every load
    }

    if (!alreadyShown) {
      setOpen(true);
      try {
        sessionStorage.setItem(AUTO_SHOWN_KEY, 'true');
      } catch {
        // ignore
      }
    }
  }, [count]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const btnCls = variant === 'dark'
    ? 'text-slate-400 hover:bg-white/10 hover:text-white'
    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        disabled={count === 0}
        className={`relative flex items-center justify-center rounded-lg p-2 transition-colors ${btnCls} ${count === 0 ? 'opacity-40 cursor-default' : ''}`}
        aria-label="Announcements"
      >
        <Megaphone className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white leading-none">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Panel — same slate-900 slide-in convention as NotificationBell / ContractApprovalBell */}
          <div className="fixed top-0 right-0 z-50 h-screen w-96 bg-slate-900 text-white shadow-2xl border-l border-white/10 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 shrink-0">
              <div>
                <p className="text-base font-semibold">Announcements</p>
                <p className="text-xs text-cyan-100/60 mt-0.5">Updates from admin</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-cyan-100/60 hover:bg-white/10 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Summary */}
            <div className="border-b border-white/10 bg-white/5 px-5 py-4 shrink-0">
              <p className="text-xs text-cyan-100/60 uppercase tracking-wide">Active</p>
              <p className="text-3xl font-bold text-blue-400 mt-1">{count}</p>
            </div>

            {/* Announcement list */}
            <div className="overflow-y-auto flex-1 min-h-0 px-2">
              {count === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-cyan-100/50">
                  No active announcements
                </p>
              ) : (
                <ul className="space-y-1 pb-4">
                  {data.map((a) => (
                    <li key={a.id} className="rounded-lg px-4 py-3 hover:bg-white/5 transition-colors">
                      <p className="text-sm text-white whitespace-pre-wrap">{a.message}</p>
                      <p className="text-xs text-cyan-100/50 mt-2">
                        {a.createdBy.firstName} {a.createdBy.lastName} · {formatDate(a.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 px-5 py-4 shrink-0">
              <button
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-center rounded-lg bg-blue-500/20 px-4 py-2.5 text-sm font-semibold text-blue-400 hover:bg-blue-500/30 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
