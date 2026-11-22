'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import CustomerSidebar from '@/components/CustomerSidebar';
import FloatingPayButton from '@/components/customer/FloatingPayButton';

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
    <div className="flex h-dvh bg-transparent surface-grid">
      <a href="#customer-content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3">
        Skip to content
      </a>
      <CustomerSidebar />
      {/* pb-32 reserves space for the mobile bottom tab bar and the pay button */}
      <main id="customer-content" tabIndex={-1} className="min-w-0 flex-1 overflow-auto pb-[calc(8rem+env(safe-area-inset-bottom,0px))] lg:pb-24">
        <div className="page-shell workspace-page mx-auto w-full max-w-[1200px] p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
      <FloatingPayButton />
    </div>
  );
}
