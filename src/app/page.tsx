"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
  },
  {
    href: "/customer-login",
    label: "Customer portal",
    who: "Balances, payment history and instalment payments",
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
      <main className="flex px-6 py-10 sm:px-10 lg:items-center lg:px-16 lg:py-12">
        <div className="w-full max-w-lg">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Sign in</h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Choose the portal for your account.
          </p>

          <div className="mt-7 border-t border-slate-200">
            {ENTRANCES.map(({ href, label, who }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-5 border-b border-slate-200 py-5 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-slate-900">{label}</span>
                  <span className="mt-1 block text-[13px] leading-5 text-slate-500">{who}</span>
                </span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-slate-500"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>

          <dl className="mt-8 space-y-3 text-[13px] leading-5">
            <div className="flex gap-3">
              <dt className="w-32 shrink-0 font-medium text-slate-500">First sign-in</dt>
              <dd className="text-slate-700">
                Customers use their phone number as both username and password, then set a new one.
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-32 shrink-0 font-medium text-slate-500">Trouble signing in</dt>
              <dd className="text-slate-700">
                Staff should contact their administrator; customers should contact their agent.
              </dd>
            </div>
          </dl>

          <p className="mt-10 border-t border-slate-200 pt-5 text-xs text-slate-400">
            hirepurchase.aidootechsolutions.com &middot; &copy; {new Date().getFullYear()} Aidoo Tech
            Solutions
          </p>
        </div>
      </main>
    </div>
  );
}
