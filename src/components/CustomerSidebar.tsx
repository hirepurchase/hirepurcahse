"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Home,
  FileText,
  CreditCard,
  User,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Customer } from "@/types";
import type { LucideIcon } from "lucide-react";

type NavigationItem = {
  name: string;
  href: string;
  icon: LucideIcon;
};

type SidebarContentProps = {
  user: Customer | null;
  navigation: NavigationItem[];
  pathname: string | null;
  onNavigate: (href: string) => void;
  onLogout: () => void;
};

function SidebarContent({
  user,
  navigation,
  pathname,
  onNavigate,
  onLogout,
}: SidebarContentProps) {
  return (
    <>
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-amber-200/30 bg-white/5">
        <h1 className="text-lg sm:text-2xl font-bold tracking-tight">AIDOO TECH</h1>
        <p className="text-amber-50/85 text-xs sm:text-sm mt-1 truncate">
          {user?.firstName} {user?.lastName}
        </p>
        <p className="text-amber-100/70 text-xs font-mono mt-0.5 truncate">
          ID: {user?.membershipId}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 sm:p-4 space-y-2 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <button
              key={item.name}
              onClick={() => onNavigate(item.href)}
              className={cn(
                "w-full flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-colors text-sm sm:text-base",
                isActive
                  ? "bg-white/15 text-white font-medium ring-1 ring-white/30"
                  : "text-amber-50/90 hover:bg-white/10"
              )}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="truncate">{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 sm:p-4 border-t border-amber-200/25">
        <Button
          variant="outline"
          className="w-full bg-transparent border-white/80 text-white hover:bg-white/12 text-sm sm:text-base h-9 sm:h-10"
          onClick={onLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>

      {/* Footer */}
      <div className="p-3 sm:p-4 border-t border-amber-200/25">
        <p className="text-xs text-amber-100/75">
          EYO Solutions
          <br />
          0246-462398
        </p>
      </div>
    </>
  );
}

export default function CustomerSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Type guard to check if user is a customer
  const customerUser = user && "membershipId" in user ? user : null;

  const navigation: NavigationItem[] = [
    { name: "Dashboard", href: "/customer/dashboard", icon: Home },
    { name: "My Contracts", href: "/customer/contracts", icon: FileText },
    { name: "Payments", href: "/customer/payments", icon: CreditCard },
    { name: "Profile", href: "/customer/profile", icon: User },
  ];

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    router.push("/customer-login");
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-cyan-800 text-white rounded-xl shadow-[0_12px_26px_-14px_rgba(8,145,178,0.75)]"
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
      <div className="hidden lg:flex h-screen w-64 flex-col bg-gradient-to-b from-cyan-900 via-teal-900 to-emerald-900 text-white border-r border-white/10">
        <SidebarContent
          user={customerUser}
          navigation={navigation}
          pathname={pathname}
          onNavigate={(href) => {
            router.push(href);
            setMobileMenuOpen(false);
          }}
          onLogout={handleLogout}
        />
      </div>

      {/* Mobile Sidebar */}
      <div
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-40 w-64 flex flex-col bg-gradient-to-b from-cyan-900 via-teal-900 to-emerald-900 text-white transform transition-transform duration-300 ease-in-out",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent
          user={customerUser}
          navigation={navigation}
          pathname={pathname}
          onNavigate={(href) => {
            router.push(href);
            setMobileMenuOpen(false);
          }}
          onLogout={handleLogout}
        />
      </div>
    </>
  );
}
