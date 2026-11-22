import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-xl content-center px-4 py-8 sm:px-6">
      <section className="operations-panel p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-slate-950">Page not found</h1>
        <p className="mt-3 text-slate-600">Check the address or return to the portal chooser.</p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800">
          Go to the portal chooser
        </Link>
      </section>
    </main>
  );
}
