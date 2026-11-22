"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileText, CreditCard, User, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import DeveloperCredit from "@/components/shared/DeveloperCredit";

const navigation = [
  { label: "Home", href: "/customer/dashboard", icon: Home },
  { label: "Contracts", href: "/customer/contracts", icon: FileText },
  { label: "Payments", href: "/customer/payments", icon: CreditCard },
  { label: "Profile", href: "/customer/profile", icon: User },
];

export default function CustomerSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const customer = user && "membershipId" in user ? user : null;
  const current = (href: string) => pathname === href || pathname?.startsWith(href + "/");

  return (
    <>
      <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-teal-800 bg-teal-950 text-white lg:flex">
        <Link href="/customer/dashboard" className="flex h-16 shrink-0 items-center gap-3 border-b border-white/15 px-5 font-bold">
          <Image src="/logo-mark-white.png" alt="" width={32} height={32} />
          AidooTech
        </Link>
        {customer && (
          <div className="border-b border-white/15 px-5 py-4">
            <p className="truncate text-sm font-semibold">{customer.firstName} {customer.lastName}</p>
            <p className="mt-1 truncate text-xs text-teal-100">Member {customer.membershipId}</p>
          </div>
        )}
        <nav aria-label="Customer navigation" className="flex-1 space-y-1 overflow-y-auto p-3">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link href={href} key={href} aria-current={current(href) ? "page" : undefined}
              className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
                current(href) ? "bg-teal-800 text-white" : "text-teal-100 hover:bg-white/10 hover:text-white")}>
              <Icon aria-hidden="true" className="size-5" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/15 p-3">
          <button type="button" onClick={logout} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-teal-100 hover:bg-white/10">
            <LogOut aria-hidden="true" className="size-5" /> Sign out
          </button>
          <DeveloperCredit tone="brand" phone="0246-462398" align="left" className="px-3 py-2" />
        </div>
      </aside>
      <nav aria-label="Customer mobile navigation" className="safe-area-bottom fixed inset-x-0 bottom-0 z-40 border-t bg-white lg:hidden">
        <div className="grid h-16 grid-cols-4">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link href={href} key={href} aria-current={current(href) ? "page" : undefined}
              className={cn("flex min-w-0 flex-col items-center justify-center gap-1 text-xs font-semibold",
                current(href) ? "bg-teal-50 text-teal-900" : "text-slate-600 hover:bg-slate-50")}>
              <Icon aria-hidden="true" className="size-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
