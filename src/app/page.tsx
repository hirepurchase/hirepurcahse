"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, Wallet } from "lucide-react";

/**
 * Entry point for an internal system, so it is built as a sign-in chooser
 * rather than a marketing page: a solid brand panel identifying the system,
 * and a short list of the ways in.
 *
 * Deliberately avoids the consumer-landing furniture that was here before —
 * pill badges, gradient washes, floating rounded cards with long shadows.
 * Everyone who reaches this page already works here; they need to know they
 * are in the right place and get to their portal.
 */

const BRAND = "#013B9A";

const ENTRANCES = [
  {
    href: "/admin-login",
    label: "Staff portal",
    who: "Agents, cluster leaders, customer service, administrators",
    icon: ShieldCheck,
  },
  {
    href: "/customer-login",
    label: "Customer portal",
    who: "Balances, payment history and instalment payments",
    icon: Wallet,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-900 lg:grid lg:grid-cols-[minmax(0,420px)_1fr]">
      {/* Identity panel — a flat block of brand, no gradient. */}
      <aside
        className="flex flex-col justify-between px-6 py-8 text-white sm:px-10 lg:py-10"
        style={{ backgroundColor: BRAND }}
      >
        <div className="flex items-center gap-3">
          <img
            src="/logo-mark-white.png"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
          />
          <div className="leading-tight">
            <p className="text-[15px] font-semibold tracking-tight">Aidoo Tech Solutions</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
              Hire Purchase
            </p>
          </div>
        </div>

        <div className="mt-8 lg:mt-0">
          <h1 className="text-[22px] font-semibold leading-[1.2] tracking-tight lg:text-[27px]">
            Hire Purchase
            <br className="hidden lg:inline" /> Management System
          </h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-white/70 lg:mt-4 lg:max-w-xs">
            Contracts, collections, inventory and device control for the Aidoo Tech
            agent network.
          </p>
        </div>

        <p className="hidden text-[11px] uppercase tracking-[0.16em] text-white/45 lg:block">
          Authorised users only
        </p>
      </aside>

      {/* Ways in */}
      <main className="flex px-6 py-10 sm:px-10 lg:items-center lg:px-12 lg:py-12">
        <div className="mx-auto w-full max-w-[420px]">
          <h2 className="text-[26px] font-semibold leading-tight tracking-tight text-slate-900">
            Sign in
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Two portals run on this system. Choose the one your account belongs to.
          </p>

          {/* A bordered list, not floating cards: the rows read as one control
              with a clear boundary, which is what a chooser should look like. */}
          <div className="mt-7 divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200">
            {ENTRANCES.map(({ href, label, who, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-4 bg-white px-4 py-4 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border transition-colors"
                  style={{ borderColor: "rgba(1,59,154,0.18)", backgroundColor: "rgba(1,59,154,0.05)" }}
                >
                  <Icon className="h-[18px] w-[18px]" style={{ color: BRAND }} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-slate-900">{label}</span>
                  <span className="mt-0.5 block text-[13px] leading-5 text-slate-500">{who}</span>
                </span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>

          {/* The two questions this screen actually gets asked. */}
          <div className="mt-6 rounded-lg bg-slate-50 px-4 py-4 text-[13px] leading-6 text-slate-600">
            <p>
              <span className="font-semibold text-slate-800">Signing in for the first time?</span>{" "}
              Customers use their phone number as both username and password, then set a new one.
            </p>
            <p className="mt-2">
              <span className="font-semibold text-slate-800">Cannot get in?</span> Staff should
              contact their administrator, customers their agent.
            </p>
          </div>

          <p className="mt-8 text-xs leading-5 text-slate-400">
            hirepurchase.aidootechsolutions.com
            <br />
            &copy; {new Date().getFullYear()} Aidoo Tech Solutions
          </p>
        </div>
      </main>
    </div>
  );
}
