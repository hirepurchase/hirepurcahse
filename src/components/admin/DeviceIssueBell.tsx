'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import Link from 'next/link';
import { useDeviceIssues } from '@/hooks/useDeviceIssues';

export default function DeviceIssueBell({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const { urgentCount, counts } = useDeviceIssues();
  const [open, setOpen] = useState(false);

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
        disabled={urgentCount === 0}
        className={`relative flex items-center justify-center rounded-lg p-2 transition-colors ${btnCls} ${urgentCount === 0 ? 'opacity-40 cursor-default' : ''}`}
        aria-label="Device lock issues"
      >
        <ShieldAlert className="h-5 w-5" />
        {urgentCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
            {urgentCount > 99 ? '99+' : urgentCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed top-0 right-0 z-50 h-screen w-96 bg-slate-900 text-white shadow-2xl border-l border-white/10 flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 shrink-0">
              <div>
                <p className="text-base font-semibold">Device Lock Issues</p>
                <p className="text-xs text-cyan-100/60 mt-0.5">Contracts needing verification</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-cyan-100/60 hover:bg-white/10 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-white/10 bg-white/5 px-5 py-4 shrink-0">
              <p className="text-xs text-cyan-100/60 uppercase tracking-wide">Urgent</p>
              <p className="text-3xl font-bold text-red-400 mt-1">{urgentCount}</p>
            </div>

            <div className="px-5 py-4 space-y-3 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between text-sm">
                <span className="text-cyan-100/70">Should be locked, isn&apos;t</span>
                <span className="font-semibold text-red-400">{counts?.categoryA ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-cyan-100/70">Should be unlocked, still locked</span>
                <span className="font-semibold text-amber-400">{counts?.categoryB ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-cyan-100/70">State unknown (lower urgency)</span>
                <span className="font-semibold text-cyan-100/50">{counts?.categoryC ?? 0}</span>
              </div>
            </div>

            <div className="border-t border-white/10 px-5 py-4 shrink-0">
              <Link
                href="/admin/device-issues"
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-center rounded-lg bg-red-500/20 px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/30 transition-colors"
              >
                Open Device Issues Page
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
