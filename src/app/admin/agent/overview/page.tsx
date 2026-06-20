'use client';

import Link from 'next/link';
import {
  LayoutDashboard,
  UserPlus,
  FileText,
  ClipboardCheck,
  RefreshCw,
  CheckCircle2,
  Wallet,
  Tags,
  ArrowRight,
  ChevronRight,
  Smartphone,
  TrendingUp,
  AlertCircle,
  Clock,
  BadgeCheck,
} from 'lucide-react';

const WORKFLOW_STEPS = [
  {
    step: 1,
    icon: UserPlus,
    title: 'Register Customer',
    desc: 'Create a new customer profile with personal details, ID info, and contact number.',
    href: '/admin/customers',
    cta: 'Go to Customers',
    color: 'bg-blue-600',
    light: 'bg-blue-50 text-blue-700 border-blue-100',
    dot: 'bg-blue-600',
  },
  {
    step: 2,
    icon: FileText,
    title: 'Create Contract',
    desc: 'Select the customer, choose an available device from inventory, set plan (3/4/6 months), and submit.',
    href: '/admin/contracts',
    cta: 'Create Contract',
    color: 'bg-indigo-600',
    light: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    dot: 'bg-indigo-600',
  },
  {
    step: 3,
    icon: Clock,
    title: 'Awaiting Approval',
    desc: 'Your contract enters the approval queue. An admin reviews and either approves or sends it back for revision.',
    href: '/admin/agent/contracts',
    cta: 'View My Contracts',
    color: 'bg-amber-500',
    light: 'bg-amber-50 text-amber-700 border-amber-100',
    dot: 'bg-amber-500',
  },
  {
    step: 4,
    icon: RefreshCw,
    title: 'Handle Revisions',
    desc: 'If revision is requested, edit the contract terms and resubmit. You will see the reason in your contract detail.',
    href: '/admin/agent/contracts',
    cta: 'View Revisions',
    color: 'bg-orange-500',
    light: 'bg-orange-50 text-orange-700 border-orange-100',
    dot: 'bg-orange-500',
  },
  {
    step: 5,
    icon: BadgeCheck,
    title: 'Contract Activated',
    desc: 'Once approved, the contract goes ACTIVE. The device is linked to the customer and Knox Guard is enrolled.',
    href: '/admin/agent/contracts',
    cta: 'View Active',
    color: 'bg-emerald-600',
    light: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    dot: 'bg-emerald-600',
  },
  {
    step: 6,
    icon: Wallet,
    title: 'Track Deposit & Commission',
    desc: 'View your deposit ledger to see collected deposits, commissions earned, and amounts paid out by admin.',
    href: '/admin/agent/deposits',
    cta: 'Deposit Ledger',
    color: 'bg-purple-600',
    light: 'bg-purple-50 text-purple-700 border-purple-100',
    dot: 'bg-purple-600',
  },
];

const PORTAL_SECTIONS = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    href: '/admin/agent/dashboard',
    color: 'bg-blue-600',
    desc: 'Your overview — portfolio stats, alerts, financial summary, recent contracts, and quick actions.',
    bullets: [
      'Total contracts, active, pending, revisions',
      'This month collections and customer registrations',
      'Alerts for overdue installments and pending revisions',
      'Quick links to create contract or register customer',
    ],
  },
  {
    icon: FileText,
    title: 'My Contracts',
    href: '/admin/agent/contracts',
    color: 'bg-indigo-600',
    desc: 'Full list of all contracts you have created. Search, filter by status, and tap any contract for details.',
    bullets: [
      'Filter by Active, Pending, Revision, Completed',
      'Search by customer name, contract number, or product',
      'View approval queue status and SLA age',
      'Tap a contract to see installment schedule and payments',
    ],
  },
  {
    icon: Wallet,
    title: 'Deposit Ledger',
    href: '/admin/agent/deposits',
    color: 'bg-purple-600',
    desc: 'Shows every deposit collected, your commission, what you owe the company, and what has been paid out.',
    bullets: [
      'Summary: total deposits, commission, outstanding',
      'Filter by date range or contract number',
      'Submit MoMo payment to settle your outstanding balance',
      'Track payment confirmation status (Pending / Paid)',
    ],
  },
  {
    icon: Tags,
    title: 'Price Chart',
    href: '/admin/price-chart',
    color: 'bg-cyan-600',
    desc: 'Live price chart for all available products. Shows instalment amounts per plan and deposit required.',
    bullets: [
      'Grouped by product category',
      'Shows 3-month, 4-month, and 6-month plans',
      'Only in-stock products are shown',
      'Export to PDF to share with customers',
    ],
  },
];

const CONTRACT_STATUSES = [
  { label: 'Pending Approval', color: 'bg-amber-100 text-amber-700', desc: 'Submitted, waiting for admin review.' },
  { label: 'Revision Requested', color: 'bg-orange-100 text-orange-700', desc: 'Admin sent it back — edit and resubmit.' },
  { label: 'Active', color: 'bg-emerald-100 text-emerald-700', desc: 'Approved and running. Customer is repaying.' },
  { label: 'Completed', color: 'bg-blue-100 text-blue-700', desc: 'All installments paid. Contract closed.' },
  { label: 'Defaulted', color: 'bg-red-100 text-red-700', desc: 'Customer has stopped paying. In arrears.' },
  { label: 'Cancelled', color: 'bg-slate-100 text-slate-600', desc: 'Contract was cancelled before activation.' },
];

const TIPS = [
  { icon: Smartphone, text: 'Device locks automatically the morning after a missed payment.' },
  { icon: AlertCircle, text: 'Check your dashboard daily for overdue alerts and revision requests.' },
  { icon: TrendingUp, text: 'Settle your deposit balance promptly to keep your ledger clean.' },
  { icon: ClipboardCheck, text: 'Double-check customer ID and phone number before submitting a contract — revisions delay activation.' },
];

export default function AgentOverviewPage() {
  return (
    <div className="min-h-screen bg-[hsl(210,20%,97%)] pb-12">

      {/* Hero */}
      <div className="bg-[hsl(222,47%,11%)] px-4 pt-6 pb-6">
        <p className="text-[11px] font-semibold text-blue-400 tracking-widest uppercase mb-1">Agent Portal</p>
        <h1 className="text-[24px] font-black text-white tracking-tight leading-tight">
          How It Works
        </h1>
        <p className="text-slate-400 text-[13px] mt-1.5 leading-relaxed">
          A quick guide to the agent portal — workflow, pages, and what everything means.
        </p>
        <div className="h-px bg-white/10 mt-4" />
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { label: 'Dashboard', href: '/admin/agent/dashboard' },
            { label: 'My Contracts', href: '/admin/agent/contracts' },
            { label: 'Deposit Ledger', href: '/admin/agent/deposits' },
            { label: 'Price Chart', href: '/admin/price-chart' },
          ].map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-300 bg-white/10 border border-white/10 rounded-full px-3 py-1.5 hover:bg-white/20 transition-colors"
            >
              {link.label} <ChevronRight className="w-3 h-3" />
            </Link>
          ))}
        </div>
      </div>
      <div className="h-1 bg-blue-600" />

      <div className="px-4 pt-6 space-y-8">

        {/* ── WORKFLOW ── */}
        <section>
          <h2 className="text-[13px] font-bold text-slate-500 uppercase tracking-widest mb-4">
            Step-by-Step Workflow
          </h2>

          <div className="relative">
            {/* Vertical connector line */}
            <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-slate-200 z-0" />

            <div className="space-y-3 relative z-10">
              {WORKFLOW_STEPS.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.step} className="flex gap-3">
                    {/* Step number circle */}
                    <div className={`shrink-0 w-10 h-10 rounded-full ${s.color} flex items-center justify-center shadow-sm`}>
                      <span className="text-white text-[13px] font-black">{s.step}</span>
                    </div>

                    {/* Card */}
                    <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className={`px-4 py-3 flex items-center gap-2.5 border-b ${s.light} border-opacity-60`}>
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="text-[13px] font-bold">{s.title}</span>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-[12px] text-slate-600 leading-relaxed">{s.desc}</p>
                        <Link
                          href={s.href}
                          className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
                        >
                          {s.cta} <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── PORTAL PAGES ── */}
        <section>
          <h2 className="text-[13px] font-bold text-slate-500 uppercase tracking-widest mb-4">
            Portal Pages
          </h2>
          <div className="space-y-3">
            {PORTAL_SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <div key={section.title} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Header */}
                  <div className={`${section.color} px-4 py-3 flex items-center justify-between`}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-[13px] font-bold text-white">{section.title}</span>
                    </div>
                    <Link
                      href={section.href}
                      className="text-[11px] font-semibold text-white/80 hover:text-white flex items-center gap-1"
                    >
                      Open <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Body */}
                  <div className="px-4 py-3">
                    <p className="text-[12px] text-slate-600 leading-relaxed mb-3">{section.desc}</p>
                    <ul className="space-y-1.5">
                      {section.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2 text-[12px] text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── CONTRACT STATUS GUIDE ── */}
        <section>
          <h2 className="text-[13px] font-bold text-slate-500 uppercase tracking-widest mb-4">
            Contract Status Guide
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-50">
            {CONTRACT_STATUSES.map((s) => (
              <div key={s.label} className="flex items-center gap-3 px-4 py-3">
                <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full ${s.color}`}>
                  {s.label}
                </span>
                <p className="text-[12px] text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── TIPS ── */}
        <section>
          <h2 className="text-[13px] font-bold text-slate-500 uppercase tracking-widest mb-4">
            Tips
          </h2>
          <div className="space-y-2.5">
            {TIPS.map((tip, i) => {
              const Icon = tip.icon;
              return (
                <div key={i} className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <Icon className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-[12px] text-blue-800 leading-relaxed">{tip.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── QUICK LINKS ── */}
        <section>
          <h2 className="text-[13px] font-bold text-slate-500 uppercase tracking-widest mb-4">
            Quick Links
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Dashboard', href: '/admin/agent/dashboard', icon: LayoutDashboard, color: 'bg-blue-600' },
              { label: 'My Contracts', href: '/admin/agent/contracts', icon: FileText, color: 'bg-indigo-600' },
              { label: 'Deposit Ledger', href: '/admin/agent/deposits', icon: Wallet, color: 'bg-purple-600' },
              { label: 'Price Chart', href: '/admin/price-chart', icon: Tags, color: 'bg-cyan-600' },
            ].map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className="flex flex-col items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl py-5 shadow-sm hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className={`w-9 h-9 rounded-xl ${link.color} flex items-center justify-center`}>
                    <Icon className="w-4.5 h-4.5 text-white" />
                  </div>
                  <span className="text-[12px] font-semibold text-slate-700">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
}
