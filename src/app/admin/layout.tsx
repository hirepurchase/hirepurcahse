'use client';

import ProtectedRoute from '@/components/shared/ProtectedRoute';
import Sidebar from '@/components/admin/Sidebar';
import TopBar from '@/components/admin/TopBar';
import DailyPaymentsBanner from '@/components/admin/DailyPaymentsBanner';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireAuth userType="admin">
      <div className="flex h-screen overflow-hidden bg-[#f4f6f9]">
        {/* Left sidebar — navigation only */}
        <Sidebar />

        {/* Right column: topbar + scrollable content */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Global title bar */}
          <TopBar />

          {/* Scrollable page area — pb-16 reserves space for mobile bottom tab bar */}
          <main className="flex-1 overflow-y-auto pb-16 lg:pb-0 surface-grid">
            <DailyPaymentsBanner />
            <div className="page-shell p-4 sm:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
