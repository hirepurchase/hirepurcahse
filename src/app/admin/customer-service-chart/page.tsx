'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AlertTriangle, Download, Headset, Mail, Phone, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Person {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

interface Officer extends Person {
  agentCount: number;
  agents: Person[];
}

export default function CustomerServiceChartPage() {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [unassigned, setUnassigned] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const dateLabel = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/admin-users/customer-service-chart');
      setOfficers(res.data.officers ?? []);
      setUnassigned(res.data.unassignedAgents ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

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

      const NAVY = [10, 22, 66] as const;
      const BLUE = [14, 56, 148] as const;
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
        doc.text(
          isFirst ? 'CUSTOMER SERVICE · AGENT CHART' : 'CUSTOMER SERVICE CHART (continued)',
          margin,
          22
        );
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`As at ${dateLabel}`, margin, 30);
        doc.text(`Page ${page}`, pageW - margin, 30, { align: 'right' });
      }

      function drawFooter() {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(
          `AIDOO TECH  ·  Customer service contacts as at ${dateLabel}`,
          pageW / 2,
          pageH - 3.5,
          { align: 'center' }
        );
      }

      drawHeader(true);
      drawFooter();

      let y = 46;

      function newPageIfNeeded(needed: number) {
        if (y + needed <= pageH - 16) return;
        doc.addPage();
        page++;
        drawHeader(false);
        drawFooter();
        y = 46;
      }

      for (const officer of officers) {
        // Keep the officer header with at least one agent row.
        newPageIfNeeded(24);

        doc.setFillColor(...BLUE);
        doc.roundedRect(margin, y, contentW, 14, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(officer.name, margin + 4, y + 6);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(191, 219, 254);
        const contact = [officer.phone, officer.email].filter(Boolean).join('   ·   ');
        doc.text(contact, margin + 4, y + 11);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text(
          `${officer.agentCount} agent${officer.agentCount === 1 ? '' : 's'}`,
          pageW - margin - 4,
          y + 8,
          { align: 'right' }
        );
        y += 17;

        if (officer.agents.length === 0) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8.5);
          doc.setTextColor(148, 163, 184);
          doc.text('No agents assigned', margin + 6, y + 3);
          y += 9;
        }

        for (const [i, agent] of officer.agents.entries()) {
          newPageIfNeeded(9);
          if (i % 2 === 0) {
            doc.setFillColor(...LBLUE);
            doc.rect(margin, y - 3.5, contentW, 8, 'F');
          }
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(15, 23, 42);
          doc.text(agent.name, margin + 4, y + 1.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(71, 85, 105);
          doc.text(agent.phone || '—', margin + 88, y + 1.5);
          doc.text(agent.email, margin + 120, y + 1.5);
          y += 8;
        }

        y += 6;
      }

      if (unassigned.length > 0) {
        newPageIfNeeded(24);
        doc.setFillColor(254, 243, 199);
        doc.roundedRect(margin, y, contentW, 12, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(146, 64, 14);
        doc.text(`Unassigned agents (${unassigned.length})`, margin + 4, y + 7.5);
        y += 15;

        for (const agent of unassigned) {
          newPageIfNeeded(9);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(15, 23, 42);
          doc.text(agent.name, margin + 4, y + 1.5);
          doc.setTextColor(71, 85, 105);
          doc.text(agent.phone || '—', margin + 88, y + 1.5);
          doc.text(agent.email, margin + 120, y + 1.5);
          y += 8;
        }
      }

      doc.save(`aidootech-customer-service-chart-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  const totalAgents = officers.reduce((sum, o) => sum + o.agentCount, 0);

  return (
    <div className="min-h-screen bg-[hsl(210,20%,97%)]">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-2 shadow-sm">
        <div>
          <h1 className="text-[15px] font-bold text-slate-900 leading-tight">
            Customer Service Chart
          </h1>
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
            disabled={exporting || loading || officers.length === 0}
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
      ) : officers.length === 0 ? (
        <div className="text-center py-32 text-slate-400 text-sm px-4">
          No customer service officers yet.
        </div>
      ) : (
        <div className="pb-10">
          {/* Poster header */}
          <div className="bg-[hsl(222,47%,11%)] px-4 pt-6 pb-5">
            <p className="text-[11px] font-semibold text-blue-400 tracking-widest uppercase mb-1">
              Aidoo Tech
            </p>
            <h2 className="text-[26px] font-black text-white leading-none tracking-tight">
              Customer Service
            </h2>
            <h3 className="text-[26px] font-black text-blue-400 leading-tight tracking-tight">
              Agent Chart
            </h3>
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
              <p className="text-slate-400 text-[11px]">As at {dateLabel}</p>
              <span className="text-[10px] font-semibold text-blue-400 tracking-wider uppercase">
                {officers.length} officers · {totalAgents} agents
              </span>
            </div>
          </div>
          <div className="h-1 bg-blue-600" />

          {/* Officer cards */}
          <div className="px-3 pt-5 space-y-5">
            {officers.map((officer) => (
              <div
                key={officer.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"
              >
                <div className="bg-[hsl(222,47%,11%)] px-4 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Headset className="w-4 h-4 text-blue-400 shrink-0" />
                      <p className="text-white font-bold text-[15px] truncate">{officer.name}</p>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[11px]">
                      {officer.phone && (
                        <a
                          href={`tel:${officer.phone}`}
                          className="flex items-center gap-1 text-blue-300 hover:text-blue-200"
                        >
                          <Phone className="w-3 h-3" /> {officer.phone}
                        </a>
                      )}
                      <a
                        href={`mailto:${officer.email}`}
                        className="flex items-center gap-1 text-slate-400 hover:text-slate-300"
                      >
                        <Mail className="w-3 h-3" /> {officer.email}
                      </a>
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold text-white bg-blue-600 rounded-full px-2.5 py-1">
                    {officer.agentCount} agent{officer.agentCount === 1 ? '' : 's'}
                  </span>
                </div>

                {officer.agents.length === 0 ? (
                  <p className="text-center text-slate-400 text-[12px] py-6">
                    No agents assigned to this officer
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {officer.agents.map((agent) => (
                      <div
                        key={agent.id}
                        className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1"
                      >
                        <p className="text-[13px] font-semibold text-slate-800">{agent.name}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                          {agent.phone && (
                            <a href={`tel:${agent.phone}`} className="text-blue-600">
                              {agent.phone}
                            </a>
                          )}
                          <a href={`mailto:${agent.email}`} className="text-slate-400">
                            {agent.email}
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {unassigned.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-2 border-b border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="text-[13px] font-bold text-amber-900">
                    {unassigned.length} agent{unassigned.length === 1 ? '' : 's'} not assigned to
                    any officer
                  </p>
                </div>
                <div className="divide-y divide-amber-100">
                  {unassigned.map((agent) => (
                    <div
                      key={agent.id}
                      className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1"
                    >
                      <p className="text-[13px] font-semibold text-amber-900">{agent.name}</p>
                      <p className="text-[11px] text-amber-700">{agent.phone || agent.email}</p>
                    </div>
                  ))}
                </div>
                <p className="px-4 py-2.5 text-[11px] text-amber-700 border-t border-amber-200">
                  Their contracts will not appear in any verification queue until an officer is
                  assigned.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
