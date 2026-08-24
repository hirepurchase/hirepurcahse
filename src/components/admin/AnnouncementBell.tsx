'use client';

import { useEffect, useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useAnnouncements } from '@/hooks/useAnnouncements';

// Cleared on every real login (admin-login/page.tsx and useAuth.ts's
// loginAdmin), so this only suppresses re-opening on every page navigation
// within one login — not on the next login in the same tab.
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

          {/* Centered card — same convention as ChangePasswordModal in TopBar.tsx */}
          <div className="relative z-10 bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg mx-4 max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-6 py-5 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Megaphone className="h-4 w-4 text-blue-600" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">
                  Announcement{count !== 1 ? 's' : ''}
                </h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 min-h-0 px-6 pb-2 space-y-3">
              {data.map((a) => (
                <div key={a.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{a.message}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {a.createdBy.firstName} {a.createdBy.lastName} · {formatDate(a.createdAt)}
                  </p>
                </div>
              ))}
            </div>

            <div className="px-6 py-5 shrink-0">
              <button
                onClick={() => setOpen(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
