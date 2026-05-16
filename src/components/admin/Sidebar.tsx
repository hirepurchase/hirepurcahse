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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import type { AdminUser } from "@/types";
import api from "@/lib/api";
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
  badgeColor?: 'green' | 'amber';
  permissions?: readonly PermissionName[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
  permissions?: readonly PermissionName[];
  roles?: string[];  // if set, only show for users whose role is in this list
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
        name: "Contract Approvals",
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
        badgeColor: "green",
        permissions: [PERMISSIONS.VIEW_PAYMENTS],
      },
      { name: "Payment Management", href: "/admin/failed-payments", icon: AlertCircle, permissions: [PERMISSIONS.VIEW_FAILED_PAYMENTS] },
      { name: "Device Control", href: "/admin/device-control", icon: Smartphone, permissions: [PERMISSIONS.VIEW_DEVICE_CONTROL, PERMISSIONS.MANAGE_DEVICE_CONTROL] },
    ],
  },
  {
    label: "Inventory",
    permissions: [PERMISSIONS.MANAGE_PRODUCTS, PERMISSIONS.MANAGE_INVENTORY],
    items: [
      { name: "Products", href: "/admin/products", icon: Package, permissions: [PERMISSIONS.MANAGE_PRODUCTS] },
      { name: "Inventory", href: "/admin/inventory", icon: Warehouse, permissions: [PERMISSIONS.MANAGE_INVENTORY] },
    ],
  },
  {
    label: "Communications",
    permissions: [PERMISSIONS.MANAGE_SETTINGS],
    items: [
      { name: "Send SMS", href: "/admin/sms", icon: MessageSquare, permissions: [PERMISSIONS.MANAGE_SETTINGS] },
      { name: "SMS Log", href: "/admin/sms/log", icon: ClipboardList, permissions: [PERMISSIONS.MANAGE_SETTINGS] },
      { name: "Notifications", href: "/admin/settings/notifications", icon: Bell, permissions: [PERMISSIONS.MANAGE_SETTINGS] },
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
    permissions: [PERMISSIONS.MANAGE_USERS, PERMISSIONS.MANAGE_ROLES, PERMISSIONS.VIEW_AUDIT_LOGS, PERMISSIONS.MANAGE_SETTINGS, PERMISSIONS.MANAGE_DEVICE_CONTROL],
    items: [
      { name: "Import Data", href: "/admin/import", icon: Upload, permissions: [PERMISSIONS.MANAGE_SETTINGS] },
      { name: "Users", href: "/admin/users", icon: Settings, permissions: [PERMISSIONS.MANAGE_USERS] },
      { name: "Roles & Permissions", href: "/admin/roles", icon: Shield, permissions: [PERMISSIONS.MANAGE_ROLES] },
      { name: "Audit Trail", href: "/admin/audit", icon: History, permissions: [PERMISSIONS.VIEW_AUDIT_LOGS] },
      { name: "Knox Guard Settings", href: "/admin/settings/knox-guard", icon: Smartphone, permissions: [PERMISSIONS.MANAGE_DEVICE_CONTROL] },
    ],
  },
];

// The 4 primary bottom tabs (always visible)
const PRIMARY_TABS = [
  { name: "Home",      href: "/admin/dashboard", icon: LayoutDashboard, permissions: [] as PermissionName[] },
  { name: "Customers", href: "/admin/customers",  icon: Users,           permissions: CUSTOMER_ACCESS_PERMISSIONS },
  { name: "Contracts", href: "/admin/contracts",  icon: FileText,        permissions: CONTRACT_ACCESS_PERMISSIONS },
  { name: "Payments",  href: "/admin/payments",   icon: CreditCard,      permissions: [PERMISSIONS.VIEW_PAYMENTS] },
];

// Groups shown in the "More" bottom-sheet, excluding primary tab hrefs
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
      { name: "Dashboard", href: "/admin/agent/dashboard", emoji: "🏠", permissions: [] as PermissionName[] },
      { name: "My Contracts", href: "/admin/agent/contracts", emoji: "💼", permissions: [PERMISSIONS.VIEW_OWN_CONTRACTS] },
    ],
  },
  {
    label: "Inventory",
    permissions: [PERMISSIONS.MANAGE_PRODUCTS, PERMISSIONS.MANAGE_INVENTORY],
    links: [
      { name: "Products",  href: "/admin/products",  emoji: "📦", permissions: [PERMISSIONS.MANAGE_PRODUCTS] },
      { name: "Inventory", href: "/admin/inventory", emoji: "🏭", permissions: [PERMISSIONS.MANAGE_INVENTORY] },
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
    permissions: [PERMISSIONS.VIEW_FAILED_PAYMENTS, PERMISSIONS.VIEW_DEVICE_CONTROL, PERMISSIONS.MANAGE_DEVICE_CONTROL],
    links: [
      { name: "Payment Mgmt", href: "/admin/failed-payments", emoji: "⚠️", permissions: [PERMISSIONS.VIEW_FAILED_PAYMENTS] },
      { name: "Device Control", href: "/admin/device-control", emoji: "📱", permissions: [PERMISSIONS.VIEW_DEVICE_CONTROL, PERMISSIONS.MANAGE_DEVICE_CONTROL] },
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
      { name: "Send SMS",      href: "/admin/sms",                    emoji: "💬", permissions: [PERMISSIONS.MANAGE_SETTINGS] },
      { name: "SMS Log",       href: "/admin/sms/log",                emoji: "📋", permissions: [PERMISSIONS.MANAGE_SETTINGS] },
      { name: "Notifications", href: "/admin/settings/notifications", emoji: "🔔", permissions: [PERMISSIONS.MANAGE_SETTINGS] },
    ],
  },
  {
    label: "Administration",
    permissions: [PERMISSIONS.MANAGE_USERS, PERMISSIONS.MANAGE_ROLES, PERMISSIONS.VIEW_AUDIT_LOGS, PERMISSIONS.MANAGE_SETTINGS, PERMISSIONS.MANAGE_DEVICE_CONTROL],
    links: [
      { name: "Import",        href: "/admin/import",                 emoji: "📥", permissions: [PERMISSIONS.MANAGE_SETTINGS] },
      { name: "Users",         href: "/admin/users",                  emoji: "👥", permissions: [PERMISSIONS.MANAGE_USERS] },
      { name: "Roles",         href: "/admin/roles",                  emoji: "🔑", permissions: [PERMISSIONS.MANAGE_ROLES] },
      { name: "Audit Trail",   href: "/admin/audit",                  emoji: "🔍", permissions: [PERMISSIONS.VIEW_AUDIT_LOGS] },
      { name: "Knox Settings", href: "/admin/settings/knox-guard",    emoji: "📱", permissions: [PERMISSIONS.MANAGE_DEVICE_CONTROL] },
    ],
  },
];

// ─── Change Password Modal ──────────────────────────────────────────────────

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setError(""); setSuccess("");
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) { setError("All fields are required"); return; }
    if (form.newPassword.length < 8) { setError("New password must be at least 8 characters"); return; }
    if (form.newPassword !== form.confirmPassword) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      await api.put("/auth/admin/me/password", form);
      setSuccess("Password changed successfully");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to change password");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-center gap-2 mb-5">
          <KeyRound className="h-5 w-5 text-cyan-600" />
          <h2 className="text-base font-semibold text-gray-900">Change Password</h2>
        </div>
        <div className="space-y-3">
          {[
            { key: "currentPassword", label: "Current Password", ac: "current-password" },
            { key: "newPassword", label: "New Password", ac: "new-password", hint: "Minimum 8 characters" },
            { key: "confirmPassword", label: "Confirm Password", ac: "new-password" },
          ].map(({ key, label, ac, hint }) => (
            <div key={key}>
              <label className="text-xs font-medium text-gray-600">{label}</label>
              <input type="password"
                className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={hint} autoComplete={ac} />
            </div>
          ))}
          {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          {success && <p className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg">{success}</p>}
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={handleSave} disabled={loading}
            className="flex-1 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl">
            {loading ? "Saving…" : "Save"}
          </button>
          <button onClick={onClose} disabled={loading}
            className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold py-2.5 rounded-xl">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Desktop Sidebar ────────────────────────────────────────────────────────

function SidebarContent({ user, pathname, paymentCount, approvalCount, onNavigate, onLogout }: {
  user: AdminUser | null;
  pathname: string | null;
  paymentCount: number;
  approvalCount: number;
  onNavigate: () => void;
  onLogout: () => void;
}) {
  const { hasAnyPermission } = usePermissions();
  const [showPw, setShowPw] = useState(false);

  const userRole = user?.role ?? "";
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

  return (
    <>
      {showPw && <ChangePasswordModal onClose={() => setShowPw(false)} />}
      <div className="flex h-16 items-center justify-between border-b border-cyan-300/25 px-4 bg-white/5 shrink-0">
        <h1 className="text-lg font-bold tracking-tight">AIDOO TECH</h1>
        <button onClick={() => setShowPw(true)} className="p-1.5 rounded-lg text-cyan-100/50 hover:text-white hover:bg-white/10">
          <KeyRound className="h-4 w-4" />
        </button>
      </div>
      <div className="border-b border-cyan-300/20 px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-sm font-bold text-cyan-200">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-cyan-100/60 truncate">{user?.role}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
        {visibleGroups.map((group, idx) => {
          const isOpen = openGroups.has(idx);
          const single = group.items.length === 1;
          if (single) {
            const item = group.items[0];
            const active = pathname === item.href || (item.href !== "/admin/dashboard" && pathname?.startsWith(item.href + "/"));
            const badge = item.badge?.(paymentCount, approvalCount) ?? null;
            const badgeCls = item.badgeColor === "amber" ? "bg-amber-500" : "bg-green-500";
            return (
              <div key={idx}>
                <p className="px-2 pt-4 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-cyan-200/50">{group.label}</p>
                <Link href={item.href} onClick={onNavigate}
                  className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                    active ? "bg-cyan-500/20 text-white ring-1 ring-cyan-400/30" : "text-cyan-50/75 hover:bg-white/10 hover:text-white")}>
                  <item.icon className={cn("h-5 w-5 shrink-0", active ? "text-cyan-300" : "text-cyan-100/60")} />
                  <span className="flex-1 truncate">{item.name}</span>
                  {badge !== null && (
                    <span className={cn("flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white", badgeCls)}>
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </Link>
              </div>
            );
          }
          return (
            <div key={idx}>
              <button onClick={() => setOpenGroups((p) => { const n = new Set(p); n.has(idx) ? n.delete(idx) : n.add(idx); return n; })}
                className="w-full flex items-center justify-between px-2 pt-4 pb-1.5 group">
                <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-200/50 group-hover:text-cyan-200/80">{group.label}</p>
                {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-cyan-100/40" /> : <ChevronRight className="h-3.5 w-3.5 text-cyan-100/40" />}
              </button>
              {isOpen && (
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = pathname === item.href || (pathname?.startsWith(item.href + "/") && item.href !== "/admin/sms");
                    const badge = item.badge?.(paymentCount, approvalCount) ?? null;
                    const badgeCls = item.badgeColor === "amber" ? "bg-amber-500" : "bg-green-500";
                    return (
                      <Link key={item.href} href={item.href} onClick={onNavigate}
                        className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                          active ? "bg-cyan-500/20 text-white ring-1 ring-cyan-400/30" : "text-cyan-50/75 hover:bg-white/10 hover:text-white")}>
                        <item.icon className={cn("h-5 w-5 shrink-0", active ? "text-cyan-300" : "text-cyan-100/60")} />
                        <span className="flex-1 truncate">{item.name}</span>
                        {badge !== null && (
                          <span className={cn("flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white", badgeCls)}>
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
      <div className="border-t border-cyan-300/20 p-3 shrink-0 space-y-1">
        <div className="flex items-center gap-3 px-3 py-1">
          <NotificationBell />
          <span className="text-sm font-medium text-cyan-50/85">Daily Payments</span>
        </div>
        <div className="flex items-center gap-3 px-3 py-1">
          <ContractApprovalBell />
          <span className="text-sm font-medium text-cyan-50/85">Contract Approvals</span>
        </div>
      </div>
      <div className="border-t border-cyan-300/20 p-3 shrink-0">
        <button onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-cyan-50/85 hover:bg-white/10 hover:text-white transition-colors">
          <LogOut className="h-5 w-5" /> Logout
        </button>
      </div>
      <div className="border-t border-cyan-300/20 px-4 py-3 shrink-0">
        <p className="text-xs text-cyan-100/70">EYO Solutions · 0246-462398</p>
      </div>
    </>
  );
}

// ─── Mobile Bottom Tab Bar ──────────────────────────────────────────────────

function MobileTabBar({ pathname, paymentCount, moreOpen, onMoreToggle, userRole }: {
  pathname: string | null;
  paymentCount: number;
  approvalCount?: number;
  moreOpen: boolean;
  onMoreToggle: () => void;
  userRole?: string;
}) {
  const { hasAnyPermission } = usePermissions();
  // Agents use agent-specific routes for Dashboard and Contracts tabs
  const effectiveTabs = PRIMARY_TABS.map((t) => {
    if (userRole === "AGENT") {
      if (t.href === "/admin/dashboard") return { ...t, href: "/admin/agent/dashboard" };
      if (t.href === "/admin/contracts") return { ...t, name: "My Contracts", href: "/admin/agent/contracts", icon: Briefcase };
    }
    return t;
  });
  const tabs = effectiveTabs.filter((t) => !t.permissions.length || hasAnyPermission(t.permissions));

  const isActive = (href: string) =>
    pathname === href || (href !== "/admin/dashboard" && pathname?.startsWith(href + "/"));

  const moreActive = moreOpen || !tabs.some((t) => isActive(t.href));

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 safe-area-bottom">
      {/* Glassmorphism dark bar matching desktop sidebar */}
      <div className="bg-slate-900/95 backdrop-blur-xl border-t border-white/10 shadow-2xl">
        <div className="flex items-end h-[62px] px-1">
          {tabs.map((tab) => {
            const active = isActive(tab.href);
            const badge = tab.href === "/admin/payments" && paymentCount > 0 ? paymentCount : null;
            return (
              <Link key={tab.href} href={tab.href}
                className="flex-1 flex flex-col items-center justify-end pb-2 gap-1 relative group">
                {/* Active pill background */}
                {active && (
                  <span className="absolute top-1 left-1/2 -translate-x-1/2 w-12 h-8 rounded-full bg-cyan-500/20" />
                )}
                <div className="relative z-10">
                  <tab.icon
                    className={cn("h-[22px] w-[22px] transition-all duration-200",
                      active ? "text-cyan-400" : "text-slate-400 group-hover:text-slate-200")}
                    strokeWidth={active ? 2.5 : 1.75}
                  />
                  {badge !== null && (
                    <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-green-400 px-0.5 text-[9px] font-bold text-slate-900 leading-none shadow">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </div>
                <span className={cn(
                  "text-[9.5px] font-semibold leading-none tracking-wide z-10 transition-colors duration-200",
                  active ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300"
                )}>
                  {tab.name}
                </span>
                {/* Active dot */}
                {active && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400" />}
              </Link>
            );
          })}

          {/* More tab */}
          <button onClick={onMoreToggle}
            className="flex-1 flex flex-col items-center justify-end pb-2 gap-1 relative group">
            {moreActive && (
              <span className="absolute top-1 left-1/2 -translate-x-1/2 w-12 h-8 rounded-full bg-cyan-500/20" />
            )}
            <svg
              className={cn("h-[22px] w-[22px] z-10 transition-colors duration-200",
                moreActive ? "text-cyan-400" : "text-slate-400 group-hover:text-slate-200")}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={moreActive ? 2.5 : 1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className={cn(
              "text-[9.5px] font-semibold leading-none tracking-wide z-10 transition-colors duration-200",
              moreActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300"
            )}>
              More
            </span>
            {moreActive && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400" />}
          </button>
        </div>
        {/* Safe area spacer for home indicator on iOS */}
        <div className="h-safe-area-inset-bottom" />
      </div>
    </nav>
  );
}

// ─── "More" Bottom Sheet ────────────────────────────────────────────────────

function MoreBottomSheet({ open, onClose, user, pathname, paymentCount, onLogout }: {
  open: boolean;
  onClose: () => void;
  user: AdminUser | null;
  pathname: string | null;
  paymentCount: number;
  onLogout: () => void;
}) {
  const { hasAnyPermission } = usePermissions();
  const [showPw, setShowPw] = useState(false);

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
      {showPw && <ChangePasswordModal onClose={() => setShowPw(false)} />}

      {/* Backdrop */}
      {open && <div className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />}

      {/* Bottom Sheet — dark, matches sidebar */}
      <div className={cn(
        "lg:hidden fixed bottom-0 inset-x-0 z-50 rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col",
        "bg-slate-900 border-t border-white/10",
        "transform transition-transform duration-300 ease-out",
        open ? "translate-y-0" : "translate-y-full"
      )}>
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* User pill */}
        <div className="mx-4 mb-4 flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-lg">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-[11px] text-cyan-400 font-medium truncate">{user?.role}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setShowPw(true)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
              <KeyRound className="h-4 w-4" />
            </button>
            <button onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable groups */}
        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-5">
          {visibleGroups.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5 px-1">
                {group.label}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {group.links.map((link) => {
                  const active = isActive(link.href);
                  return (
                    <Link key={link.href} href={link.href} onClick={onClose}
                      className={cn(
                        "flex flex-col items-center gap-2 py-4 px-2 rounded-2xl text-center transition-all duration-150",
                        active
                          ? "bg-cyan-500 shadow-lg shadow-cyan-500/30 scale-95"
                          : "bg-white/5 border border-white/8 text-slate-300 hover:bg-white/10 active:scale-95"
                      )}>
                      <span className="text-2xl leading-none">{link.emoji}</span>
                      <span className={cn(
                        "text-[11px] font-semibold leading-tight",
                        active ? "text-white" : "text-slate-300"
                      )}>{link.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Notification + Logout */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <div className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/8 rounded-xl">
              <NotificationBell />
              <span className="text-sm font-medium text-slate-300">Daily Payments</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <ContractApprovalBell />
              <span className="text-sm font-medium text-amber-300">Contract Approvals</span>
            </div>
            <button onClick={onLogout}
              className="flex w-full items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/20 transition-colors active:scale-95">
              <LogOut className="h-5 w-5" /> Sign Out
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

  const adminUser = user && "role" in user ? user : null;

  const handleLogout = () => {
    logout();
    setMoreOpen(false);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex h-screen w-64 shrink-0 flex-col bg-linear-to-b from-slate-950 via-cyan-950 to-slate-900 text-white border-r border-white/10">
        <SidebarContent
          user={adminUser}
          pathname={pathname}
          paymentCount={paymentCount}
          approvalCount={approvalCount}
          onNavigate={() => {}}
          onLogout={handleLogout}
        />
      </div>

      {/* Mobile: Bottom Tab Bar */}
      <MobileTabBar
        pathname={pathname}
        paymentCount={paymentCount}
        approvalCount={approvalCount}
        moreOpen={moreOpen}
        onMoreToggle={() => setMoreOpen((o) => !o)}
        userRole={adminUser?.role}
      />

      {/* Mobile: "More" Bottom Sheet */}
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
