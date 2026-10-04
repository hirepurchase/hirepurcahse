'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle, Layers, Package, PlusCircle, Settings, Smartphone, TabletSmartphone } from 'lucide-react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { PERMISSIONS } from '@/lib/permissions';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

const tabs = [
  { label: 'Overview', href: '/admin/paytrigger', icon: TabletSmartphone, exact: true },
  { label: 'Issues', href: '/admin/paytrigger/issues', icon: AlertTriangle, exact: false },
  { label: 'Devices', href: '/admin/paytrigger/devices', icon: Smartphone, exact: false },
  { label: 'Enrol', href: '/admin/paytrigger/enrol', icon: PlusCircle, exact: false },
  { label: 'Ladder', href: '/admin/paytrigger/ladder', icon: Layers, exact: false },
  { label: 'Products', href: '/admin/paytrigger/products', icon: Package, exact: false },
  { label: 'Settings', href: '/admin/paytrigger/settings', icon: Settings, exact: false },
];

export default function PayTriggerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [waiting, setWaiting] = useState(0);

  // The one number an admin must not miss: customers who paid and are still locked.
  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .get('/paytrigger/health')
        .then(({ data }) => alive && setWaiting(data.paidStillLocked || 0))
        .catch(() => undefined);
    load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [pathname]);

  return (
    <ProtectedRoute permissions={[PERMISSIONS.VIEW_DEVICE_CONTROL, PERMISSIONS.MANAGE_DEVICE_CONTROL]}>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
            <TabletSmartphone className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">PayTrigger</h1>
            <p className="text-sm text-gray-500">Device lock for financed TECNO, Infinix and itel phones.</p>
          </div>
        </div>

        <div className="border-b border-gray-200">
          <nav className="-mb-px flex gap-1 overflow-x-auto">
            {tabs.map(({ label, href, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname === href || pathname?.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                    active ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                  {label === 'Issues' && waiting > 0 && (
                    <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{waiting}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {children}
      </div>
    </ProtectedRoute>
  );
}
