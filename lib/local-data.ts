import npiRaw from "@/data/npi_tx_raw.json";
import zipCounty from "@/data/zip_county_tx.json";
import censusPop from "@/data/census_population_tx.json";
import { computeCountyScores, type CountyPopulation, type Provider } from "@/lib/scoring";
import type { CountyScoreRow, RegistryCandidate } from "@/lib/workbench";

type NpiRow = {
  npi: string;
  org_name: string;
  dba_name: string | null;
  address_line1: string | null;
  city: string | null;
  zip: string | null;
  all_matched_taxonomies: string[];
  pediatric_signal: boolean;
  provider_types: string[];
};

const zipMap = zipCounty as Record<string, { county_fips: string; county_name: string }>;

function mappedProviders(): Provider[] {
  return (npiRaw as NpiRow[]).map((row) => {
    const zip5 = row.zip ? row.zip.slice(0, 5) : null;
    const county = zip5 ? zipMap[zip5] : undefined;
    return {
      npi: row.npi,
      org_name: row.org_name,
      dba_name: row.dba_name,
      address_line1: row.address_line1,
      city: row.city,
      zip: row.zip,
      county_fips: county?.county_fips ?? null,
      county_name: county?.county_name ?? null,
      all_matched_taxonomies: row.all_matched_taxonomies,
      provider_types: row.provider_types,
      pediatric_signal: row.pediatric_signal,
    };
  });
}

export function loadLocalCountyScores(): CountyScoreRow[] {
  return computeCountyScores(mappedProviders(), censusPop as CountyPopulation[]);
}

export function loadLocalRegistryCandidates(): RegistryCandidate[] {
  return mappedProviders()
    .filter((p) => p.pediatric_signal)
    .map((p) => ({
      npi: p.npi,
      org_name: p.org_name,
      dba_name: p.dba_name,
      address_line1: p.address_line1,
      city: p.city,
      zip: p.zip,
      county_name: p.county_name,
      provider_type: p.provider_types.join("+"),
    }));
}

export function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
