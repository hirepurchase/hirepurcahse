"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CreditCard, FileText, Menu, ShieldCheck, ShoppingCart, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const highlights = [
  {
    title: "Customer Management",
    description: "Complete customer lifecycle, onboarding, and account visibility.",
    icon: Users,
  },
  {
    title: "Contract Intelligence",
    description: "Track schedules, balances, and contract performance in one flow.",
    icon: FileText,
  },
  {
    title: "Integrated Payments",
    description: "Built for mobile money with live status and retry handling.",
    icon: CreditCard,
  },
];

export default function Home() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-white/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <button
            className="flex items-center gap-2"
            onClick={() => router.push("/")}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_12px_28px_-14px_rgba(13,148,136,0.75)]">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold tracking-tight text-slate-900">AIDOO TECH</p>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Hire Purchase OS</p>
            </div>
          </button>

          <nav className="hidden items-center gap-3 md:flex">
            <Button variant="ghost" onClick={() => router.push("/customer-login")}>
              Customer Portal
            </Button>
            <Button onClick={() => router.push("/admin-login")}>
              Admin Portal
            </Button>
          </nav>

          <button
            className="rounded-xl border border-slate-200 bg-white p-2 md:hidden"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5 text-slate-700" /> : <Menu className="h-5 w-5 text-slate-700" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
            <div className="flex flex-col gap-2">
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => {
                  router.push("/customer-login");
                  setMobileMenuOpen(false);
                }}
              >
                Customer Portal
              </Button>
              <Button
                className="justify-start"
                onClick={() => {
                  router.push("/admin-login");
                  setMobileMenuOpen(false);
                }}
              >
                Admin Portal
              </Button>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:pt-14">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 p-7 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.65)] backdrop-blur-md sm:p-10 lg:p-14">
          <div className="absolute -left-24 top-0 h-56 w-56 rounded-full bg-cyan-300/40 blur-3xl" />
          <div className="absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-amber-200/50 blur-3xl" />

          <div className="relative grid gap-9 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="space-y-5">
              <p className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-800">
                <ShieldCheck className="h-3.5 w-3.5" />
                Operational Control Center
              </p>
              <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Modern Hire Purchase
                <span className="block text-primary">Built for Daily Operations</span>
              </h1>
              <p className="max-w-xl text-base text-slate-600 sm:text-lg">
                Manage contracts, payments, inventory, and customer activity from one dependable platform designed for speed and clarity.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" onClick={() => router.push("/admin-login")}>
                  Enter Admin Workspace
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => router.push("/customer-login")}>
                  Open Customer Portal
                </Button>
              </div>
            </div>

            <Card className="border-slate-200/70 bg-white/90">
              <CardHeader className="space-y-3">
                <CardTitle className="text-xl">Quick Access</CardTitle>
                <CardDescription>
                  Pick your workspace to continue.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" onClick={() => router.push("/admin-login")}>
                  <ShieldCheck className="h-4 w-4" />
                  Admin Login
                </Button>
                <Button className="w-full justify-start" variant="secondary" onClick={() => router.push("/customer-login")}>
                  <Users className="h-4 w-4" />
                  Customer Login
                </Button>
                <p className="pt-1 text-xs text-slate-500">
                  Customer default username and initial password: phone number.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {highlights.map((item, index) => (
            <Card
              key={item.title}
              className="translate-y-0 animate-[rise-in_420ms_cubic-bezier(0.19,1,0.22,1)] border-white/70 bg-white/90"
              style={{ animationDelay: `${index * 110}ms` }}
            >
              <CardHeader>
                <div className="mb-1 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-cyan-100">
                  <item.icon className="h-5 w-5" />
                </div>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>
      </main>

      <footer className="border-t border-white/60 bg-slate-950 px-4 py-9 text-slate-300 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-100">AIDOO TECH</p>
            <p className="text-xs text-slate-400">Hire Purchase Management Platform</p>
          </div>
          <div className="text-xs text-slate-400">
            <p>&copy; 2026 AIDOO TECH. All rights reserved.</p>
            <p>Built by EYO Solutions</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
