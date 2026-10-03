'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/useToast';
import { Section, errorText } from '../shared';

interface Product {
  id: string;
  name: string;
  marked: boolean;
  brand: string | null;
  suggested: boolean;
}

export default function PayTriggerProducts() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = (list: Product[]) => {
    setProducts(list);
    setMarked(new Set(list.filter((p) => p.marked).map((p) => p.id)));
  };

  useEffect(() => {
    api
      .get('/paytrigger/products')
      .then(({ data }) => apply(data.products))
      .catch((err) => setError(errorText(err, 'Could not load products')));
  }, []);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (products || [])
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .sort((a, b) => Number(marked.has(b.id) || b.suggested) - Number(marked.has(a.id) || a.suggested) || a.name.localeCompare(b.name));
  }, [products, search, marked]);

  const changed = products ? products.some((p) => p.marked !== marked.has(p.id)) : false;

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await api.put('/paytrigger/products', { productIds: [...marked] });
      apply(data.products);
      toast({ title: 'Saved' });
    } catch (err) {
      toast({ title: 'Not saved', description: errorText(err, 'Request failed'), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  if (error) return <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
        Marked products are managed by PayTrigger, and <span className="font-semibold text-gray-800">Knox Guard will not try to enrol them</span>. Names
        that look like TECNO, Infinix or itel are suggested, but nothing is marked until you confirm it here.
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input className="pl-9" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Section title={`Products (${marked.size} marked)`}>
        {!products ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {shown.map((p) => (
              <li key={p.id}>
                <label className="flex cursor-pointer items-center gap-3 py-2.5">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={marked.has(p.id)}
                    onChange={() =>
                      setMarked((prev) => {
                        const next = new Set(prev);
                        if (next.has(p.id)) next.delete(p.id);
                        else next.add(p.id);
                        return next;
                      })
                    }
                  />
                  <span className="flex-1 text-sm text-gray-900">{p.name}</span>
                  {p.suggested && !marked.has(p.id) && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Looks like Transsion</span>}
                </label>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {changed && (
        <div className="sticky bottom-20 z-10 lg:bottom-3">
          <Button className="bg-indigo-600 text-white hover:bg-indigo-700 w-full shadow-lg" onClick={save} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      )}
    </div>
  );
}
