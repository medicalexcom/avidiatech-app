export const dynamic = "force-dynamic";
export default function DocsDocumentExtractionPage() {
  return (
    <div className="max-w-prose space-y-10">
      <div className="space-y-2">
        <span className="inline-block px-2 py-0.5 text-xs rounded bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300">Data Intelligence</span>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">AvidiaDoc — Document & Datasheet Extraction</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Extract structured product data from PDFs, manuals, and supplier datasheets.</p>
      </div>
      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-5">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">📌 Full documentation coming soon</p>
        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">Contact <a href="mailto:support@avidiatech.com" className="underline">support@avidiatech.com</a> for early access.</p>
      </div>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">Overview</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">AvidiaDoc processes supplier-provided PDFs, product manuals, and specification sheets — even scanned documents — and extracts structured product data including names, model numbers, specifications, certifications, and dimensions. Output is the same structured JSON as AvidiaExtract, feeding directly into the enrichment pipeline.</p>
      </section>
    </div>
  );
}
