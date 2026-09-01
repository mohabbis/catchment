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
  const countyCount = shortlist.filter((market) => market.kind === "county").length;
  const classifiedCount = VERIFIED_CLINICS.length;
  const targetCount = VERIFIED_CLINICS.filter(
    (clinic) => clinic.classification === "target_candidate"
  ).length;

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-950">
      <header className="shrink-0 border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Catchment</h1>
            <p className="text-xs text-slate-600">
              Texas pediatric therapy deal-origination workbench
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <span>
              <span className="font-medium text-slate-900">{countyCount}</span> counties + DFW
            </span>
            <span>
              <span className="font-medium text-slate-900">{classifiedCount}</span> classified
              clinics
            </span>
            <span>
              <span className="font-medium text-teal-800">{targetCount}</span> potential targets
            </span>
            {source === "local" ? (
              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-800 ring-1 ring-amber-200">
                Local extract
              </span>
            ) : null}
            <details className="relative">
              <summary className="cursor-pointer font-medium text-slate-700 hover:text-slate-950">
                Methodology
              </summary>
              <div className="absolute right-0 z-10 mt-2 w-80 rounded-lg border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-600 shadow-lg">
                <p>
                  County screening joins Census ACS under-18 population with NPPES organization
                  records matching pediatric therapy signals. That screen is candidate generation,
                  not a clinic census.
                </p>
                <p className="mt-2">
                  Classified clinics are website-verified, then tagged for ownership, size,
                  pediatric mix, and next action. DFW is one metro market. Passes are logged on
                  purpose.
                </p>
                <p className="mt-2 text-slate-500">
                  Independent work sample. Not commissioned by Oaklin Lane.
                </p>
              </div>
            </details>
          </div>
        </div>
      </header>

      <Workbench shortlist={shortlist} />

      <footer className="shrink-0 border-t border-slate-200 px-4 py-2 text-[10px] text-slate-500 lg:px-6">
        Screening: NPPES NPI Registry, Census ACS 5-Year, ZCTA-to-County crosswalk. Clinic layer:
        official operator websites, NPI authorized officials, and public founder sources. Ownership
        is not a pulled SOS filing.
      </footer>
    </div>
  );
}
