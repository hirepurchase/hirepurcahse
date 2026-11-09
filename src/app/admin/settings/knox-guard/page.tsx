'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * An older copy of the Knox Guard settings screen that no menu links to.
 * Everything, paid temporary unlock included, lives on Knox Guard → Settings.
 */
export default function KnoxGuardSettingsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/knox/settings');
  }, [router]);
  return null;
}
