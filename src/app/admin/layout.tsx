'use client';

import ProtectedRoute from '@/components/shared/ProtectedRoute';
import Sidebar from '@/components/admin/Sidebar';
import TopBar from '@/components/admin/TopBar';
import DailyPaymentsBanner from '@/components/admin/DailyPaymentsBanner';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireAuth userType="admin">
      <div className="flex h-dvh overflow-hidden bg-background">
        <a href="#staff-content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3">
          Skip to content
        </a>
        {/* Left sidebar — navigation only */}
        <Sidebar />

        {/* Right column: topbar + scrollable content */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Global title bar */}
          <TopBar />

          {/* Scrollable page area — pb-16 reserves space for mobile bottom tab bar */}
          <main id="staff-content" tabIndex={-1} className="flex-1 overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom,0px))] lg:pb-0 surface-grid">
            <div className="page-shell workspace-page mx-auto w-full max-w-[1440px] p-4 sm:p-6 lg:p-8">
              <DailyPaymentsBanner />
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
