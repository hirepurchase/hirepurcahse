'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Loader2, Search, User } from 'lucide-react';
import api from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface Result {
  type: 'customer' | 'contract';
  id: string;
  title: string;
  subtitle: string;
  status?: string;
  href: string;
}

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  DEFAULTED: 'bg-red-100 text-red-800',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-900',
};

/**
 * Find a customer or contract from anywhere: name, phone, membership number,
 * contract number or IMEI. Ctrl+K (or ⌘K) opens it. Results are limited to
 * what the signed-in person may see.
 */
export default function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setResults([]);
    setActive(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    let live = true;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/search', { params: { q: term } });
        if (live) { setResults(data.results ?? []); setActive(0); }
      } catch {
        if (live) setResults([]);
      } finally {
        if (live) setLoading(false);
      }
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [q]);

  const go = (r: Result | undefined) => {
    if (!r) return;
    setOpen(false);
    router.push(r.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(results[active]); }
  };

  const term = q.trim();
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search customers and contracts"
        className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-sm text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 sm:min-w-56"
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline">Search customers, contracts…</span>
        <kbd className="ml-auto hidden rounded border border-slate-200 bg-slate-50 px-1.5 text-[10px] font-semibold text-slate-500 lg:inline">Ctrl K</kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[12%] max-w-xl translate-y-0 gap-0 p-0 sm:p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Search</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Name, phone, contract number or IMEI"
              aria-label="Search"
              aria-controls="global-search-results"
              aria-activedescendant={results[active] ? `gs-${active}` : undefined}
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
            {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-hidden="true" />}
          </div>
          <div id="global-search-results" role="listbox" aria-label="Results" className="max-h-[60vh] overflow-y-auto p-1.5">
            {term.length < 2 ? (
              <p className="px-3 py-6 text-center text-sm text-slate-500">Type at least 2 letters or numbers.</p>
            ) : !loading && results.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-slate-500">Nothing found for “{term}”.</p>
            ) : (
              results.map((r, i) => (
                <button
                  key={`${r.type}-${r.id}`}
                  id={`gs-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r)}
                  className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left', i === active ? 'bg-blue-50' : 'hover:bg-slate-50')}
                >
                  <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', r.type === 'customer' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700')}>
                    {r.type === 'customer' ? <User className="h-4 w-4" aria-hidden="true" /> : <FileText className="h-4 w-4" aria-hidden="true" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">{r.title}</span>
                    <span className="block truncate text-xs text-slate-500">{r.type === 'customer' ? 'Customer' : 'Contract'} · {r.subtitle}</span>
                  </span>
                  {r.status && <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize', STATUS_STYLE[r.status] ?? 'bg-slate-100 text-slate-700')}>{r.status.toLowerCase().replace(/_/g, ' ')}</span>}
                </button>
              ))
            )}
          </div>
          <p className="border-t px-3 py-2 text-[11px] text-slate-500">↑ ↓ to move · Enter to open · Esc to close</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
