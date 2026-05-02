import { useAuthStore } from '@/store/authStore';
import { AdminUser } from '@/types';
import {
  adminHasAllPermissions,
  adminHasAnyPermission,
  adminHasPermission,
  isSuperAdmin as isSuperAdminUser,
  type PermissionName,
} from '@/lib/permissions';

export function usePermissions() {
  const { user, userType } = useAuthStore();
  const adminUser = userType === 'admin' ? (user as AdminUser | null) : null;

  const hasPermission = (permission: PermissionName): boolean => (
    userType === 'admin' ? adminHasPermission(adminUser, permission) : false
  );

  const isSuperAdmin = (): boolean => {
    return userType === 'admin' ? isSuperAdminUser(adminUser) : false;
  };

  const isAdmin = (): boolean => {
    if (userType !== 'admin' || !adminUser) return false;
    const role = adminUser.role;
    return role === 'SUPER_ADMIN' || role === 'ADMIN';
  };

  const hasAnyPermission = (permissions: readonly PermissionName[]): boolean => (
    userType === 'admin' ? adminHasAnyPermission(adminUser, permissions) : false
  );

  const hasAllPermissions = (permissions: readonly PermissionName[]): boolean => (
    userType === 'admin' ? adminHasAllPermissions(adminUser, permissions) : false
  );

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isSuperAdmin,
    isAdmin,
  };
}
