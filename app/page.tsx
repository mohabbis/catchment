import Workbench from "@/components/Workbench";
import { VERIFIED_CLINICS } from "@/lib/verified-clinics";
import { hasSupabaseEnv, loadLocalCountyScores, loadLocalRegistryCandidates } from "@/lib/local-data";
import { getSupabaseClient } from "@/lib/supabase";
import {
  buildDisplayShortlist,
  type CountyScoreRow,
  type RegistryCandidate,
} from "@/lib/workbench";

export const revalidate = 3600;

async function getCountyScores(): Promise<CountyScoreRow[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("county_scores")
    .select(
      "county_fips, county_name, population_under_18, pediatric_provider_count, density_per_10k, single_location_pct, quadrant"
    )
    .order("county_name", { ascending: true });

  if (error) throw new Error(`Failed to load county_scores: ${error.message}`);
  return (data ?? []) as CountyScoreRow[];
}

async function getRegistryCandidates(): Promise<RegistryCandidate[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("providers")
    .select(
      "npi, org_name, dba_name, address_line1, city, zip, county_name, provider_type"
    )
    .eq("pediatric_signal", true)
    .order("county_name", { ascending: true })
    .order("org_name", { ascending: true });

  if (error) throw new Error(`Failed to load providers: ${error.message}`);
  return (data ?? []) as RegistryCandidate[];
}

function groupRegistryByCounty(candidates: RegistryCandidate[]): Map<string, RegistryCandidate[]> {
  const map = new Map<string, RegistryCandidate[]>();
  for (const candidate of candidates) {
    if (!candidate.county_name) continue;
    const list = map.get(candidate.county_name) ?? [];
    list.push(candidate);
    map.set(candidate.county_name, list);
  }
  return map;
}

async function loadWorkbenchData(): Promise<{
  counties: CountyScoreRow[];
  registryCandidates: RegistryCandidate[];
  source: "supabase" | "local";
}> {
  if (hasSupabaseEnv()) {
    try {
      const [counties, registryCandidates] = await Promise.all([
        getCountyScores(),
        getRegistryCandidates(),
      ]);
      if (counties.length > 0) {
        return { counties, registryCandidates, source: "supabase" };
      }
    } catch {
      // Fall through to the checked-in extract so the workbench still boots.
    }
  }

  return {
    counties: loadLocalCountyScores(),
    registryCandidates: loadLocalRegistryCandidates(),
    source: "local",
  };
}

export default async function Home() {
  const { counties, registryCandidates, source } = await loadWorkbenchData();
  const shortlist = buildDisplayShortlist(counties, groupRegistryByCounty(registryCandidates));
  const targetCount = VERIFIED_CLINICS.filter(
    (clinic) => clinic.classification === "target_candidate"
  ).length;

  return (
    <div className="app-shell">
      <header className="shrink-0 border-b border-[var(--line)] bg-[var(--card)]/90 backdrop-blur">
        <div className="flex flex-wrap items-end justify-between gap-4 px-4 py-3.5 lg:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-faint)]">
              Oaklin Lane · Texas
            </p>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-3">
              <h1 className="serif text-2xl font-semibold tracking-tight text-[var(--ink)]">
                Catchment
              </h1>
              <p className="max-w-xl text-sm text-[var(--ink-soft)]">
                Which markets, which clinics, what evidence.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--ink-soft)]">
            <span>
              <span className="font-semibold text-[var(--ink)]">{targetCount}</span> ranked
              targets
            </span>
            <span>
              <span className="font-semibold text-[var(--ink)]">{VERIFIED_CLINICS.length}</span>{" "}
              classified
            </span>
            <details className="relative">
              <summary className="cursor-pointer font-medium text-[var(--forest)] hover:text-[var(--forest-deep)]">
                How to read this
              </summary>
              <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-[var(--line)] bg-[var(--card)] p-4 text-xs leading-5 text-[var(--ink-soft)] shadow-lg">
                <p>
                  Start on DFW. Open a target. Export a brief. NPPES is a screen, not a clinic
                  census. Ownership is web/NPI research, not a pulled SOS filing.
                </p>
                <p className="mt-2">
                  Registry source: {source === "local" ? "checked-in extract" : "Supabase"}.
                  Independent work sample — not commissioned by Oaklin Lane.
                </p>
              </div>
            </details>
          </div>
        </div>
      </header>

      <Workbench shortlist={shortlist} />

      <footer className="shrink-0 border-t border-[var(--line)] px-4 py-2 text-[10px] text-[var(--ink-faint)] lg:px-6">
        Screening: NPPES, Census ACS, ZCTA crosswalk. Clinic layer: official sites and public
        founder sources. Passes are logged on purpose.
      </footer>
    </div>
  );
}
