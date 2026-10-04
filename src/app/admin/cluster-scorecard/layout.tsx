'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Medal, SlidersHorizontal } from 'lucide-react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { PERMISSIONS } from '@/lib/permissions';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';

export default function ClusterScorecardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.MANAGE_COMMISSION_SETTINGS);
  const tabs = [
    { label: 'Scorecard', href: '/admin/cluster-scorecard', icon: Medal, show: true },
    { label: 'Rates', href: '/admin/cluster-scorecard/rates', icon: SlidersHorizontal, show: canManage },
  ].filter((t) => t.show);

  return (
    <ProtectedRoute permissions={[PERMISSIONS.VIEW_REPORTS, PERMISSIONS.MANAGE_COMMISSION_SETTINGS]}>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
            <Medal className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Cluster leader scorecard</h1>
            <p className="text-sm text-gray-500">Monthly performance pay for cluster leaders.</p>
          </div>
        </div>
        {tabs.length > 1 && (
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex gap-1 overflow-x-auto">
              {tabs.map(({ label, href, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium',
                      active ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
        {children}
      </div>
    </ProtectedRoute>
  );
}
