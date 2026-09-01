"use client";

import { useEffect, useState } from "react";
import GuidePanel from "@/components/GuidePanel";
import Workbench from "@/components/Workbench";
import type { ShortlistMarket } from "@/lib/workbench";

export default function CatchmentApp({
  shortlist,
  dataSource,
  targetCount,
}: {
  shortlist: ShortlistMarket[];
  dataSource: "supabase" | "local";
  targetCount: number;
}) {
  const [guideOpen, setGuideOpen] = useState(false);
  const [focusMarket, setFocusMarket] = useState<string | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && guideOpen) setGuideOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [guideOpen]);

  return (
    <div className="app-shell">
      <header className="shrink-0 border-b border-[var(--line)] bg-[var(--card)]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-5">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-faint)]">
              Oaklin Lane · Texas pediatric therapy
            </p>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="serif text-xl font-semibold tracking-tight text-[var(--ink)]">
                Catchment
              </h1>
              <p className="text-sm text-[var(--ink-soft)]">
                Choose a market, read the case, open a clinic.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-1 text-xs text-[var(--ink-faint)]">
              <span className="font-semibold text-[var(--ink)]">{targetCount}</span> clinics
              to call
            </p>
            <button
              type="button"
              data-testid="how-to-use"
              onClick={() => setGuideOpen(true)}
              className="btn btn-ghost"
            >
              Guide
            </button>
          </div>
        </div>
      </header>

      <Workbench shortlist={shortlist} focusMarket={focusMarket} />

      <footer className="shrink-0 border-t border-[var(--line)] px-4 py-2 text-[10px] text-[var(--ink-faint)] lg:px-5">
        NPPES and census screen markets. Clinic facts come from public sites and NPI. Passes
        are listed on purpose.
      </footer>

      {guideOpen ? (
        <GuidePanel
          dataSource={dataSource}
          onClose={() => setGuideOpen(false)}
          onOpenDfw={() => {
            setFocusMarket("DFW Metro");
            setGuideOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
