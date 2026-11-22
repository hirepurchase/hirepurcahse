export default function LoadingState({ label }: { label: string }) {
  return (
    <span role="status" className="inline-flex max-w-full items-center gap-2.5 rounded-xl border bg-card px-4 py-3 text-sm font-medium text-slate-700">
      <span aria-hidden="true" className="size-4 shrink-0 rounded-full border-2 border-blue-200 border-t-blue-700 motion-safe:animate-spin" />
      {label}
    </span>
  );
}
