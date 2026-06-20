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

      function decoratePage() {
        // Header
        doc.setFillColor(10, 10, 10);
        doc.rect(0, 0, pageW, 40, 'F');
        // Orange left stripe
        doc.setFillColor(234, 88, 12);
        doc.rect(0, 0, 4, 40, 'F');
        // Bottom border of header
        doc.setFillColor(234, 88, 12);
        doc.rect(0, 40, pageW, 1.2, 'F');
        // Footer
        doc.setFillColor(10, 10, 10);
        doc.rect(0, pageH - 10, pageW, 10, 'F');
      }

      function drawHeader(isFirst: boolean) {
        decoratePage();

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text('AIDOO TECH', margin + 6, 15);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(234, 88, 12);
        doc.text(
          isFirst ? 'HIRE PURCHASE · PRICE CHART' : 'PRICE CHART (continued)',
          margin + 6,
          23
        );

        doc.setFontSize(8);
        doc.setTextColor(160, 160, 160);
        doc.text(`Prices as at ${dateLabel}`, margin + 6, 31);

        doc.setTextColor(100, 100, 100);
        doc.text(`Page ${page}`, pageW - margin, 31, { align: 'right' });
      }

      function drawFooter() {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(130, 130, 130);
        doc.text(
          `AIDOO TECH  ·  Prices valid as at ${dateLabel}  ·  Subject to change without notice`,
          pageW / 2,
          pageH - 3.5,
          { align: 'center' }
        );
      }

      drawHeader(true);
      drawFooter();

      let y = 48;
      const lineH = 8;
      const catH = 9;
      const thH = 7.5;

      // Column layout: Product | 3mo | 4mo | 6mo | Deposit
      const colX  = [margin, margin + 72, margin + 105, margin + 133, margin + 161];

      function drawColHeaders(curY: number): number {
        doc.setFillColor(28, 28, 28);
        doc.rect(margin, curY, contentW, thH, 'F');
        const labels = ['PRODUCT', '3 MONTHS', '4 MONTHS', '6 MONTHS', 'DEPOSIT'];
        const aligns: ('left' | 'right')[] = ['left', 'right', 'right', 'right', 'right'];
        const endX = [colX[1] - 3, colX[2] - 3, colX[3] - 3, colX[4] - 3, margin + contentW - 2];
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        labels.forEach((lbl, i) => {
          if (i === 0) {
            doc.text(lbl, colX[0] + 2, curY + 5, { align: 'left' });
          } else {
            doc.text(lbl, endX[i - 1], curY + 5, { align: 'right' });
          }
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
          y = 48;
        }

        // Category bar
        doc.setFillColor(234, 88, 12);
        doc.rect(margin, y, contentW, catH, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text(group.name.toUpperCase(), margin + 3, y + 6.2);
        y += catH + 1;

        y = drawColHeaders(y);

        for (let i = 0; i < group.products.length; i++) {
          if (y + lineH > pageH - 14) {
            drawFooter();
            doc.addPage();
            page++;
            drawHeader(false);
            drawFooter();
            y = 48;
            y = drawColHeaders(y);
          }

          const product = group.products[i];

          // Row bg
          if (i % 2 === 1) {
            doc.setFillColor(245, 245, 245);
            doc.rect(margin, y, contentW, lineH, 'F');
          }

          // Product name
          doc.setTextColor(15, 15, 15);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.text(product.name, colX[0] + 2, y + 5.2, { maxWidth: 68 });

          // Plan prices
          doc.setFont('helvetica', 'normal');
          const months = [3, 4, 6];
          const endXPrices = [colX[2] - 3, colX[3] - 3, colX[4] - 3];
          months.forEach((m, idx) => {
            const p = product.pricings.find((pr) => pr.installmentMonths === m);
            if (p) {
              doc.setTextColor(15, 15, 15);
              doc.text(`GHS ${p.basePrice.toLocaleString()}`, endXPrices[idx], y + 5.2, { align: 'right' });
            } else {
              doc.setTextColor(200, 200, 200);
              doc.text('—', endXPrices[idx], y + 5.2, { align: 'right' });
            }
          });

          // Deposit
          const firstP = product.pricings[0];
          if (firstP) {
            doc.setTextColor(234, 88, 12);
            doc.setFont('helvetica', 'bold');
            doc.text(
              `GHS ${firstP.depositAmount.toLocaleString()}`,
              margin + contentW - 2,
              y + 5.2,
              { align: 'right' }
            );
          }

          // Divider
          doc.setDrawColor(230, 230, 230);
          doc.setLineWidth(0.15);
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

  const PLAN_MONTHS = [3, 4, 6];

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-base font-bold text-slate-900 leading-none">Price Chart</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Button
            size="sm"
            onClick={exportPDF}
            disabled={exporting || loading || categories.length === 0}
            className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 h-8"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            {exporting ? 'Exporting…' : 'PDF'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-32 text-slate-400 text-sm">
          No products with prices and available inventory.
        </div>
      ) : (
        <div ref={posterRef}>
          {/* Poster header */}
          <div className="bg-[#0a0a0a] px-4 pt-5 pb-4 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />
            <div className="pl-3">
              <p className="text-orange-500 text-[10px] font-bold tracking-widest uppercase">
                Aidoo Tech
              </p>
              <h2 className="text-2xl font-black text-white tracking-tight leading-tight mt-0.5">
                Hire Purchase
              </h2>
              <h3 className="text-2xl font-black text-orange-500 tracking-tight leading-tight">
                Price Chart
              </h3>
              <p className="text-slate-500 text-[11px] mt-2">Prices as at {dateLabel}</p>
            </div>
            {/* decorative ring */}
            <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full border-[16px] border-orange-500/10 pointer-events-none" />
          </div>

          {/* Tagline strip */}
          <div className="bg-orange-600 px-4 py-2 flex gap-3 overflow-x-auto text-[10px] text-white font-semibold tracking-wide whitespace-nowrap">
            <span>3 · 4 · 6 Month Plans</span>
            <span className="opacity-50">|</span>
            <span>Low Deposits</span>
            <span className="opacity-50">|</span>
            <span>Fast Approval</span>
            <span className="opacity-50">|</span>
            <span>All prices in GHS</span>
          </div>

          {/* Categories */}
          <div className="divide-y divide-slate-100">
            {categories.map((group) => (
              <div key={group.id}>
                {/* Category header */}
                <div className="flex items-center gap-2 bg-slate-900 px-4 py-2.5">
                  <div className="w-1 h-4 rounded-full bg-orange-500 shrink-0" />
                  <span className="text-[11px] font-bold text-white uppercase tracking-widest">
                    {group.name}
                  </span>
                </div>

                {/* Column headers */}
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-0 bg-slate-800 px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Product</span>
                  <span className="w-[68px] text-right">3 mo</span>
                  <span className="w-[68px] text-right">4 mo</span>
                  <span className="w-[68px] text-right">Deposit</span>
                </div>

                {/* Product rows */}
                <div className="divide-y divide-slate-50">
                  {group.products.map((product, idx) => {
                    const p3 = product.pricings.find((p) => p.installmentMonths === 3);
                    const p4 = product.pricings.find((p) => p.installmentMonths === 4);
                    const deposit = product.pricings[0]?.depositAmount;

                    return (
                      <div
                        key={product.id}
                        className={`grid grid-cols-[1fr_auto_auto_auto] gap-0 items-center px-4 py-3 ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                        }`}
                      >
                        {/* Name */}
                        <div>
                          <p className="text-[13px] font-bold text-slate-900 leading-tight">
                            {product.name}
                          </p>
                          {product.description && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {product.description}
                            </p>
                          )}
                        </div>

                        {/* 3 months */}
                        <div className="w-[68px] text-right">
                          {p3 ? (
                            <span className="text-[12px] font-semibold text-slate-700">
                              {formatCurrency(p3.basePrice)}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-sm">—</span>
                          )}
                        </div>

                        {/* 4 months */}
                        <div className="w-[68px] text-right">
                          {p4 ? (
                            <span className="text-[12px] font-semibold text-slate-700">
                              {formatCurrency(p4.basePrice)}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-sm">—</span>
                          )}
                        </div>

                        {/* Deposit */}
                        <div className="w-[68px] text-right">
                          {deposit != null ? (
                            <span className="text-[12px] font-bold text-orange-600">
                              {formatCurrency(deposit)}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-sm">—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 6-month column — shown below on mobile to avoid cramping */}
                {group.products.some((p) => p.pricings.find((pr) => pr.installmentMonths === 6)) && (
                  <div className="bg-slate-50 border-t border-slate-100">
                    <div className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      6-Month Instalment
                    </div>
                    <div className="divide-y divide-slate-100">
                      {group.products.map((product, idx) => {
                        const p6 = product.pricings.find((p) => p.installmentMonths === 6);
                        if (!p6) return null;
                        return (
                          <div
                            key={product.id}
                            className={`flex items-center justify-between px-4 py-2 ${
                              idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                            }`}
                          >
                            <span className="text-[12px] font-semibold text-slate-700">
                              {product.name}
                            </span>
                            <span className="text-[12px] font-semibold text-slate-700">
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

          {/* Poster footer */}
          <div className="bg-[#0a0a0a] px-4 py-4 mt-1">
            <p className="text-slate-500 text-[10px] text-center">
              Prices valid as at {dateLabel} · Subject to change without notice
            </p>
            <p className="text-orange-500 text-xs font-black text-center tracking-widest mt-1">
              AIDOO TECH
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
