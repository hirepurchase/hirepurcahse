"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Home, FileText, CreditCard, User, LogOut, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type { Customer } from "@/types";
import type { LucideIcon } from "lucide-react";

type NavItem = { name: string; href: string; icon: LucideIcon; tabLabel?: string };

const navigation: NavItem[] = [
  { name: "Dashboard",   href: "/customer/dashboard", icon: Home,       tabLabel: "Home" },
  { name: "My Contracts",href: "/customer/contracts",  icon: FileText,   tabLabel: "Contracts" },
  { name: "Payments",    href: "/customer/payments",   icon: CreditCard, tabLabel: "Payments" },
  { name: "Profile",     href: "/customer/profile",    icon: User,       tabLabel: "Profile" },
];

// First 3 in bottom tab bar; rest go in "More" sheet
const TAB_ITEMS = navigation.slice(0, 3);
const MORE_ITEMS = navigation.slice(3);

// ─── Desktop Sidebar ────────────────────────────────────────────────────────

function SidebarContent({ user, pathname, onNavigate, onLogout }: {
  user: Customer | null;
  pathname: string | null;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}) {
  return (
    <>
      <div className="p-5 border-b border-white/20 bg-white/5 shrink-0">
        <h1 className="text-xl font-bold tracking-tight">AIDOO TECH</h1>
        <p className="text-white/80 text-sm mt-1 truncate">{user?.firstName} {user?.lastName}</p>
        <p className="text-white/50 text-xs font-mono mt-0.5 truncate">ID: {user?.membershipId}</p>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navigation.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <button key={item.href} onClick={() => onNavigate(item.href)}
              className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium",
                active ? "bg-white/15 text-white ring-1 ring-white/25" : "text-white/70 hover:bg-white/10 hover:text-white")}>
              <item.icon className={cn("h-5 w-5 shrink-0", active ? "text-white" : "text-white/50")} />
              <span className="truncate">{item.name}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-white/15 shrink-0">
        <button onClick={onLogout}
          className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors">
          <LogOut className="h-5 w-5 shrink-0 text-white/50" /> Logout
        </button>
      </div>
      <div className="px-5 py-3 border-t border-white/15 shrink-0">
        <p className="text-xs text-white/40">EYO Solutions · 0246-462398</p>
      </div>
    </>
  );
}

// ─── Mobile Bottom Tab Bar ──────────────────────────────────────────────────

function MobileTabBar({ pathname, onNavigate, moreOpen, onMoreToggle }: {
  pathname: string | null;
  onNavigate: (href: string) => void;
  moreOpen: boolean;
  onMoreToggle: () => void;
}) {
  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + "/");
  const moreActive = moreOpen || !TAB_ITEMS.some((t) => isActive(t.href));

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t-2 border-gray-100 shadow-lg safe-area-bottom">
      <div className="flex items-stretch h-16">
        {TAB_ITEMS.map((tab) => {
          const active = isActive(tab.href);
          return (
            <button key={tab.href} onClick={() => onNavigate(tab.href)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors",
                active ? "text-teal-600 bg-teal-50/60" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              )}>
              <tab.icon
                className={cn("h-6 w-6 transition-all", active ? "text-teal-600" : "text-gray-400")}
                strokeWidth={active ? 2.5 : 1.75}
                fill={active ? "rgba(13,148,136,0.1)" : "none"}
              />
              <span className={cn("text-[10px] font-semibold leading-none", active ? "text-teal-600" : "text-gray-400")}>
                {tab.tabLabel ?? tab.name}
              </span>
              {active && <div className="absolute bottom-0 h-0.5 w-8 bg-teal-500 rounded-full" />}
            </button>
          );
        })}

        {/* More tab */}
        <button onClick={onMoreToggle}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors",
            moreActive ? "text-teal-600 bg-teal-50/60" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
          )}>
          <svg className={cn("h-6 w-6", moreActive ? "text-teal-600" : "text-gray-400")}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={moreActive ? 2.5 : 1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className={cn("text-[10px] font-semibold leading-none", moreActive ? "text-teal-600" : "text-gray-400")}>
            More
          </span>
          {moreActive && <div className="absolute bottom-0 h-0.5 w-8 bg-teal-500 rounded-full" />}
        </button>
      </div>
    </nav>
  );
}

// ─── "More" Bottom Sheet ────────────────────────────────────────────────────

const MORE_LINKS = [
  { name: "Profile",    href: "/customer/profile",  emoji: "👤" },
];

function MoreBottomSheet({ open, onClose, user, pathname, onNavigate, onLogout }: {
  open: boolean;
  onClose: () => void;
  user: Customer | null;
  pathname: string | null;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}) {
  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + "/");

  const handleNav = (href: string) => {
    onNavigate(href);
    onClose();
  };

  return (
    <>
      {open && <div className="lg:hidden fixed inset-0 z-40 bg-black/40" onClick={onClose} />}

      <div className={cn(
        "lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-2xl shadow-2xl",
        "transform transition-transform duration-300 ease-out",
        open ? "translate-y-0" : "translate-y-full"
      )}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* User pill */}
        <div className="mx-4 mb-4 flex items-center gap-3 bg-teal-50 rounded-xl px-4 py-3">
          <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-gray-500 font-mono truncate">ID: {user?.membershipId}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white transition-colors shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Extra nav links */}
        <div className="px-4 pb-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Account</p>
          <div className="grid grid-cols-3 gap-2">
            {MORE_LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <button key={link.href} onClick={() => handleNav(link.href)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-xl text-center transition-colors",
                    active ? "bg-teal-600 text-white" : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  )}>
                  <span className="text-2xl leading-none">{link.emoji}</span>
                  <span className="text-xs font-semibold leading-tight">{link.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Logout */}
        <div className="px-4 pb-6 pt-3 border-t border-gray-100 mt-3">
          <button onClick={onLogout}
            className="flex w-full items-center gap-3 px-4 py-3 bg-red-50 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors">
            <LogOut className="h-5 w-5" /> Sign Out
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main Export ────────────────────────────────────────────────────────────

export default function CustomerSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const customerUser = user && "membershipId" in user ? user : null;

  const handleNavigate = (href: string) => router.push(href);

  const handleLogout = () => {
    logout();
    setMoreOpen(false);
    router.push("/customer-login");
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex h-screen w-64 shrink-0 flex-col bg-linear-to-b from-cyan-900 via-teal-900 to-emerald-900 text-white border-r border-white/10">
        <SidebarContent
          user={customerUser}
          pathname={pathname}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      </div>

      {/* Mobile: Bottom Tab Bar */}
      <MobileTabBar
        pathname={pathname}
        onNavigate={handleNavigate}
        moreOpen={moreOpen}
        onMoreToggle={() => setMoreOpen((o) => !o)}
      />

      {/* Mobile: "More" Bottom Sheet */}
      <MoreBottomSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        user={customerUser}
        pathname={pathname}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />
    </>
  );
}
