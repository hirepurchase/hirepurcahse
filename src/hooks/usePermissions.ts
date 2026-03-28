import { useAuthStore } from '@/store/authStore';
import { AdminUser } from '@/types';

export function usePermissions() {
  const { user, userType } = useAuthStore();

  const hasPermission = (permission: string): boolean => {
    if (userType !== 'admin' || !user) {
      return false;
    }

    const adminUser = user as AdminUser;
    // SUPER_ADMIN bypasses all permission checks (mirrors backend behaviour)
    if (adminUser.role === 'SUPER_ADMIN') {
      return true;
    }
    return adminUser.permissions?.includes(permission) || false;
  };

  const isSuperAdmin = (): boolean => {
    if (userType !== 'admin' || !user) return false;
    return (user as AdminUser).role === 'SUPER_ADMIN';
  };

  const isAdmin = (): boolean => {
    if (userType !== 'admin' || !user) return false;
    const role = (user as AdminUser).role;
    return role === 'SUPER_ADMIN' || role === 'ADMIN';
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some((permission) => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every((permission) => hasPermission(permission));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isSuperAdmin,
    isAdmin,
  };
}
