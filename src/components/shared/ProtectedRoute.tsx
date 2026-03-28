'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import type { AdminUser } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  userType?: 'admin' | 'customer';
  permissions?: string[];
}

export default function ProtectedRoute({
  children,
  requireAuth = true,
  userType,
  permissions,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, userType: currentUserType, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (requireAuth && !isAuthenticated) {
      const loginPath = userType === 'admin' ? '/admin-login' : '/customer-login';
      router.push(loginPath);
      return;
    }

    if (userType && currentUserType !== userType) {
      const loginPath = userType === 'admin' ? '/admin-login' : '/customer-login';
      router.push(loginPath);
      return;
    }

    if (permissions && permissions.length > 0 && currentUserType === 'admin') {
      const adminUser = user as AdminUser | null;
      const isSuperAdmin = adminUser?.role === 'SUPER_ADMIN';
      const hasPermission = isSuperAdmin || permissions.some(perm =>
        adminUser?.permissions?.includes(perm)
      );
      if (!hasPermission) {
        router.push('/admin/dashboard');
        return;
      }
    }
  }, [isLoading, isAuthenticated, currentUserType, userType, permissions, router, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Not authenticated or wrong user type — render nothing (redirect is in-flight)
  if (!isAuthenticated || (userType && currentUserType !== userType)) {
    return null;
  }

  // Permission check — render an access denied screen instead of null (prevents flash)
  if (permissions && permissions.length > 0 && currentUserType === 'admin') {
    const adminUser = user as AdminUser | null;
    const isSuperAdmin = adminUser?.role === 'SUPER_ADMIN';
    const hasPermission = isSuperAdmin || permissions.some(perm =>
      adminUser?.permissions?.includes(perm)
    );
    if (!hasPermission) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Access Denied</h2>
            <p className="text-gray-500 text-sm">You do not have permission to view this page.</p>
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="mt-6 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
