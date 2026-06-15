"use client";

import { useState } from "react";
import { LogOut, KeyRound, ChevronDown, User, Bell, ClipboardCheck, Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type { AdminUser } from "@/types";
import api from "@/lib/api";
import NotificationBell from "./NotificationBell";
import ContractApprovalBell from "./ContractApprovalBell";

// ─── Change Password Modal ───────────────────────────────────────────────────

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setError(""); setSuccess("");
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError("All fields are required"); return;
    }
    if (form.newPassword.length < 8) {
      setError("New password must be at least 8 characters"); return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords do not match"); return;
    }
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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 w-full max-w-sm mx-4">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <KeyRound className="h-4 w-4 text-blue-600" />
          </div>
          <h2 className="text-base font-semibold text-gray-900">Change Password</h2>
        </div>
        <div className="space-y-3">
          {[
            { key: "currentPassword", label: "Current Password", ac: "current-password" },
            { key: "newPassword", label: "New Password", ac: "new-password", hint: "Minimum 8 characters" },
            { key: "confirmPassword", label: "Confirm Password", ac: "new-password" },
          ].map(({ key, label, ac, hint }) => (
            <div key={key}>
              <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
              <input
                type="password"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={hint}
                autoComplete={ac}
              />
            </div>
          ))}
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>}
          {success && <p className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">{success}</p>}
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            {loading ? "Saving…" : "Save Password"}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── User Dropdown ───────────────────────────────────────────────────────────

function UserMenu({ user, onLogout }: { user: AdminUser; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <>
      {showPw && <ChangePasswordModal onClose={() => setShowPw(false)} />}
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl border transition-all",
            open
              ? "bg-gray-100 border-gray-300"
              : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300"
          )}
        >
          {/* Avatar */}
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
            {initials}
          </div>
          <div className="hidden sm:flex flex-col items-start leading-none">
            <span className="text-[13px] font-semibold text-gray-800">{user.firstName} {user.lastName}</span>
            <span className="text-[11px] text-gray-500 mt-0.5">{user.role}</span>
          </div>
          <ChevronDown className={cn("h-3.5 w-3.5 text-gray-400 transition-transform hidden sm:block", open && "rotate-180")} />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 mt-2 w-56 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden animate-slide-down">
              {/* User info header */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user.firstName} {user.lastName}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
                <span className="inline-flex mt-2 items-center px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-[11px] font-semibold text-blue-700">
                  {user.role}
                </span>
              </div>

              {/* Actions */}
              <div className="p-1.5 space-y-0.5">
                <button
                  onClick={() => { setOpen(false); setShowPw(true); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                >
                  <KeyRound className="h-4 w-4 text-gray-400" />
                  Change Password
                </button>
                <button
                  onClick={() => { setOpen(false); onLogout(); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── TopBar Export ───────────────────────────────────────────────────────────

export default function TopBar({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const { user, logout } = useAuth();
  const adminUser = user && "role" in user ? (user as AdminUser) : null;

  return (
    <header className="h-14 shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 z-30 sticky top-0">
      {/* Left: company branding */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger — only shown when sidebar is a drawer */}
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors mr-1"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        {/* Logo mark */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <span className="text-white text-[13px] font-extrabold tracking-tighter leading-none">AT</span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[15px] font-extrabold text-gray-900 tracking-tight">AIDOO TECH</span>
            <span className="text-[10px] text-gray-400 font-medium tracking-wide uppercase hidden sm:block">Hire Purchase System</span>
          </div>
        </div>
      </div>

      {/* Right: bells + user menu */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Notification bells — shown on desktop only (mobile has "More" sheet) */}
        <div className="hidden lg:flex items-center gap-1">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
            <NotificationBell />
          </div>
          <div className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
            <ContractApprovalBell />
          </div>
        </div>

        <div className="hidden lg:block w-px h-6 bg-gray-200 mx-1" />

        {adminUser && <UserMenu user={adminUser} onLogout={logout} />}
      </div>
    </header>
  );
}
