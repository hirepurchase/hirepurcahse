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
        <header className="flex items-center gap-3 workspace-heading workspace-heading--report">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
            <Medal className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Cluster leader scorecard</h1>
            <p className="text-sm text-gray-500">Monthly performance pay for cluster leaders.</p>
          </div>
        </header>
        {tabs.length > 1 && (
          <div className="operations-panel min-w-0">
            <nav aria-label="Cluster scorecard navigation" className="flex gap-1 overflow-x-auto p-1.5">
              {tabs.map(({ label, href, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      'inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                      active ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
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
