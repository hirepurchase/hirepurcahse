"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  Warehouse,
  FileText,
  CreditCard,
  BarChart3,
  Shield,
  History,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  Upload,
  AlertCircle,
  MessageSquare,
  ClipboardList,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type { AdminUser } from "@/types";
import type { LucideIcon } from "lucide-react";
import NotificationBell from "./NotificationBell";
import { useDailyPayments } from "@/hooks/useDailyPayments";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: (paymentCount: number) => number | null;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Customers",
    items: [
      { name: "Customers", href: "/admin/customers", icon: Users },
    ],
  },
  {
    label: "Contracts & Payments",
    items: [
      { name: "Contracts", href: "/admin/contracts", icon: FileText },
      {
        name: "Payments",
        href: "/admin/payments",
        icon: CreditCard,
        badge: (count) => (count > 0 ? count : null),
      },
      { name: "Payment Management", href: "/admin/failed-payments", icon: AlertCircle },
    ],
  },
  {
    label: "Inventory",
    items: [
      { name: "Products", href: "/admin/products", icon: Package },
      { name: "Inventory", href: "/admin/inventory", icon: Warehouse },
    ],
  },
  {
    label: "Communications",
    items: [
      { name: "Send SMS", href: "/admin/sms", icon: MessageSquare },
      { name: "SMS Log", href: "/admin/sms/log", icon: ClipboardList },
      { name: "Notifications", href: "/admin/settings/notifications", icon: Bell },
    ],
  },
  {
    label: "Reports",
    items: [
      { name: "Reports", href: "/admin/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Administration",
    items: [
      { name: "Import Data", href: "/admin/import", icon: Upload },
      { name: "Users", href: "/admin/users", icon: Settings },
      { name: "Roles & Permissions", href: "/admin/roles", icon: Shield },
      { name: "Audit Trail", href: "/admin/audit", icon: History },
    ],
  },
];

type SidebarContentProps = {
  user: AdminUser | null;
  pathname: string | null;
  paymentCount: number;
  onNavigate: () => void;
  onLogout: () => void;
};

function SidebarContent({ user, pathname, paymentCount, onNavigate, onLogout }: SidebarContentProps) {
  // Pre-expand the group containing the active page
  const activeGroup = navGroups.findIndex(g => g.items.some(i => pathname === i.href || pathname?.startsWith(i.href + '/')));
  const [openGroups, setOpenGroups] = useState<Set<number>>(() => {
    const s = new Set<number>();
    if (activeGroup >= 0) s.add(activeGroup);
    // Always keep Overview open (single item, looks better)
    s.add(0);
    return s;
  });

  const toggleGroup = (idx: number) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  return (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-cyan-300/25 px-4 bg-white/5 flex-shrink-0">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight">AIDOO TECH</h1>
      </div>

      {/* User Info */}
      <div className="border-b border-cyan-300/20 p-3 sm:p-4 flex-shrink-0">
        <p className="text-xs sm:text-sm font-medium truncate">
          {user?.firstName} {user?.lastName}
        </p>
        <p className="text-xs text-cyan-100/70 truncate">{user?.role}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navGroups.map((group, groupIdx) => {
          const isOpen = openGroups.has(groupIdx);
          const isSingleItem = group.items.length === 1;

          if (isSingleItem) {
            // Render single-item groups without a collapsible header
            const item = group.items[0];
            const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname?.startsWith(item.href + '/'));
            const badgeCount = item.badge?.(paymentCount) ?? null;
            return (
              <div key={groupIdx}>
                <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-cyan-100/40">
                  {group.label}
                </p>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-colors",
                    isActive
                      ? "bg-white/16 text-white ring-1 ring-white/20"
                      : "text-cyan-50/85 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <item.icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span className="flex-1 truncate">{item.name}</span>
                  {badgeCount !== null && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-green-500 px-1 text-[10px] font-bold text-white">
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </Link>
              </div>
            );
          }

          return (
            <div key={groupIdx}>
              {/* Group header — collapsible */}
              <button
                onClick={() => toggleGroup(groupIdx)}
                className="w-full flex items-center justify-between px-3 pt-3 pb-1 group"
              >
                <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-100/40 group-hover:text-cyan-100/70 transition-colors">
                  {group.label}
                </p>
                {isOpen
                  ? <ChevronDown className="h-3 w-3 text-cyan-100/30" />
                  : <ChevronRight className="h-3 w-3 text-cyan-100/30" />
                }
              </button>

              {isOpen && (
                <div className="space-y-0.5">
                  {group.items.map(item => {
                    const isActive = pathname === item.href || (pathname?.startsWith(item.href + '/') && item.href !== '/admin/sms');
                    const badgeCount = item.badge?.(paymentCount) ?? null;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-colors",
                          isActive
                            ? "bg-white/16 text-white ring-1 ring-white/20"
                            : "text-cyan-50/85 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <item.icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                        <span className="flex-1 truncate">{item.name}</span>
                        {badgeCount !== null && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-green-500 px-1 text-[10px] font-bold text-white">
                            {badgeCount > 99 ? "99+" : badgeCount}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Daily Payments Bell */}
      <div className="border-t border-cyan-300/20 p-3 sm:p-4 flex-shrink-0">
        <div className="flex items-center gap-3 px-3 py-1">
          <NotificationBell />
          <span className="text-xs sm:text-sm font-medium text-cyan-50/85">Daily Payments</span>
        </div>
      </div>

      {/* Logout */}
      <div className="border-t border-cyan-300/20 p-3 sm:p-4 flex-shrink-0">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium text-cyan-50/85 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
          Logout
        </button>
      </div>

      {/* Footer */}
      <div className="border-t border-cyan-300/20 p-3 sm:p-4 flex-shrink-0">
        <p className="text-xs text-cyan-100/70">
          EYO Solutions
          <br />
          0246-462398
        </p>
      </div>
    </>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { count: paymentCount } = useDailyPayments();

  const adminUser = user && "role" in user ? user : null;

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-950 text-white rounded-xl shadow-[0_12px_26px_-14px_rgba(2,132,199,0.75)]"
      >
        {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex h-screen w-64 flex-col bg-gradient-to-b from-slate-950 via-cyan-950 to-slate-900 text-white border-r border-white/10">
        <SidebarContent
          user={adminUser}
          pathname={pathname}
          paymentCount={paymentCount}
          onNavigate={() => setMobileMenuOpen(false)}
          onLogout={() => { logout(); setMobileMenuOpen(false); }}
        />
      </div>

      {/* Mobile Sidebar */}
      <div
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-40 w-64 flex flex-col bg-gradient-to-b from-slate-950 via-cyan-950 to-slate-900 text-white transform transition-transform duration-300 ease-in-out",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent
          user={adminUser}
          pathname={pathname}
          paymentCount={paymentCount}
          onNavigate={() => setMobileMenuOpen(false)}
          onLogout={() => { logout(); setMobileMenuOpen(false); }}
        />
      </div>
    </>
  );
}
