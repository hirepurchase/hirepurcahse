'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
  totalInventory: number;
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

      // Only include products that have pricings AND available inventory
      const filtered = products.filter(
        (p) => p.pricings.length > 0 && p.availableInventory > 0
      );

      // Group by category
      const map = new Map<string, CategoryGroup>();
      for (const p of filtered) {
        const catId = p.category.id;
        if (!map.has(catId)) {
          map.set(catId, { id: catId, name: p.category.name, products: [] });
        }
        map.get(catId)!.products.push(p);
      }

      // Sort products alphabetically within each category
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
      const margin = 14;
      const contentW = pageW - margin * 2;

      let page = 1;

      function addPage() {
        doc.addPage();
        page++;
        drawPageBackground();
      }

      function drawPageBackground() {
        // Dark header band
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, pageW, 38, 'F');
        // Accent stripe
        doc.setFillColor(234, 88, 12);
        doc.rect(0, 36, pageW, 2, 'F');
        // Footer band
        doc.setFillColor(15, 23, 42);
        doc.rect(0, pageH - 12, pageW, 12, 'F');
      }

      function drawHeader(isFirst: boolean) {
        drawPageBackground();
        // Company name
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('AIDOO TECH', margin, 16);

        if (isFirst) {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(253, 186, 116);
          doc.text('HIRE PURCHASE PRICE CHART', margin, 24);
        } else {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(253, 186, 116);
          doc.text('PRICE CHART (cont.)', margin, 24);
        }

        // Date top-right
        doc.setFontSize(9);
        doc.setTextColor(203, 213, 225);
        doc.setFont('helvetica', 'normal');
        const dateStr = `As at ${dateLabel}`;
        doc.text(dateStr, pageW - margin, 16, { align: 'right' });
        doc.text(`Page ${page}`, pageW - margin, 24, { align: 'right' });
      }

      function drawFooter() {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text('AIDOO TECH  •  Prices valid as at ' + dateLabel + '  •  Subject to change without notice', pageW / 2, pageH - 4.5, { align: 'center' });
      }

      // ——— First page ———
      drawHeader(true);
      drawFooter();

      let y = 46;
      const lineH = 7;
      const headerH = 8;
      const colW = [70, 30, 30, 30, contentW - 160];
      const colX = [margin, margin + 70, margin + 100, margin + 130, margin + 160];

      function drawTableHeader(curY: number) {
        doc.setFillColor(30, 41, 59);
        doc.rect(margin, curY, contentW, headerH, 'F');
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        const headers = ['Product', '3 Months', '4 Months', '6 Months', 'Deposit'];
        headers.forEach((h, i) => {
          doc.text(h, colX[i] + 2, curY + 5.5);
        });
        return curY + headerH;
      }

      for (const group of categories) {
        // Check space for category header + at least one row
        if (y + 14 + lineH > pageH - 16) {
          drawFooter();
          addPage();
          drawHeader(false);
          drawFooter();
          y = 46;
        }

        // Category header
        doc.setFillColor(234, 88, 12);
        doc.rect(margin, y, contentW, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(group.name.toUpperCase(), margin + 3, y + 5.5);
        y += 8 + 1;

        y = drawTableHeader(y);

        let rowEven = false;
        for (const product of group.products) {
          if (y + lineH > pageH - 16) {
            drawFooter();
            addPage();
            drawHeader(false);
            drawFooter();
            y = 46;
            y = drawTableHeader(y);
            rowEven = false;
          }

          // Alternating row background
          if (rowEven) {
            doc.setFillColor(248, 250, 252);
            doc.rect(margin, y, contentW, lineH, 'F');
          }
          rowEven = !rowEven;

          doc.setTextColor(15, 23, 42);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text(product.name, colX[0] + 2, y + 4.8, { maxWidth: colW[0] - 4 });

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);

          const months = [3, 4, 6];
          months.forEach((m, idx) => {
            const p = product.pricings.find((pr) => pr.installmentMonths === m);
            if (p) {
              doc.setTextColor(15, 23, 42);
              doc.text(`GHS ${p.basePrice.toLocaleString()}`, colX[idx + 1] + 2, y + 4.8);
            } else {
              doc.setTextColor(180, 180, 180);
              doc.text('—', colX[idx + 1] + 2, y + 4.8);
            }
          });

          // Deposit from first available pricing
          const firstPricing = product.pricings[0];
          if (firstPricing) {
            doc.setTextColor(234, 88, 12);
            doc.setFont('helvetica', 'bold');
            doc.text(`GHS ${firstPricing.depositAmount.toLocaleString()}`, colX[4] + 2, y + 4.8);
          }

          // Row border
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.1);
          doc.line(margin, y + lineH, margin + contentW, y + lineH);

          y += lineH;
        }

        y += 4; // gap between categories
      }

      doc.save(`Aidoo-Tech-Price-Chart-${today.toISOString().slice(0, 10)}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  const PLAN_MONTHS = [3, 4, 6];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Price Chart</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Prices as at <span className="font-medium text-slate-700">{dateLabel}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={exportPDF}
            disabled={exporting || loading || categories.length === 0}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Download className="w-4 h-4 mr-1.5" />
            {exporting ? 'Generating…' : 'Export PDF'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-32 text-slate-400">
          No products with prices and available inventory found.
        </div>
      ) : (
        /* ——— Poster ——— */
        <div ref={posterRef} className="max-w-4xl mx-auto">
          {/* Poster card */}
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-200">

            {/* Poster header */}
            <div className="bg-slate-900 px-8 py-6 relative overflow-hidden">
              {/* decorative circles */}
              <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-orange-500/10 pointer-events-none" />
              <div className="absolute -bottom-10 right-20 w-28 h-28 rounded-full bg-orange-500/10 pointer-events-none" />

              <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                <div>
                  <p className="text-orange-400 text-xs font-semibold tracking-widest uppercase mb-1">
                    Aidoo Tech
                  </p>
                  <h2 className="text-3xl font-extrabold text-white tracking-tight leading-none">
                    Hire Purchase
                  </h2>
                  <h3 className="text-3xl font-extrabold text-orange-400 tracking-tight">
                    Price Chart
                  </h3>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 text-xs uppercase tracking-widest">Prices as at</p>
                  <p className="text-white font-bold text-lg">{dateLabel}</p>
                </div>
              </div>

              {/* orange accent bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600" />
            </div>

            {/* Info strip */}
            <div className="bg-orange-50 border-b border-orange-100 px-8 py-3 flex flex-wrap gap-4 text-xs text-orange-700 font-medium">
              <span>✓ Flexible payment plans: 3, 4 or 6 months</span>
              <span>✓ Low deposits</span>
              <span>✓ Quick approval</span>
              <span>✓ All prices in Ghana Cedis (GHS)</span>
            </div>

            {/* Product tables by category */}
            <div className="bg-white divide-y divide-slate-100">
              {categories.map((group) => (
                <div key={group.id} className="px-6 md:px-8 py-5">
                  {/* Category label */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-5 w-1 rounded-full bg-orange-500" />
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                      {group.name}
                    </h4>
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-xs text-slate-400">{group.products.length} model{group.products.length !== 1 ? 's' : ''}</span>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto -mx-2">
                    <table className="w-full text-sm min-w-[520px]">
                      <thead>
                        <tr className="bg-slate-800 text-slate-300 text-xs uppercase tracking-wider">
                          <th className="text-left px-3 py-2.5 rounded-tl-lg font-semibold w-[35%]">Product</th>
                          {PLAN_MONTHS.map((m) => (
                            <th key={m} className="text-center px-3 py-2.5 font-semibold">
                              {m} Months
                            </th>
                          ))}
                          <th className="text-center px-3 py-2.5 font-semibold">Deposit</th>
                          <th className="text-center px-3 py-2.5 rounded-tr-lg font-semibold">Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {group.products.map((product, idx) => (
                          <tr
                            key={product.id}
                            className={`transition-colors hover:bg-orange-50/60 ${
                              idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                            }`}
                          >
                            <td className="px-3 py-3">
                              <div className="font-semibold text-slate-900 text-sm">
                                {product.name}
                              </div>
                              {product.description && (
                                <div className="text-xs text-slate-400 mt-0.5">
                                  {product.description}
                                </div>
                              )}
                            </td>
                            {PLAN_MONTHS.map((m) => {
                              const p = product.pricings.find((pr) => pr.installmentMonths === m);
                              return (
                                <td key={m} className="px-3 py-3 text-center">
                                  {p ? (
                                    <span className="font-bold text-slate-800">
                                      {formatCurrency(p.basePrice)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 text-base">—</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="px-3 py-3 text-center">
                              {product.pricings[0] ? (
                                <span className="font-bold text-orange-600">
                                  {formatCurrency(product.pricings[0].depositAmount)}
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <Badge
                                variant="outline"
                                className={`text-xs font-semibold ${
                                  product.availableInventory > 10
                                    ? 'border-green-300 text-green-700 bg-green-50'
                                    : product.availableInventory > 0
                                    ? 'border-amber-300 text-amber-700 bg-amber-50'
                                    : 'border-red-300 text-red-700 bg-red-50'
                                }`}
                              >
                                {product.availableInventory > 0
                                  ? `${product.availableInventory} in stock`
                                  : 'Out of stock'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>

            {/* Poster footer */}
            <div className="bg-slate-900 px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="text-slate-400 text-xs">
                Prices valid as at {dateLabel} · Subject to change without notice
              </p>
              <p className="text-orange-400 text-xs font-bold tracking-wider">
                AIDOO TECH
              </p>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500 px-1">
            <span>* Monthly instalment amounts shown per plan</span>
            <span>* Deposit shown is for the shortest available plan</span>
            <span>* Low stock = fewer than 10 units</span>
          </div>
        </div>
      )}
    </div>
  );
}
