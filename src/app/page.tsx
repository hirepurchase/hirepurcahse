"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck, ShoppingCart, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f6f4ee]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(13,148,136,0.14),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(251,146,60,0.16),transparent_20%),linear-gradient(180deg,#f8f6f1_0%,#f8fafc_55%,#eef7f4_100%)]" />
      <div className="absolute -left-24 top-16 h-52 w-52 rounded-full bg-emerald-300/25 blur-3xl" />
      <div className="absolute bottom-10 right-[-2rem] h-56 w-56 rounded-full bg-amber-200/30 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6 sm:px-6">
        <header className="flex items-center justify-between">
          <button
            className="flex items-center gap-3 text-left"
            onClick={() => router.push("/")}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f766e_0%,#0f172a_100%)] text-white shadow-[0_18px_40px_-22px_rgba(15,118,110,0.85)]">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight text-slate-900">
                AIDOO TECH
              </p>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Hire Purchase
              </p>
            </div>
          </button>

          <Button
            variant="ghost"
            className="hidden text-slate-700 sm:inline-flex"
            onClick={() => router.push("/admin-login")}
          >
            Admin Login
          </Button>
        </header>

        <main className="flex flex-1 items-center justify-center py-10 sm:py-14">
          <section className="w-full max-w-3xl rounded-[32px] border border-white/80 bg-white/76 px-6 py-10 text-center shadow-[0_40px_110px_-54px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:px-10 sm:py-14">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-800">
              <ShieldCheck className="h-3.5 w-3.5" />
              Aidoo Tech Solutions
            </div>

            <h1 className="mt-6 text-balance text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Access to your Hire purchase workspace.
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-balance text-sm leading-7 text-slate-600 sm:text-base">
              Manage operations from the admin portal or track repayments from
              the customer portal.
            </p>

            <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="flex-1 rounded-2xl bg-[linear-gradient(135deg,#0f766e_0%,#115e59_48%,#0f172a_100%)] shadow-[0_24px_40px_-24px_rgba(15,118,110,0.9)]"
                onClick={() => router.push("/admin-login")}
              >
                Admin Portal
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex-1 rounded-2xl border-slate-200 bg-white/90"
                onClick={() => router.push("/customer-login")}
              >
                <Users className="h-4 w-4" />
                Customer Portal
              </Button>
            </div>

            <p className="mt-6 text-xs text-slate-500">
              Customer default username and initial password: phone number.
            </p>
          </section>
        </main>

        <footer className="pb-2 text-center text-xs text-slate-500">
          &copy; 2026 AIDOO TECH
        </footer>
      </div>
    </div>
  );
}
