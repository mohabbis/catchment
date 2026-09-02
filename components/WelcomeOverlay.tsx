"use client";

import { useEffect, useRef } from "react";
import { TOUR_STEPS, WHAT_IT_IS, WHO_IT_IS_FOR } from "@/lib/guide-copy";

export default function WelcomeOverlay({
  dataSource,
  targetCount,
  onStartDfw,
  onDismiss,
  onOpenGuide,
}: {
  dataSource: "supabase" | "local";
  targetCount: number;
  onStartDfw: () => void;
  onDismiss: () => void;
  onOpenGuide: () => void;
}) {
  const startRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    startRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onDismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[rgba(28,25,21,0.45)] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      data-testid="welcome-overlay"
    >
      <div className="my-auto w-full max-w-2xl overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--card)] shadow-2xl">
        <div className="border-b border-[var(--line)] px-6 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-faint)]">
            {WHAT_IT_IS.kicker}
          </p>
          <h2 id="welcome-title" className="serif mt-1 text-2xl font-semibold leading-tight">
            {WHAT_IT_IS.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">{WHAT_IT_IS.lede}</p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            <span className="font-semibold text-[var(--ink)]">{targetCount}</span> named clinics
            are on the call list across the shortlisted Texas markets.
          </p>
          <p className="mt-3 rounded-md border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-xs leading-5 text-[var(--ink-soft)]">
            <span className="font-semibold text-[var(--ink)]">Known limit, up front. </span>
            The public-data screen behind this is thin — the NPPES name-match returned 64
            organization records for all of Texas and missed Cole, KDC, and Synaptic. Density and
            fragmentation are reported for transparency and are not used to rank markets. The
            shortlist is an editorial call and the verified clinic layer is the work.
          </p>
        </div>

        <div className="max-h-[52vh] overflow-y-auto px-6 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {WHO_IT_IS_FOR.map((item) => (
              <div
                key={item.title}
                className="rounded-md border border-[var(--line)] bg-[var(--paper)] px-3 py-3"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                  {item.title}
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--ink-soft)]">{item.body}</p>
              </div>
            ))}
          </div>

          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
            A session, end to end
          </p>
          <ol className="mt-2 space-y-2">
            {TOUR_STEPS.map((step, index) => (
              <li key={step.id} className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--forest-soft)] text-[11px] font-semibold tabular-nums text-[var(--forest-deep)]">
                  {index + 1}
                </span>
                <span className="text-sm leading-6">
                  <span className="font-semibold text-[var(--ink)]">{step.title}. </span>
                  <span className="text-[var(--ink-soft)]">{step.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--line)] bg-[var(--paper)] px-6 py-4">
          <button
            ref={startRef}
            type="button"
            data-testid="welcome-start"
            onClick={onStartDfw}
            className="btn btn-primary"
          >
            Start with DFW
          </button>
          <button
            type="button"
            data-testid="welcome-dismiss"
            onClick={onDismiss}
            className="btn btn-ghost"
          >
            Look around first
          </button>
          <button type="button" onClick={onOpenGuide} className="btn btn-ghost">
            Full guide
          </button>
          <p className="ml-auto text-[10px] leading-4 text-[var(--ink-faint)]">
            Independent work sample · registry from{" "}
            {dataSource === "local" ? "the checked-in extract" : "Supabase"}
          </p>
        </div>
      </div>
    </div>
  );
}
