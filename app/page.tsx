import Workbench from "@/components/Workbench";
import { getSupabaseClient } from "@/lib/supabase";
import {
  buildShortlist,
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

export default async function Home() {
  const [counties, registryCandidates] = await Promise.all([
    getCountyScores(),
    getRegistryCandidates(),
  ]);

  const shortlist = buildShortlist(counties, groupRegistryByCounty(registryCandidates));
  const verifiedCount = shortlist.reduce((sum, market) => sum + market.verifiedClinics.length, 0);
  const targetCount = shortlist.reduce((sum, market) => sum + market.targetCount, 0);

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
              <span className="font-medium text-slate-900">{shortlist.length}</span> shortlist
              markets
            </span>
            <span>
              <span className="font-medium text-slate-900">{verifiedCount}</span> verified clinics
            </span>
            <span>
              <span className="font-medium text-teal-800">{targetCount}</span> potential targets
            </span>
            <details className="relative">
              <summary className="cursor-pointer font-medium text-slate-700 hover:text-slate-950">
                Methodology
              </summary>
              <div className="absolute right-0 z-10 mt-2 w-80 rounded-lg border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-600 shadow-lg">
                <p>
                  County screening joins Census ACS under-18 population with NPPES organization
                  records matching pediatric therapy signals. M&A rank reflects captured provider
                  count, market scale, and single-location fragmentation proxy.
                </p>
                <p className="mt-2">
                  Verified clinics are confirmed via official practice websites and location pages.
                  NPPES records are candidate organizations only — not presented as a clinic
                  database.
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
        Data: NPPES NPI Registry, Census ACS 5-Year, ZCTA-to-County crosswalk. Clinic verification
        via official operator websites.
      </footer>
    </div>
  );
}
