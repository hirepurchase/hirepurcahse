'use client';

import ProtectedRoute from '@/components/shared/ProtectedRoute';
import Sidebar from '@/components/admin/Sidebar';
import DailyPaymentsBanner from '@/components/admin/DailyPaymentsBanner';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requireAuth userType="admin">
      <div className="flex h-screen overflow-hidden surface-grid">
        <Sidebar />
        {/* pb-16 reserves space for the mobile bottom tab bar */}
        <main className="flex-1 overflow-y-auto bg-transparent pb-16 lg:pb-0">
          <DailyPaymentsBanner />
          <div className="page-shell p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
