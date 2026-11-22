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
        <header className="flex items-center gap-3 workspace-heading workspace-heading--device">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
            <TabletSmartphone className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">PayTrigger</h1>
            <p className="text-sm text-gray-500">Device lock for financed TECNO, Infinix and itel phones.</p>
          </div>
        </header>

        <div className="operations-panel min-w-0">
          <nav aria-label="PayTrigger navigation" className="flex gap-1 overflow-x-auto p-1.5">
            {tabs.map(({ label, href, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname === href || pathname?.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    'inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                    active ? 'bg-indigo-50 text-indigo-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
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
