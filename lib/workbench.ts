import {
  LICENSE_STATUS_LABELS,
  REJECTED_RECORDS,
  SOS_STATUS_LABELS,
  VERIFIED_CLINICS,
  type LicenseCheck,
  type MetroId,
  type RejectedRecord,
  type SosCheck,
  type VerifiedClinic,
} from "@/lib/verified-clinics";
import type { Quadrant } from "@/lib/scoring";
import {
  clinicChecks,
  marketCoverage,
  ownershipConfidence,
  portfolioCoverage,
  CHECK_STATE_LABELS,
} from "@/lib/coverage";
import { METHODOLOGY_STATEMENT, NOT_DONE } from "@/lib/methodology";

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

export type EvidenceLevel =
  | "Named operators mapped"
  | "Partial clinic layer"
  | "Thin clinic layer"
  | "Registry screen only";

export type MarketProfile = CountyScoreRow & {
  evidence_confidence: EvidenceLevel;
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
      "Harris combines statewide-leading child population with enough public provider evidence to support real clinic verification. On current evidence it looks like the strongest first market for an acquisition sourcing sprint. That is a sequencing hypothesis, not a concluded investment.",
    risk:
      "The NPPES screen undercounts supply and overstates fragmentation when multi-site brands use different legal entities. Scaled competitors are already active in the market.",
    nextAction:
      "Map verified operators by ownership and site count, then separate independent platforms from scaled competitors.",
  },
  "Bexar County": {
    headline: "Large pediatric base with a mixed independent, nonprofit, and system landscape.",
    rationale:
      "San Antonio has enough scale that a platform thesis is worth testing, and the verified set already shows several different operator models that can be compared before outreach.",
    risk:
      "Hospital and nonprofit participation can make registry fragmentation look more actionable than the actual ownership landscape.",
    nextAction:
      "Complete an ownership map and verify whether independent operators have enough locations and clinician depth for platform relevance.",
  },
  "Tarrant County": {
    headline: "High-growth metro scale with several verifiable independent clinic leads.",
    rationale:
      "Tarrant has a large child population, low captured density, and the clearest early evidence of clinician-owned and founder-led operators in the verified set. Low captured density here is a recall problem before it is a supply signal — only three registry records were returned.",
    risk:
      "The apparent supply gap here is especially sensitive to data misses, and no clinic census has been completed outside the named leads.",
    nextAction:
      "Expand the clinic census around Fort Worth, Keller, Mansfield, and Southlake before ranking individual targets.",
  },
  "Dallas County": {
    headline: "The most visible DFW consolidator appears to be based here — and so is the sponsor's own clinic.",
    rationale:
      "Dallas reads as more than a thesis-only market. Synaptic (Elashi, ~8–9 DFW sites on its own site, no outside capital found) appears to be the local platform. KidSpeak and Speech Wings present as real boutiques. Oaklin Lane's Lake Highlands clinic is the sponsor's own, not a target. Read Dallas as the DFW core rather than a standalone county deal.",
    risk:
      "Synaptic spans Dallas, Tarrant, and Collin. Ranking Dallas on county density will understate the operator that matters.",
    nextAction:
      "Qualifying call with Elashi. Assess partnership, acquisition, and competitive implications before prioritizing Dallas de novo.",
  },
  "Travis County": {
    headline: "Austin has named independents — and two scaled platforms already on the ground.",
    rationale:
      "KidWorks (Rebecca Pokluda, 1999), Line Leader (Sharon Wisnieski, 2009), and Children's Therapeutics of Austin (Gabriele Rose on NPI; retired 2020) are the Travis independents. Cole and NAPA are already here, which points to a selective add-on market rather than a greenfield.",
    risk:
      "Williamson and Hays are not in this county total. KidSensations closed in May 2025 — NPPES still carries it. CTOA current members after Rose’s retirement are unconfirmed.",
    nextAction:
      "Suggested call order: KidWorks, then Line Leader. Pull the SOS filing on CTOA LLC before assuming Rose still owns it.",
  },
  "Collin County": {
    headline: "North DFW is where rooftops and multi-site independents already meet.",
    rationale:
      "Frisco Feeding (Jeanine Roddy, 4 sites, ~22 staff) and The Therapy Spot (4 sites, owner unnamed) are the suburban independents. Cole is in Frisco. That looks like a share fight rather than an empty suburb.",
    risk:
      "Frisco ZIPs split Denton/Collin. Therapy Spot's Denton site is outside this county. A Collin-only density number is the wrong object.",
    nextAction:
      "Roddy outreach. Pull the SOS filing on Therapy Spot before anyone calls a generic intake line.",
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

/** A request to focus a market. `nonce` makes repeat requests for the same market distinct. */
export type FocusRequest = {
  market: string;
  nonce: number;
};

export function isMetroMarket(market: ShortlistMarket) {
  return market.kind === "metro" || market.county_fips === "dfw";
}

export type ExecutiveConclusion = {
  thesis: string;
  priorities: string[];
  caveats: string[];
};

/**
 * Confidence tracks the verified clinic layer, not registry capture. Ranking a
 * market's evidence by how many NPPES rows a broken name-match returned would
 * score the query, not the diligence — and would rate Harris "strong" off 11
 * records drawn from a 64-record statewide pull.
 */
function confidenceFor(verifiedClinicCount: number): EvidenceLevel {
  if (verifiedClinicCount >= 8) return "Named operators mapped";
  if (verifiedClinicCount >= 4) return "Partial clinic layer";
  if (verifiedClinicCount >= 1) return "Thin clinic layer";
  return "Registry screen only";
}

/**
 * There is deliberately no de-novo or M&A rank here.
 *
 * A rank on ascending captured density puts Tarrant first on 3 records and
 * Harris fourth on 11 — it rewards the counties where the NPPES query failed
 * hardest, which is the opposite of a market signal. A rank on descending
 * record count just re-sorts the same artifact. Both were computed and never
 * rendered; they are gone rather than dormant. Market order is the curated
 * shortlist below, which is an editorial call, stated as one.
 */
export function buildMarketProfiles(counties: CountyScoreRow[]): MarketProfile[] {
  return counties.map((county) => ({
    ...county,
    evidence_confidence: "Registry screen only" as EvidenceLevel,
  }));
}

export function narrativeFor(market: MarketProfile): MarketNarrative {
  return (
    MARKET_NARRATIVES[market.county_name] ?? {
      headline: "A directional market signal that still needs a clinic census.",
      rationale: `${market.county_name} has ${market.population_under_18?.toLocaleString() ?? "an unknown number of"} residents under 18 and ${market.pediatric_provider_count} captured registry records.`,
      risk: "Registry coverage is incomplete and should not be read as verified local supply.",
      nextAction:
        "Verify operating clinics, ownership, service mix, and location count before outreach.",
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
        evidence_confidence: "Registry screen only",
      } satisfies MarketProfile);

    const verifiedClinics = VERIFIED_CLINICS.filter((clinic) => clinic.countyName === countyName);
    const registryCandidates = registryByCounty.get(countyName) ?? [];
    const unmatched = unmatchedRegistryCandidates(registryCandidates, verifiedClinics);

    return {
      ...market,
      evidence_confidence: confidenceFor(verifiedClinics.length),
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

  // Outreach rank ahead of alphabetical: the call list is a queue, not an index.
  const rankOf = (item: DiligenceItem) =>
    item.kind === "verified" ? (item.outreachRank ?? Number.POSITIVE_INFINITY) : Number.POSITIVE_INFINITY;

  return items.sort((a, b) => {
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    if (rankOf(a) !== rankOf(b)) return rankOf(a) - rankOf(b);
    return a.name.localeCompare(b.name);
  });
}

export const DFW_COUNTY_NAMES = ["Dallas County", "Tarrant County", "Collin County"] as const;

export type MetroDefinition = {
  metroId: Extract<MetroId, "dfw" | "houston" | "austin">;
  fips: string;
  name: string;
  countyNames: readonly string[];
  metroLabel: string;
  narrative: MarketNarrative;
};

export const METRO_DEFINITIONS: MetroDefinition[] = [
  {
    metroId: "dfw",
    fips: "dfw",
    name: "DFW Metro",
    countyNames: DFW_COUNTY_NAMES,
    metroLabel: "Dallas, Tarrant, and Collin as one market",
    narrative: {
      headline: "Treat DFW as one market. The independents already cross the county lines.",
      rationale:
        "Synaptic, Therapy Spot, Frisco Feeding, and Cole do not operate inside a single county, so a Tarrant-only or Collin-only density number is a screening artifact. Combined child population is ~1.5M. Named founder-led preliminary targets: Therapedia (Kitchens), Frisco Feeding (Roddy), Synaptic (Elashi), Anchor (Ruelas), Cowtown (Khammar), Jump Start (Roe) — each still requires ownership and independence confirmation.",
      risk:
        "Oaklin Lane's own site listed Lake Highlands and Rockwall when checked 2026-09-01 — confirm before relying on it. Cole is in Frisco. Synaptic's reported footprint has grown. That pattern suggests an active consolidation market rather than a discovery exercise, and it is a hypothesis to test on the calls, not an established fact.",
      nextAction:
        "Suggested qualifying-call order: Therapedia → Frisco Feeding → Synaptic. Pull the SOS filing on Therapy Spot. Pass Cole, Oaklin Lane, and hospital/nonprofit names.",
    },
  },
  {
    metroId: "houston",
    fips: "houston",
    name: "Houston Metro",
    countyNames: ["Harris County", "Fort Bend County", "Montgomery County"],
    metroLabel: "Harris, Fort Bend, and Montgomery as one market",
    narrative: {
      headline: "Treat Houston as one market. The named independents sit next to a local platform.",
      rationale:
        "Kids Developmental Clinic (Dinn, 4 sites), Pediatric Therapy Center (Knowlton / 113015 Therapy, PLLC), and Wishing Well (Eglinger / MERC) are the Harris independents. Fort Bend and Montgomery add children to the metro total but have no verified clinic in this set — they are not shortlist rows. Cole appears to be the largest scaled operator in the metro.",
      risk:
        "NPPES undercounts (missed Cole and KDC). Therapy At The Zone is not one P&L. T2000 is home health. Fort Bend and Montgomery density is not a clinic census.",
      nextAction:
        "Suggested qualifying-call order: KDC → PTC. Pull SOS filings on Kids DC, LLC and 113015 Therapy, PLLC. Ask Knowlton who the unnamed co-owner is. Pass Cole, the Zone, and hospital/home-health names.",
    },
  },
  {
    metroId: "austin",
    fips: "austin",
    name: "Austin Metro",
    countyNames: ["Travis County", "Williamson County", "Hays County"],
    metroLabel: "Travis, Williamson, and Hays as one market",
    narrative: {
      headline: "Austin is a selective add-on market with named founders and two platforms already on the ground.",
      rationale:
        "KidWorks (Pokluda, 1999), Line Leader (Wisnieski, 2009), and CTOA (Rose on NPI, retired 2020) are the Travis independents. Williamson and Hays add children to the metro total but have no verified clinic assigned — they are not shortlist rows. Cole and NAPA are already here, so treat Austin as a selective add-on market until the calls say otherwise.",
      risk:
        "KidSensations closed May 2025 and still sits in NPPES. CTOA current members after Rose’s retirement are unconfirmed. A Travis-only density number is the wrong object.",
      nextAction:
        "Suggested qualifying-call order: KidWorks, then Line Leader. Pull the SOS filing on CTOA LLC before assuming Rose still owns it. Pass Cole, NAPA, and the closed clinic.",
    },
  },
];

export function buildMetroRollup(
  def: MetroDefinition,
  allCounties: CountyScoreRow[],
  registryByCounty: Map<string, RegistryCandidate[]>
): ShortlistMarket {
  const countyRows = def.countyNames.map((name) =>
    allCounties.find((county) => county.county_name === name)
  );
  const under18 = countyRows.reduce((sum, row) => sum + (row?.population_under_18 ?? 0), 0);
  const providerCount = countyRows.reduce(
    (sum, row) => sum + (row?.pediatric_provider_count ?? 0),
    0
  );
  const verifiedClinics = VERIFIED_CLINICS.filter((clinic) => clinic.metroId === def.metroId);
  const registryCandidates = def.countyNames.flatMap(
    (name) => registryByCounty.get(name) ?? []
  );
  const unmatched = unmatchedRegistryCandidates(registryCandidates, verifiedClinics);

  return {
    county_fips: def.fips,
    county_name: def.name,
    population_under_18: under18 || null,
    pediatric_provider_count: providerCount,
    density_per_10k:
      under18 > 0 ? Number((providerCount / (under18 / 10000)).toFixed(2)) : null,
    single_location_pct: null,
    quadrant: null,
    evidence_confidence: confidenceFor(verifiedClinics.length),
    kind: "metro",
    curatedRank: 0,
    metroLabel: def.metroLabel,
    narrative: def.narrative,
    verifiedClinics,
    targetCount: verifiedClinics.filter((clinic) => clinic.classification === "target_candidate")
      .length,
    benchmarkCount: verifiedClinics.filter(
      (clinic) => clinic.classification === "competitor_benchmark"
    ).length,
    registryCandidates,
    unmatchedRegistryCount: unmatched.length,
  };
}

/** @deprecated Use buildMetroRollup — kept for the DFW-only call sites. */
export function buildDfwRollup(
  shortlist: ShortlistMarket[],
  allCounties?: CountyScoreRow[]
): ShortlistMarket {
  const def = METRO_DEFINITIONS[0];
  const counties =
    allCounties ??
    shortlist.filter((market) =>
      (DFW_COUNTY_NAMES as readonly string[]).includes(market.county_name)
    );
  const registryByCounty = new Map<string, RegistryCandidate[]>();
  for (const market of shortlist) {
    registryByCounty.set(market.county_name, market.registryCandidates);
  }
  return buildMetroRollup(def, counties, registryByCounty);
}

export function buildDisplayShortlist(
  counties: CountyScoreRow[],
  registryByCounty: Map<string, RegistryCandidate[]>
): ShortlistMarket[] {
  const countyShortlist = buildShortlist(counties, registryByCounty);
  const metros = METRO_DEFINITIONS.map((def) =>
    buildMetroRollup(def, counties, registryByCounty)
  );
  return [...metros, ...countyShortlist];
}

export function buildExecutiveConclusion(shortlist: ShortlistMarket[]): ExecutiveConclusion {
  const countyMarkets = shortlist.filter((market) => !isMetroMarket(market));
  const verifiedMarkets = countyMarkets.filter((market) => market.verifiedClinics.length > 0);
  const ranked = [...VERIFIED_CLINICS]
    .filter((clinic) => clinic.outreachRank !== null)
    .sort((a, b) => (a.outreachRank ?? 99) - (b.outreachRank ?? 99));
  const coverage = portfolioCoverage(VERIFIED_CLINICS);

  return {
    thesis:
      "Working hypothesis: start where a named founder, more than one site or a disclosed therapist bench, and no sponsor press overlap. On current evidence that list is short — Therapedia, Frisco Feeding, Synaptic, PTA San Antonio, Kids Developmental Clinic — and every name on it still needs ownership and independence confirmed. DFW, Houston, and Austin are read as metro markets. NPPES is a candidate generator only: Tarrant returned 3 registry rows against 4 verified independents.",
    priorities: ranked.slice(0, 6).map((clinic) => {
      const owner = clinic.ownerName ? ` (${clinic.ownerName})` : "";
      return `${clinic.outreachRank}. ${clinic.name}${owner} — ${clinic.nextAction}`;
    }),
    caveats: [
      `${verifiedMarkets.length} of ${countyMarkets.length} county markets now have a verified clinic layer.`,
      `Research completeness: ${coverage.ownersNamed} of ${coverage.clinics} classified clinics have a named owner, ${coverage.filingsPulled} have a Texas SOS filing pulled, and ${coverage.licenseRowsPulled} of ${coverage.licenseRowsRecorded} license-board rows were pulled. Ownership is from practice sites, NPI authorized officials, and public profiles. "No PE press found" is not a clearance.`,
      "Clinician counts from public profiles and clinic sites are estimates. Confirm on the call.",
      "The NPPES name-match returned 64 org records for all of Texas and missed Cole, KDC, Synaptic, Therapy Spot, and Frisco Feeding. Density and fragmentation are shown for transparency and are not used to rank markets.",
      "The six markets are a curated editorial shortlist, not a model output. Hidalgo has the state's second-largest capture and is deliberately not on it — no clinic work was done there.",
      "Preliminary target counts partly track how much research a market received. Read them next to research coverage, not as a ranking.",
      "Oaklin Lane's own clinics are on the map and in the pass list.",
    ],
  };
}

/**
 * Reports capture; does not rank markets.
 *
 * The NPPES name-match returns 64 org records statewide, so density across every
 * shortlist market lands in a narrow band a fraction of a provider per 10k
 * children — one to two orders of magnitude under real supply. A threshold set calibrated to a true
 * supply curve would never fire on this data, so there is nothing honest to
 * branch on. State the capture and let the verified clinic layer carry the call.
 */
export function supplyGapReadout(market: ShortlistMarket): string {
  if (market.density_per_10k === null || market.pediatric_provider_count === 0) {
    return "No registry capture here. Nothing to screen on — read the verified clinic layer instead.";
  }
  const records = `${market.pediatric_provider_count} NPPES name-matched record${
    market.pediatric_provider_count === 1 ? "" : "s"
  }`;
  const scale = market.population_under_18
    ? ` against ${market.population_under_18.toLocaleString()} children`
    : "";
  return `${records}${scale} — ${market.density_per_10k}/10k. That measures what the name-match found, not what operates here: the same query missed Cole, KDC, Synaptic, Therapy Spot, and Frisco Feeding. Do not rank markets on this number.`;
}

/**
 * The fragmentation proxy reads 100% in all but two of the Texas counties that
 * clear the capture floor (21 of 23 on the checked-in extract), because multi-site brands file their sites under separate
 * legal entities and the name-match only catches some of them. A variable with
 * no variance cannot separate markets, so this reports the number and says so
 * rather than dressing it up as a consolidation signal.
 */
export function consolidationReadout(market: ShortlistMarket): string {
  if (market.pediatric_provider_count === 0) {
    return "Fragmentation proxy unavailable — no captured records in this market.";
  }
  if (market.single_location_pct === null) {
    return "Not computed at metro level — single-location share is a statewide identity test and does not sum across counties. Read it on the county rows, with the caveat below.";
  }
  if (market.pediatric_provider_count < 5) {
    return `${market.single_location_pct}% single-location across only ${market.pediatric_provider_count} captured records — too thin to read as fragmentation at all. Ownership mapping is the only route.`;
  }
  return `${market.single_location_pct}% single-location. Across this capture the proxy sits at 100% in nearly every county, so differences between markets carry little signal. Ownership mapping is the only route.`;
}

const MARKET_ALIASES: Record<string, string[]> = {
  "Harris County": ["Harris", "Houston"],
  "Dallas County": ["Dallas", "Rockwall"],
  "Tarrant County": ["Tarrant", "Fort Worth"],
  "Collin County": ["Collin", "Frisco"],
  "Travis County": ["Travis", "Austin"],
  "Bexar County": ["Bexar", "San Antonio"],
  "DFW Metro": ["Dallas", "Tarrant", "Collin", "Frisco", "Rockwall", "Denton", "DFW"],
  "Houston Metro": ["Houston", "Harris", "Fort Bend", "Montgomery", "Pearland", "Pasadena"],
  "Austin Metro": ["Austin", "Travis", "Williamson", "Hays"],
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
    return `Owner not named — ${SOS_STATUS_LABELS[clinic.sosCheck.status]} as of ${clinic.sosCheck.checkedOn}`;
  }
  if (clinic.ownershipStatus === "platform_scaled") return "Scaled platform";
  if (clinic.ownershipStatus === "nonprofit") return "Nonprofit";
  if (clinic.ownershipStatus === "hospital_system") return "Hospital / health system";
  if (clinic.ownershipStatus === "sponsor_platform") return "Oaklin Lane (buyer)";
  return "Ownership not established";
}

export function sosCheckLine(check: SosCheck): string {
  const legal = check.legalName ? ` · ${check.legalName}` : "";
  const members = check.members ? ` · ${check.members}` : "";
  return `${SOS_STATUS_LABELS[check.status]} · checked ${check.checkedOn}${legal}${members}`;
}

export function licenseCheckLine(check: LicenseCheck): string {
  const number = check.licenseNumber ? ` · #${check.licenseNumber}` : "";
  const holder = check.holderName ? ` · ${check.holderName}` : "";
  return `${check.board}: ${LICENSE_STATUS_LABELS[check.status]}${number}${holder} · ${check.checkedOn}`;
}

export type BriefNotes = Record<string, string>;

export function buildIcBrief(
  selected: ShortlistMarket,
  queue: DiligenceItem[],
  rejected: RejectedRecord[],
  notes: BriefNotes = {}
): string {
  const ranked = [...selected.verifiedClinics]
    .filter((clinic) => clinic.outreachRank !== null)
    .sort((a, b) => (a.outreachRank ?? 99) - (b.outreachRank ?? 99));

  const coverage = marketCoverage(selected);

  const lines = [
    `# Catchment IC brief — ${selected.county_name}`,
    "",
    `Evidence: ${selected.evidence_confidence}. ${selected.metroLabel ?? "County market"}.`,
    `Research coverage: ${coverage.label} — ${coverage.pct}% of the standing check-list complete across ${coverage.clinicsClassified} classified clinic${coverage.clinicsClassified === 1 ? "" : "s"} (${coverage.ownersNamed} with a named owner, ${coverage.filingsPulled} with an SOS filing pulled). Coverage measures diligence effort, not market quality.`,
    "",
    "## Method",
    METHODOLOGY_STATEMENT,
    "",
    "## Thesis",
    selected.narrative.headline,
    "",
    selected.narrative.rationale,
    "",
    "## Why this market",
    `- Scale: ${(selected.population_under_18 ?? 0).toLocaleString()} children 0–17`,
    `- Registry capture (not supply): ${selected.pediatric_provider_count} NPPES name-matched records, ${selected.density_per_10k ?? "n/a"}/10k. From a 64-record statewide pull that missed Cole, KDC, Synaptic, Therapy Spot, and Frisco Feeding — this counts what the query found, not what operates here.`,
    `- Fragmentation proxy: ${selected.single_location_pct === null ? "n/a" : `${selected.single_location_pct}% single-location — reads ~100% across almost every captured county, so it does not separate markets`}.`,
    `- Risk: ${selected.narrative.risk}`,
    `- Next: ${selected.narrative.nextAction}`,
    "",
  ];

  if (ranked.length) {
    lines.push(
      `Counts below are preliminary. "Preliminary target" means a named clinic worth a qualifying call on current public evidence — not a confirmation of ownership, independence, or availability.`,
      ""
    );
  }

  if (ranked.length) {
    lines.push("## Preliminary targets, in suggested call order", "");
    for (const clinic of ranked) {
      lines.push(
        `${clinic.outreachRank}. ${clinic.name} — ${ownershipHeadline(clinic)}. ${clinic.nextAction}`
      );
    }
    lines.push("");
  }

  lines.push("## Classified clinics", "");

  for (const clinic of selected.verifiedClinics) {
    const workspaceNote = notes[clinic.id]?.trim();
    lines.push(
      `### ${clinic.name}`,
      `- Classification: ${clinic.classification}`,
      `- Ownership: ${ownershipHeadline(clinic)} — ${clinic.ownershipSignal}`,
      `- SOS / NPI check: ${sosCheckLine(clinic.sosCheck)}`,
      `- SOS note: ${clinic.sosCheck.note}`,
      `- PE signal: ${clinic.peSignal}`,
      `- Locations: ${clinic.locationCount} (${clinic.footprint})`,
      `- Size signal: ${clinic.clinicianEstimate}`,
      `- Services: ${clinic.services.join(", ")}`,
      `- Next action: ${clinic.nextAction}`,
      `- Website: ${clinic.websiteUrl}`,
      `- Notes: ${clinic.verificationNote}`
    );
    if (clinic.licenseChecks.length) {
      lines.push("- License / SOS:");
      for (const check of clinic.licenseChecks) {
        lines.push(`  - ${licenseCheckLine(check)} — ${check.note}`);
      }
    }
    const confidence = ownershipConfidence(clinic);
    lines.push(`- Ownership confidence: ${confidence.label} — ${confidence.basis}`);
    lines.push("- Research completeness:");
    for (const check of clinicChecks(clinic)) {
      lines.push(
        `  - ${check.label}: ${CHECK_STATE_LABELS[check.state]}${
          check.checkedOn ? ` (${check.checkedOn})` : ""
        } — ${check.detail}`
      );
    }
    if (workspaceNote) {
      lines.push(`- Workspace note: ${workspaceNote}`);
    }
    lines.push("");
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
    "## What was not done",
    ...NOT_DONE.map((line) => `- ${line}`),
    "",
    "## Caveats",
    "- NPPES is a candidate-generation screen, not a clinic census. Density and fragmentation are reported for transparency, not used to rank markets — see the note under each.",
    "- The six markets are a curated editorial shortlist, not the output of a model. Hidalgo County has the second-largest registry capture in the state and is deliberately not shortlisted; no verified clinic work was done there.",
    "- SOS and license rows are dated checks from this pass. Interactive board/SOS search was not completed — do not read `not_pulled` as unlicensed or uncleared.",
    "- Preliminary target counts partly reflect how much research a market received. Read them alongside research coverage, not as a market ranking.",
    "- Ownership notes are web/NPI research, not Texas SOS filings.",
    "- “No PE press found” is not clearance.",
    "- Oaklin Lane’s own clinics are the buyer, not targets.",
    ""
  );

  return lines.join("\n");
}
