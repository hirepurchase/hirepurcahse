'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { adminHasPermission, PERMISSIONS } from '@/lib/permissions';
import type { AdminUser } from '@/types';

export function usePendingTemporaryUnlocks() {
  const [count, setCount] = useState(0);
  const { isAuthenticated, isLoading, userType, user } = useAuthStore();
  const adminUser = user as AdminUser | null;
  // Only approvers — a count nobody can act on is noise.
  const canApprove =
    userType === 'admin' && adminHasPermission(adminUser, PERMISSIONS.APPROVE_TEMPORARY_UNLOCK);

  const load = useCallback(async () => {
    if (isLoading || !isAuthenticated || !canApprove) {
      setCount(0);
      return;
    }

    try {
      const res = await api.get('/temporary-unlocks/pending-count');
      setCount(res.data.count ?? 0);
    } catch {
      // silently fail — non-critical UI
    }
  }, [canApprove, isAuthenticated, isLoading]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !canApprove) {
      setCount(0);
      return;
    }

    void load();
    const interval = setInterval(load, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [canApprove, isAuthenticated, isLoading, load]);

  return { count, refresh: load };
}
