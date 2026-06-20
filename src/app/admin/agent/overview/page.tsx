'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

type RGB = [number, number, number];

const WORKFLOW_STEPS: { step: number; title: string; desc: string; rgb: RGB }[] = [
  { step: 1, title: 'Register Customer',        rgb: [37, 99, 235],   desc: 'Create a new customer profile with personal details, ID info, and contact number.' },
  { step: 2, title: 'Create Contract',           rgb: [79, 70, 229],   desc: 'Select the customer, choose an available device from inventory, set plan (3, 4, or 6 months), and submit.' },
  { step: 3, title: 'Awaiting Approval',         rgb: [245, 158, 11],  desc: 'Your contract enters the approval queue. An admin reviews and either approves or sends it back for revision.' },
  { step: 4, title: 'Handle Revisions',          rgb: [249, 115, 22],  desc: 'If revision is requested, edit the contract terms and resubmit. The reason will appear in your contract detail.' },
  { step: 5, title: 'Contract Activated',        rgb: [5, 150, 105],   desc: 'Once approved, the contract goes ACTIVE. The device is linked to the customer and Knox Guard is enrolled.' },
  { step: 6, title: 'Track Deposit & Commission',rgb: [124, 58, 237],  desc: 'View your deposit ledger to see collected deposits, commissions earned, and amounts paid out by admin.' },
];

const PORTAL_PAGES: { title: string; desc: string; bullets: string[]; rgb: RGB }[] = [
  {
    title: 'Dashboard', rgb: [37, 99, 235],
    desc: 'Portfolio stats, alerts, financial summary, recent contracts, and quick actions.',
    bullets: [
      'Total contracts: active, pending, revisions at a glance',
      'This month collections and new customer count',
      'Alerts for overdue installments and pending revisions',
      'Quick links to create a contract or register a customer',
    ],
  },
  {
    title: 'My Contracts', rgb: [79, 70, 229],
    desc: 'Full list of contracts you have created. Search, filter by status, and tap any contract for details.',
    bullets: [
      'Filter by Active, Pending, Revision, Completed, Defaulted',
      'Search by customer name, contract number, or product',
      'View approval queue status and SLA age per contract',
      'Tap a contract to see installment schedule and payments',
    ],
  },
  {
    title: 'Deposit Ledger', rgb: [124, 58, 237],
    desc: 'Every deposit collected, your commission, what you owe the company, and what has been paid out.',
    bullets: [
      'Summary totals: deposits, commission, outstanding balance',
      'Filter by date range or contract number',
      'Submit MoMo payment to settle your outstanding balance',
      'Track payment confirmation: Pending or Paid',
    ],
  },
  {
    title: 'Price Chart', rgb: [8, 145, 178],
    desc: 'Live prices for all available products. Shows instalment amounts per plan and deposit required.',
    bullets: [
      'Grouped by product category (e.g. Samsung, Tecno)',
      'Shows 3-month, 4-month, and 6-month instalment amounts',
      'Only in-stock products are displayed',
      'Export to PDF to share with customers',
    ],
  },
];

const CONTRACT_STATUSES: { label: string; desc: string; rgb: RGB }[] = [
  { label: 'Pending Approval',   desc: 'Submitted — waiting for admin review.',               rgb: [245, 158, 11] },
  { label: 'Revision Requested', desc: 'Admin sent it back — edit terms and resubmit.',       rgb: [249, 115, 22] },
  { label: 'Active',             desc: 'Approved and running. Customer is repaying.',          rgb: [5, 150, 105]  },
  { label: 'Completed',          desc: 'All instalments paid. Contract is closed.',            rgb: [37, 99, 235]  },
  { label: 'Defaulted',          desc: 'Customer has stopped paying. In arrears.',             rgb: [220, 38, 38]  },
  { label: 'Cancelled',          desc: 'Contract was cancelled before or after activation.',   rgb: [100, 116, 139]},
];

const TIPS = [
  'Device locks automatically at 8:00 AM the morning after a missed payment due date.',
  'Check your dashboard daily — overdue alerts and revision requests need prompt action.',
  'Settle your deposit balance promptly to keep your agent ledger clean.',
  'Double-check customer ID number and phone before submitting — revisions delay device activation.',
  'Use the Price Chart page to show customers plan options and deposit amounts before creating a contract.',
];

export default function AgentOverviewPage() {
  const [exporting, setExporting] = useState(false);

  async function exportPDF() {
    setExporting(true);
    try {
      const { default: jsPDF } = await import('jspdf');

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const PW = 210;
      const PH = 297;
      const M  = 14;
      const CW = PW - M * 2;

      // ── palette ──────────────────────────────────────────────────────────
      const NAVY:  [number,number,number] = [10, 22, 66];
      const BLUE:  [number,number,number] = [37, 99, 235];
      const SLATE: [number,number,number] = [100, 116, 139];
      const DARK:  [number,number,number] = [15, 23, 42];
      const WHITE: [number,number,number] = [255, 255, 255];

      let page = 1;

      // ── helpers ──────────────────────────────────────────────────────────
      function chrome() {
        // header band
        doc.setFillColor(...NAVY);
        doc.rect(0, 0, PW, 32, 'F');
        doc.setFillColor(...BLUE);
        doc.rect(0, 31.5, PW, 1, 'F');
        // footer band
        doc.setFillColor(...NAVY);
        doc.rect(0, PH - 9, PW, 9, 'F');
      }

      function header(isFirst: boolean) {
        chrome();
        doc.setTextColor(...WHITE);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('AIDOO TECH', M, 13);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(147, 197, 253);
        doc.text(
          isFirst ? 'AGENT PORTAL · WORKFLOW & INTERFACE OVERVIEW' : 'AGENT PORTAL OVERVIEW (continued)',
          M, 21
        );

        doc.setFontSize(7);
        doc.setTextColor(...SLATE);
        doc.text(`Page ${page}`, PW - M, 21, { align: 'right' });
      }

      function footer() {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...SLATE);
        doc.text(
          'AIDOO TECH  ·  Agent Portal Guide  ·  Confidential — for internal agent use only',
          PW / 2, PH - 3, { align: 'center' }
        );
      }

      function sectionTitle(label: string, y: number): number {
        doc.setFillColor(240, 244, 255);
        doc.rect(M, y, CW, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...BLUE);
        doc.text(label.toUpperCase(), M + 3, y + 5);
        return y + 7 + 3;
      }

      function needsPage(y: number, h: number): number {
        if (y + h > PH - 13) {
          footer();
          doc.addPage();
          page++;
          header(false);
          footer();
          return 38;
        }
        return y;
      }

      // ══════════════════════════════════════════════════════════
      // PAGE 1
      // ══════════════════════════════════════════════════════════
      header(true);
      footer();
      let y = 38;

      // ── intro ────────────────────────────────────────────────
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK);
      doc.text(
        'This document describes the step-by-step workflow for Aidoo Tech sales agents,',
        M, y
      );
      y += 5;
      doc.text(
        'the purpose of each portal page, contract status meanings, and key tips.',
        M, y
      );
      y += 10;

      // ══════════════════════════════════════════════════════════
      // SECTION 1 — WORKFLOW
      // ══════════════════════════════════════════════════════════
      y = sectionTitle('Step-by-Step Workflow', y);

      const STEP_H = 20;
      const CIRCLE_R = 5;
      const LINE_X = M + CIRCLE_R;

      // draw connector line first (full height of all steps)
      const lineTop = y + CIRCLE_R;
      const lineBot = y + WORKFLOW_STEPS.length * (STEP_H + 2) - CIRCLE_R;
      doc.setDrawColor(200, 210, 230);
      doc.setLineWidth(0.4);
      doc.line(LINE_X, lineTop, LINE_X, lineBot);

      for (let i = 0; i < WORKFLOW_STEPS.length; i++) {
        const s = WORKFLOW_STEPS[i];
        y = needsPage(y, STEP_H + 2);

        // circle
        doc.setFillColor(s.rgb[0], s.rgb[1], s.rgb[2]);
        doc.circle(LINE_X, y + CIRCLE_R, CIRCLE_R, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text(String(s.step), LINE_X, y + CIRCLE_R + 2.5, { align: 'center' });

        // card background
        const cardX = M + CIRCLE_R * 2 + 3;
        const cardW = CW - CIRCLE_R * 2 - 3;
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(cardX, y, cardW, STEP_H, 2, 2, 'F');
        doc.setDrawColor(...s.rgb);
        doc.setLineWidth(0.8);
        doc.line(cardX, y + 2, cardX, y + STEP_H - 2);

        // title
        doc.setTextColor(...s.rgb);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text(s.title, cardX + 4, y + 7);

        // desc
        doc.setTextColor(...DARK);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        const lines = doc.splitTextToSize(s.desc, cardW - 8) as string[];
        doc.text(lines, cardX + 4, y + 13);

        y += STEP_H + 2;
      }

      y += 6;

      // ══════════════════════════════════════════════════════════
      // SECTION 2 — PORTAL PAGES
      // ══════════════════════════════════════════════════════════
      y = needsPage(y, 14);
      y = sectionTitle('Portal Pages', y);

      for (const pg of PORTAL_PAGES) {
        const bulletLines = pg.bullets.map(b => doc.splitTextToSize(`• ${b}`, CW - 10) as string[]);
        const totalBulletLines = bulletLines.reduce((sum, bl) => sum + bl.length, 0);
        const cardH = 6 + 5 + (totalBulletLines * 4.5) + 6;

        y = needsPage(y, cardH + 2);

        // header bar
        doc.setFillColor(...pg.rgb);
        doc.rect(M, y, CW, 8, 'F');
        doc.setTextColor(...WHITE);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text(pg.title, M + 3, y + 5.5);

        y += 8;

        // body
        doc.setFillColor(252, 253, 255);
        doc.rect(M, y, CW, cardH - 8, 'F');
        doc.setDrawColor(220, 228, 245);
        doc.setLineWidth(0.15);
        doc.rect(M, y, CW, cardH - 8);

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(80, 95, 120);
        const descLines = doc.splitTextToSize(pg.desc, CW - 8) as string[];
        doc.text(descLines, M + 4, y + 5);

        let by = y + 5 + descLines.length * 4.5 + 1;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...DARK);

        for (const bl of bulletLines) {
          doc.text(bl, M + 6, by);
          by += bl.length * 4.5;
        }

        y += cardH - 8 + 4;
      }

      y += 2;

      // ══════════════════════════════════════════════════════════
      // SECTION 3 — CONTRACT STATUS GUIDE
      // ══════════════════════════════════════════════════════════
      y = needsPage(y, 14 + CONTRACT_STATUSES.length * 9);
      y = sectionTitle('Contract Status Guide', y);

      for (const s of CONTRACT_STATUSES) {
        y = needsPage(y, 9);

        // pill
        // light tint of the status colour for the pill background
        const tint = (c: number) => Math.round(c * 0.15 + 240);
        doc.setFillColor(tint(s.rgb[0]), tint(s.rgb[1]), tint(s.rgb[2]));
        doc.roundedRect(M, y, 42, 7, 1.5, 1.5, 'F');
        doc.setTextColor(...s.rgb);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text(s.label, M + 21, y + 4.8, { align: 'center' });

        // desc
        doc.setTextColor(...DARK);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(s.desc, M + 46, y + 4.8);

        y += 9;
      }

      y += 6;

      // ══════════════════════════════════════════════════════════
      // SECTION 4 — TIPS
      // ══════════════════════════════════════════════════════════
      y = needsPage(y, 14 + TIPS.length * 11);
      y = sectionTitle('Tips for Agents', y);

      for (let i = 0; i < TIPS.length; i++) {
        const lines = doc.splitTextToSize(TIPS[i], CW - 14) as string[];
        const boxH = lines.length * 4.5 + 6;
        y = needsPage(y, boxH + 2);

        doc.setFillColor(239, 246, 255);
        doc.roundedRect(M, y, CW, boxH, 2, 2, 'F');
        doc.setDrawColor(...BLUE);
        doc.setLineWidth(0.6);
        doc.line(M, y + 2, M, y + boxH - 2);

        // bullet number
        doc.setTextColor(...BLUE);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(`${i + 1}`, M + 4, y + boxH / 2 + 2.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...DARK);
        doc.text(lines, M + 10, y + 5);

        y += boxH + 3;
      }

      // ══════════════════════════════════════════════════════════
      // FINAL PAGE — stamp
      // ══════════════════════════════════════════════════════════
      y = needsPage(y, 18);
      doc.setFillColor(240, 244, 255);
      doc.rect(M, y, CW, 14, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...BLUE);
      doc.text('AIDOO TECH — Agent Portal', PW / 2, y + 6, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...SLATE);
      doc.text('For internal agent use only · Confidential', PW / 2, y + 11, { align: 'center' });

      const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
      doc.save(`Aidoo-Tech-Agent-Portal-Overview-${date}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[hsl(210,20%,97%)]">

      {/* Header */}
      <div className="bg-[hsl(222,47%,11%)] px-4 pt-6 pb-5">
        <p className="text-[11px] font-semibold text-blue-400 tracking-widest uppercase mb-1">Agent Portal</p>
        <h1 className="text-[22px] font-black text-white tracking-tight leading-tight">
          Workflow & Interface Overview
        </h1>
        <p className="text-slate-400 text-[12px] mt-1.5 leading-relaxed">
          Step-by-step guide to the agent portal — workflow, pages, statuses, and tips.
        </p>
      </div>
      <div className="h-1 bg-blue-600" />

      {/* Download card */}
      <div className="px-4 pt-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[15px] font-bold text-slate-900">Agent Portal Guide</h2>
              <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                A complete PDF guide covering the 6-step workflow, all portal pages, contract status meanings, and agent tips. Suitable for onboarding new agents.
              </p>
              <ul className="mt-3 space-y-1">
                {[
                  '6-step hire purchase workflow',
                  'Portal pages — Dashboard, Contracts, Deposits, Price Chart',
                  'Contract status guide',
                  'Tips and best practices',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-[12px] text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <Button
            className="w-full mt-5 h-11 text-sm font-semibold"
            onClick={exportPDF}
            disabled={exporting}
          >
            <Download className="w-4 h-4 mr-2" />
            {exporting ? 'Generating PDF…' : 'Download PDF Guide'}
          </Button>
        </div>

        {/* Preview sections */}
        <div className="mt-5 space-y-3 pb-10">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">What's inside</p>

          {[
            { num: '01', title: 'Step-by-Step Workflow', desc: '6 numbered steps from customer registration through to commission tracking, each colour-coded.' },
            { num: '02', title: 'Portal Pages', desc: 'Dashboard · My Contracts · Deposit Ledger · Price Chart — purpose and features of each.' },
            { num: '03', title: 'Contract Status Guide', desc: 'Plain-English explanation of all 6 contract statuses: Pending, Revision, Active, Completed, Defaulted, Cancelled.' },
            { num: '04', title: 'Agent Tips', desc: 'Device lock timing, daily checks, deposit settlement, and data accuracy before submission.' },
          ].map((s) => (
            <div key={s.num} className="flex gap-3 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                <span className="text-white text-[11px] font-black">{s.num}</span>
              </div>
              <div>
                <p className="text-[13px] font-bold text-slate-800">{s.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
