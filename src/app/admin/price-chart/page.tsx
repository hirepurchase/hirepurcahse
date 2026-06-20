'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Pricing {
  installmentMonths: number;
  basePrice: number;
  depositAmount: number;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  availableInventory: number;
  pricings: Pricing[];
  category: { id: string; name: string };
}

interface CategoryGroup {
  id: string;
  name: string;
  products: Product[];
}

export default function PriceChartPage() {
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/products', { params: { limit: 500, isActive: true } });
      const products: Product[] = res.data.products ?? [];

      const filtered = products.filter(
        (p) => p.pricings.length > 0 && p.availableInventory > 0
      );

      const map = new Map<string, CategoryGroup>();
      for (const p of filtered) {
        const catId = p.category.id;
        if (!map.has(catId)) {
          map.set(catId, { id: catId, name: p.category.name, products: [] });
        }
        map.get(catId)!.products.push(p);
      }

      const groups = [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
      groups.forEach((g) => g.products.sort((a, b) => a.name.localeCompare(b.name)));
      setCategories(groups);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function exportPDF() {
    setExporting(true);
    try {
      const { default: jsPDF } = await import('jspdf');

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210;
      const pageH = 297;
      const margin = 12;
      const contentW = pageW - margin * 2;
      let page = 1;

      // App primary blue: hsl(222 84% 35%) ≈ rgb(14, 56, 148)
      const NAVY  = [10, 22, 66] as const;   // sidebar dark
      const BLUE  = [14, 56, 148] as const;  // primary
      const LBLUE = [239, 246, 255] as const; // blue-50

      function decoratePage() {
        doc.setFillColor(...NAVY);
        doc.rect(0, 0, pageW, 38, 'F');
        doc.setFillColor(...BLUE);
        doc.rect(0, 37.5, pageW, 1.5, 'F');
        doc.setFillColor(...NAVY);
        doc.rect(0, pageH - 10, pageW, 10, 'F');
      }

      function drawHeader(isFirst: boolean) {
        decoratePage();
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('AIDOO TECH', margin, 14);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(147, 197, 253); // blue-300
        doc.text(
          isFirst ? 'HIRE PURCHASE · PRICE CHART' : 'PRICE CHART (continued)',
          margin, 22
        );

        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`Prices as at ${dateLabel}`, margin, 30);
        doc.text(`Page ${page}`, pageW - margin, 30, { align: 'right' });
      }

      function drawFooter() {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(
          `AIDOO TECH  ·  Prices valid as at ${dateLabel}  ·  Subject to change without notice`,
          pageW / 2, pageH - 3.5, { align: 'center' }
        );
      }

      drawHeader(true);
      drawFooter();

      let y = 45;
      const lineH = 8;
      const catH  = 8.5;
      const thH   = 7;

      const colX   = [margin, margin + 74, margin + 104, margin + 134, margin + 160];
      const endX   = [colX[1] - 2, colX[2] - 2, colX[3] - 2, margin + contentW - 1];

      function drawColHeaders(curY: number): number {
        doc.setFillColor(30, 41, 82);
        doc.rect(margin, curY, contentW, thH, 'F');
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.text('PRODUCT', colX[0] + 2, curY + 4.8);
        ['3 MONTHS', '4 MONTHS', '6 MONTHS', 'DEPOSIT'].forEach((h, i) => {
          doc.text(h, endX[i], curY + 4.8, { align: 'right' });
        });
        return curY + thH;
      }

      for (const group of categories) {
        if (y + catH + thH + lineH > pageH - 14) {
          drawFooter();
          doc.addPage();
          page++;
          drawHeader(false);
          drawFooter();
          y = 45;
        }

        // Category bar — primary blue
        doc.setFillColor(...BLUE);
        doc.rect(margin, y, contentW, catH, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(group.name.toUpperCase(), margin + 3, y + 5.8);
        y += catH + 1;

        y = drawColHeaders(y);

        for (let i = 0; i < group.products.length; i++) {
          if (y + lineH > pageH - 14) {
            drawFooter();
            doc.addPage();
            page++;
            drawHeader(false);
            drawFooter();
            y = 45;
            y = drawColHeaders(y);
          }

          const product = group.products[i];

          if (i % 2 === 1) {
            doc.setFillColor(...LBLUE);
            doc.rect(margin, y, contentW, lineH, 'F');
          }

          doc.setTextColor(15, 23, 42);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.text(product.name, colX[0] + 2, y + 5.2, { maxWidth: 70 });

          doc.setFont('helvetica', 'normal');
          [3, 4, 6].forEach((m, idx) => {
            const p = product.pricings.find((pr) => pr.installmentMonths === m);
            if (p) {
              doc.setTextColor(15, 23, 42);
              doc.text(`GHS ${p.basePrice.toLocaleString()}`, endX[idx], y + 5.2, { align: 'right' });
            } else {
              doc.setTextColor(200, 210, 230);
              doc.text('—', endX[idx], y + 5.2, { align: 'right' });
            }
          });

          const dep = product.pricings[0];
          if (dep) {
            doc.setTextColor(...BLUE);
            doc.setFont('helvetica', 'bold');
            doc.text(`GHS ${dep.depositAmount.toLocaleString()}`, endX[3], y + 5.2, { align: 'right' });
          }

          doc.setDrawColor(220, 228, 240);
          doc.setLineWidth(0.12);
          doc.line(margin, y + lineH, margin + contentW, y + lineH);

          y += lineH;
        }

        y += 5;
      }

      doc.save(`Aidoo-Tech-Price-Chart-${today.toISOString().slice(0, 10)}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[hsl(210,20%,97%)]">

      {/* ── Top action bar ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-2 shadow-sm">
        <div>
          <h1 className="text-[15px] font-bold text-slate-900 leading-tight">Price Chart</h1>
          <p className="text-[11px] text-slate-400 leading-none mt-0.5">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-[18px] h-[18px] ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Button
            size="sm"
            onClick={exportPDF}
            disabled={exporting || loading || categories.length === 0}
            className="h-8 px-3 text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            {exporting ? 'Exporting…' : 'Export PDF'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-32 text-slate-400 text-sm px-4">
          No products with prices and available inventory found.
        </div>
      ) : (
        <div ref={posterRef} className="pb-8">

          {/* ── Poster header ── */}
          <div className="bg-[hsl(222,47%,11%)] px-4 pt-6 pb-5">
            <p className="text-[11px] font-semibold text-blue-400 tracking-widest uppercase mb-1">
              Aidoo Tech
            </p>
            <h2 className="text-[26px] font-black text-white leading-none tracking-tight">
              Hire Purchase
            </h2>
            <h3 className="text-[26px] font-black text-blue-400 leading-tight tracking-tight">
              Price Chart
            </h3>
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
              <p className="text-slate-400 text-[11px]">Prices as at {dateLabel}</p>
              <span className="text-[10px] font-semibold text-blue-400 tracking-wider uppercase">
                All prices in GHS
              </span>
            </div>
          </div>

          {/* Blue accent rule */}
          <div className="h-1 bg-blue-600" />

          {/* Plan pills */}
          <div className="bg-white px-4 py-3 flex gap-2 overflow-x-auto border-b border-slate-100">
            {['3-Month Plan', '4-Month Plan', '6-Month Plan'].map((label) => (
              <span
                key={label}
                className="shrink-0 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-3 py-1"
              >
                {label}
              </span>
            ))}
            <span className="shrink-0 text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-3 py-1">
              Low Deposit
            </span>
          </div>

          {/* ── Categories ── */}
          <div className="px-3 pt-4 space-y-5">
            {categories.map((group) => (
              <div key={group.id} className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">

                {/* Category header */}
                <div className="bg-blue-700 px-4 py-2.5 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-300" />
                  <span className="text-[12px] font-bold text-white tracking-wider uppercase">
                    {group.name}
                  </span>
                </div>

                {/* Column headers */}
                <div className="grid grid-cols-[1fr_auto_auto_auto] bg-slate-800 px-4 py-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Product</span>
                  <span className="w-[60px] text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider">3 mo</span>
                  <span className="w-[60px] text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider">4 mo</span>
                  <span className="w-[60px] text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deposit</span>
                </div>

                {/* Rows */}
                <div className="divide-y divide-slate-50">
                  {group.products.map((product, idx) => {
                    const p3  = product.pricings.find((p) => p.installmentMonths === 3);
                    const p4  = product.pricings.find((p) => p.installmentMonths === 4);
                    const dep = product.pricings[0]?.depositAmount;

                    return (
                      <div
                        key={product.id}
                        className={`grid grid-cols-[1fr_auto_auto_auto] items-center gap-0 px-4 py-3 ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-blue-50/40'
                        }`}
                      >
                        <div className="pr-2 min-w-0">
                          <p className="text-[13px] font-semibold text-slate-900 leading-tight truncate">
                            {product.name}
                          </p>
                          {product.description && (
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                              {product.description}
                            </p>
                          )}
                        </div>

                        <div className="w-[60px] text-right">
                          {p3 ? (
                            <span className="text-[12px] font-semibold text-slate-700">
                              {formatCurrency(p3.basePrice)}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-sm">—</span>
                          )}
                        </div>

                        <div className="w-[60px] text-right">
                          {p4 ? (
                            <span className="text-[12px] font-semibold text-slate-700">
                              {formatCurrency(p4.basePrice)}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-sm">—</span>
                          )}
                        </div>

                        <div className="w-[60px] text-right">
                          {dep != null ? (
                            <span className="text-[12px] font-bold text-blue-700">
                              {formatCurrency(dep)}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-sm">—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 6-month sub-section (only if any product has it) */}
                {group.products.some((p) => p.pricings.find((pr) => pr.installmentMonths === 6)) && (
                  <div className="border-t border-slate-100">
                    <div className="bg-slate-50 px-4 py-2 flex items-center gap-2 border-b border-slate-100">
                      <div className="w-1 h-3 rounded-full bg-blue-400" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        6-Month Instalment
                      </span>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {group.products.map((product, idx) => {
                        const p6 = product.pricings.find((p) => p.installmentMonths === 6);
                        if (!p6) return null;
                        return (
                          <div
                            key={product.id}
                            className={`flex items-center justify-between px-4 py-2.5 ${
                              idx % 2 === 0 ? 'bg-white' : 'bg-blue-50/40'
                            }`}
                          >
                            <span className="text-[12px] font-semibold text-slate-700 truncate pr-4">
                              {product.name}
                            </span>
                            <span className="text-[12px] font-semibold text-slate-700 shrink-0">
                              {formatCurrency(p6.basePrice)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Poster footer ── */}
          <div className="mt-6 mx-3 rounded-xl bg-[hsl(222,47%,11%)] px-4 py-4">
            <p className="text-white font-black text-[13px] tracking-wider text-center">
              AIDOO TECH
            </p>
            <p className="text-slate-500 text-[10px] text-center mt-1">
              Prices valid as at {dateLabel} · Subject to change without notice
            </p>
          </div>

          {/* Note */}
          <p className="text-center text-[10px] text-slate-400 mt-3 px-4">
            3 &amp; 4 month columns show monthly instalment · Deposit is for shortest available plan
          </p>
        </div>
      )}
    </div>
  );
}
