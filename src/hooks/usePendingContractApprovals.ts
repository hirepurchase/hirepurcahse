'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { adminHasAnyPermission, CONTRACT_APPROVAL_ACCESS_PERMISSIONS } from '@/lib/permissions';
import type { AdminUser } from '@/types';

export function usePendingContractApprovals() {
  const [count, setCount] = useState(0);
  const { isAuthenticated, isLoading, userType, user } = useAuthStore();
  const adminUser = user as AdminUser | null;
  const canViewApprovals = userType === 'admin' && adminHasAnyPermission(adminUser, CONTRACT_APPROVAL_ACCESS_PERMISSIONS);

  const load = useCallback(async () => {
    if (isLoading || !isAuthenticated || !canViewApprovals) {
      setCount(0);
      return;
    }

    try {
      const res = await api.get('/contracts/approvals/count');
      setCount(res.data.count ?? 0);
    } catch {
      // silently fail — non-critical UI
    }
  }, [canViewApprovals, isAuthenticated, isLoading]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !canViewApprovals) {
      setCount(0);
      return;
    }

    void load();
    const interval = setInterval(load, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [canViewApprovals, isAuthenticated, isLoading, load]);

  return { count, refresh: load };
}
