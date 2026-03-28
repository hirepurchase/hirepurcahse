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
  KeyRound,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import type { AdminUser } from "@/types";
import api from "@/lib/api";
import type { LucideIcon } from "lucide-react";
import NotificationBell from "./NotificationBell";
import { useDailyPayments } from "@/hooks/useDailyPayments";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: (paymentCount: number) => number | null;
  // Any ONE of these permissions grants access. Empty = visible to all admins.
  permissions?: string[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
  // Any ONE of these permissions makes the whole group visible
  permissions?: string[];
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
    permissions: ["VIEW_CUSTOMERS"],
    items: [
      { name: "Customers", href: "/admin/customers", icon: Users, permissions: ["VIEW_CUSTOMERS"] },
    ],
  },
  {
    label: "Contracts & Payments",
    permissions: ["VIEW_CONTRACTS", "VIEW_PAYMENTS"],
    items: [
      { name: "Contracts", href: "/admin/contracts", icon: FileText, permissions: ["VIEW_CONTRACTS"] },
      {
        name: "Payments",
        href: "/admin/payments",
        icon: CreditCard,
        badge: (count) => (count > 0 ? count : null),
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

type SidebarContentProps = {
  user: AdminUser | null;
  pathname: string | null;
  paymentCount: number;
  onNavigate: () => void;
  onLogout: () => void;
};

function SidebarContent({ user, pathname, paymentCount, onNavigate, onLogout }: SidebarContentProps) {
  const { hasAnyPermission } = usePermissions();

  // Filter groups and items based on the current user's permissions
  const visibleGroups = navGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item =>
        !item.permissions || item.permissions.length === 0 || hasAnyPermission(item.permissions)
      ),
    }))
    .filter(group =>
      group.items.length > 0 &&
      (!group.permissions || group.permissions.length === 0 || hasAnyPermission(group.permissions))
    );

  // Pre-expand the group containing the active page
  const activeGroup = visibleGroups.findIndex(g => g.items.some(i => pathname === i.href || pathname?.startsWith(i.href + '/')));
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

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [isChangingPw, setIsChangingPw] = useState(false);

  const handleChangePassword = async () => {
    setPwError('');
    setPwSuccess('');
    if (!pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword) {
      setPwError('All fields are required');
      return;
    }
    if (pwForm.newPassword.length < 8) {
      setPwError('New password must be at least 8 characters');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('Passwords do not match');
      return;
    }
    setIsChangingPw(true);
    try {
      await api.put('/auth/admin/me/password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
        confirmPassword: pwForm.confirmPassword,
      });
      setPwSuccess('Password changed successfully');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setPwError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setIsChangingPw(false);
    }
  };

  return (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-cyan-300/25 px-4 bg-white/5 shrink-0">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight">AIDOO TECH</h1>
      </div>

      {/* User Info */}
      <div className="border-b border-cyan-300/20 px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-sm font-bold text-cyan-200">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-cyan-100/60 truncate">{user?.role}</p>
          </div>
          <button
            onClick={() => { setShowChangePassword(true); setPwError(''); setPwSuccess(''); }}
            title="Change my password"
            className="shrink-0 p-1.5 rounded-lg text-cyan-100/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <KeyRound className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Change My Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 z-100 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowChangePassword(false)} />
          <div className="relative z-10 bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4 text-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <KeyRound className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-semibold">Change My Password</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Current Password</label>
                <input
                  type="password"
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={pwForm.currentPassword}
                  onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">New Password</label>
                <input
                  type="password"
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={pwForm.newPassword}
                  onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })}
                  placeholder="Minimum 8 characters"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Confirm New Password</label>
                <input
                  type="password"
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={pwForm.confirmPassword}
                  onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                  autoComplete="new-password"
                />
              </div>
              {pwError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-md">{pwError}</p>}
              {pwSuccess && <p className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-md">{pwSuccess}</p>}
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={handleChangePassword}
                disabled={isChangingPw}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {isChangingPw ? 'Saving...' : 'Save Password'}
              </button>
              <button
                onClick={() => setShowChangePassword(false)}
                disabled={isChangingPw}
                className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
        {visibleGroups.map((group, groupIdx) => {
          const isOpen = openGroups.has(groupIdx);
          const isSingleItem = group.items.length === 1;

          if (isSingleItem) {
            const item = group.items[0];
            const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname?.startsWith(item.href + '/'));
            const badgeCount = item.badge?.(paymentCount) ?? null;
            return (
              <div key={groupIdx}>
                <p className="px-2 pt-4 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-cyan-200/50">
                  {group.label}
                </p>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                    isActive
                      ? "bg-cyan-500/20 text-white ring-1 ring-cyan-400/30 shadow-sm"
                      : "text-cyan-50/75 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-cyan-300" : "text-cyan-100/60")} />
                  <span className="flex-1 truncate">{item.name}</span>
                  {badgeCount !== null && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-green-500 px-1.5 text-[10px] font-bold text-white">
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
                className="w-full flex items-center justify-between px-2 pt-4 pb-1.5 group"
              >
                <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-200/50 group-hover:text-cyan-200/80 transition-colors">
                  {group.label}
                </p>
                {isOpen
                  ? <ChevronDown className="h-3.5 w-3.5 text-cyan-100/40 group-hover:text-cyan-100/70 transition-colors" />
                  : <ChevronRight className="h-3.5 w-3.5 text-cyan-100/40 group-hover:text-cyan-100/70 transition-colors" />
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
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                          isActive
                            ? "bg-cyan-500/20 text-white ring-1 ring-cyan-400/30 shadow-sm"
                            : "text-cyan-50/75 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-cyan-300" : "text-cyan-100/60")} />
                        <span className="flex-1 truncate">{item.name}</span>
                        {badgeCount !== null && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-green-500 px-1.5 text-[10px] font-bold text-white">
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
      <div className="border-t border-cyan-300/20 p-3 sm:p-4 shrink-0">
        <div className="flex items-center gap-3 px-3 py-1">
          <NotificationBell />
          <span className="text-xs sm:text-sm font-medium text-cyan-50/85">Daily Payments</span>
        </div>
      </div>

      {/* Logout */}
      <div className="border-t border-cyan-300/20 p-3 sm:p-4 shrink-0">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium text-cyan-50/85 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
          Logout
        </button>
      </div>

      {/* Footer */}
      <div className="border-t border-cyan-300/20 p-3 sm:p-4 shrink-0">
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
