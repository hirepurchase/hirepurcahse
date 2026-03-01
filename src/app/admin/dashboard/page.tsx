'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, DollarSign, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface RecentContract {
  id: string;
  createdAt: string;
  totalAmount: number;
  status: string;
  customer: { firstName: string; lastName: string; membershipId: string };
  inventoryItem: { product: { name: string } } | null;
}

interface DashboardStats {
  totalCustomers: number;
  totalContracts: number;
  activeContracts: number;
  totalRevenue: number;
  overduePayments: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalContracts: 0,
    activeContracts: 0,
    totalRevenue: 0,
    overduePayments: 0,
  });
  const [recentContracts, setRecentContracts] = useState<RecentContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setError(null);
      const response = await api.get('/reports/dashboard');
      const payload = response.data;

      setStats({
        totalCustomers: payload?.customers?.total ?? 0,
        totalContracts: payload?.contracts?.total ?? 0,
        activeContracts: payload?.contracts?.active ?? 0,
        totalRevenue: payload?.payments?.monthlyTotal ?? 0,
        overduePayments: payload?.alerts?.overdueInstallments ?? 0,
      });
      setRecentContracts(payload?.recentContracts ?? []);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
      setError('Could not load dashboard statistics. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Customers',
      value: stats.totalCustomers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Total Contracts',
      value: stats.totalContracts,
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      subtitle: `${stats.activeContracts} active`,
    },
    {
      title: 'This Month Revenue',
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Overdue Payments',
      value: stats.overduePayments,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome to your hire purchase management system</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={loadDashboardStats}
            className="ml-auto text-sm font-medium text-red-700 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`${stat.bgColor} ${stat.color} p-2 rounded-lg`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {'subtitle' in stat && stat.subtitle ? (
                <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions + Recent Contracts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/admin/customers?action=new"
              className="block p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <p className="font-medium text-blue-900">Register New Customer</p>
              <p className="text-sm text-blue-700">Create a customer account and generate membership ID</p>
            </Link>
            <Link
              href="/admin/contracts?action=new"
              className="block p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
            >
              <p className="font-medium text-green-900">Create Hire Purchase Sale</p>
              <p className="text-sm text-green-700">Initiate a new hire purchase contract</p>
            </Link>
            <Link
              href="/admin/products?action=new"
              className="block p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <p className="font-medium text-purple-900">Add Product</p>
              <p className="text-sm text-purple-700">Add new products to inventory</p>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            {recentContracts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No contracts yet</p>
                <p className="text-sm mt-1">Recent contracts will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentContracts.map((contract) => (
                  <Link
                    key={contract.id}
                    href={`/admin/contracts/${contract.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {contract.customer.firstName} {contract.customer.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {contract.inventoryItem?.product?.name ?? 'Product'} · {contract.customer.membershipId}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(contract.totalAmount)}
                      </p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        contract.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700'
                          : contract.status === 'COMPLETED'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {contract.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
