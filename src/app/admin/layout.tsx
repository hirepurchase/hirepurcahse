'use client';

import ProtectedRoute from '@/components/shared/ProtectedRoute';
import Sidebar from '@/components/admin/Sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requireAuth userType="admin">
      <div className="flex h-screen overflow-hidden surface-grid">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-transparent pt-16 lg:pt-0">
          <div className="page-shell p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
