import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Wallet } from "lucide-react";
import { InstallAppButton } from "@/components/shared/InstallAppButton";
import DeveloperCredit from "@/components/shared/DeveloperCredit";

const portals = [
  { href: "/admin-login", title: "Staff portal", description: "Customers, contracts, inventory, and collections.", icon: ShieldCheck, color: "bg-blue-50 text-blue-800" },
  { href: "/customer-login", title: "Customer portal", description: "Balances, installments, and payment history.", icon: Wallet, color: "bg-teal-50 text-teal-800" },
];

export default function Home() {
  return (
    <main className="min-h-dvh">
      <div className="bg-slate-950 px-5 pb-20 pt-8 text-white sm:px-8 sm:pb-28">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-3 font-semibold">
            <Image src="/logo-mark-white.png" alt="" width={36} height={36} />
            Aidoo Tech Solutions
          </div>
          <h1 className="mt-10 text-4xl font-bold tracking-tight sm:text-5xl">Hire Purchase</h1>
          <p className="mt-3 text-base text-slate-300">Choose a portal to sign in.</p>
        </div>
      </div>
      <div className="relative mx-auto -mt-10 max-w-[60rem] px-5 pb-8 sm:px-8">
        <nav aria-label="Sign-in portals" className="grid gap-4 sm:grid-cols-2">
          {portals.map(({ href, title, description, icon: Icon, color }) => (
            <Link key={href} href={href} className="operations-panel block p-5 transition-colors hover:border-blue-400 sm:p-6">
              <span className={`grid size-11 place-items-center rounded-xl ${color}`}><Icon aria-hidden="true" className="size-5" /></span>
              <h2 className="mt-4 text-xl font-bold text-slate-950">{title}</h2>
              <p className="mt-2 text-base text-slate-600">{description}</p>
            </Link>
          ))}
        </nav>
        <div className="mt-6 text-sm leading-6 text-slate-600">
          <p>First time signing in? Customers use their phone number as their initial password.</p>
          <p>For help signing in, staff can contact their administrator and customers can contact their agent.</p>
        </div>
        <footer className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t py-4 text-sm">
          <Link href="/privacy" className="font-medium text-slate-700 hover:underline">Privacy policy</Link>
          <InstallAppButton />
          <DeveloperCredit align="left" />
        </footer>
      </div>
    </main>
  );
}
