import { VERIFIED_CLINICS, type VerifiedClinic } from "@/lib/verified-clinics";
import type { Quadrant } from "@/lib/scoring";

export type StrategyMode = "ma" | "deNovo";

/** Curated investment-committee shortlist — editorial judgment on top of screening scores. */
export const CURATED_MARKET_NAMES = [
  "Harris County",
  "Tarrant County",
  "Bexar County",
  "Dallas County",
  "Travis County",
  "Collin County",
] as const;

export type CuratedMarketName = (typeof CURATED_MARKET_NAMES)[number];

export const METRO_CALLOUTS: Partial<Record<CuratedMarketName, string>> = {
  "Harris County": "Greater Houston",
  "Tarrant County": "DFW — Fort Worth anchor",
  "Dallas County": "DFW — Dallas core",
  "Bexar County": "San Antonio metro",
  "Travis County": "Austin metro",
  "Collin County": "DFW — North suburban growth",
};

export type CountyScoreRow = {
  county_fips: string;
  county_name: string;
  population_under_18: number | null;
  pediatric_provider_count: number;
  density_per_10k: number | null;
  single_location_pct: number | null;
  quadrant: Quadrant | null;
};

export type RegistryCandidate = {
  npi: string;
  org_name: string;
  dba_name: string | null;
  address_line1: string | null;
  city: string | null;
  zip: string | null;
  county_name: string | null;
  provider_type: string | null;
};

export type MarketProfile = CountyScoreRow & {
  de_novo_rank: number | null;
  ma_rank: number | null;
  evidence_confidence: "Strong directional" | "Directional" | "Limited";
};

export type MarketNarrative = {
  headline: string;
  rationale: string;
  risk: string;
  nextAction: string;
};

export const MARKET_NARRATIVES: Record<string, MarketNarrative> = {
  "Harris County": {
    headline: "Largest pediatric demand pool with the deepest captured provider base.",
    rationale:
      "Harris combines statewide-leading child population with enough public provider evidence to support real clinic verification. It is the strongest first market for an acquisition sourcing sprint, not a concluded investment.",
    risk:
      "The NPPES screen undercounts supply and overstates fragmentation when multi-site brands use different legal entities. Scaled competitors are already active in the market.",
    nextAction:
      "Map verified operators by ownership and site count, then separate independent platforms from scaled competitors.",
  },
  "Bexar County": {
    headline: "Large pediatric base with a mixed independent, nonprofit, and system landscape.",
    rationale:
      "San Antonio has enough scale to support a platform thesis, while the verified set already shows several different operator models that can be compared before outreach.",
    risk:
      "Hospital and nonprofit participation can make registry fragmentation look more actionable than the actual ownership landscape.",
    nextAction:
      "Complete an ownership map and verify whether independent operators have enough locations and clinician depth for platform relevance.",
  },
  "Tarrant County": {
    headline: "High-growth metro scale with several verifiable independent clinic leads.",
    rationale:
      "Tarrant has a large child population, low captured density, and the clearest early evidence of clinician-owned and founder-led operators in the verified set.",
    risk:
      "Only three registry records were captured, so the apparent supply gap is especially sensitive to data misses.",
    nextAction:
      "Expand the clinic census around Fort Worth, Keller, Mansfield, and Southlake before ranking individual targets.",
  },
  "Dallas County": {
    headline: "Large demand base, but the current clinic evidence is not yet verified.",
    rationale:
      "Dallas screens well on scale and registry depth, making it an important comparison market for the broader DFW thesis.",
    risk:
      "The current product has no official-site-verified Dallas clinic layer, so target-level conclusions would be premature.",
    nextAction: "Verify the highest-signal registry candidates and connect them to operating brands and locations.",
  },
  "Travis County": {
    headline: "Attractive metro demand with a thin public candidate set.",
    rationale:
      "Austin has meaningful pediatric scale and low captured provider density, which supports continued screening for both acquisition and de novo strategies.",
    risk:
      "Four captured records are not a reliable clinic census, and the metro footprint crosses county boundaries.",
    nextAction: "Build a metro-level clinic census before treating county density as a supply conclusion.",
  },
  "Collin County": {
    headline: "Affluent DFW suburban scale with limited registry capture.",
    rationale:
      "Collin adds north-suburban pediatric demand to the broader DFW thesis. It screens well on child population but has thin NPPES evidence relative to Harris or Tarrant.",
    risk:
      "Providers may list Dallas or Denton addresses while serving Collin families. County boundaries understate the true catchment.",
    nextAction:
      "Map operating clinics in Plano, Frisco, and McKinney before ranking Collin separately from Dallas and Tarrant.",
  },
};

export type DiligenceStatus =
  | "registry_candidate"
  | "verified_operator"
  | "target_candidate"
  | "competitor_benchmark";

export type DiligenceItem =
  | {
      kind: "registry";
      id: string;
      countyName: string;
      name: string;
      npi: string;
      city: string | null;
      zip: string | null;
      providerType: string | null;
      status: "registry_candidate";
    }
  | ({
      kind: "verified";
      status: Exclude<DiligenceStatus, "registry_candidate">;
    } & VerifiedClinic);

export type ShortlistMarket = MarketProfile & {
  curatedRank: number;
  metroLabel: string | null;
  narrative: MarketNarrative;
  verifiedClinics: VerifiedClinic[];
  targetCount: number;
  benchmarkCount: number;
  registryCandidates: RegistryCandidate[];
  unmatchedRegistryCount: number;
};

export type ExecutiveConclusion = {
  thesis: string;
  priorities: string[];
  caveats: string[];
};

function confidenceFor(count: number): MarketProfile["evidence_confidence"] {
  if (count >= 5) return "Strong directional";
  if (count >= 3) return "Directional";
  return "Limited";
}

export function buildMarketProfiles(counties: CountyScoreRow[]): MarketProfile[] {
  const eligible = counties.filter(
    (county) =>
      county.pediatric_provider_count >= 2 &&
      (county.population_under_18 ?? 0) >= 25000 &&
      county.density_per_10k !== null
  );

  const deNovoRank = new Map(
    [...eligible]
      .sort(
        (a, b) =>
          (a.density_per_10k ?? Number.POSITIVE_INFINITY) -
            (b.density_per_10k ?? Number.POSITIVE_INFINITY) ||
          (b.population_under_18 ?? 0) - (a.population_under_18 ?? 0)
      )
      .map((county, index) => [county.county_fips, index + 1])
  );

  const maRank = new Map(
    [...eligible]
      .sort(
        (a, b) =>
          b.pediatric_provider_count - a.pediatric_provider_count ||
          (b.single_location_pct ?? 0) - (a.single_location_pct ?? 0) ||
          (b.population_under_18 ?? 0) - (a.population_under_18 ?? 0)
      )
      .map((county, index) => [county.county_fips, index + 1])
  );

  return counties.map((county) => ({
    ...county,
    de_novo_rank: deNovoRank.get(county.county_fips) ?? null,
    ma_rank: maRank.get(county.county_fips) ?? null,
    evidence_confidence: confidenceFor(county.pediatric_provider_count),
  }));
}

export function narrativeFor(market: MarketProfile): MarketNarrative {
  return (
    MARKET_NARRATIVES[market.county_name] ?? {
      headline: "A directional market signal that still needs a clinic census.",
      rationale: `${market.county_name} has ${market.population_under_18?.toLocaleString() ?? "an unknown number of"} residents under 18 and ${market.pediatric_provider_count} captured registry records.`,
      risk: "Registry coverage is incomplete and should not be read as verified local supply.",
      nextAction: "Verify operating clinics, ownership, service mix, and location count before outreach.",
    }
  );
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Loose match so registry rows linked to a verified brand are not double-counted as cold leads. */
export function registryMatchesVerified(
  candidate: RegistryCandidate,
  clinic: VerifiedClinic
): boolean {
  const registryName = normalizeName(candidate.dba_name || candidate.org_name);
  const clinicName = normalizeName(clinic.name);
  if (registryName.includes(clinicName) || clinicName.includes(registryName)) return true;

  const clinicTokens = clinicName.split(" ").filter((token) => token.length > 3);
  const matchedTokens = clinicTokens.filter((token) => registryName.includes(token));
  return clinicTokens.length >= 2 && matchedTokens.length >= 2;
}

export function unmatchedRegistryCandidates(
  candidates: RegistryCandidate[],
  verified: VerifiedClinic[]
): RegistryCandidate[] {
  return candidates.filter(
    (candidate) => !verified.some((clinic) => registryMatchesVerified(candidate, clinic))
  );
}

export function buildShortlist(
  counties: CountyScoreRow[],
  registryByCounty: Map<string, RegistryCandidate[]>
): ShortlistMarket[] {
  const profiles = buildMarketProfiles(counties);
  const profileByName = new Map(profiles.map((profile) => [profile.county_name, profile]));

  return CURATED_MARKET_NAMES.map((countyName, index) => {
    const market =
      profileByName.get(countyName) ??
      ({
        county_fips: "",
        county_name: countyName,
        population_under_18: null,
        pediatric_provider_count: 0,
        density_per_10k: null,
        single_location_pct: null,
        quadrant: null,
        de_novo_rank: null,
        ma_rank: null,
        evidence_confidence: "Limited",
      } satisfies MarketProfile);

    const verifiedClinics = VERIFIED_CLINICS.filter((clinic) => clinic.countyName === countyName);
    const registryCandidates = registryByCounty.get(countyName) ?? [];
    const unmatched = unmatchedRegistryCandidates(registryCandidates, verifiedClinics);

    return {
      ...market,
      curatedRank: index + 1,
      metroLabel: METRO_CALLOUTS[countyName] ?? null,
      narrative: narrativeFor(market),
      verifiedClinics,
      targetCount: verifiedClinics.filter((clinic) => clinic.classification === "target_candidate")
        .length,
      benchmarkCount: verifiedClinics.filter(
        (clinic) => clinic.classification === "competitor_benchmark"
      ).length,
      registryCandidates,
      unmatchedRegistryCount: unmatched.length,
    };
  });
}

export function buildDiligenceQueue(shortlist: ShortlistMarket[]): DiligenceItem[] {
  const items: DiligenceItem[] = [];

  for (const market of shortlist) {
    for (const clinic of market.verifiedClinics) {
      items.push({ kind: "verified", status: clinic.classification, ...clinic });
    }
    for (const candidate of unmatchedRegistryCandidates(
      market.registryCandidates,
      market.verifiedClinics
    )) {
      items.push({
        kind: "registry",
        id: candidate.npi,
        countyName: market.county_name,
        name: candidate.dba_name || candidate.org_name,
        npi: candidate.npi,
        city: candidate.city,
        zip: candidate.zip,
        providerType: candidate.provider_type,
        status: "registry_candidate",
      });
    }
  }

  const statusOrder: Record<DiligenceStatus, number> = {
    target_candidate: 0,
    verified_operator: 1,
    competitor_benchmark: 2,
    registry_candidate: 3,
  };

  return items.sort((a, b) => {
    const statusA = a.kind === "verified" ? a.status : a.status;
    const statusB = b.kind === "verified" ? b.status : b.status;
    if (statusOrder[statusA] !== statusOrder[statusB]) {
      return statusOrder[statusA] - statusOrder[statusB];
    }
    return a.kind === "verified" ? a.name.localeCompare(b.name) : a.name.localeCompare(b.name);
  });
}

export function buildExecutiveConclusion(shortlist: ShortlistMarket[]): ExecutiveConclusion {
  const verifiedMarkets = shortlist.filter((market) => market.verifiedClinics.length > 0);
  const unverifiedMarkets = shortlist.filter((market) => market.verifiedClinics.length === 0);
  const targets = VERIFIED_CLINICS.filter((clinic) => clinic.classification === "target_candidate");

  const tarrantTargets = targets.filter((clinic) => clinic.countyName === "Tarrant County");
  const harrisTargets = targets.filter((clinic) => clinic.countyName === "Harris County");

  return {
    thesis:
      "Texas pediatric therapy sourcing should start where market scale and verified independent operators overlap. Tarrant County offers the clearest near-term acquisition leads; Harris County offers the largest demand pool with a mix of independents and scaled competitors. Dallas, Travis, and Collin remain screening-positive but need clinic-level verification before target ranking.",
    priorities: [
      tarrantTargets.length > 0
        ? `Run ownership diligence on Tarrant leads first (${tarrantTargets.map((clinic) => clinic.name).join(", ")}).`
        : "Complete Tarrant County clinic verification before outreach.",
      harrisTargets.length > 0
        ? `Separate Harris independents from scaled platforms — prioritize ${harrisTargets.map((clinic) => clinic.name).join(", ")} over Cole-scale benchmarks.`
        : "Build a verified Harris clinic census before ranking targets.",
      unverifiedMarkets.length > 0
        ? `Finish official-site verification for ${unverifiedMarkets.map((market) => market.county_name.replace(" County", "")).join(", ")} — registry records alone are not actionable.`
        : "Expand verified clinic coverage in secondary shortlist markets.",
      `Treat ${shortlist.reduce((sum, market) => sum + market.unmatchedRegistryCount, 0)} unmatched registry records as candidate organizations, not confirmed clinics.`,
    ],
    caveats: [
      `${verifiedMarkets.length} of ${shortlist.length} shortlist markets have verified clinic layers.`,
      "NPPES captures organization records with pediatric name signals — not a clinic database.",
      "County rankings are directional; DFW and Austin markets cross county lines.",
    ],
  };
}

export function supplyGapReadout(market: ShortlistMarket): string {
  if (market.density_per_10k === null) return "Insufficient data for density comparison.";
  if (market.pediatric_provider_count <= 2) {
    return "Very thin registry capture — supply gap signal is hypothesis-only until clinics are verified.";
  }
  if (market.density_per_10k <= 1.5) {
    return "Low captured provider density relative to peer counties; may indicate underserved demand or data undercount.";
  }
  if (market.density_per_10k >= 3) {
    return "Higher captured density — competitive supply is more visible in public data, but still incomplete.";
  }
  return "Moderate captured density — useful for screening, not a supply conclusion.";
}

export function consolidationReadout(market: ShortlistMarket): string {
  if (market.single_location_pct === null || market.pediatric_provider_count === 0) {
    return "Fragmentation proxy unavailable — too few captured records.";
  }
  if (market.single_location_pct >= 70) {
    return "High single-location organization proxy — more independent operators visible in registry data.";
  }
  if (market.single_location_pct <= 40) {
    return "Lower fragmentation proxy — more multi-site or consolidated organization identities in capture.";
  }
  return "Mixed fragmentation signal — ownership mapping required before consolidation thesis.";
}
