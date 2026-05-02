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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import type { AdminUser } from "@/types";
import api from "@/lib/api";
import type { LucideIcon } from "lucide-react";
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
  permissions?: string[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
  permissions?: string[];
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
      { name: "My Contracts", href: "/admin/agent/contracts", icon: Briefcase, permissions: ["VIEW_CONTRACTS"] },
    ],
  },
  {
    label: "Customers",
    permissions: ["VIEW_CUSTOMERS"],
    items: [
      { name: "Customers", href: "/admin/customers", icon: Users, permissions: ["VIEW_CUSTOMERS"] },
    ],
  },
  {
    label: "Contracts & Payments",
    permissions: ["VIEW_CONTRACTS", "VIEW_PAYMENTS", "VIEW_CONTRACT_APPROVALS", "APPROVE_CONTRACT"],
    items: [
      { name: "Contracts", href: "/admin/contracts", icon: FileText, permissions: ["VIEW_CONTRACTS"] },
      {
        name: "Contract Approvals",
        href: "/admin/contract-approvals",
        icon: ClipboardCheck,
        badge: (_pc, ac) => (ac > 0 ? ac : null),
        badgeColor: "amber",
        permissions: ["VIEW_CONTRACT_APPROVALS", "APPROVE_CONTRACT"],
      },
      {
        name: "Payments",
        href: "/admin/payments",
        icon: CreditCard,
        badge: (count) => (count > 0 ? count : null),
        badgeColor: "green",
        permissions: ["VIEW_PAYMENTS"],
      },
      { name: "Payment Management", href: "/admin/failed-payments", icon: AlertCircle, permissions: ["VIEW_FAILED_PAYMENTS"] },
    ],
  },
  {
    label: "Inventory",
    permissions: ["MANAGE_PRODUCTS", "MANAGE_INVENTORY"],
    items: [
      { name: "Products", href: "/admin/products", icon: Package, permissions: ["MANAGE_PRODUCTS"] },
      { name: "Inventory", href: "/admin/inventory", icon: Warehouse, permissions: ["MANAGE_INVENTORY"] },
    ],
  },
  {
    label: "Communications",
    permissions: ["MANAGE_SETTINGS"],
    items: [
      { name: "Send SMS", href: "/admin/sms", icon: MessageSquare, permissions: ["MANAGE_SETTINGS"] },
      { name: "SMS Log", href: "/admin/sms/log", icon: ClipboardList, permissions: ["MANAGE_SETTINGS"] },
      { name: "Notifications", href: "/admin/settings/notifications", icon: Bell, permissions: ["MANAGE_SETTINGS"] },
    ],
  },
  {
    label: "Reports",
    permissions: ["VIEW_REPORTS"],
    items: [
      { name: "Reports", href: "/admin/reports", icon: BarChart3, permissions: ["VIEW_REPORTS"] },
    ],
  },
  {
    label: "Administration",
    permissions: ["MANAGE_USERS", "MANAGE_ROLES", "VIEW_AUDIT_LOGS", "MANAGE_SETTINGS"],
    items: [
      { name: "Import Data", href: "/admin/import", icon: Upload, permissions: ["MANAGE_SETTINGS"] },
      { name: "Users", href: "/admin/users", icon: Settings, permissions: ["MANAGE_USERS"] },
      { name: "Roles & Permissions", href: "/admin/roles", icon: Shield, permissions: ["MANAGE_ROLES"] },
      { name: "Audit Trail", href: "/admin/audit", icon: History, permissions: ["VIEW_AUDIT_LOGS"] },
    ],
  },
];

// The 4 primary bottom tabs (always visible)
const PRIMARY_TABS = [
  { name: "Home",      href: "/admin/dashboard", icon: LayoutDashboard, permissions: [] as string[] },
  { name: "Customers", href: "/admin/customers",  icon: Users,           permissions: ["VIEW_CUSTOMERS"] },
  { name: "Contracts", href: "/admin/contracts",  icon: FileText,        permissions: ["VIEW_CONTRACTS"] },
  { name: "Payments",  href: "/admin/payments",   icon: CreditCard,      permissions: ["VIEW_PAYMENTS"] },
];

// Groups shown in the "More" bottom-sheet, excluding primary tab hrefs
const MORE_GROUPS: Array<{
  label: string;
  permissions?: string[];
  roles?: string[];
  links: { name: string; href: string; emoji: string; permissions: string[] }[];
}> = [
  {
    label: "Agent Menu",
    roles: ["AGENT"],
    links: [
      { name: "My Contracts", href: "/admin/agent/contracts", emoji: "💼", permissions: ["VIEW_CONTRACTS"] },
    ],
  },
  {
    label: "Inventory",
    permissions: ["MANAGE_PRODUCTS", "MANAGE_INVENTORY"],
    links: [
      { name: "Products",  href: "/admin/products",  emoji: "📦", permissions: ["MANAGE_PRODUCTS"] },
      { name: "Inventory", href: "/admin/inventory", emoji: "🏭", permissions: ["MANAGE_INVENTORY"] },
    ],
  },
  {
    label: "Contract Approvals",
    permissions: ["VIEW_CONTRACT_APPROVALS", "APPROVE_CONTRACT"],
    links: [
      { name: "Approvals", href: "/admin/contract-approvals", emoji: "📋", permissions: ["VIEW_CONTRACT_APPROVALS", "APPROVE_CONTRACT"] },
    ],
  },
  {
    label: "Payments",
    permissions: ["VIEW_FAILED_PAYMENTS"],
    links: [
      { name: "Payment Mgmt", href: "/admin/failed-payments", emoji: "⚠️", permissions: ["VIEW_FAILED_PAYMENTS"] },
    ],
  },
  {
    label: "Reports",
    permissions: ["VIEW_REPORTS"],
    links: [
      { name: "Reports", href: "/admin/reports", emoji: "📊", permissions: ["VIEW_REPORTS"] },
    ],
  },
  {
    label: "Communications",
    permissions: ["MANAGE_SETTINGS"],
    links: [
      { name: "Send SMS",      href: "/admin/sms",                    emoji: "💬", permissions: ["MANAGE_SETTINGS"] },
      { name: "SMS Log",       href: "/admin/sms/log",                emoji: "📋", permissions: ["MANAGE_SETTINGS"] },
      { name: "Notifications", href: "/admin/settings/notifications", emoji: "🔔", permissions: ["MANAGE_SETTINGS"] },
    ],
  },
  {
    label: "Administration",
    permissions: ["MANAGE_USERS", "MANAGE_ROLES", "VIEW_AUDIT_LOGS", "MANAGE_SETTINGS"],
    links: [
      { name: "Import",      href: "/admin/import", emoji: "📥", permissions: ["MANAGE_SETTINGS"] },
      { name: "Users",       href: "/admin/users",  emoji: "👥", permissions: ["MANAGE_USERS"] },
      { name: "Roles",       href: "/admin/roles",  emoji: "🔑", permissions: ["MANAGE_ROLES"] },
      { name: "Audit Trail", href: "/admin/audit",  emoji: "🔍", permissions: ["VIEW_AUDIT_LOGS"] },
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
  // Agents use "My Contracts" tab instead of the general Contracts tab
  const effectiveTabs = PRIMARY_TABS.map((t) =>
    t.href === "/admin/contracts" && userRole === "AGENT"
      ? { ...t, name: "My Contracts", href: "/admin/agent/contracts", icon: Briefcase }
      : t
  );
  const tabs = effectiveTabs.filter((t) => !t.permissions.length || hasAnyPermission(t.permissions));

  const isActive = (href: string) =>
    pathname === href || (href !== "/admin/dashboard" && pathname?.startsWith(href + "/"));

  const moreActive = moreOpen || !tabs.some((t) => isActive(t.href));

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t-2 border-gray-100 shadow-lg safe-area-bottom">
      <div className="flex items-stretch h-16">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          const badge = tab.href === "/admin/payments" && paymentCount > 0 ? paymentCount : null;
          return (
            <Link key={tab.href} href={tab.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors",
                active ? "text-cyan-600 bg-cyan-50/60" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              )}>
              <div className="relative">
                <tab.icon className={cn("h-6 w-6 transition-all", active ? "text-cyan-600" : "text-gray-400")}
                  strokeWidth={active ? 2.5 : 1.75} fill={active ? "rgba(8,145,178,0.1)" : "none"} />
                {badge !== null && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-green-500 px-0.5 text-[9px] font-bold text-white leading-none">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <span className={cn("text-[10px] font-semibold leading-none", active ? "text-cyan-600" : "text-gray-400")}>
                {tab.name}
              </span>
              {active && <div className="absolute bottom-0 h-0.5 w-8 bg-cyan-500 rounded-full" />}
            </Link>
          );
        })}

        {/* More tab */}
        <button onClick={onMoreToggle}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors",
            moreActive ? "text-cyan-600 bg-cyan-50/60" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
          )}>
          <svg className={cn("h-6 w-6", moreActive ? "text-cyan-600" : "text-gray-400")}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={moreActive ? 2.5 : 1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className={cn("text-[10px] font-semibold leading-none", moreActive ? "text-cyan-600" : "text-gray-400")}>
            More
          </span>
          {moreActive && <div className="absolute bottom-0 h-0.5 w-8 bg-cyan-500 rounded-full" />}
        </button>
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
      {open && <div className="lg:hidden fixed inset-0 z-40 bg-black/40" onClick={onClose} />}

      {/* Bottom Sheet */}
      <div className={cn(
        "lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[82vh] flex flex-col",
        "transform transition-transform duration-300 ease-out",
        open ? "translate-y-0" : "translate-y-full"
      )}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* User pill */}
        <div className="mx-4 mb-3 flex items-center gap-3 bg-cyan-50 rounded-xl px-4 py-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-cyan-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-gray-500 truncate">{user?.role}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setShowPw(true)}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white transition-colors">
              <KeyRound className="h-4 w-4" />
            </button>
            <button onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable groups */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
          {visibleGroups.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
                {group.label}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {group.links.map((link) => {
                  const active = isActive(link.href);
                  return (
                    <Link key={link.href} href={link.href} onClick={onClose}
                      className={cn(
                        "flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-xl text-center transition-colors",
                        active ? "bg-cyan-600 text-white" : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                      )}>
                      <span className="text-2xl leading-none">{link.emoji}</span>
                      <span className="text-xs font-semibold leading-tight">{link.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Notification + Logout at the bottom */}
          <div className="pt-1 border-t border-gray-100 space-y-2">
            <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl">
              <NotificationBell />
              <span className="text-sm font-medium text-gray-700">Daily Payments</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2.5 bg-amber-50 rounded-xl">
              <ContractApprovalBell />
              <span className="text-sm font-medium text-gray-700">Contract Approvals</span>
            </div>
            <button onClick={onLogout}
              className="flex w-full items-center gap-3 px-3 py-2.5 bg-red-50 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors">
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
