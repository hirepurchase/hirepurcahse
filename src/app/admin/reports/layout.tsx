'use client';

import { usePathname } from 'next/navigation';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { PERMISSIONS } from '@/lib/permissions';

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Portfolio at Risk is also for cluster leaders and officers, who see their
  // own scope of it: the menu shows it to them and the API allows it, so the
  // page must too. Every other report stays behind VIEW_REPORTS.
  const permissions = pathname?.startsWith('/admin/reports/portfolio-at-risk')
    ? [PERMISSIONS.VIEW_REPORTS, PERMISSIONS.VIEW_ASSIGNED_CONTRACTS]
    : [PERMISSIONS.VIEW_REPORTS];
  return <ProtectedRoute permissions={permissions}>{children}</ProtectedRoute>;
}
