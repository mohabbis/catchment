import CatchmentApp from "@/components/CatchmentApp";
import { VERIFIED_CLINICS } from "@/lib/verified-clinics";
import { hasSupabaseEnv, loadLocalCountyScores, loadLocalRegistryCandidates } from "@/lib/local-data";
import { getSupabaseClient } from "@/lib/supabase";
import { scoredCounties } from "@/lib/scoring";
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
    .select("npi, org_name, dba_name, address_line1, city, zip, county_name, provider_type")
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
    <CatchmentApp
      shortlist={shortlist}
      counties={scoredCounties(counties)}
      dataSource={source}
      targetCount={targetCount}
    />
  );
}
