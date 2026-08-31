'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export interface DeviceIssueCounts {
  categoryA: number;
  categoryB: number;
  categoryC: number;
  urgent: number;
  total: number;
}

export function useDeviceIssues() {
  const [counts, setCounts] = useState<DeviceIssueCounts | null>(null);
  const { isAuthenticated, isLoading, userType } = useAuthStore();

  const load = useCallback(async () => {
    if (isLoading || !isAuthenticated || userType !== 'admin') return;
    try {
      const res = await api.get('/knox-guard/device-issues');
      setCounts(res.data?.counts ?? null);
    } catch {
      // silently fail — permission may not include device control; non-critical UI
    }
  }, [isAuthenticated, isLoading, userType]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || userType !== 'admin') return;
    load();
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [isAuthenticated, isLoading, load, userType]);

  return { urgentCount: counts?.urgent ?? 0, counts, refresh: load };
}
