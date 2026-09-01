import { CAVEATS, GLOSSARY, SESSION_STEPS } from "@/lib/guide-copy";

export default function GuidePanel({
  dataSource,
  onClose,
  onOpenDfw,
}: {
  dataSource: "supabase" | "local";
  onClose: () => void;
  onOpenDfw: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-[rgba(28,25,21,0.28)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-title"
      data-testid="guide-panel"
    >
      <button type="button" className="h-full flex-1" aria-label="Close guide" onClick={onClose} />
      <aside className="flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-[var(--line)] bg-[var(--card)] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-faint)]">
              How to use Catchment
            </p>
            <h2 id="guide-title" className="serif mt-1 text-2xl font-semibold">
              Markets, clinics, evidence
            </h2>
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="space-y-6 px-5 py-5 text-sm leading-6 text-[var(--ink-soft)]">
          <p>
            Left is the market. Center is why it matters. Right is who to call. Open a
            clinic for the owner, the dated license check, and the next action.
          </p>

          <ol className="space-y-3">
            {SESSION_STEPS.map((step) => (
              <li key={step.n} className="rounded-md border border-[var(--line)] bg-[var(--paper)] px-3 py-3">
                <p className="font-semibold text-[var(--ink)]">
                  {step.n}. {step.title}
                </p>
                <p className="mt-1 text-xs leading-5">{step.body}</p>
              </li>
            ))}
          </ol>

          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              Words
            </h3>
            <dl className="mt-2 space-y-3">
              {GLOSSARY.map((item) => (
                <div key={item.term}>
                  <dt className="font-semibold text-[var(--ink)]">{item.term}</dt>
                  <dd className="mt-0.5 text-xs leading-5">{item.meaning}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--risk)]">
              Limits
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5">
              {CAVEATS.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-[var(--ink-faint)]">
              Registry source: {dataSource === "local" ? "checked-in extract" : "Supabase"}.
            </p>
          </div>

          <button type="button" className="btn btn-primary" onClick={onOpenDfw}>
            Go to DFW
          </button>
        </div>
      </aside>
    </div>
  );
}
