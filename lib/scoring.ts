// Aggregation + 2x2 quadrant logic for the catchment county scores.
//
// Two independent axes, no blended/weighted index:
//   - density: pediatric providers per 10k under-18 population. Low = underserved.
//   - fragmentation: % of pediatric provider locations belonging to an org
//     identity (DBA, falling back to legal org name) that appears at only
//     one address statewide. High = fragmented / consolidation-ready.

export type Provider = {
  npi: string;
  org_name: string;
  dba_name: string | null;
  address_line1: string | null;
  city: string | null;
  zip: string | null;
  county_fips: string | null;
  county_name: string | null;
  all_matched_taxonomies: string[];
  provider_types: string[];
  pediatric_signal: boolean;
};

export type CountyPopulation = {
  county_fips: string;
  county_name: string;
  population_under_18: number;
};

export type Quadrant =
  | "underserved_fragmented"
  | "underserved_consolidated"
  | "saturated_fragmented"
  | "saturated_consolidated";

export type CountyScore = {
  county_fips: string;
  county_name: string;
  population_under_18: number | null;
  pediatric_provider_count: number;
  density_per_10k: number | null;
  single_location_pct: number | null;
  quadrant: Quadrant | null;
};

function orgIdentityKey(p: Provider): string {
  return (p.dba_name || p.org_name).trim().toUpperCase();
}

function locationKey(p: Provider): string {
  return `${(p.address_line1 || "").trim().toUpperCase()}|${(p.zip || "").trim()}`;
}

/** Maps each pediatric provider's org identity to whether it's single-location statewide. */
export function computeSingleLocationFlags(providers: Provider[]): Map<string, boolean> {
  const addressesByIdentity = new Map<string, Set<string>>();
  for (const p of providers) {
    const identity = orgIdentityKey(p);
    const set = addressesByIdentity.get(identity) ?? new Set<string>();
    set.add(locationKey(p));
    addressesByIdentity.set(identity, set);
  }
  const singleLocationByIdentity = new Map<string, boolean>();
  for (const [identity, addresses] of addressesByIdentity) {
    singleLocationByIdentity.set(identity, addresses.size === 1);
  }
  return singleLocationByIdentity;
}

export function computeCountyScores(
  providers: Provider[],
  populations: CountyPopulation[]
): CountyScore[] {
  const pediatricProviders = providers.filter((p) => p.pediatric_signal && p.county_fips);
  const singleLocationByIdentity = computeSingleLocationFlags(pediatricProviders);

  const providersByCounty = new Map<string, Provider[]>();
  for (const p of pediatricProviders) {
    const list = providersByCounty.get(p.county_fips!) ?? [];
    list.push(p);
    providersByCounty.set(p.county_fips!, list);
  }

  const scores: CountyScore[] = populations.map((pop) => {
    const countyProviders = providersByCounty.get(pop.county_fips) ?? [];
    const pediatricCount = countyProviders.length;

    const densityPer10k =
      pop.population_under_18 > 0
        ? (pediatricCount / (pop.population_under_18 / 10000))
        : null;

    const singleLocationCount = countyProviders.filter((p) =>
      singleLocationByIdentity.get(orgIdentityKey(p))
    ).length;
    const singleLocationPct =
      pediatricCount > 0 ? (singleLocationCount / pediatricCount) * 100 : null;

    return {
      county_fips: pop.county_fips,
      county_name: pop.county_name,
      population_under_18: pop.population_under_18,
      pediatric_provider_count: pediatricCount,
      density_per_10k: densityPer10k !== null ? Number(densityPer10k.toFixed(2)) : null,
      single_location_pct: singleLocationPct !== null ? Number(singleLocationPct.toFixed(1)) : null,
      quadrant: null,
    };
  });

  return assignQuadrants(scores);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Labels each county with providers by whether it's above/below the
 * median density and median fragmentation among counties that actually
 * have at least one pediatric provider (a median over hundreds of
 * zero-provider counties would just split "zero vs. zero").
 *
 * The fragmentation axis collapses on the current capture: single-location %
 * is 100 in 10 of the 12 counties clearing the floor, because multi-site
 * brands file their sites under separate legal entities and the name-match
 * catches only some of them. A median of 100 makes the ">= median" test
 * near-universally true, which would label almost every county "fragmented"
 * and hand the 2x2 a second axis that carries no information. When that
 * happens the quadrant is left null rather than fabricated — a degenerate
 * axis should abstain, not vote.
 */
function assignQuadrants(scores: CountyScore[]): CountyScore[] {
  const withProviders = scores.filter(
    (s) => s.pediatric_provider_count > 0 && s.density_per_10k !== null && s.single_location_pct !== null
  );
  if (withProviders.length === 0) return scores;

  const densityMedian = median(withProviders.map((s) => s.density_per_10k!));
  const fragmentationMedian = median(withProviders.map((s) => s.single_location_pct!));

  const distinctFragmentation = new Set(withProviders.map((s) => s.single_location_pct!)).size;
  const atMedian = withProviders.filter((s) => s.single_location_pct === fragmentationMedian).length;
  const fragmentationSeparates =
    distinctFragmentation >= 3 && atMedian / withProviders.length < 0.5;
  if (!fragmentationSeparates) {
    return scores.map((s) => ({ ...s, quadrant: null }));
  }

  return scores.map((s) => {
    if (s.pediatric_provider_count === 0 || s.density_per_10k === null || s.single_location_pct === null) {
      return s;
    }
    const lowDensity = s.density_per_10k <= densityMedian;
    const highFragmentation = s.single_location_pct >= fragmentationMedian;
    let quadrant: Quadrant;
    if (lowDensity && highFragmentation) quadrant = "underserved_fragmented";
    else if (lowDensity && !highFragmentation) quadrant = "underserved_consolidated";
    else if (!lowDensity && highFragmentation) quadrant = "saturated_fragmented";
    else quadrant = "saturated_consolidated";
    return { ...s, quadrant };
  });
}

export const QUADRANT_LABELS: Record<Quadrant, string> = {
  underserved_fragmented: "Lower Density & Fragmented",
  underserved_consolidated: "Lower Density & Less Fragmented",
  saturated_fragmented: "Higher Density & Fragmented",
  saturated_consolidated: "Higher Density & Less Fragmented",
};
