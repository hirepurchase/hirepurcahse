'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import CustomerSidebar from '@/components/CustomerSidebar';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, userType, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/customer-login');
      } else if (userType !== 'customer') {
        router.push('/admin/dashboard');
      }
    }
  }, [isAuthenticated, userType, isLoading, router]);

  if (isLoading || !isAuthenticated || userType !== 'customer') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-transparent surface-grid">
      <CustomerSidebar />
      {/* pb-16 reserves space for the mobile bottom tab bar */}
      <main className="flex-1 overflow-auto pb-16 lg:pb-0">
        <div className="page-shell p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
