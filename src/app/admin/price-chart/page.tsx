'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Download, RefreshCw, Smartphone } from 'lucide-react';
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

      const NAVY  = [10, 22, 66] as const;
      const BLUE  = [14, 56, 148] as const;
      const LBLUE = [239, 246, 255] as const;

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
        doc.setTextColor(147, 197, 253);
        doc.text(isFirst ? 'HIRE PURCHASE · PRICE CHART' : 'PRICE CHART (continued)', margin, 22);
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

      // ── helpers ──────────────────────────────────────────────
      function weeklyAmt(p: { basePrice: number; depositAmount: number; installmentMonths: number }): number {
        return Math.ceil(((p.basePrice - p.depositAmount) / (p.installmentMonths * 4)) * 100) / 100;
      }

      function fmt(n: number) {
        return `GHS ${n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }

      // ── card layout constants ─────────────────────────────────
      // Two-column card grid, matching the screen layout
      const cols       = 2;
      const gapX       = 4;                                  // gap between columns
      const cardW      = (contentW - gapX) / cols;           // ≈ 91 mm each
      const cardR      = 3;                                   // corner radius
      const hdrH       = 11;                                  // blue card header height
      const planRowH   = 10;                                  // height per plan row (total + weekly lines)
      const depH       = 8;                                   // deposit footer height
      const catLabelH  = 8;
      const cardGapY   = 4;                                   // vertical gap between cards
      const catGapY    = 6;                                   // gap after last card in category

      let y = 45;
      let col = 0;   // 0 = left, 1 = right
      let rowTopY = y;

      function cardHeight(product: Product): number {
        const planCount = ([3, 4, 6] as const).filter(
          m => product.pricings.some(pr => pr.installmentMonths === m)
        ).length;
        return hdrH + planCount * planRowH + depH;
      }

      function cardX(): number {
        return margin + col * (cardW + gapX);
      }

      // Flush any open left card (fill right with nothing, advance y)
      function flushRow() {
        if (col === 1) {
          y = rowTopY + 0; // rowTopY is updated when card is drawn
        }
        col = 0;
      }

      function newPage() {
        drawFooter();
        doc.addPage();
        page++;
        drawHeader(false);
        drawFooter();
        y = 45;
        col = 0;
        rowTopY = y;
      }

      // Draw one product card at (cx, cy), returns card bottom y
      function drawCard(product: Product, cx: number, cy: number): number {
        const plans = ([3, 4, 6] as const).filter(
          m => product.pricings.some(pr => pr.installmentMonths === m)
        );
        const ch = hdrH + plans.length * planRowH + depH;

        // Card shadow / border
        doc.setFillColor(226, 232, 240);
        doc.roundedRect(cx + 0.5, cy + 0.5, cardW, ch, cardR, cardR, 'F');

        // White card background
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(cx, cy, cardW, ch, cardR, cardR, 'F');

        // ── Blue header ──
        doc.setFillColor(...BLUE);
        // Top rounded corners only: draw rect + two bottom-corner fills
        doc.roundedRect(cx, cy, cardW, hdrH, cardR, cardR, 'F');
        doc.setFillColor(...BLUE);
        doc.rect(cx, cy + hdrH - cardR, cardW, cardR, 'F'); // square bottom of header

        // Phone icon circle
        const iconCx = cx + 5.5;
        const iconCy = cy + hdrH / 2;
        doc.setFillColor(29, 78, 216); // slightly darker blue
        doc.circle(iconCx, iconCy, 3.2, 'F');
        doc.setTextColor(191, 219, 254); // blue-200
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        doc.text('📱', iconCx, iconCy + 1.8, { align: 'center' });

        // Product name
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        const nameX = cx + 11.5;
        const nameMaxW = cardW - 13;
        doc.text(product.name, nameX, cy + 5, { maxWidth: nameMaxW });
        if (product.description) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6);
          doc.setTextColor(147, 197, 253); // blue-300
          doc.text(product.description, nameX, cy + 9, { maxWidth: nameMaxW });
        }

        // ── Plan rows ──
        plans.forEach((m, idx) => {
          const pr = product.pricings.find(p => p.installmentMonths === m)!;
          const wk = weeklyAmt(pr);
          const ry = cy + hdrH + idx * planRowH;

          // Alternate stripe for readability
          if (idx % 2 === 1) {
            doc.setFillColor(248, 250, 252); // slate-50
            doc.rect(cx, ry, cardW, planRowH, 'F');
          }

          // Plan label  (left)
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(100, 116, 139); // slate-500
          doc.text(`${m}-Month Plan`, cx + 3, ry + 4);

          // Total price (right, top line)
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(15, 23, 42);
          doc.text(fmt(pr.basePrice), cx + cardW - 3, ry + 4, { align: 'right' });

          // "total" label suffix  (right, top line — dimmed)
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.5);
          doc.setTextColor(148, 163, 184);
          const totalW = doc.getTextWidth(fmt(pr.basePrice));
          doc.text('total', cx + cardW - 3 - totalW - 1, ry + 4);

          // Weekly repayment (right, bottom line — green)
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(5, 150, 105); // emerald-600
          doc.text(`${fmt(wk)} /wk`, cx + cardW - 3, ry + 8.5, { align: 'right' });

          // "Weekly repayment" label (left, bottom line)
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.5);
          doc.setTextColor(148, 163, 184);
          doc.text('Weekly repayment', cx + 3, ry + 8.5);

          // Divider line between plan rows
          if (idx < plans.length - 1) {
            doc.setDrawColor(241, 245, 249);
            doc.setLineWidth(0.2);
            doc.line(cx, ry + planRowH, cx + cardW, ry + planRowH);
          }
        });

        // ── Deposit footer ──
        const depY = cy + hdrH + plans.length * planRowH;

        // Blue-50 tinted background for footer
        doc.setFillColor(239, 246, 255); // blue-50
        // Bottom rounded corners only
        doc.roundedRect(cx, depY, cardW, depH, cardR, cardR, 'F');
        doc.rect(cx, depY, cardW, cardR, 'F'); // square top of footer

        // Top border line
        doc.setDrawColor(191, 219, 254); // blue-200
        doc.setLineWidth(0.3);
        doc.line(cx, depY, cx + cardW, depY);

        // "DEPOSIT" label
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(37, 99, 235); // blue-600
        doc.text('DEPOSIT', cx + 3, depY + 5.2);

        // Deposit amount
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(29, 78, 216); // blue-700
        const dep = product.pricings[0]?.depositAmount ?? 0;
        doc.text(fmt(dep), cx + cardW - 3, depY + 5.8, { align: 'right' });

        // Outer card border
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.25);
        doc.roundedRect(cx, cy, cardW, ch, cardR, cardR, 'S');

        return cy + ch;
      }

      // ── Main render loop ──────────────────────────────────────
      for (const group of categories) {
        // Finish any open left column before starting a category header
        if (col === 1) {
          // Just move to next row — the left card was already drawn
          y = rowTopY; // rowTopY was set when left card started; need max of both
        }
        col = 0;

        // Category label — needs space for label + at least one card
        const firstCardH = group.products[0] ? cardHeight(group.products[0]) : 0;
        if (y + catLabelH + firstCardH > pageH - 14) {
          newPage();
        }

        // Category label row
        doc.setFillColor(...BLUE);
        doc.rect(margin, y, contentW, catLabelH, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text(group.name.toUpperCase(), margin + 3, y + 5.5);
        y += catLabelH + 3;

        rowTopY = y;
        let leftCardBottom = y;
        let rightCardBottom = y;

        for (let i = 0; i < group.products.length; i++) {
          const product = group.products[i];
          const ch = cardHeight(product);

          if (col === 0) {
            // Starting a new row
            rowTopY = y;
            // Check if this card fits on the page
            if (y + ch > pageH - 14) {
              newPage();
              rowTopY = y;
            }
            leftCardBottom = drawCard(product, cardX(), y);
            col = 1;
          } else {
            // Right column — must fit in the same row height
            // If it doesn't fit, newPage and start fresh
            if (rowTopY + ch > pageH - 14) {
              // advance y past left card first
              y = leftCardBottom + cardGapY;
              newPage();
              rowTopY = y;
              leftCardBottom = drawCard(product, cardX(), y);
              col = 1;
            } else {
              rightCardBottom = drawCard(product, cardX(), rowTopY);
              // Row is complete — advance y past the taller of the two cards
              y = Math.max(leftCardBottom, rightCardBottom) + cardGapY;
              col = 0;
              rowTopY = y;
            }
          }
        }

        // If last product landed in left column, advance y past it
        if (col === 1) {
          y = leftCardBottom + cardGapY;
          col = 0;
        }

        y += catGapY;
      }

      doc.save(`Aidoo-Tech-Price-Chart-${today.toISOString().slice(0, 10)}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  const PLAN_MONTHS = [3, 4, 6] as const;

  return (
    <div className="min-h-screen bg-[hsl(210,20%,97%)]">

      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-2 shadow-sm">
        <div>
          <h1 className="text-[15px] font-bold text-slate-900 leading-tight">Price Chart</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">{dateLabel}</p>
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
        <div ref={posterRef} className="pb-10">

          {/* Poster header */}
          <div className="bg-[hsl(222,47%,11%)] px-4 pt-6 pb-5">
            <p className="text-[11px] font-semibold text-blue-400 tracking-widest uppercase mb-1">Aidoo Tech</p>
            <h2 className="text-[26px] font-black text-white leading-none tracking-tight">Hire Purchase</h2>
            <h3 className="text-[26px] font-black text-blue-400 leading-tight tracking-tight">Price Chart</h3>
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
              <p className="text-slate-400 text-[11px]">Prices as at {dateLabel}</p>
              <span className="text-[10px] font-semibold text-blue-400 tracking-wider uppercase">All prices in GHS</span>
            </div>
          </div>
          <div className="h-1 bg-blue-600" />

          {/* Plan pills */}
          <div className="bg-white px-4 py-3 flex gap-2 overflow-x-auto border-b border-slate-100">
            {['3-Month Plan', '4-Month Plan', '6-Month Plan', 'Weekly Repayment', 'Low Deposit'].map((label) => (
              <span
                key={label}
                className={`shrink-0 text-[11px] font-semibold rounded-full px-3 py-1 border ${
                  label === 'Weekly Repayment'
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
                    : 'text-blue-700 bg-blue-50 border-blue-100'
                }`}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Categories */}
          <div className="px-3 pt-5 space-y-7">
            {categories.map((group) => (
              <div key={group.id}>

                {/* Category label */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-5 w-1 rounded-full bg-blue-600" />
                  <span className="text-[13px] font-bold text-slate-800 uppercase tracking-widest">
                    {group.name}
                  </span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                {/* Product cards grid — 1 col on small, 2 col on md+ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {group.products.map((product) => {
                    const dep = product.pricings[0]?.depositAmount;

                    return (
                      <div
                        key={product.id}
                        className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                      >
                        {/* Card header */}
                        <div className="bg-blue-700 px-4 py-3 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                            <Smartphone className="w-4 h-4 text-blue-200" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-white leading-tight truncate">
                              {product.name}
                            </p>
                            {product.description && (
                              <p className="text-[10px] text-blue-300 mt-0.5 truncate">
                                {product.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Instalment plans */}
                        <div className="divide-y divide-slate-100">
                          {PLAN_MONTHS.map((m) => {
                            const p = product.pricings.find((pr) => pr.installmentMonths === m);
                            if (!p) return null;
                            const weekly = Math.ceil(((p.basePrice - p.depositAmount) / (m * 4)) * 100) / 100;
                            return (
                              <div key={m} className="px-4 py-2.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-semibold text-slate-500">
                                    {m}-Month Plan
                                  </span>
                                  <span className="text-[13px] font-bold text-slate-800">
                                    {formatCurrency(p.basePrice)}
                                    <span className="text-[10px] font-normal text-slate-400 ml-1">total</span>
                                  </span>
                                </div>
                                <div className="flex items-center justify-between mt-0.5">
                                  <span className="text-[10px] text-slate-400">Weekly repayment</span>
                                  <span className="text-[11px] font-semibold text-emerald-600">
                                    {formatCurrency(weekly)}<span className="text-[9px] font-normal text-emerald-400 ml-0.5">/wk</span>
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Deposit footer */}
                        {dep != null && (
                          <div className="bg-blue-50 border-t border-blue-100 px-4 py-2.5 flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide">
                              Deposit
                            </span>
                            <span className="text-[14px] font-black text-blue-700">
                              {formatCurrency(dep)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Poster footer */}
          <div className="mt-8 mx-3 rounded-xl bg-[hsl(222,47%,11%)] px-4 py-4">
            <p className="text-white font-black text-[13px] tracking-wider text-center">AIDOO TECH</p>
            <p className="text-slate-500 text-[10px] text-center mt-1">
              Prices valid as at {dateLabel} · Subject to change without notice
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
