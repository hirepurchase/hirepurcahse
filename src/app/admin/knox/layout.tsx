'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Settings, Smartphone, PlusCircle } from 'lucide-react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { PERMISSIONS } from '@/lib/permissions';
import { cn } from '@/lib/utils';

const tabs = [
  { label: 'Overview',  href: '/admin/knox',          icon: Shield,       exact: true },
  { label: 'Devices',   href: '/admin/knox/devices',  icon: Smartphone,   exact: false },
  { label: 'Enroll',    href: '/admin/knox/enroll',   icon: PlusCircle,   exact: false },
  { label: 'Settings',  href: '/admin/knox/settings', icon: Settings,     exact: false },
];

export default function KnoxLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <ProtectedRoute permissions={[PERMISSIONS.VIEW_DEVICE_CONTROL, PERMISSIONS.MANAGE_DEVICE_CONTROL]}>
      <div className="space-y-6">
        {/* Section header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-600 shadow-sm">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Samsung Knox Guard</h1>
            <p className="text-sm text-gray-500">Centralised device restriction management for financed Samsung devices.</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex gap-1 overflow-x-auto">
            {tabs.map(({ label, href, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname === href || pathname?.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                    active
                      ? 'border-cyan-600 text-cyan-700'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Page content */}
        {children}
      </div>
    </ProtectedRoute>
  );
}
