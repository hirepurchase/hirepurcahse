'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, FileText, Banknote, AlertCircle, Plus, PackagePlus, UserPlus, Wallet } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { AdminUser } from '@/types';

interface RecentContract {
  id: string;
  createdAt: string;
  totalPrice: number;
  status: string;
  customer: { firstName: string; lastName: string; membershipId: string };
  inventoryItem: { product: { name: string } } | null;
}

interface DashboardStats {
  totalCustomers: number;
  totalContracts: number;
  activeContracts: number;
  totalRevenue: number;
  monthlyPayments: number;
  overduePayments: number;
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-slate-100 text-slate-700',
  DEFAULTED: 'bg-red-100 text-red-800',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-900',
  REVISION_REQUESTED: 'bg-amber-100 text-amber-900',
};

export default function AdminDashboard() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const { user, isLoading: isAuthLoading } = useAuthStore();
  const adminUser = user as AdminUser | null;

  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalContracts: 0,
    activeContracts: 0,
    totalRevenue: 0,
    monthlyPayments: 0,
    overduePayments: 0,
  });
  const [recentContracts, setRecentContracts] = useState<RecentContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardStats = useCallback(async () => {
    setIsLoading(true);
    try {
      setError(null);
      const response = await api.get('/reports/dashboard');
      const payload = response.data;
      setStats({
        totalCustomers: payload?.customers?.total ?? 0,
        totalContracts: payload?.contracts?.total ?? 0,
        activeContracts: payload?.contracts?.active ?? 0,
        totalRevenue: payload?.payments?.monthlyTotal ?? 0,
        monthlyPayments: payload?.payments?.monthlyCount ?? 0,
        overduePayments: payload?.alerts?.overdueInstallments ?? 0,
      });
      setRecentContracts(payload?.recentContracts ?? []);
    } catch {
      setError('We couldn’t load the dashboard. Try again to see the latest figures.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (adminUser?.role === 'AGENT') {
      router.replace('/admin/agent/dashboard');
      return;
    }

    if (adminUser?.role === 'CLUSTER_AGENT') {
      router.replace('/admin/cluster/dashboard');
      return;
    }

    // Customer service work from their own dashboard (their menu and phone
    // tabs start there), so signing in lands them on it.
    if (adminUser?.role === 'CUSTOMER_SERVICE') {
      router.replace('/admin/customer-service/dashboard');
      return;
    }

    void loadDashboardStats();
  }, [adminUser?.role, isAuthLoading, loadDashboardStats, router]);

  const canCreateContract = hasPermission(PERMISSIONS.CREATE_CONTRACT);
  const shortcuts = [
    { label: 'Register customer', href: '/admin/customers?action=new', icon: UserPlus, permission: PERMISSIONS.CREATE_CUSTOMER },
    { label: 'Add product', href: '/admin/products?action=new', icon: PackagePlus, permission: PERMISSIONS.MANAGE_PRODUCTS },
    { label: 'View payment reports', href: '/admin/reports/payments', icon: Wallet, permission: PERMISSIONS.VIEW_REPORTS },
  ].filter(({ permission }) => hasPermission(permission));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 workspace-heading workspace-heading--work">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Operations overview</h1>
          <p className="mt-2 text-base text-slate-600">Monitor collections, customers, and contracts.</p>
        </div>
        {canCreateContract && (
          <Button asChild size="lg">
            <Link href="/admin/contracts?action=new"><Plus aria-hidden="true" /> New contract</Link>
          </Button>
        )}
      </header>

      {isLoading ? (
        <div role="status" className="operations-panel flex min-h-52 items-center justify-center gap-3 text-sm text-slate-600">
          <span aria-hidden="true" className="size-5 rounded-full border-2 border-blue-100 border-t-blue-600 motion-safe:animate-spin" />
          Loading dashboard…
        </div>
      ) : error ? (
        <div role="alert" className="operations-panel flex flex-wrap items-center gap-3 p-5">
          <AlertCircle aria-hidden="true" className="size-5 text-red-600" />
          <p className="flex-1 text-sm text-slate-700">{error}</p>
          <Button variant="outline" onClick={loadDashboardStats}>Retry</Button>
        </div>
      ) : (
        <>
          <section aria-label="Portfolio metrics" className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
            <Metric title="Collected this month" value={formatCurrency(stats.totalRevenue)}
              detail={`${stats.monthlyPayments.toLocaleString()} successful payments`} icon={Banknote}
              href="/admin/reports/payments" featured />
            <Metric title="Active contracts" value={stats.activeContracts.toLocaleString()}
              detail={`${stats.totalContracts.toLocaleString()} total contracts`} icon={FileText} href="/admin/contracts" />
            <Metric title="Customers" value={stats.totalCustomers.toLocaleString()}
              detail="Registered customers" icon={Users} href="/admin/customers" />
            <Metric title="Overdue installments" value={stats.overduePayments.toLocaleString()}
              detail={stats.overduePayments > 0 ? 'View defaults report' : 'No overdue installments'}
              icon={AlertCircle} href="/admin/reports/defaults" attention={stats.overduePayments > 0} />
          </section>

          <div className={cn('grid items-start gap-5', shortcuts.length > 0 && 'xl:grid-cols-[minmax(0,1fr)_17rem]')}>
            <section aria-labelledby="recent-contracts" className="operations-panel min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
                <h2 id="recent-contracts" className="text-lg font-bold text-slate-950">Recent contracts</h2>
                <Button asChild variant="outline" size="sm"><Link href="/admin/contracts">All contracts</Link></Button>
              </div>
              {recentContracts.length === 0 ? (
                <p className="border-t px-5 py-12 text-center text-sm text-slate-600 workspace-empty-message">No contracts yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table aria-labelledby="recent-contracts" className="w-full text-left text-sm">
                    <thead className="border-y bg-slate-50 text-slate-600">
                      <tr>
                        <th scope="col" className="px-4 py-3 font-semibold sm:pl-5">Customer</th>
                        <th scope="col" className="hidden px-3 py-3 font-semibold md:table-cell">Created</th>
                        <th scope="col" className="px-3 py-3 text-right font-semibold">Contract total</th>
                        <th scope="col" className="hidden px-4 py-3 font-semibold sm:table-cell">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {recentContracts.map((contract) => {
                        const { firstName, lastName, membershipId } = contract.customer;
                        const status = (
                          <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize', STATUS_STYLES[contract.status] ?? 'bg-slate-100 text-slate-700')}>
                            {contract.status.toLowerCase().replace(/_/g, ' ')}
                          </span>
                        );
                        return (
                          <tr key={contract.id} className="hover:bg-slate-50">
                            <th scope="row" className="px-4 py-3 font-normal sm:pl-5">
                              <Link href={`/admin/contracts/${contract.id}`} className="font-semibold text-blue-700 hover:underline">
                                {firstName} {lastName}
                              </Link>
                              <p className="mt-0.5 text-xs text-slate-600">{[contract.inventoryItem?.product?.name, membershipId].filter(Boolean).join(' · ')}</p>
                            </th>
                            <td className="hidden whitespace-nowrap px-3 py-3 text-slate-600 md:table-cell">{formatDate(contract.createdAt)}</td>
                            <td className="px-3 py-3 text-right font-semibold text-slate-900">
                              <span className="whitespace-nowrap">{formatCurrency(contract.totalPrice)}</span>
                              <div className="mt-1 sm:hidden">{status}</div>
                            </td>
                            <td className="hidden px-4 py-3 sm:table-cell">{status}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            {shortcuts.length > 0 && (
              <section aria-labelledby="quick-actions" className="operations-panel p-4 sm:p-5">
                <h2 id="quick-actions" className="text-lg font-bold text-slate-950">Quick actions</h2>
                <ul className="mt-4 space-y-2">
                  {shortcuts.map(({ href, label, icon: Icon }) => (
                    <li key={href}>
                      <Link href={href} className="flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800">
                        <Icon aria-hidden="true" className="size-4 shrink-0 text-blue-700" />
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ title, value, detail, icon: Icon, href, featured, attention }: {
  title: string;
  value: string;
  detail: string;
  icon: typeof Users;
  href: string;
  featured?: boolean;
  attention?: boolean;
}) {
  return (
    <Link href={href} className={cn('operations-panel flex min-w-0 flex-col p-4 transition-colors sm:p-5',
      featured ? 'operations-featured text-white' : 'hover:border-blue-300 hover:bg-blue-50/30')}>
      <div className="flex items-center justify-between gap-2">
        <span className={cn('text-sm font-semibold', featured ? 'text-blue-100' : 'text-slate-700')}>{title}</span>
        <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', featured ? 'bg-white/15 text-white' :
          attention ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700')}>
          <Icon aria-hidden="true" className="size-[18px]" />
        </span>
      </div>
      <span className={cn('mt-3 break-words text-2xl font-bold tracking-tight tabular-nums sm:text-[1.75rem]',
        attention && 'text-red-700')}>{value}</span>
      <span className={cn('mt-1 text-sm', featured ? 'text-blue-100' : 'text-slate-600')}>{detail}</span>
    </Link>
  );
}
