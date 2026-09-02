@AGENTS.md

# Catchment

Deal-origination workbench for Texas pediatric therapy (SLP / OT / PT). It answers
three questions: which markets deserve attention, which real clinics operate there,
and what public evidence supports a call. Independent work sample — not commissioned
by Oaklin Lane, no proprietary data.

## Commands

```sh
npm run dev                  # http://localhost:3000, boots without Supabase
npm run build                # production build (see "Known issues")
npm run lint                 # eslint, flat config
npm run check-clinic-sites   # re-runs the live-site check -> data/clinic-link-status.json
```

There is no test runner. `data-testid` attributes exist throughout `components/`
but no suite consumes them yet.

## Architecture

Next.js App Router, React 19, Tailwind v4, TypeScript. Three layers, deliberately
separated — do not blur them:

1. **Screening layer (quantitative, weak).** NPPES + Census, aggregated in
   `lib/scoring.ts` into a density × fragmentation 2×2. Screening only — never
   present it as a clinic census. `quadrantThresholds()` exports the median split
   so the chart draws the same crosshair the classifier used; `scoredCounties()`
   is the county universe the split is defined over; `fragmentationIsTrivial()`
   flags counties where a single provider forces a 100% single-location share.
2. **Verified layer (editorial, the real product).** `lib/verified-clinics.ts` is a
   hand-curated 1,200-line constant: named clinics, owners, dated SOS/license checks,
   sources, outreach ranks, plus `REJECTED_RECORDS` (the pass log). This file is the
   asset. Treat edits to it as data-integrity changes.
3. **Presentation layer.** `lib/workbench.ts` joins 1 + 2 into `ShortlistMarket`
   rows (metro rollups first, then county slices), builds the diligence queue,
   the executive conclusion, and the IC brief markdown.

### Data flow

`app/page.tsx` (server component, `revalidate = 3600`) loads county scores and
registry candidates from Supabase when `NEXT_PUBLIC_SUPABASE_*` are set, and
**silently falls back** to the checked-in extract in `data/` via `lib/local-data.ts`
otherwise. `buildDisplayShortlist()` produces the shortlist, which is passed to the
client `CatchmentApp` → `Workbench`.

### Component map

- `components/CatchmentApp.tsx` — shell, header, first-run welcome, guide panel.
- `components/Workbench.tsx` — the app. Three panes: markets (left) / case (center)
  / clinics (right); on mobile a 1-2-3 pane switcher. Also owns the clinic drawer.
- `components/GuidePanel.tsx` + `lib/guide-copy.ts` — all onboarding prose lives in
  `guide-copy.ts`; keep copy there, not inline in components.
- `components/QuadrantChart.tsx` — hand-rolled SVG scatter of the screening 2×2.
  No chart library. Dot size is the captured provider count; shortlisted markets
  are labelled and clickable. When the fragmentation median lands at 100% the
  chart switches from four quadrants to two halves and says why — do not "fix"
  that by hiding the caveat.
- `components/CatchmentMap.tsx` — hand-rolled SVG equirectangular projection of TX.
  No map library. City-level, approximate on purpose.
- `components/IcBriefPrint.tsx` — print/PDF view, driven by `@media print` rules at
  the bottom of `app/globals.css`.

### Workspace state

Clinic workflow states and notes live in `lib/workspace.ts`, in localStorage and
nowhere else. Components read it through `useSyncExternalStore`, so there is no
mount effect and no hydration flash. It is not a CRM and should not become one.

An earlier version synced to a `clinic_workspace` Supabase table that the anon key
could read in full, while the UI promised notes stayed local. The sync was removed
rather than given auth. Do not reintroduce a shared table behind that copy.

## Conventions

- Colors come from CSS custom properties in `app/globals.css` (`--ink`, `--paper`,
  `--forest`, `--risk`, …), used as `text-[var(--ink)]`. No Tailwind palette colors.
- Serif (`Source_Serif_4`, via the `.serif` class) is for headlines and narrative
  prose; sans for UI chrome. Numbers get `tabular-nums`.
- Ghost/primary buttons are the `.btn .btn-ghost` / `.btn .btn-primary` classes.
- Never invent a fact for display. If a check was not run, the UI says "not pulled"
  — see `sosCheckLine`, `licenseCheckLine`, `linkStatusHeadline`. Preserve that
  discipline in any new surface, charts included: a number thin enough to mislead
  gets its sample size shown next to it, not a footnote in the guide.
- Onboarding prose lives in `lib/guide-copy.ts` and is rendered by `WelcomeOverlay`
  (first run, localStorage-gated, replayable) and `GuidePanel`. Add copy there.

## Data regeneration

```sh
node scripts/fetch-npi-tx.mjs               # -> data/npi_tx_raw.json
node scripts/fetch-census-population.mjs    # -> data/census_population_tx.json
node scripts/build-zip-county-crosswalk.mjs # -> data/zip_county_tx.json
node scripts/aggregate-county-scores.ts     # joins, scores, writes to Supabase
```

`data/npi_tx_raw.json` currently holds 64 statewide records. That is a known
under-capture of the NPPES query (exact `taxonomy_description` + name wildcard),
not a real supply picture — which is why the verified layer exists and why the
density numbers are labelled screening-only everywhere they appear.

## Known issues

- Supabase fallback is silent by design; the source in use is surfaced only in the
  welcome overlay and the guide panel ("Registry source: checked-in extract | Supabase").
- Build Next from `node_modules` (`npm run build`), not `npx next build` on a machine
  without deps installed — npx fetches its own copy and prerender fails on
  `/_global-error` with an internal `Expected workStore to be initialized` invariant.
