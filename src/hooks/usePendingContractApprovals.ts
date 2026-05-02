'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export function usePendingContractApprovals() {
  const [count, setCount] = useState(0);

  const load = async () => {
    try {
      const res = await api.get('/contracts/approvals/count');
      setCount(res.data.count ?? 0);
    } catch {
      // silently fail — non-critical UI
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { count, refresh: load };
}
