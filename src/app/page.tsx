"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Smartphone,
  ShieldCheck,
  Wallet,
  Users,
  LayoutGrid,
} from "lucide-react";

/**
 * The public entry point. Its one job is to put a person into the right portal
 * in a single tap, so it is built as a gateway rather than a marketing page.
 *
 * Colours are taken from the logo itself — #013B9A is sampled from the mark —
 * instead of the teal and amber gradients that were here before and matched
 * nothing else in the product.
 */

const BRAND = "#013B9A";

const ASSURANCES = [
  {
    icon: ShieldCheck,
    title: "Device protection",
    body: "Financed phones are enrolled with Samsung Knox Guard and released automatically once payments are up to date.",
  },
  {
    icon: Wallet,
    title: "Mobile money & direct debit",
    body: "Repayments come in through Hubtel and post themselves against the right instalment.",
  },
  {
    icon: BarChart3,
    title: "Every cedi accounted for",
    body: "Agents, stock, collections and portfolio risk tracked in one place, across the whole book.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-900">
      {/* A single restrained brand wash, rather than competing colour blobs. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(1,59,154,0.10),transparent_65%)]"
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 sm:px-8">
        <header className="flex items-center justify-between gap-4 py-6">
          <div className="flex items-center gap-3">
            <img
              src="/logo-mark.png"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />
            <div className="leading-tight">
              <p className="text-[15px] font-bold tracking-tight text-slate-900">
                Aidoo Tech Solutions
              </p>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                Hire Purchase
              </p>
            </div>
          </div>

          <Link
            href="/admin-login"
            className="hidden rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-white hover:text-slate-900 sm:inline-flex"
          >
            Staff sign in
          </Link>
        </header>

        <main className="flex flex-1 items-center py-6 sm:py-10">
          <div className="grid w-full items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
            {/* What this is */}
            <section className="order-2 pt-2 lg:order-1">
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
                style={{ borderColor: "rgba(1,59,154,0.25)", color: BRAND, background: "rgba(1,59,154,0.06)" }}
              >
                <Smartphone className="h-3.5 w-3.5" />
                Device financing in Ghana
              </span>

              <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl">
                Own the phone.
                <br />
                <span style={{ color: BRAND }}>Pay week by week.</span>
              </h1>

              <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">
                The hire purchase platform behind Aidoo Tech Solutions — where our
                agents write contracts and our customers keep track of what they
                owe. Choose your portal to sign in.
              </p>

              <dl className="mt-9 grid gap-5 sm:grid-cols-3">
                {ASSURANCES.map(({ icon: Icon, title, body }) => (
                  <div key={title}>
                    <dt className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Icon className="h-4 w-4 shrink-0" style={{ color: BRAND }} />
                      {title}
                    </dt>
                    <dd className="mt-1.5 text-[13px] leading-6 text-slate-600">{body}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* Where to go — the actual purpose of the page */}
            <section aria-label="Choose a portal" className="order-1 w-full lg:order-2">
              <div className="rounded-3xl border border-slate-200/80 bg-white p-2 shadow-[0_30px_70px_-45px_rgba(10,22,51,0.5)]">
                <Link
                  href="/admin-login"
                  className="group flex items-center gap-4 rounded-2xl p-5 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ outlineColor: BRAND }}
                >
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ background: BRAND }}
                  >
                    <LayoutGrid className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-bold text-slate-900">Staff portal</span>
                    <span className="mt-0.5 block text-[13px] leading-5 text-slate-600">
                      Agents, cluster leaders, customer service and administrators.
                    </span>
                  </span>
                  <ArrowRight
                    className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5"
                    style={{ color: BRAND }}
                  />
                </Link>

                <div className="mx-5 h-px bg-slate-100" />

                <Link
                  href="/customer-login"
                  className="group flex items-center gap-4 rounded-2xl p-5 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ outlineColor: BRAND }}
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <Users className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-bold text-slate-900">Customer portal</span>
                    <span className="mt-0.5 block text-[13px] leading-5 text-slate-600">
                      Check your balance, see your payment history and pay an instalment.
                    </span>
                  </span>
                  <ArrowRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>

              {/* Kept from the old page because customers genuinely need it, but
                  attached to the portal it belongs to instead of floating loose. */}
              <p className="mt-4 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-[13px] leading-6 text-slate-600">
                <span className="font-semibold text-slate-800">First time signing in?</span>{" "}
                Customers use their phone number as both username and initial password, then set a
                new one.
              </p>
            </section>
          </div>
        </main>

        <footer className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-slate-200 py-6 text-center text-xs text-slate-500 sm:flex-row sm:text-left">
          <p>&copy; {new Date().getFullYear()} Aidoo Tech Solutions. All rights reserved.</p>
          <p className="font-medium text-slate-600">hirepurchase.aidootechsolutions.com</p>
        </footer>
      </div>
    </div>
  );
}
