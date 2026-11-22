import DiagnosticPage from "@/components/shared/DiagnosticPage";

export default function DebugPage() {
  return (
    <DiagnosticPage title="Frontend diagnostics">
      <p>Compare the two swatches to check that Tailwind and inline styles both load.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-blue-700 p-4 text-white">Tailwind styles</div>
        <div className="rounded-xl p-4" style={{ backgroundColor: "#065f46", color: "#fff" }}>Inline styles</div>
      </div>
    </DiagnosticPage>
  );
}
