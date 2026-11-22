export default function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <header className="border-b pb-3">
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      {description && <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>}
    </header>
  );
}
