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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type { AdminUser } from "@/types";
import type { LucideIcon } from "lucide-react";
import NotificationBell from "./NotificationBell";
import { useDailyPayments } from "@/hooks/useDailyPayments";

const navigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Customers", href: "/admin/customers", icon: Users },
  { name: "Products", href: "/admin/products", icon: Package },
  { name: "Inventory", href: "/admin/inventory", icon: Warehouse },
  { name: "Contracts", href: "/admin/contracts", icon: FileText },
  { name: "Payments", href: "/admin/payments", icon: CreditCard },
  { name: "Payment Management", href: "/admin/failed-payments", icon: AlertCircle },
  { name: "Reports", href: "/admin/reports", icon: BarChart3 },
  { name: "Import Data", href: "/admin/import", icon: Upload },
  { name: "Notifications", href: "/admin/settings/notifications", icon: Bell },
  { name: "Users", href: "/admin/users", icon: Settings },
  { name: "Roles & Permissions", href: "/admin/roles", icon: Shield },
  { name: "Audit Trail", href: "/admin/audit", icon: History },
];

type NavigationItem = {
  name: string;
  href: string;
  icon: LucideIcon;
};

type SidebarContentProps = {
  user: AdminUser | null;
  navigation: NavigationItem[];
  pathname: string | null;
  paymentCount: number;
  onNavigate: () => void;
  onLogout: () => void;
};

function SidebarContent({
  user,
  navigation,
  pathname,
  paymentCount,
  onNavigate,
  onLogout,
}: SidebarContentProps) {
  return (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-cyan-300/25 px-4 bg-white/5">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight">AIDOO TECH</h1>
      </div>

      {/* User Info */}
      <div className="border-b border-cyan-300/20 p-3 sm:p-4">
        <p className="text-xs sm:text-sm font-medium truncate">
          {user?.firstName} {user?.lastName}
        </p>
        <p className="text-xs text-cyan-100/70 truncate">{user?.role}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3 sm:p-4 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const isPayments = item.href === "/admin/payments";
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-colors",
                isActive
                  ? "bg-white/16 text-white ring-1 ring-white/30"
                  : "text-cyan-50/85 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="truncate flex-1">{item.name}</span>
              {isPayments && paymentCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-green-500 px-1 text-[10px] font-bold text-white leading-none">
                  {paymentCount > 99 ? "99+" : paymentCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Daily Payments Bell */}
      <div className="border-t border-cyan-300/20 p-3 sm:p-4">
        <div className="flex items-center gap-3 px-3 py-1">
          <NotificationBell />
          <span className="text-xs sm:text-sm font-medium text-cyan-50/85">Daily Payments</span>
        </div>
      </div>

      {/* Logout */}
      <div className="border-t border-cyan-300/20 p-3 sm:p-4">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium text-cyan-50/85 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
          Logout
        </button>
      </div>

      {/* Footer */}
      <div className="border-t border-cyan-300/20 p-3 sm:p-4">
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
        {mobileMenuOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
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
          navigation={navigation}
          pathname={pathname}
          paymentCount={paymentCount}
          onNavigate={() => setMobileMenuOpen(false)}
          onLogout={() => {
            logout();
            setMobileMenuOpen(false);
          }}
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
          navigation={navigation}
          pathname={pathname}
          paymentCount={paymentCount}
          onNavigate={() => setMobileMenuOpen(false)}
          onLogout={() => {
            logout();
            setMobileMenuOpen(false);
          }}
        />
      </div>
    </>
  );
}
