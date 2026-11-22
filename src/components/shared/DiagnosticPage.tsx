import Link from "next/link";

export default function DiagnosticPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      <section className="operations-panel p-6 sm:p-8">
        <p role="status" className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
          Page rendered
        </p>
        <h1 className="mt-4 text-3xl font-bold text-slate-950">{title}</h1>
        <div className="mt-4 space-y-3 text-slate-600">{children}</div>
        <Link href="/" className="mt-6 inline-block text-sm font-semibold text-blue-700 hover:underline">
          Return to the portal chooser
        </Link>
      </section>
    </main>
  );
}
