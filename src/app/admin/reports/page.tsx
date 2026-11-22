import Link from 'next/link';
import { BarChart3, TrendingUp, AlertTriangle, Package, Banknote, Shield, Wallet, Trophy, DollarSign, Award, ShieldAlert, Medal, Boxes } from 'lucide-react';

export default function ReportsPage() {
  const reports = [
    {
      title: 'Income Report',
      description: 'Track payments and revenue by payment method (Direct Debit, Mobile Money, Cash, Bank)',
      icon: Wallet,
      color: 'text-emerald-600 bg-emerald-100',
      category: 'Payments and risk',
      path: '/admin/reports/income',
    },
    {
      title: 'Agent Performance',
      description: 'Leaderboard of agents by contracts created, sales value, and payments collected on their contracts',
      icon: Trophy,
      color: 'text-amber-600 bg-amber-100',
      category: 'Agent and cluster performance',
      path: '/admin/reports/agents',
    },
    {
      title: 'Sales Report',
      description: 'View sales performance, contract values, and sales by category and agent',
      icon: TrendingUp,
      color: 'text-green-600 bg-green-100',
      category: 'Sales and inventory',
      path: '/admin/reports/sales',
    },
    {
      title: 'Payment Report',
      description: 'Track payment collections, transaction status, and payment methods',
      icon: Banknote,
      color: 'text-blue-600 bg-blue-100',
      category: 'Payments and risk',
      path: '/admin/reports/payments',
    },
    {
      title: 'Defaulters Report',
      description: 'Monitor overdue contracts, defaulters, and payment delays',
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-100',
      category: 'Payments and risk',
      path: '/admin/reports/defaults',
    },
    {
      title: 'Inventory Report',
      description: 'Stock levels, product availability, and inventory valuation',
      icon: Package,
      color: 'text-purple-600 bg-purple-100',
      category: 'Sales and inventory',
      path: '/admin/reports/inventory',
    },
    {
      title: 'Agent Stock',
      description: 'Devices each agent is holding, their value, and how long they have had them',
      icon: Boxes,
      color: 'text-indigo-600 bg-indigo-100',
      category: 'Sales and inventory',
      path: '/admin/reports/agent-stock',
    },
    {
      title: 'Preapprovals Report',
      description: 'Track Hubtel direct debit mandate approvals and customer authorization status',
      icon: Shield,
      color: 'text-teal-600 bg-teal-100',
      category: 'Payments and risk',
      path: '/admin/reports/preapprovals',
    },
    {
      title: 'Dashboard Overview',
      description: 'Quick overview of key business metrics and statistics',
      icon: BarChart3,
      color: 'text-indigo-600 bg-indigo-100',
      category: 'Sales and inventory',
      path: '/admin/reports/dashboard',
    },
    {
      title: 'Agent Completions',
      description: 'Contracts paid off per agent in a month — the basis for paying completion bonuses',
      icon: Award,
      color: 'text-emerald-600 bg-emerald-100',
      category: 'Agent and cluster performance',
      path: '/admin/reports/agent-completions',
    },
    {
      title: 'Portfolio at Risk',
      description: 'PAR 1 and PAR 30 by agent and cluster, ageing of the book, and who is over the contract-blocking limit',
      icon: ShieldAlert,
      color: 'text-rose-600 bg-rose-100',
      category: 'Payments and risk',
      path: '/admin/reports/portfolio-at-risk',
    },
    {
      title: 'Cluster Leader Scorecard',
      description: 'Monthly performance pay for cluster leaders — indicators, rates, approval and payment',
      icon: Medal,
      color: 'text-emerald-600 bg-emerald-100',
      category: 'Agent and cluster performance',
      path: '/admin/cluster-scorecard',
    },
    {
      title: 'Agent Deposit Collections',
      description: 'Track deposit collections, commissions earned, and remittances per agent',
      icon: DollarSign,
      color: 'text-cyan-600 bg-cyan-100',
      category: 'Agent and cluster performance',
      path: '/admin/reports/agent-deposits',
    },
  ];

  const categories = ['Payments and risk', 'Sales and inventory', 'Agent and cluster performance'];

  return (
    <div className="space-y-6">
      <header className="workspace-heading workspace-heading--report">
        <h1>Reports</h1>
        <p className="mt-2">Review collections, sales, inventory, and team performance.</p>
      </header>
      <nav aria-label="Reports" className="space-y-7">
        {categories.map((category) => (
          <section key={category} aria-label={category}>
            <h2 className="mb-3 text-lg font-bold text-slate-950">{category}</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {reports.filter((report) => report.category === category).map(({ path, title, description, color, icon: Icon }) => (
                <Link key={path} href={path} className="operations-panel flex items-start gap-4 p-4 transition-colors hover:border-blue-400 hover:bg-blue-50/30 sm:p-5">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${color}`}>
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-slate-950">{title}</span>
                    <span className="mt-1 block text-sm leading-5 text-slate-600">{description}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </nav>
    </div>
  );
}
