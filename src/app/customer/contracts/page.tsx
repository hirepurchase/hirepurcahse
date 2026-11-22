'use client';

import LoadingState from "@/components/shared/LoadingState";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { cn, formatCurrency, formatDate, getStatusColor, calculateProgress } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import type { HirePurchaseContract } from '@/types';

export default function CustomerContractsPage() {
  const [contracts, setContracts] = useState<HirePurchaseContract[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<HirePurchaseContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadContracts();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = contracts.filter(
        (c) =>
          c.contractNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.inventoryItem?.product?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredContracts(filtered);
    } else {
      setFilteredContracts(contracts);
    }
  }, [searchQuery, contracts]);

  const loadContracts = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/customers/me/contracts');
      const contractsData = response.data.contracts || [];
      setContracts(contractsData);
      setFilteredContracts(contractsData);
    } catch (error: unknown) {
      const message =
        typeof error === 'object' && error !== null
          ? (error as { response?: { data?: { error?: string } } }).response?.data
              ?.error
          : undefined;
      toast({
        title: 'Error',
        description: message || 'Failed to load contracts',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-56 items-center justify-center">
        <LoadingState label="Loading your contracts…" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="workspace-heading workspace-heading--customer">
        <h1 className="text-3xl font-bold text-gray-900">My Contracts</h1>
        <p className="text-gray-600 mt-1">View all your hire purchase contracts</p>
      </header>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              aria-label="Search your contracts"
              placeholder="Search by contract number or product name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contracts Grid */}
      {filteredContracts.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">No contracts found</p>
              <p className="text-sm mt-1">
                {searchQuery ? 'Try a different search term' : 'You do not have any contracts yet'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredContracts.map((contract) => {
            const progress = calculateProgress(contract.totalPaid, contract.totalPrice);
            return (
              <Card
                key={contract.id}
                className="min-w-0 transition-colors hover:border-teal-400"
              >
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-lg wrap-break-word">
                        <Link href={`/customer/contracts/${contract.id}`} className="text-teal-800 hover:underline">{contract.contractNumber}</Link>
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {contract.inventoryItem?.product?.name}
                      </p>
                    </div>
                    <Badge className={cn(getStatusColor(contract.status), 'shrink-0')}>
                      {contract.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Financial Summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm wrap-break-word tabular-nums">
                      <div>
                        <p className="text-gray-600">Total Price</p>
                        <p className="font-semibold">{formatCurrency(contract.totalPrice)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Deposit</p>
                        <p className="font-semibold text-blue-600">{formatCurrency(contract.depositAmount)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Total Paid</p>
                        <p className="font-semibold text-green-600">
                          {formatCurrency(contract.totalPaid)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Outstanding</p>
                        <p className="font-semibold text-red-600">
                          {formatCurrency(contract.outstandingBalance)}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-semibold">{progress.toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Payment Terms */}
                    <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t">
                      <div>
                        <p className="text-gray-600">Payment Frequency</p>
                        <p className="font-medium">{contract.paymentFrequency}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Installment Amount</p>
                        <p className="font-medium">{formatCurrency(contract.installmentAmount)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Start Date</p>
                        <p className="font-medium">{formatDate(contract.startDate)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">End Date</p>
                        <p className="font-medium">{formatDate(contract.endDate)}</p>
                      </div>
                    </div>

                    {/* Product Details */}
                    <div className="pt-2 border-t text-sm">
                      <p className="text-gray-600">Serial/IMEI</p>
                      <p className="font-mono text-xs">
                        {contract.inventoryItem?.serialNumber}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
