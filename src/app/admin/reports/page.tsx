'use client';

import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, Package, Users, DollarSign, FileText, Shield, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function ReportsPage() {
  const router = useRouter();

  const reports = [
    {
      title: 'Income Report',
      description: 'Track payments and revenue by payment method (Direct Debit, Mobile Money, Cash, Bank)',
      icon: Wallet,
      color: 'text-emerald-600 bg-emerald-100',
      path: '/admin/reports/income',
    },
    {
      title: 'Sales Report',
      description: 'View sales performance, contract values, and sales by category and agent',
      icon: TrendingUp,
      color: 'text-green-600 bg-green-100',
      path: '/admin/reports/sales',
    },
    {
      title: 'Payment Report',
      description: 'Track payment collections, transaction status, and payment methods',
      icon: DollarSign,
      color: 'text-blue-600 bg-blue-100',
      path: '/admin/reports/payments',
    },
    {
      title: 'Defaulters Report',
      description: 'Monitor overdue contracts, defaulters, and payment delays',
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-100',
      path: '/admin/reports/defaults',
    },
    {
      title: 'Inventory Report',
      description: 'Stock levels, product availability, and inventory valuation',
      icon: Package,
      color: 'text-purple-600 bg-purple-100',
      path: '/admin/reports/inventory',
    },
    {
      title: 'Preapprovals Report',
      description: 'Track Hubtel direct debit mandate approvals and customer authorization status',
      icon: Shield,
      color: 'text-teal-600 bg-teal-100',
      path: '/admin/reports/preapprovals',
    },
    {
      title: 'Dashboard Overview',
      description: 'Quick overview of key business metrics and statistics',
      icon: BarChart3,
      color: 'text-indigo-600 bg-indigo-100',
      path: '/admin/reports/dashboard',
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600 mt-1">Business intelligence and analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <Card
            key={report.path}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push(report.path)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg mb-2">{report.title}</CardTitle>
                  <p className="text-sm text-gray-600">{report.description}</p>
                </div>
                <div className={`p-3 rounded-lg ${report.color}`}>
                  <report.icon className="h-6 w-6" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                View Report
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
