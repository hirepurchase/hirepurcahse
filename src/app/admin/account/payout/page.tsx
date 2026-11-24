'use client';

import PayoutNumberForm from '@/components/admin/PayoutNumberForm';

export default function PayoutNumberPage() {
  return (
    <div className="max-w-xl space-y-5 pb-10">
      <header className="workspace-heading workspace-heading--settings">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Payout MoMo number</h1>
        <p className="mt-0.5 text-sm text-gray-500">Where your commission is sent.</p>
      </header>
      <section className="operations-panel p-4 sm:p-5">
        <PayoutNumberForm />
      </section>
    </div>
  );
}
