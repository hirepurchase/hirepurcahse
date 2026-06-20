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
  AlertCircle,
  MessageSquare,
  ClipboardList,
  ClipboardCheck,
  ChevronDown,
  ChevronRight,
  KeyRound,
  Upload,
  X,
  Briefcase,
  Smartphone,
  Wallet,
  BookOpen,
  DollarSign,
  Menu,
  Tags,
  BookOpenCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import type { AdminUser } from "@/types";
import type { LucideIcon } from "lucide-react";
import {
  CONTRACT_ACCESS_PERMISSIONS,
  CONTRACT_APPROVAL_ACCESS_PERMISSIONS,
  CUSTOMER_ACCESS_PERMISSIONS,
  PERMISSIONS,
  type PermissionName,
} from "@/lib/permissions";
import NotificationBell from "./NotificationBell";
import ContractApprovalBell from "./ContractApprovalBell";
import { useDailyPayments } from "@/hooks/useDailyPayments";
import { usePendingContractApprovals } from "@/hooks/usePendingContractApprovals";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: (paymentCount: number, approvalCount: number) => number | null;
  badgeColor?: "red" | "amber";
  permissions?: readonly PermissionName[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
  permissions?: readonly PermissionName[];
  roles?: string[];
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Agent Menu",
    roles: ["AGENT"],
    items: [
      { name: "Dashboard", href: "/admin/agent/dashboard", icon: LayoutDashboard },
      { name: "My Contracts", href: "/admin/agent/contracts", icon: Briefcase, permissions: [PERMISSIONS.VIEW_OWN_CONTRACTS] },
      { name: "Deposit Ledger", href: "/admin/agent/deposits", icon: Wallet, permissions: [PERMISSIONS.VIEW_AGENT_COMMISSIONS] },
      { name: "Price Chart", href: "/admin/price-chart", icon: Tags, permissions: [] as PermissionName[] },
      { name: "How It Works", href: "/admin/agent/overview", icon: BookOpenCheck, permissions: [] as PermissionName[] },
    ],
  },
  {
    label: "Customers",
    permissions: CUSTOMER_ACCESS_PERMISSIONS,
    items: [
      { name: "Customers", href: "/admin/customers", icon: Users, permissions: CUSTOMER_ACCESS_PERMISSIONS },
    ],
  },
  {
    label: "Contracts & Payments",
    permissions: [...CONTRACT_ACCESS_PERMISSIONS, PERMISSIONS.VIEW_PAYMENTS, ...CONTRACT_APPROVAL_ACCESS_PERMISSIONS],
    items: [
      { name: "Contracts", href: "/admin/contracts", icon: FileText, permissions: CONTRACT_ACCESS_PERMISSIONS },
      {
        name: "Approvals",
        href: "/admin/contract-approvals",
        icon: ClipboardCheck,
        badge: (_pc, ac) => (ac > 0 ? ac : null),
        badgeColor: "amber",
        permissions: CONTRACT_APPROVAL_ACCESS_PERMISSIONS,
      },
      {
        name: "Payments",
        href: "/admin/payments",
        icon: CreditCard,
        badge: (count) => (count > 0 ? count : null),
        badgeColor: "red",
        permissions: [PERMISSIONS.VIEW_PAYMENTS],
      },
      { name: "Payment Management", href: "/admin/failed-payments", icon: AlertCircle, permissions: [PERMISSIONS.VIEW_FAILED_PAYMENTS] },
    ],
  },
  {
    label: "Inventory",
    permissions: [PERMISSIONS.MANAGE_PRODUCTS, PERMISSIONS.MANAGE_INVENTORY],
    items: [
      { name: "Products", href: "/admin/products", icon: Package, permissions: [PERMISSIONS.MANAGE_PRODUCTS] },
      { name: "Inventory", href: "/admin/inventory", icon: Warehouse, permissions: [PERMISSIONS.MANAGE_INVENTORY] },
      { name: "Price Chart", href: "/admin/price-chart", icon: Tags, permissions: [PERMISSIONS.MANAGE_PRODUCTS] },
    ],
  },
  {
    label: "Communications",
    permissions: [PERMISSIONS.MANAGE_SETTINGS],
    items: [
      { name: "Send SMS", href: "/admin/sms", icon: MessageSquare, permissions: [PERMISSIONS.MANAGE_SETTINGS] },
      { name: "SMS Log", href: "/admin/sms/log", icon: ClipboardList, permissions: [PERMISSIONS.MANAGE_SETTINGS] },
      { name: "Notifications", href: "/admin/settings/notifications", icon: Bell, permissions: [PERMISSIONS.MANAGE_SETTINGS] },
      { name: "Retry Settings", href: "/admin/settings/retry-settings", icon: ClipboardCheck, permissions: [PERMISSIONS.MANAGE_SETTINGS] },
    ],
  },
  {
    label: "Reports",
    permissions: [PERMISSIONS.VIEW_REPORTS],
    items: [
      { name: "Reports", href: "/admin/reports", icon: BarChart3, permissions: [PERMISSIONS.VIEW_REPORTS] },
    ],
  },
  {
    label: "Administration",
    permissions: [PERMISSIONS.MANAGE_USERS, PERMISSIONS.MANAGE_ROLES, PERMISSIONS.VIEW_AUDIT_LOGS, PERMISSIONS.MANAGE_SETTINGS, PERMISSIONS.VIEW_DEVICE_CONTROL, PERMISSIONS.MANAGE_DEVICE_CONTROL, PERMISSIONS.MANAGE_AGENT_LEDGER, PERMISSIONS.MANAGE_COMMISSION_SETTINGS],
    items: [
      { name: "Import Data", href: "/admin/import", icon: Upload, permissions: [PERMISSIONS.MANAGE_SETTINGS] },
      { name: "Users", href: "/admin/users", icon: Settings, permissions: [PERMISSIONS.MANAGE_USERS] },
      { name: "Roles & Permissions", href: "/admin/roles", icon: Shield, permissions: [PERMISSIONS.MANAGE_ROLES] },
      { name: "Audit Trail", href: "/admin/audit", icon: History, permissions: [PERMISSIONS.VIEW_AUDIT_LOGS] },
      { name: "Knox Guard", href: "/admin/knox", icon: Smartphone, permissions: [PERMISSIONS.VIEW_DEVICE_CONTROL, PERMISSIONS.MANAGE_DEVICE_CONTROL] },
      { name: "Device Control", href: "/admin/device-control", icon: Shield, permissions: [PERMISSIONS.VIEW_DEVICE_CONTROL, PERMISSIONS.MANAGE_DEVICE_CONTROL] },
      { name: "Agent Ledger", href: "/admin/agent/admin-ledger", icon: BookOpen, permissions: [PERMISSIONS.MANAGE_AGENT_LEDGER] },
      { name: "Commission Settings", href: "/admin/settings/commission", icon: DollarSign, permissions: [PERMISSIONS.MANAGE_COMMISSION_SETTINGS] },
    ],
  },
];

// Mobile bottom tabs
const PRIMARY_TABS = [
  { name: "Home",      href: "/admin/dashboard", icon: LayoutDashboard, permissions: [] as PermissionName[] },
  { name: "Customers", href: "/admin/customers",  icon: Users,           permissions: CUSTOMER_ACCESS_PERMISSIONS },
  { name: "Contracts", href: "/admin/contracts",  icon: FileText,        permissions: CONTRACT_ACCESS_PERMISSIONS },
  { name: "Payments",  href: "/admin/payments",   icon: CreditCard,      permissions: [PERMISSIONS.VIEW_PAYMENTS] },
];

const MORE_GROUPS: Array<{
  label: string;
  permissions?: readonly PermissionName[];
  roles?: string[];
  links: { name: string; href: string; emoji: string; permissions: readonly PermissionName[] }[];
}> = [
  {
    label: "Agent Menu",
    roles: ["AGENT"],
    links: [
      { name: "Dashboard",     href: "/admin/agent/dashboard",  emoji: "🏠", permissions: [] as PermissionName[] },
      { name: "My Contracts",  href: "/admin/agent/contracts",  emoji: "💼", permissions: [PERMISSIONS.VIEW_OWN_CONTRACTS] },
      { name: "Deposit Ledger",href: "/admin/agent/deposits",   emoji: "💰", permissions: [PERMISSIONS.VIEW_AGENT_COMMISSIONS] },
      { name: "Price Chart",   href: "/admin/price-chart",      emoji: "🏷️", permissions: [] as PermissionName[] },
      { name: "How It Works",  href: "/admin/agent/overview",   emoji: "📖", permissions: [] as PermissionName[] },
    ],
  },
  {
    label: "Inventory",
    permissions: [PERMISSIONS.MANAGE_PRODUCTS, PERMISSIONS.MANAGE_INVENTORY],
    links: [
      { name: "Products",    href: "/admin/products",    emoji: "📦", permissions: [PERMISSIONS.MANAGE_PRODUCTS] },
      { name: "Inventory",   href: "/admin/inventory",   emoji: "🏭", permissions: [PERMISSIONS.MANAGE_INVENTORY] },
      { name: "Price Chart", href: "/admin/price-chart", emoji: "🏷️", permissions: [PERMISSIONS.MANAGE_PRODUCTS] },
    ],
  },
  {
    label: "Contract Approvals",
    permissions: CONTRACT_APPROVAL_ACCESS_PERMISSIONS,
    links: [
      { name: "Approvals", href: "/admin/contract-approvals", emoji: "📋", permissions: CONTRACT_APPROVAL_ACCESS_PERMISSIONS },
    ],
  },
  {
    label: "Payments",
    permissions: [PERMISSIONS.VIEW_FAILED_PAYMENTS],
    links: [
      { name: "Payment Mgmt", href: "/admin/failed-payments", emoji: "⚠️", permissions: [PERMISSIONS.VIEW_FAILED_PAYMENTS] },
    ],
  },
  {
    label: "Reports",
    permissions: [PERMISSIONS.VIEW_REPORTS],
    links: [
      { name: "Reports", href: "/admin/reports", emoji: "📊", permissions: [PERMISSIONS.VIEW_REPORTS] },
    ],
  },
  {
    label: "Communications",
    permissions: [PERMISSIONS.MANAGE_SETTINGS],
    links: [
      { name: "Send SMS",       href: "/admin/sms",                          emoji: "💬", permissions: [PERMISSIONS.MANAGE_SETTINGS] },
      { name: "SMS Log",        href: "/admin/sms/log",                      emoji: "📋", permissions: [PERMISSIONS.MANAGE_SETTINGS] },
      { name: "Notifications",  href: "/admin/settings/notifications",       emoji: "🔔", permissions: [PERMISSIONS.MANAGE_SETTINGS] },
      { name: "Retry Settings", href: "/admin/settings/retry-settings",      emoji: "🔄", permissions: [PERMISSIONS.MANAGE_SETTINGS] },
    ],
  },
  {
    label: "Administration",
    permissions: [PERMISSIONS.MANAGE_USERS, PERMISSIONS.MANAGE_ROLES, PERMISSIONS.VIEW_AUDIT_LOGS, PERMISSIONS.MANAGE_SETTINGS, PERMISSIONS.VIEW_DEVICE_CONTROL, PERMISSIONS.MANAGE_DEVICE_CONTROL, PERMISSIONS.MANAGE_AGENT_LEDGER, PERMISSIONS.MANAGE_COMMISSION_SETTINGS],
    links: [
      { name: "Import",              href: "/admin/import",               emoji: "📥", permissions: [PERMISSIONS.MANAGE_SETTINGS] },
      { name: "Users",               href: "/admin/users",                emoji: "👥", permissions: [PERMISSIONS.MANAGE_USERS] },
      { name: "Roles",               href: "/admin/roles",                emoji: "🔑", permissions: [PERMISSIONS.MANAGE_ROLES] },
      { name: "Audit Trail",         href: "/admin/audit",                emoji: "🔍", permissions: [PERMISSIONS.VIEW_AUDIT_LOGS] },
      { name: "Knox Guard",          href: "/admin/knox",                 emoji: "🔒", permissions: [PERMISSIONS.VIEW_DEVICE_CONTROL, PERMISSIONS.MANAGE_DEVICE_CONTROL] },
      { name: "Device Control",      href: "/admin/device-control",       emoji: "🛡️", permissions: [PERMISSIONS.VIEW_DEVICE_CONTROL, PERMISSIONS.MANAGE_DEVICE_CONTROL] },
      { name: "Agent Ledger",        href: "/admin/agent/admin-ledger",   emoji: "📒", permissions: [PERMISSIONS.MANAGE_AGENT_LEDGER] },
      { name: "Commission Settings", href: "/admin/settings/commission",  emoji: "💲", permissions: [PERMISSIONS.MANAGE_COMMISSION_SETTINGS] },
    ],
  },
];

// ─── Desktop Sidebar Navigation ─────────────────────────────────────────────

function SidebarNav({
  pathname,
  paymentCount,
  approvalCount,
  onNavigate,
}: {
  pathname: string | null;
  paymentCount: number;
  approvalCount: number;
  onNavigate: () => void;
}) {
  const { hasAnyPermission } = usePermissions();
  const { user } = useAuth();
  const adminUser = user && "role" in user ? (user as AdminUser) : null;
  const userRole = adminUser?.role ?? "";

  const visibleGroups = navGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.permissions?.length || hasAnyPermission(i.permissions)) }))
    .filter((g) =>
      g.items.length > 0 &&
      (!g.permissions?.length || hasAnyPermission(g.permissions)) &&
      (!g.roles?.length || g.roles.includes(userRole))
    );

  const activeIdx = visibleGroups.findIndex((g) =>
    g.items.some((i) => pathname === i.href || pathname?.startsWith(i.href + "/"))
  );

  const [openGroups, setOpenGroups] = useState<Set<number>>(() => {
    const s = new Set<number>([0]);
    if (activeIdx >= 0) s.add(activeIdx);
    return s;
  });

  const toggleGroup = (idx: number) =>
    setOpenGroups((p) => { const n = new Set(p); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });

  return (
    <nav className="flex-1 overflow-y-auto sidebar-scroll py-3 px-2.5 space-y-0.5">
      {visibleGroups.map((group, idx) => {
        const isOpen = openGroups.has(idx);
        const single = group.items.length === 1;

        if (single) {
          const item = group.items[0];
          const active = pathname === item.href || (item.href !== "/admin/dashboard" && item.href !== "/admin/agent/dashboard" && pathname?.startsWith(item.href + "/"));
          const badge = item.badge?.(paymentCount, approvalCount) ?? null;
          return (
            <div key={idx}>
              <p className="px-2.5 pt-5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {group.label}
              </p>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/8"
                )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-white" : "text-slate-500")} />
                <span className="flex-1 truncate">{item.name}</span>
                {badge !== null && (
                  <span className={cn(
                    "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white",
                    item.badgeColor === "amber" ? "bg-amber-500" : "bg-red-500"
                  )}>
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            </div>
          );
        }

        return (
          <div key={idx}>
            <button
              onClick={() => toggleGroup(idx)}
              className="w-full flex items-center justify-between px-2.5 pt-5 pb-1 group"
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 group-hover:text-slate-400">
                {group.label}
              </p>
              {isOpen
                ? <ChevronDown className="h-3 w-3 text-slate-600" />
                : <ChevronRight className="h-3 w-3 text-slate-600" />}
            </button>
            {isOpen && (
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || (pathname?.startsWith(item.href + "/") && item.href !== "/admin/sms");
                  const badge = item.badge?.(paymentCount, approvalCount) ?? null;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-blue-600 text-white"
                          : "text-slate-400 hover:text-white hover:bg-white/8"
                      )}
                    >
                      <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-white" : "text-slate-500")} />
                      <span className="flex-1 truncate">{item.name}</span>
                      {badge !== null && (
                        <span className={cn(
                          "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white",
                          item.badgeColor === "amber" ? "bg-amber-500" : "bg-red-500"
                        )}>
                          {badge > 99 ? "99+" : badge}
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
  );
}

// ─── Mobile Bottom Tab Bar ──────────────────────────────────────────────────

function MobileTabBar({
  pathname,
  paymentCount,
  moreOpen,
  onMoreToggle,
  userRole,
}: {
  pathname: string | null;
  paymentCount: number;
  approvalCount?: number;
  moreOpen: boolean;
  onMoreToggle: () => void;
  userRole?: string;
}) {
  const { hasAnyPermission } = usePermissions();

  const effectiveTabs = PRIMARY_TABS.map((t) => {
    if (userRole === "AGENT") {
      if (t.href === "/admin/dashboard") return { ...t, href: "/admin/agent/dashboard" };
      if (t.href === "/admin/contracts") return { ...t, name: "My Contracts", href: "/admin/agent/contracts", icon: Briefcase };
    }
    return t;
  });
  const tabs = effectiveTabs.filter((t) => !t.permissions.length || hasAnyPermission(t.permissions));

  const isActive = (href: string) =>
    pathname === href || (href !== "/admin/dashboard" && href !== "/admin/agent/dashboard" && pathname?.startsWith(href + "/"));

  const moreActive = moreOpen || !tabs.some((t) => isActive(t.href));

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 safe-area-bottom">
      <div className="bg-white border-t border-gray-200 shadow-[0_-1px_12px_rgba(0,0,0,0.08)]">
        <div className="flex items-end h-[60px] px-1">
          {tabs.map((tab) => {
            const active = isActive(tab.href);
            const badge = tab.href === "/admin/payments" && paymentCount > 0 ? paymentCount : null;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex-1 flex flex-col items-center justify-end pb-2.5 gap-1 relative group"
              >
                <div className="relative">
                  <tab.icon
                    className={cn(
                      "h-5 w-5 transition-colors",
                      active ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                    )}
                    strokeWidth={active ? 2.5 : 1.75}
                  />
                  {badge !== null && (
                    <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white leading-none shadow">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </div>
                <span className={cn(
                  "text-[10px] font-semibold leading-none transition-colors",
                  active ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                )}>
                  {tab.name}
                </span>
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-t-full" />
                )}
              </Link>
            );
          })}

          {/* More */}
          <button
            onClick={onMoreToggle}
            className="flex-1 flex flex-col items-center justify-end pb-2.5 gap-1 relative group"
          >
            <Menu
              className={cn(
                "h-5 w-5 transition-colors",
                moreActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
              )}
              strokeWidth={moreActive ? 2.5 : 1.75}
            />
            <span className={cn(
              "text-[10px] font-semibold leading-none transition-colors",
              moreActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
            )}>
              More
            </span>
            {moreActive && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-t-full" />
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}

// ─── "More" Bottom Sheet ────────────────────────────────────────────────────

function MoreBottomSheet({
  open,
  onClose,
  user,
  pathname,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  user: AdminUser | null;
  pathname: string | null;
  paymentCount: number;
  onLogout: () => void;
}) {
  const { hasAnyPermission } = usePermissions();
  const userRole = user?.role ?? "";

  const visibleGroups = MORE_GROUPS
    .map((g) => ({
      ...g,
      links: g.links.filter((l) => !l.permissions.length || hasAnyPermission(l.permissions)),
    }))
    .filter((g) =>
      g.links.length > 0 &&
      (!g.permissions?.length || hasAnyPermission(g.permissions)) &&
      (!g.roles?.length || g.roles.includes(userRole))
    );

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + "/");

  return (
    <>
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
          onClick={onClose}
        />
      )}

      <div className={cn(
        "lg:hidden fixed bottom-0 inset-x-0 z-50 rounded-t-2xl shadow-2xl max-h-[88vh] flex flex-col",
        "bg-white border-t border-gray-200",
        "transform transition-transform duration-300 ease-out will-change-transform",
        open ? "translate-y-0" : "translate-y-full"
      )}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-9 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* User info bar */}
        <div className="mx-4 my-3 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{user?.firstName} {user?.lastName}</p>
              <p className="text-[11px] text-blue-600 font-medium">{user?.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell variant="light" />
            <ContractApprovalBell variant="light" />
            <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-200 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Grid groups */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-5">
          {visibleGroups.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5 px-1">
                {group.label}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {group.links.map((link) => {
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={onClose}
                      className={cn(
                        "flex flex-col items-center gap-2 py-4 px-2 rounded-xl text-center transition-all",
                        active
                          ? "bg-blue-600 shadow-md"
                          : "bg-gray-50 border border-gray-200 hover:bg-gray-100 active:scale-95"
                      )}
                    >
                      <span className="text-2xl leading-none">{link.emoji}</span>
                      <span className={cn(
                        "text-[11px] font-semibold leading-tight",
                        active ? "text-white" : "text-gray-700"
                      )}>{link.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Sign out */}
          <div className="pt-1 border-t border-gray-100">
            <button
              onClick={onLogout}
              className="flex w-full items-center gap-3 px-4 py-3.5 bg-red-50 border border-red-100 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors active:scale-95"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main Export ────────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const { count: paymentCount } = useDailyPayments();
  const { count: approvalCount } = usePendingContractApprovals();

  const adminUser = user && "role" in user ? (user as AdminUser) : null;

  const handleLogout = () => {
    logout();
    setMoreOpen(false);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex h-full w-60 shrink-0 flex-col bg-slate-900 border-r border-slate-800">
        {/* Brand strip */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-slate-800 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <span className="text-white text-[11px] font-extrabold tracking-tighter">AT</span>
          </div>
          <div className="leading-none">
            <p className="text-[14px] font-extrabold text-white tracking-tight">AIDOO TECH</p>
            <p className="text-[9px] text-slate-500 font-medium uppercase tracking-widest mt-0.5">Hire Purchase</p>
          </div>
        </div>

        {/* Nav */}
        <SidebarNav
          pathname={pathname}
          paymentCount={paymentCount}
          approvalCount={approvalCount}
          onNavigate={() => {}}
        />

        {/* Footer */}
        <div className="border-t border-slate-800 px-3 py-3 shrink-0">
          <p className="text-[10px] text-slate-600 text-center">EYO Solutions · 0246-462398</p>
        </div>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <MobileTabBar
        pathname={pathname}
        paymentCount={paymentCount}
        approvalCount={approvalCount}
        moreOpen={moreOpen}
        onMoreToggle={() => setMoreOpen((o) => !o)}
        userRole={adminUser?.role}
      />

      {/* Mobile "More" Bottom Sheet */}
      <MoreBottomSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        user={adminUser}
        pathname={pathname}
        paymentCount={paymentCount}
        onLogout={handleLogout}
      />
    </>
  );
}
