'use client';

import Link from 'next/link';
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
  return (
    <section className="workspace-heading workspace-heading--device">
      <h1>Knox Guard settings</h1>
      <p role="status" className="text-sm text-slate-600">Opening the device policy and lock-screen settings…</p>
      <Link href="/admin/knox/settings" className="mt-3 inline-block text-sm font-semibold text-blue-700 hover:underline">
        Open Knox Guard settings
      </Link>
    </section>
  );
}
