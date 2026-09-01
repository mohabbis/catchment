import {
  REJECTED_RECORDS,
  VERIFIED_CLINICS,
  type RejectedRecord,
  type VerifiedClinic,
} from "@/lib/verified-clinics";
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
    headline: "The DFW consolidator already lives here — and the house platform does too.",
    rationale:
      "Dallas is no longer a thesis-only market. Synaptic (Elashi, ~8–9 DFW sites, bootstrapped) is the local platform. KidSpeak and Speech Wings are real boutiques. Oaklin Lane's Lake Highlands clinic is the buyer, not a target. Read Dallas as the DFW core, not as a standalone county deal.",
    risk:
      "Synaptic spans Dallas, Tarrant, and Collin. Ranking Dallas on county density will understate the operator that matters.",
    nextAction: "Call Elashi. Decide partner, acquire, or compete before any Dallas de-novo talk.",
  },
  "Travis County": {
    headline: "Austin has named independents — and two platforms already on the ground.",
    rationale:
      "KidWorks (Rebecca Pokluda, 1999) and Children's Therapeutics of Austin are founder-era single sites. Line Leader is a real multidisciplinary clinic with unnamed ownership. Cole and NAPA are already here. This is a selective add-on market, not a greenfield.",
    risk:
      "Williamson and Hays are not in this county total. KidSensations closed in May 2025 — NPPES still carries it.",
    nextAction: "KidWorks first. SOS on Line Leader and CTOA. Do not underwrite Austin from four NPPES rows.",
  },
  "Collin County": {
    headline: "North DFW is where rooftops and multi-site independents already meet.",
    rationale:
      "Frisco Feeding (Jeanine Roddy, 4 sites, ~22 staff) and The Therapy Spot (4 sites, owner unnamed) are the suburban independents. Cole is in Frisco. This is a share-fight, not an empty suburb.",
    risk:
      "Frisco ZIPs split Denton/Collin. Therapy Spot's Denton site is outside this county. A Collin-only density number is the wrong object.",
    nextAction: "Roddy outreach. SOS on Therapy Spot before anyone calls a generic intake line.",
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

export type ShortlistKind = "county" | "metro";

export type ShortlistMarket = MarketProfile & {
  kind: ShortlistKind;
  curatedRank: number;
  metroLabel: string | null;
  narrative: MarketNarrative;
  verifiedClinics: VerifiedClinic[];
  targetCount: number;
  benchmarkCount: number;
  registryCandidates: RegistryCandidate[];
  unmatchedRegistryCount: number;
};

export function isMetroMarket(market: ShortlistMarket) {
  return market.kind === "metro" || market.county_fips === "dfw";
}

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
      kind: "county" as const,
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

export const DFW_COUNTY_NAMES = ["Dallas County", "Tarrant County", "Collin County"] as const;

export function buildDfwRollup(shortlist: ShortlistMarket[]): ShortlistMarket {
  const parts = shortlist.filter((market) =>
    (DFW_COUNTY_NAMES as readonly string[]).includes(market.county_name)
  );
  const verifiedClinics = VERIFIED_CLINICS.filter((clinic) => clinic.metroId === "dfw");
  const registryCandidates = parts.flatMap((market) => market.registryCandidates);
  const unmatched = unmatchedRegistryCandidates(registryCandidates, verifiedClinics);
  const under18 = parts.reduce((sum, market) => sum + (market.population_under_18 ?? 0), 0);
  const providerCount = parts.reduce((sum, market) => sum + market.pediatric_provider_count, 0);

  return {
    county_fips: "dfw",
    county_name: "DFW Metro",
    population_under_18: under18 || null,
    pediatric_provider_count: providerCount,
    density_per_10k:
      under18 > 0 ? Number((providerCount / (under18 / 10000)).toFixed(2)) : null,
    single_location_pct: null,
    quadrant: null,
    de_novo_rank: null,
    ma_rank: null,
    evidence_confidence: "Directional",
    kind: "metro",
    curatedRank: 0,
    metroLabel: "Dallas + Tarrant + Collin",
    narrative: {
      headline: "Treat DFW as one market. The independents already cross the county lines.",
      rationale:
        "Synaptic, Therapy Spot, Frisco Feeding, and Cole do not operate inside a single county. A Tarrant-only or Collin-only density number is a screening artifact. Combined child population is ~1.5M. Named founder targets: Therapedia (Kitchens), Frisco Feeding (Roddy), Synaptic (Elashi), Anchor (Ruelas), Cowtown (Khammar), Jump Start (Roe).",
      risk:
        "Oaklin Lane already has Lake Highlands and Rockwall. Cole is in Frisco. Synaptic is scaling without you. This is a consolidation race, not a discovery exercise.",
      nextAction:
        "Outreach order: Therapedia → Frisco Feeding → Synaptic. SOS on Therapy Spot. Pass Cole, Oaklin Lane, and hospital/nonprofit names.",
    },
    verifiedClinics,
    targetCount: verifiedClinics.filter((clinic) => clinic.classification === "target_candidate").length,
    benchmarkCount: verifiedClinics.filter((clinic) => clinic.classification === "competitor_benchmark")
      .length,
    registryCandidates,
    unmatchedRegistryCount: unmatched.length,
  };
}

export function buildDisplayShortlist(
  counties: CountyScoreRow[],
  registryByCounty: Map<string, RegistryCandidate[]>
): ShortlistMarket[] {
  const countyShortlist = buildShortlist(counties, registryByCounty);
  return [buildDfwRollup(countyShortlist), ...countyShortlist];
}

export function buildExecutiveConclusion(shortlist: ShortlistMarket[]): ExecutiveConclusion {
  const countyMarkets = shortlist.filter((market) => !isMetroMarket(market));
  const verifiedMarkets = countyMarkets.filter((market) => market.verifiedClinics.length > 0);
  const ranked = [...VERIFIED_CLINICS]
    .filter((clinic) => clinic.outreachRank !== null)
    .sort((a, b) => (a.outreachRank ?? 99) - (b.outreachRank ?? 99));

  return {
    thesis:
      "Start where a named founder, more than one site or a disclosed therapist bench, and no PE press overlap. That list is short: Therapedia, Frisco Feeding, Synaptic, PTA San Antonio, Kids Developmental Clinic. DFW is one market. NPPES is a candidate generator — Tarrant had 3 registry rows and 4 verified independents.",
    priorities: ranked.slice(0, 6).map((clinic) => {
      const owner = clinic.ownerName ? ` (${clinic.ownerName})` : "";
      return `${clinic.outreachRank}. ${clinic.name}${owner} — ${clinic.nextAction}`;
    }),
    caveats: [
      `${verifiedMarkets.length} of ${countyMarkets.length} county markets now have a verified clinic layer.`,
      "Ownership is from practice sites, NPI authorized officials, and LinkedIn — not pulled SOS filings. 'No PE press found' is not a clearance.",
      "Clinician counts from LinkedIn/sites are estimates. Confirm on the call.",
      "NPPES name-match missed Cole, KDC, Synaptic, Therapy Spot, and Frisco Feeding. Density is a hypothesis.",
      "Oaklin Lane's own clinics are on the map and in the pass list.",
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

const MARKET_ALIASES: Record<string, string[]> = {
  "Harris County": ["Harris", "Houston"],
  "Dallas County": ["Dallas", "Rockwall"],
  "Tarrant County": ["Tarrant", "Fort Worth"],
  "Collin County": ["Collin", "Frisco"],
  "Travis County": ["Travis", "Austin"],
  "Bexar County": ["Bexar", "San Antonio"],
  "DFW Metro": ["Dallas", "Tarrant", "Collin", "Frisco", "Rockwall", "Denton", "DFW"],
};

export function rejectedForMarket(
  market: ShortlistMarket,
  options?: { includeStatewide?: boolean }
): RejectedRecord[] {
  const aliases = MARKET_ALIASES[market.county_name] ?? [
    market.county_name.replace(/ County$/, ""),
  ];
  return REJECTED_RECORDS.filter((record) => {
    if (record.market === "Statewide" || record.market === "Outside shortlist") {
      return options?.includeStatewide ?? isMetroMarket(market);
    }
    return aliases.some((alias) => record.market.includes(alias));
  });
}

export function ownershipHeadline(clinic: VerifiedClinic): string {
  if (clinic.ownerName) return clinic.ownerName;
  if (clinic.ownershipStatus === "independent_unnamed") {
    return "Owner not named on public site";
  }
  if (clinic.ownershipStatus === "platform_scaled") return "Scaled platform";
  if (clinic.ownershipStatus === "nonprofit") return "Nonprofit";
  if (clinic.ownershipStatus === "hospital_system") return "Hospital / health system";
  if (clinic.ownershipStatus === "sponsor_platform") return "Oaklin Lane (buyer)";
  return "Ownership not established";
}

export function buildIcBrief(
  selected: ShortlistMarket,
  queue: DiligenceItem[],
  rejected: RejectedRecord[]
): string {
  const lines = [
    `# Catchment IC brief — ${selected.county_name}`,
    "",
    `Evidence: ${selected.evidence_confidence}. ${selected.metroLabel ?? "County market"}.`,
    "",
    "## Thesis",
    selected.narrative.headline,
    "",
    selected.narrative.rationale,
    "",
    "## Why this market",
    `- Scale: ${(selected.population_under_18 ?? 0).toLocaleString()} children 0–17`,
    `- Supply (registry screen only): ${selected.pediatric_provider_count} NPPES name-matched records; density ${selected.density_per_10k ?? "n/a"} /10k`,
    `- Consolidation proxy: ${selected.single_location_pct === null ? "n/a" : `${selected.single_location_pct}% single-location`}`,
    `- Risk: ${selected.narrative.risk}`,
    `- Next: ${selected.narrative.nextAction}`,
    "",
    "## Classified clinics",
    "",
  ];

  for (const clinic of selected.verifiedClinics) {
    lines.push(
      `### ${clinic.name}`,
      `- Classification: ${clinic.classification}`,
      `- Ownership: ${ownershipHeadline(clinic)} — ${clinic.ownershipSignal}`,
      `- PE signal: ${clinic.peSignal}`,
      `- Locations: ${clinic.locationCount} (${clinic.footprint})`,
      `- Size signal: ${clinic.clinicianEstimate}`,
      `- Services: ${clinic.services.join(", ")}`,
      `- Next action: ${clinic.nextAction}`,
      `- Website: ${clinic.websiteUrl}`,
      `- Notes: ${clinic.verificationNote}`,
      ""
    );
  }

  const registryItems = queue.filter((item) => item.kind === "registry");
  if (registryItems.length) {
    lines.push("## Unmatched registry candidates (not verified clinics)", "");
    for (const item of registryItems) {
      if (item.kind !== "registry") continue;
      lines.push(
        `- ${item.name} — NPI ${item.npi}${item.city ? `, ${item.city}` : ""}`
      );
    }
    lines.push("");
  }

  if (rejected.length) {
    lines.push("## Pass / not a target", "");
    for (const record of rejected) {
      lines.push(`- **${record.name}** (${record.category.replaceAll("_", " ")}) — ${record.reason}`);
    }
    lines.push("");
  }

  lines.push(
    "## Caveats",
    "- NPPES is a candidate-generation screen, not a clinic census.",
    "- Ownership notes are web/NPI research, not Texas SOS filings.",
    "- “No PE press found” is not clearance.",
    "- Oaklin Lane’s own clinics are the buyer, not targets.",
    ""
  );

  return lines.join("\n");
}
