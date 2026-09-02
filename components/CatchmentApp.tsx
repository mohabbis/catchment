"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import GuidePanel from "@/components/GuidePanel";
import WelcomeOverlay from "@/components/WelcomeOverlay";
import Workbench from "@/components/Workbench";
import type { CountyScoreRow, FocusRequest, ShortlistMarket } from "@/lib/workbench";

const WELCOME_SEEN_KEY = "catchment-welcome-seen";

function subscribeToWelcomeFlag(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function readWelcomeSeen(): boolean {
  try {
    return Boolean(window.localStorage.getItem(WELCOME_SEEN_KEY));
  } catch {
    // Private mode or blocked storage — treat as seen rather than nag every render.
    return true;
  }
}

export default function CatchmentApp({
  shortlist,
  counties,
  dataSource,
  targetCount,
}: {
  shortlist: ShortlistMarket[];
  counties: CountyScoreRow[];
  dataSource: "supabase" | "local";
  targetCount: number;
}) {
  const [guideOpen, setGuideOpen] = useState(false);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);

  // The server has no storage to read, so it renders "seen" and the client
  // swaps in the real value on hydration — no markup mismatch, no mount flash.
  const welcomeSeen = useSyncExternalStore(subscribeToWelcomeFlag, readWelcomeSeen, () => true);
  const [welcomeOverride, setWelcomeOverride] = useState<"open" | "closed" | null>(null);
  const welcomeOpen = welcomeOverride ? welcomeOverride === "open" : !welcomeSeen;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && guideOpen) setGuideOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [guideOpen]);

  const dismissWelcome = useCallback(() => {
    setWelcomeOverride("closed");
    try {
      window.localStorage.setItem(WELCOME_SEEN_KEY, new Date().toISOString());
    } catch {
      // Nothing to persist to — the overlay still closes for this session.
    }
  }, []);

  // A fresh object every time so repeat requests re-focus the market.
  function focusDfw() {
    setFocusRequest((previous) => ({
      market: "DFW Metro",
      nonce: (previous?.nonce ?? 0) + 1,
    }));
  }

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

      <Workbench shortlist={shortlist} counties={counties} focusRequest={focusRequest} />

      <footer className="shrink-0 border-t border-[var(--line)] px-4 py-2 text-[10px] text-[var(--ink-faint)] lg:px-5">
        NPPES and census screen markets. Clinic facts come from public sites and NPI. Passes
        are listed on purpose.
      </footer>

      {guideOpen ? (
        <GuidePanel
          dataSource={dataSource}
          onClose={() => setGuideOpen(false)}
          onReplayIntro={() => {
            setGuideOpen(false);
            setWelcomeOverride("open");
          }}
          onOpenDfw={() => {
            focusDfw();
            setGuideOpen(false);
          }}
        />
      ) : null}

      {welcomeOpen ? (
        <WelcomeOverlay
          dataSource={dataSource}
          targetCount={targetCount}
          onDismiss={dismissWelcome}
          onStartDfw={() => {
            focusDfw();
            dismissWelcome();
          }}
          onOpenGuide={() => {
            dismissWelcome();
            setGuideOpen(true);
          }}
        />
      ) : null}
    </div>
  );
}
