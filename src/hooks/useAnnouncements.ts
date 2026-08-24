'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export interface StaffAnnouncement {
  id: string;
  message: string;
  createdAt: string;
  expiresAt: string;
  createdBy: { firstName: string; lastName: string };
}

export function useAnnouncements() {
  const [data, setData] = useState<StaffAnnouncement[]>([]);
  const { isAuthenticated, isLoading, userType } = useAuthStore();

  const load = useCallback(async () => {
    if (isLoading || !isAuthenticated || userType !== 'admin') {
      return;
    }

    try {
      const res = await api.get('/announcements/mine');
      setData(res.data || []);
    } catch {
      // silently fail — non-critical UI
    }
  }, [isAuthenticated, isLoading, userType]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || userType !== 'admin') {
      return;
    }
    load();
  }, [isAuthenticated, isLoading, load, userType]);

  return { data, count: data.length, refresh: load };
}
