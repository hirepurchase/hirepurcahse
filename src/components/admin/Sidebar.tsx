"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  Warehouse,
  FileText,
  CreditCard,
  Landmark,
  BarChart3,
  Shield,
  History,
  Bell,
  LogOut,
  AlertCircle,
  MessageSquare,
  ClipboardList,
  ClipboardCheck,
  ChevronRight,
  KeyRound,
  Upload,
  X,
  Briefcase,
  Smartphone,
  TabletSmartphone,
  Medal,
  Gift,
  Wallet,
  BookOpen,
  DollarSign,
  Menu,
  Tags,
  UserCheck,
  PhoneCall,
  CalendarClock,
  Headset,
  Megaphone,
  AlertTriangle,
  Unlock,
  LockOpen,
  ShieldCheck,
  ShieldAlert,
  Target,
  PhoneIncoming,
  Boxes,
  UserCog,
  Network,
  RefreshCw,
  CalendarX,
  UserRound,
  Map as MapIcon,
  TrendingUp,
  Headphones,
  ShoppingCart,
  Banknote,
  Lock,
  PackageOpen,
  UsersRound,
  ChartLine,
  MessagesSquare,
  Settings,
  CalendarRange,
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
import AnnouncementBell from "./AnnouncementBell";
import DeviceIssueBell from "./DeviceIssueBell";
import { useDailyPayments } from "@/hooks/useDailyPayments";
import { usePendingContractApprovals } from "@/hooks/usePendingContractApprovals";
import { usePendingTemporaryUnlocks } from "@/hooks/usePendingTemporaryUnlocks";
import DeveloperCredit from "@/components/shared/DeveloperCredit";

// The customer service directory is for supervisors and officers. Agents are
// shown only their own officer, on their dashboard.
const CUSTOMER_SERVICE_CHART_PERMISSIONS = [
  PERMISSIONS.MANAGE_USERS,
  PERMISSIONS.MANAGE_CSO_ASSIGNMENTS,
  PERMISSIONS.VIEW_CONTRACTS,
  PERMISSIONS.MANAGE_CONTACT_ATTEMPTS,
] as const;

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: (paymentCount: number, approvalCount: number, temporaryUnlockCount: number) => number | null;
  badgeColor?: "red" | "amber";
  permissions?: readonly PermissionName[];
  /** Roles that reach this page from their own menu, so it is not listed twice. */
  hideForRoles?: string[];
  /** Listed only for these roles (pages the server keeps to one role). */
  onlyForRoles?: string[];
}

interface NavGroup {
  label: string;
  /** Shown beside the group's heading (desktop) and its title on the phone. */
  icon?: LucideIcon;
  items: NavItem[];
  permissions?: readonly PermissionName[];
  roles?: string[];
}

// One menu for every screen size: the desktop sidebar and the phone's "More"
// sheet both read this list. Groups follow the work, not the org chart:
// selling, getting paid, keeping phones locked, stock, people, reports,
// messages, and settings last. A role's own work comes first for that role.
//
// A group with no label is pinned at the top without a heading. A group shows
// only when at least one of its items does.
const DEVICE = [PERMISSIONS.VIEW_DEVICE_CONTROL, PERMISSIONS.MANAGE_DEVICE_CONTROL];
const OWN_MENU_ROLES = ["AGENT", "CLUSTER_AGENT", "CUSTOMER_SERVICE"];

const navGroups: NavGroup[] = [
  {
    label: "",
    items: [
      // Agents, cluster leaders and customer service have their own dashboards in their menu.
      { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, hideForRoles: OWN_MENU_ROLES },
    ],
  },

  // ── A role's own work ─────────────────────────────────────────────────────
  {
    label: "My work",
    icon: UserRound,
    roles: ["AGENT"],
    items: [
      { name: "Dashboard", href: "/admin/agent/dashboard", icon: LayoutDashboard },
      { name: "My Contracts", href: "/admin/agent/contracts", icon: Briefcase, permissions: [PERMISSIONS.VIEW_OWN_CONTRACTS] },
      { name: "Overdue", href: "/admin/agent/overdue", icon: AlertTriangle, permissions: [PERMISSIONS.VIEW_OWN_CONTRACTS] },
      { name: "Due Tomorrow", href: "/admin/agent/upcoming", icon: CalendarClock, permissions: [PERMISSIONS.VIEW_OWN_CONTRACTS] },
      { name: "Completed", href: "/admin/agent/completed", icon: ClipboardCheck, permissions: [PERMISSIONS.VIEW_OWN_CONTRACTS] },
      { name: "My Earnings", href: "/admin/agent/earnings", icon: Banknote, permissions: [PERMISSIONS.VIEW_AGENT_COMMISSIONS] },
      { name: "Deposit Ledger", href: "/admin/agent/deposits", icon: Wallet, permissions: [PERMISSIONS.VIEW_AGENT_COMMISSIONS] },
      { name: "My KPIs", href: "/admin/kpi", icon: Target },
      { name: "Price Chart", href: "/admin/price-chart", icon: Tags },
    ],
  },
  {
    label: "My cluster",
    icon: MapIcon,
    roles: ["CLUSTER_AGENT"],
    items: [
      { name: "Dashboard", href: "/admin/cluster/dashboard", icon: LayoutDashboard },
      { name: "Cluster Contracts", href: "/admin/contracts", icon: FileText, permissions: [PERMISSIONS.VIEW_ASSIGNED_CONTRACTS] },
      { name: "Overdue", href: "/admin/agent/overdue", icon: AlertTriangle, permissions: [PERMISSIONS.VIEW_OWN_CONTRACTS] },
      { name: "Due Tomorrow", href: "/admin/agent/upcoming", icon: CalendarClock, permissions: [PERMISSIONS.VIEW_OWN_CONTRACTS] },
      { name: "Completed", href: "/admin/agent/completed", icon: ClipboardCheck, permissions: [PERMISSIONS.VIEW_OWN_CONTRACTS] },
      { name: "Stock by Agent", href: "/admin/cluster/stock", icon: Boxes, permissions: [PERMISSIONS.VIEW_ASSIGNED_CONTRACTS] },
      { name: "Temporary Unlocks", href: "/admin/temporary-unlocks", icon: Unlock, permissions: [PERMISSIONS.REQUEST_TEMPORARY_UNLOCK] },
    ],
  },
  {
    label: "My sales",
    icon: TrendingUp,
    roles: ["CLUSTER_AGENT"],
    items: [
      { name: "My Earnings", href: "/admin/agent/earnings", icon: Banknote, permissions: [PERMISSIONS.VIEW_AGENT_COMMISSIONS] },
      { name: "My Contracts", href: "/admin/agent/contracts", icon: Briefcase, permissions: [PERMISSIONS.VIEW_OWN_CONTRACTS] },
      { name: "Deposit Ledger", href: "/admin/agent/deposits", icon: Wallet, permissions: [PERMISSIONS.VIEW_AGENT_COMMISSIONS] },
      { name: "My KPIs", href: "/admin/kpi", icon: Target },
      { name: "Price Chart", href: "/admin/price-chart", icon: Tags },
    ],
  },
  {
    label: "Customer service",
    icon: Headphones,
    roles: ["CUSTOMER_SERVICE"],
    items: [
      { name: "Dashboard", href: "/admin/customer-service/dashboard", icon: LayoutDashboard },
      {
        name: "Welcome Calls",
        href: "/admin/customer-service/verification",
        icon: UserCheck,
        // A contract cannot go live until it is verified, so a waiting one is
        // visible without opening the page.
        badge: (_pc, ac) => (ac > 0 ? ac : null),
        badgeColor: "amber",
        permissions: [PERMISSIONS.VERIFY_CUSTOMER],
      },
      { name: "Call Queue", href: "/admin/customer-service/call-queue", icon: PhoneCall, permissions: [PERMISSIONS.MANAGE_CONTACT_ATTEMPTS] },
      { name: "Follow-ups", href: "/admin/customer-service/follow-ups", icon: CalendarClock, permissions: [PERMISSIONS.MANAGE_CONTACT_ATTEMPTS] },
      { name: "My Agents", href: "/admin/customer-service/my-agents", icon: Briefcase, permissions: [PERMISSIONS.VIEW_ASSIGNED_CONTRACTS] },
      { name: "Customers", href: "/admin/customers", icon: Users, permissions: [PERMISSIONS.VIEW_ASSIGNED_CUSTOMERS] },
      { name: "Call Logs", href: "/admin/call-logs", icon: History, permissions: [PERMISSIONS.MANAGE_CONTACT_ATTEMPTS] },
      { name: "Send SMS", href: "/admin/sms", icon: MessageSquare, permissions: [PERMISSIONS.SEND_SMS] },
      { name: "My KPIs", href: "/admin/kpi", icon: Target },
    ],
  },

  // ── The business ──────────────────────────────────────────────────────────
  {
    label: "Sales",
    icon: ShoppingCart,
    items: [
      { name: "Customers", href: "/admin/customers", icon: Users, permissions: CUSTOMER_ACCESS_PERMISSIONS, hideForRoles: ["CUSTOMER_SERVICE"] },
      { name: "Contracts", href: "/admin/contracts", icon: FileText, permissions: CONTRACT_ACCESS_PERMISSIONS, hideForRoles: ["CLUSTER_AGENT"] },
      {
        name: "Approvals",
        href: "/admin/contract-approvals",
        icon: ClipboardCheck,
        badge: (_pc, ac) => (ac > 0 ? ac : null),
        badgeColor: "amber",
        permissions: CONTRACT_APPROVAL_ACCESS_PERMISSIONS,
      },
      // Customer service have it in their own menu.
      { name: "Welcome Calls", href: "/admin/customer-service/verification", icon: PhoneIncoming, permissions: [PERMISSIONS.VERIFY_CUSTOMER], hideForRoles: ["CUSTOMER_SERVICE"] },
      { name: "Reschedules", href: "/admin/reschedules", icon: CalendarRange, permissions: [PERMISSIONS.EDIT_CONTRACT_VALUES] },
    ],
  },
  {
    label: "Payments",
    icon: Banknote,
    items: [
      {
        name: "Payments",
        href: "/admin/payments",
        icon: CreditCard,
        badge: (count) => (count > 0 ? count : null),
        badgeColor: "red",
        permissions: [PERMISSIONS.VIEW_PAYMENTS],
      },
      { name: "Failed Payments", href: "/admin/failed-payments", icon: AlertCircle, permissions: [PERMISSIONS.VIEW_FAILED_PAYMENTS] },
      { name: "Agent Deposits", href: "/admin/agent/admin-ledger", icon: BookOpen, permissions: [PERMISSIONS.MANAGE_AGENT_LEDGER] },
      { name: "Completion Commission", href: "/admin/agent/completion-commission", icon: Medal, permissions: [PERMISSIONS.MANAGE_AGENT_LEDGER] },
      { name: "Completion Pay (per sale)", href: "/admin/agent/completion-commissions", icon: Gift, permissions: [PERMISSIONS.MANAGE_AGENT_LEDGER] },
    ],
  },
  {
    label: "Device locking",
    icon: Lock,
    items: [
      { name: "Device Control", href: "/admin/device-control", icon: Shield, permissions: DEVICE },
      { name: "Lock Issues", href: "/admin/device-issues", icon: AlertTriangle, permissions: DEVICE },
      {
        name: "Temporary Unlocks",
        href: "/admin/temporary-unlocks",
        icon: Unlock,
        // A request sits on a locked phone until someone decides, so the count
        // belongs in the nav rather than behind a click.
        badge: (_pc, _ac, tu) => (tu > 0 ? tu : null),
        badgeColor: "amber",
        permissions: [PERMISSIONS.APPROVE_TEMPORARY_UNLOCK, PERMISSIONS.VIEW_TEMPORARY_UNLOCKS],
        hideForRoles: ["CLUSTER_AGENT"],
      },
      { name: "Paid Unlocks", href: "/admin/paid-unlock", icon: LockOpen, permissions: [PERMISSIONS.MANAGE_DEVICE_CONTROL] },
      { name: "Knox Guard", href: "/admin/knox", icon: Smartphone, permissions: DEVICE },
      { name: "PayTrigger", href: "/admin/paytrigger", icon: TabletSmartphone, permissions: DEVICE },
    ],
  },
  {
    label: "Inventory",
    icon: PackageOpen,
    items: [
      { name: "Inventory", href: "/admin/inventory", icon: Warehouse, permissions: [PERMISSIONS.MANAGE_INVENTORY] },
      { name: "Products", href: "/admin/products", icon: Package, permissions: [PERMISSIONS.MANAGE_PRODUCTS] },
      { name: "Stock by Agent", href: "/admin/cluster/stock", icon: Boxes, permissions: [PERMISSIONS.MANAGE_INVENTORY], hideForRoles: ["CLUSTER_AGENT"] },
      { name: "Price Chart", href: "/admin/price-chart", icon: Tags, permissions: [PERMISSIONS.MANAGE_PRODUCTS], hideForRoles: ["AGENT", "CLUSTER_AGENT"] },
    ],
  },
  {
    label: "Team",
    icon: UsersRound,
    items: [
      { name: "Users", href: "/admin/users", icon: UserCog, permissions: [PERMISSIONS.MANAGE_USERS] },
      { name: "Agent Supervision", href: "/admin/agent-supervision", icon: ShieldCheck, permissions: [PERMISSIONS.MANAGE_USERS, PERMISSIONS.MANAGE_CSO_ASSIGNMENTS, PERMISSIONS.MANAGE_CLUSTER_ASSIGNMENTS] },
      { name: "Cluster Coverage", href: "/admin/cluster-chart", icon: Network, permissions: [PERMISSIONS.MANAGE_CLUSTER_ASSIGNMENTS, PERMISSIONS.MANAGE_USERS] },
      // Deliberately not shown to agents: they see their own officer on their dashboard.
      { name: "Customer Service", href: "/admin/customer-service-chart", icon: Headset, permissions: CUSTOMER_SERVICE_CHART_PERMISSIONS },
      { name: "Call Assignments", href: "/admin/welcome-calls", icon: PhoneIncoming, permissions: [PERMISSIONS.MANAGE_CSO_ASSIGNMENTS] },
    ],
  },
  {
    label: "Reports",
    icon: ChartLine,
    items: [
      { name: "Reports", href: "/admin/reports", icon: BarChart3, permissions: [PERMISSIONS.VIEW_REPORTS] },
      { name: "Portfolio at Risk", href: "/admin/reports/portfolio-at-risk", icon: ShieldAlert, permissions: [PERMISSIONS.VIEW_REPORTS, PERMISSIONS.VIEW_ASSIGNED_CONTRACTS] },
      { name: "KPIs", href: "/admin/kpi", icon: Target, permissions: [PERMISSIONS.VIEW_REPORTS], hideForRoles: OWN_MENU_ROLES },
      { name: "Cluster Scorecard", href: "/admin/cluster-scorecard", icon: Medal, permissions: [PERMISSIONS.VIEW_REPORTS, PERMISSIONS.MANAGE_COMMISSION_SETTINGS] },
      { name: "Call Logs", href: "/admin/call-logs", icon: History, permissions: [PERMISSIONS.VIEW_AUDIT_LOGS, PERMISSIONS.VIEW_REPORTS], hideForRoles: ["CUSTOMER_SERVICE"] },
    ],
  },
  {
    label: "Messages",
    icon: MessagesSquare,
    items: [
      { name: "Send SMS", href: "/admin/sms", icon: MessageSquare, permissions: [PERMISSIONS.MANAGE_SETTINGS], hideForRoles: ["CUSTOMER_SERVICE"] },
      { name: "SMS Log", href: "/admin/sms/log", icon: ClipboardList, permissions: [PERMISSIONS.MANAGE_SETTINGS] },
      { name: "Announcements", href: "/admin/announcements", icon: Megaphone, permissions: [PERMISSIONS.MANAGE_ANNOUNCEMENTS] },
    ],
  },
  {
    label: "Settings",
    icon: Settings,
    items: [
      { name: "Payment Gateway", href: "/admin/settings/payment-gateway", icon: Landmark, permissions: [PERMISSIONS.MANAGE_SETTINGS], onlyForRoles: ["SUPER_ADMIN"] },
      { name: "Payment Retries", href: "/admin/settings/retry-settings", icon: RefreshCw, permissions: [PERMISSIONS.MANAGE_SETTINGS] },
      { name: "Reschedule Rules", href: "/admin/settings/reschedules", icon: CalendarRange, permissions: [PERMISSIONS.MANAGE_SETTINGS] },
      { name: "Commissions", href: "/admin/settings/commission", icon: DollarSign, permissions: [PERMISSIONS.MANAGE_COMMISSION_SETTINGS] },
      { name: "Expiry Penalties", href: "/admin/settings/penalties", icon: CalendarX, permissions: [PERMISSIONS.MANAGE_SETTINGS] },
      { name: "Notifications", href: "/admin/settings/notifications", icon: Bell, permissions: [PERMISSIONS.MANAGE_SETTINGS] },
      { name: "Roles & Permissions", href: "/admin/roles", icon: KeyRound, permissions: [PERMISSIONS.MANAGE_ROLES] },
      { name: "Import Data", href: "/admin/import", icon: Upload, permissions: [PERMISSIONS.MANAGE_SETTINGS] },
      { name: "Audit Trail", href: "/admin/audit", icon: History, permissions: [PERMISSIONS.VIEW_AUDIT_LOGS] },
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

// ─── Shared: what this user can see ─────────────────────────────────────────

function useVisibleGroups(userRole: string) {
  const { hasAnyPermission } = usePermissions();
  return navGroups
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (i) =>
          (!i.permissions?.length || hasAnyPermission(i.permissions)) &&
          !i.hideForRoles?.includes(userRole) &&
          (!i.onlyForRoles || i.onlyForRoles.includes(userRole))
      ),
    }))
    .filter((g) => g.items.length > 0 && (!g.permissions?.length || hasAnyPermission(g.permissions)) && (!g.roles?.length || g.roles.includes(userRole)));
}

const ROOT_PAGES = ["/admin/dashboard", "/admin/agent/dashboard", "/admin/cluster/dashboard", "/admin/customer-service/dashboard", "/admin/sms"];

/** The menu item for this page: the longest href that matches, so /admin/sms/log lights SMS Log, not Send SMS. */
function activeHref(pathname: string | null, hrefs: string[]): string | null {
  if (!pathname) return null;
  let best: string | null = null;
  for (const h of hrefs) {
    const hit = pathname === h || (!ROOT_PAGES.includes(h) && pathname.startsWith(h + "/")) || (h === "/admin/sms" && pathname === h);
    if (hit && (!best || h.length > best.length)) best = h;
  }
  return best;
}

// Which groups each person has opened or closed, kept in this browser only.
// Read through useSyncExternalStore so the server render (no storage) and the
// browser agree, and every sidebar on the page stays in step.
const OPEN_KEY = "sidebar.groups";
const openListeners = new Set<() => void>();

function subscribeOpen(cb: () => void) {
  openListeners.add(cb);
  return () => {
    openListeners.delete(cb);
  };
}

function readOpenRaw(): string | null {
  try {
    return localStorage.getItem(OPEN_KEY);
  } catch {
    return null;
  }
}

function writeOpen(prefs: Record<string, boolean>) {
  try {
    localStorage.setItem(OPEN_KEY, JSON.stringify(prefs));
  } catch {
    /* per-browser convenience only */
  }
  openListeners.forEach((cb) => cb());
}

function parseOpen(raw: string | null): Record<string, boolean> {
  try {
    const v = raw ? JSON.parse(raw) : {};
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

function Badge({ value, color }: { value: number; color?: "red" | "amber" }) {
  return (
    <span
      className={cn(
        "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums text-white",
        color === "amber" ? "bg-amber-500" : "bg-red-500"
      )}
    >
      {value > 99 ? "99+" : value}
    </span>
  );
}

// ─── Desktop Sidebar Navigation ─────────────────────────────────────────────

function SidebarNav({
  pathname,
  paymentCount,
  approvalCount,
  temporaryUnlockCount,
  onNavigate,
}: {
  pathname: string | null;
  paymentCount: number;
  approvalCount: number;
  temporaryUnlockCount: number;
  onNavigate: () => void;
}) {
  const { user } = useAuth();
  const adminUser = user && "role" in user ? (user as AdminUser) : null;
  const userRole = adminUser?.role ?? "";
  const groups = useVisibleGroups(userRole);

  const current = activeHref(pathname, groups.flatMap((g) => g.items.map((i) => i.href)));
  const activeGroup = groups.find((g) => g.items.some((i) => i.href === current))?.label ?? null;

  // A group is open if this person said so; otherwise their own menu and the
  // group holding the current page start open, the rest closed.
  const prefs = parseOpen(useSyncExternalStore(subscribeOpen, readOpenRaw, () => null));
  const isOpen = (g: { label: string; roles?: string[] }) => prefs[g.label] ?? (g.label === activeGroup || !!g.roles?.length);
  const toggle = (g: { label: string; roles?: string[] }) => writeOpen({ ...prefs, [g.label]: !isOpen(g) });

  const badgeOf = (item: NavItem) => item.badge?.(paymentCount, approvalCount, temporaryUnlockCount) ?? null;

  const renderItem = (item: NavItem, nested = false) => {
    const active = item.href === current;
    const badge = badgeOf(item);
    return (
      <Link
        key={item.href + item.name}
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group/item relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
          active
            ? "bg-blue-500/20 font-semibold text-white"
            : "font-medium text-slate-300 hover:bg-white/[0.07] hover:text-white"
        )}
      >
        {active && (
          <span
            className={cn("absolute inset-y-1.5 w-[3px] bg-blue-500", nested ? "-left-[10px] rounded-full" : "left-0 rounded-r-full")}
            aria-hidden="true"
          />
        )}
        <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-blue-400" : "text-slate-500 group-hover/item:text-slate-300")} />
        <span className="flex-1 truncate">{item.name}</span>
        {badge !== null && <Badge value={badge} color={item.badgeColor} />}
      </Link>
    );
  };

  return (
    <nav className="flex-1 overflow-y-auto sidebar-scroll px-3 py-4" aria-label="Main">
      {groups.map((group) => {
        if (!group.label) {
          return (
            <div key="pinned" className="mb-2 space-y-0.5 border-b border-white/[0.06] pb-2">
              {group.items.map((item) => renderItem(item))}
            </div>
          );
        }
        const expanded = isOpen(group);
        const pending = group.items.reduce((s, i) => s + (badgeOf(i) ?? 0), 0);
        const pendingColor = group.items.some((i) => (badgeOf(i) ?? 0) > 0 && i.badgeColor === "red") ? "red" : "amber";
        const id = `nav-${group.label.replace(/\W+/g, "-").toLowerCase()}`;
        const holdsCurrent = group.label === activeGroup;
        return (
          <div key={group.label} className="mt-1 first:mt-0">
            <button
              type="button"
              onClick={() => toggle(group)}
              aria-expanded={expanded}
              aria-controls={id}
              className={cn(
                "group/head flex w-full items-center gap-3 rounded-md px-2.5 py-[7px] text-left text-[13.5px] font-semibold transition-colors",
                holdsCurrent ? "text-white" : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
              )}
            >
              {group.icon && (
                <group.icon
                  className={cn("h-4 w-4 shrink-0", holdsCurrent ? "text-blue-400" : "text-slate-400 group-hover/head:text-slate-200")}
                  aria-hidden="true"
                />
              )}
              <span className="flex-1 truncate">{group.label}</span>
              {!expanded && pending > 0 && <Badge value={pending} color={pendingColor} />}
              <ChevronRight
                className={cn("h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform duration-150", expanded && "rotate-90")}
                aria-hidden="true"
              />
            </button>
            {expanded && (
              <div id={id} className="ml-[18px] mt-0.5 space-y-0.5 border-l border-white/10 pl-2">
                {group.items.map((item) => renderItem(item, true))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/** The bottom tabs on a phone: each role's own home and main lists. */
function primaryTabs(userRole?: string) {
  return PRIMARY_TABS.map((t) => {
    if (userRole === "AGENT") {
      if (t.href === "/admin/dashboard") return { ...t, href: "/admin/agent/dashboard" };
      if (t.href === "/admin/contracts") return { ...t, name: "My Contracts", href: "/admin/agent/contracts", icon: Briefcase };
    }
    if (userRole === "CLUSTER_AGENT") {
      if (t.href === "/admin/dashboard") return { ...t, href: "/admin/cluster/dashboard" };
      if (t.href === "/admin/contracts") return { ...t, name: "My Contracts", href: "/admin/agent/contracts", icon: Briefcase };
    }
    if (userRole === "CUSTOMER_SERVICE") {
      if (t.href === "/admin/dashboard") return { ...t, href: "/admin/customer-service/dashboard" };
      if (t.href === "/admin/contracts") return { ...t, name: "Verify", href: "/admin/customer-service/verification", icon: UserCheck };
      if (t.href === "/admin/payments") return { ...t, name: "Call Queue", href: "/admin/customer-service/call-queue", icon: PhoneCall };
    }
    return t;
  });
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
  temporaryUnlockCount?: number;
  moreOpen: boolean;
  onMoreToggle: () => void;
  userRole?: string;
}) {
  const { hasAnyPermission } = usePermissions();

  const tabs = primaryTabs(userRole).filter((t) => !t.permissions.length || hasAnyPermission(t.permissions));

  const isActive = (href: string) =>
    pathname === href ||
    (href !== "/admin/dashboard" &&
      href !== "/admin/agent/dashboard" &&
      href !== "/admin/customer-service/dashboard" &&
      pathname?.startsWith(href + "/"));

  const moreActive = moreOpen || !tabs.some((t) => isActive(t.href));

  return (
    <nav aria-label="Mobile navigation" className="lg:hidden fixed bottom-0 inset-x-0 z-40 safe-area-bottom bg-white">
      <div className="bg-white border-t border-gray-200 shadow-[0_-1px_12px_rgba(0,0,0,0.08)]">
        <div className="flex items-end h-[60px] px-1">
          {tabs.map((tab) => {
            const active = isActive(tab.href);
            const badge = tab.href === "/admin/payments" && paymentCount > 0 ? paymentCount : null;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className="h-full min-w-0 flex-1 flex flex-col items-center justify-center gap-1 relative group"
              >
                <div className="relative">
                  <tab.icon
                    className={cn(
                      "h-5 w-5 transition-colors",
                      active ? "text-blue-600" : "text-slate-600 group-hover:text-slate-900"
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
                  "text-xs font-semibold leading-none transition-colors",
                  active ? "text-blue-600" : "text-slate-600 group-hover:text-slate-900"
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
            type="button"
            aria-expanded={moreOpen}
            onClick={onMoreToggle}
            className="h-full min-w-0 flex-1 flex flex-col items-center justify-center gap-1 relative group"
          >
            <Menu
              className={cn(
                "h-5 w-5 transition-colors",
                moreActive ? "text-blue-600" : "text-slate-600 group-hover:text-slate-900"
              )}
              strokeWidth={moreActive ? 2.5 : 1.75}
            />
            <span className={cn(
              "text-xs font-semibold leading-none transition-colors",
              moreActive ? "text-blue-600" : "text-slate-600 group-hover:text-slate-900"
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
  paymentCount,
  approvalCount,
  temporaryUnlockCount,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  user: AdminUser | null;
  pathname: string | null;
  paymentCount: number;
  approvalCount: number;
  temporaryUnlockCount: number;
  onLogout: () => void;
}) {
  const { hasAnyPermission } = usePermissions();
  const userRole = user?.role ?? "";
  // The bottom tabs are already one tap away: the sheet holds everything else.
  const onTabs = new Set(primaryTabs(userRole).filter((t) => !t.permissions.length || hasAnyPermission(t.permissions)).map((t) => t.href));
  const visibleGroups = useVisibleGroups(userRole)
    .map((g) => ({ ...g, items: g.items.filter((i) => !onTabs.has(i.href)) }))
    .filter((g) => g.items.length > 0);
  const current = activeHref(pathname, visibleGroups.flatMap((g) => g.items.map((i) => i.href)));

  return (
    <>
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
          onClick={onClose}
        />
      )}

      <div inert={!open} className={cn(
        "lg:hidden fixed bottom-0 inset-x-0 z-50 rounded-t-2xl shadow-2xl max-h-[88dvh] flex flex-col",
        "bg-white border-t border-gray-200",
        "transform transition-transform duration-300 ease-out motion-reduce:transition-none",
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
            <AnnouncementBell variant="light" />
            <DeviceIssueBell variant="light" />
            <NotificationBell variant="light" />
            <ContractApprovalBell variant="light" />
            <button aria-label="Close navigation" onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-200 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Grid groups */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-5">
          {visibleGroups.map((group) => (
            <div key={group.label || "pinned"}>
              {group.label && (
                <p className="mb-2.5 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                  {group.icon && <group.icon className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />}
                  {group.label}
                </p>
              )}
              <div className="grid grid-cols-3 gap-2">
                {group.items.map((item) => {
                  const active = item.href === current;
                  const badge = item.badge?.(paymentCount, approvalCount, temporaryUnlockCount) ?? null;
                  return (
                    <Link
                      key={item.href + item.name}
                      href={item.href}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex flex-col items-center gap-2 rounded-xl px-2 py-3.5 text-center transition-all active:scale-95",
                        active ? "bg-blue-600 shadow-md" : "border border-gray-200 bg-gray-50 hover:bg-gray-100"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg",
                          active ? "bg-white/15 text-white" : "bg-white text-blue-600 shadow-sm ring-1 ring-gray-200"
                        )}
                      >
                        <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                      </span>
                      <span className={cn("text-[11px] font-semibold leading-tight", active ? "text-white" : "text-gray-700")}>
                        {item.name}
                      </span>
                      {badge !== null && (
                        <span className="absolute right-1.5 top-1.5">
                          <Badge value={badge} color={item.badgeColor} />
                        </span>
                      )}
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
          <DeveloperCredit phone="0246-462398" className="pt-1" />
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
  const { count: temporaryUnlockCount } = usePendingTemporaryUnlocks();

  const adminUser = user && "role" in user ? (user as AdminUser) : null;

  const handleLogout = () => {
    logout();
    setMoreOpen(false);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="operations-sidebar hidden lg:flex h-full w-60 shrink-0 flex-col border-r border-slate-800">
        {/* Brand strip */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-white/10 shrink-0">
          <Image src="/logo-mark-white.png" alt="" width={32} height={32} className="shrink-0" />
          <div className="leading-none">
            <p className="text-base font-bold text-white tracking-tight">AidooTech</p>
            <p className="text-xs text-slate-300 font-medium mt-1">Hire Purchase</p>
          </div>
        </div>

        {/* Nav */}
        <SidebarNav
          pathname={pathname}
          paymentCount={paymentCount}
          approvalCount={approvalCount}
          temporaryUnlockCount={temporaryUnlockCount}
          onNavigate={() => {}}
        />

        {/* Footer */}
        <div className="border-t border-slate-800 px-3 py-3 shrink-0">
          <DeveloperCredit tone="dark" phone="0246-462398" size="xs" />
        </div>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <MobileTabBar
        pathname={pathname}
        paymentCount={paymentCount}
        approvalCount={approvalCount}
        temporaryUnlockCount={temporaryUnlockCount}
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
        approvalCount={approvalCount}
        temporaryUnlockCount={temporaryUnlockCount}
        onLogout={handleLogout}
      />
    </>
  );
}
