// Methodology surface: what the screening layer actually queried, computed,
// and left undone.
//
// Every entry here is traceable to code in this repo — the NPPES query in
// scripts/fetch-npi-tx.mjs, the Census pull in scripts/fetch-census-population.mjs,
// the crosswalk in scripts/build-zip-county-crosswalk.mjs, and the arithmetic in
// lib/scoring.ts. Nothing is asserted here that those files do not do. Where a
// step was skipped (deduplication, taxonomy codes, an entity rollup) this file
// says it was skipped rather than describing a step that does not exist.

import type { CountyScoreRow } from "@/lib/workbench";

export const METHODOLOGY_STATEMENT =
  "Market screens use Census child-population estimates and pediatric-therapy-related NPPES organization records. Provider density is directional: NPPES records may represent an organization, a single site of a larger group, or a mailing address, and no deduplication or entity rollup is applied. Clinic candidates are then classified by hand from public websites, NPI records, ownership indications, and available corporate or professional-license information. Results identify areas and organizations for further diligence. They do not establish market demand, ownership, transaction eligibility, or investment suitability.";

export type ScreenParameter = {
  label: string;
  value: string;
  note: string;
};

/** The literal query parameters behind the registry extract. */
export const SUPPLY_QUERY: ScreenParameter[] = [
  {
    label: "Registry",
    value: "NPPES NPI Registry API, version 2.1",
    note: "Public federal provider registry. No key required, no licensing or claims data attached.",
  },
  {
    label: "Enumeration type",
    value: "NPI-2 (organizations only)",
    note: "Individual clinician NPIs (NPI-1) are not in this pull at all. A solo practitioner who never enumerated an organization is invisible to this screen.",
  },
  {
    label: "Taxonomy filter",
    value: "Speech-Language Pathologist · Occupational Therapist · Physical Therapist",
    note: "Matched on NPPES taxonomy_description text, not on taxonomy codes. Pediatric-specialty codes (for example Physical Therapist, Pediatrics) were not enumerated, so a record is not captured because of its specialty code.",
  },
  {
    label: "Name filter",
    value: "organization_name contains pediatric | kids | child | peds",
    note: "This is the pediatric signal — a name-match, not a clinical one. A pediatric practice named after its founder is missed. A taxonomy-only search without this filter returned 120,000+ records dominated by home health, hospice, DME, and hospital systems, so the name filter was pushed into the query itself.",
  },
  {
    label: "Geography filter",
    value: "state = TX",
    note: "Practice-location state as filed with NPPES.",
  },
];

export const DEMAND_QUERY: ScreenParameter[] = [
  {
    label: "Source",
    value: "Census ACS 5-Year, 2023 vintage",
    note: "County-level estimates for all Texas counties.",
  },
  {
    label: "Variable",
    value: "B09001_001E — total population under 18",
    note: "The denominator is children 0–17, not total population and not a therapy-eligible or diagnosed cohort. It is a proxy for demand, not a measure of it.",
  },
  {
    label: "Geography",
    value: "County (state FIPS 48)",
    note: "No sub-county, ZIP, or drive-time demand estimate is computed.",
  },
];

export const GEOGRAPHY_QUERY: ScreenParameter[] = [
  {
    label: "ZIP to county",
    value: "Census 2020 ZCTA-to-County relationship file",
    note: "A provider's 5-digit practice ZIP is mapped to one county. Where a ZCTA spans counties it is assigned to the county with the largest land-area overlap, so a border ZIP can land on the wrong side.",
  },
  {
    label: "Address used",
    value: "NPPES practice address line 1 + ZIP",
    note: "This is a filed address. It can be a billing or mailing location rather than a treating site, and it does not describe a catchment or service area.",
  },
  {
    label: "Metro rollup",
    value: "Sum of member counties",
    note: "DFW = Dallas + Tarrant + Collin. Houston = Harris + Fort Bend + Montgomery. Austin = Travis + Williamson + Hays. Records and children are summed and density is recomputed on the sums. The fragmentation proxy is a statewide identity test and does not sum, so it is left blank at metro level rather than approximated.",
  },
];

export type MetricDefinition = {
  term: string;
  plain: string;
  formula: string;
  denominator: string;
  dedup: string;
  limit: string;
};

export const METRIC_DEFINITIONS: MetricDefinition[] = [
  {
    term: "Captured provider record",
    plain:
      "One NPPES organization record that cleared every filter above. It is a registry row, not a clinic, not a site, and not a clinician.",
    formula: "count of NPI-2 rows where pediatric_signal = true and a county was resolved",
    denominator: "—",
    dedup:
      "None. No deduplication, no entity rollup, no parent-child mapping. A group that files one NPI per site contributes one record per site; a group that files a single NPI contributes one record in total. The two are counted the same way here.",
    limit:
      "The statewide pull is 64 records. Verified operators including Cole, Kids Developmental Clinic, Synaptic, The Therapy Spot, and Frisco Feeding are absent from it. This count measures query recall, not local supply.",
  },
  {
    term: "Provider density per 10k children",
    plain: "Captured records for a market, per 10,000 children aged 0–17 in that market.",
    formula: "captured records ÷ (population under 18 ÷ 10,000)",
    denominator: "Census ACS 2023 B09001_001E, county totals, summed for metros",
    dedup: "None — see above. The numerator inherits every capture problem.",
    limit:
      "Every value this produces sits one to two orders of magnitude below plausible real supply — the live range across counties with any capture is shown above, and the per-market values are on the Overview and Compare views. Differences between markets on this axis mostly reflect where the name-match happened to hit. No market is ranked on it.",
  },
  {
    term: "Fragmentation proxy (single-location share)",
    plain:
      "The share of a county's captured records whose organization identity appears at only one address in the whole state.",
    formula:
      "single-location records ÷ captured records in the county, as a percentage",
    denominator: "captured records in that county",
    dedup:
      "Identity = DBA name, falling back to legal organization name, trimmed and upper-cased. Location = address line 1 + ZIP. This is a string match on names, not an ownership test: two sites of one owner filed under different entity names read as two independent operators.",
    limit:
      "It reads 100% in nearly every county with any capture — the exact count is in the live figures above — because multi-site brands file their sites under separate legal entities and the name-match catches only some of them. A variable with almost no variance cannot separate markets. It is reported for transparency and is not used to rank.",
  },
  {
    term: "Peer set / median",
    plain:
      "When a median is taken, the comparison group is Texas counties with at least one captured record — not all 254 counties.",
    formula: "median over counties where captured records ≥ 1",
    denominator: "counties clearing the capture floor",
    dedup: "—",
    limit:
      "A median across hundreds of zero-record counties would split zero against zero. Restricting to counties with capture makes the median meaningful but small-n, and it still describes the query rather than the state.",
  },
  {
    term: "2×2 quadrant",
    plain:
      "The screening quadrant (density × fragmentation) deliberately abstains on the current data and shows nothing.",
    formula:
      "assigned only when fragmentation has ≥3 distinct values and fewer than half the counties sit exactly at the median",
    denominator: "—",
    dedup: "—",
    limit:
      "Those conditions do not hold on this extract, so the quadrant returns null everywhere. A degenerate axis abstains rather than voting.",
  },
];

export type DictionaryEntry = { term: string; meaning: string };

/** Labels used across the interface, defined once. */
export const LABEL_DICTIONARY: DictionaryEntry[] = [
  {
    term: "Preliminary target",
    meaning:
      "A named, apparently independent clinic that looks worth a qualifying call on current public evidence. It is not an investment approval, a confirmation of ownership or independence, or a statement that the business is available.",
  },
  {
    term: "Preliminary outreach candidate",
    meaning:
      "The same set, counted. The count is a research queue, not a verified pipeline: ownership, entity status, and independence are still open on most of these names.",
  },
  {
    term: "On the map",
    meaning:
      "A real clinic that is not on the outreach list — usually a boutique or a useful piece of local context.",
  },
  {
    term: "Passed / benchmark",
    meaning:
      "Reviewed and set aside on purpose: scaled platform, hospital, nonprofit, closed, home health, or the sponsor's own sites.",
  },
  {
    term: "Registry name",
    meaning:
      "An unverified NPPES name-match. Candidate generation only — no site, owner, or status has been checked.",
  },
  {
    term: "Research coverage",
    meaning:
      "How much of the standing check-list has been completed for a market. It measures diligence effort, not market quality: a market can score high on coverage because more hours went into it, and a market with more preliminary targets may simply have been researched harder.",
  },
  {
    term: "Ownership confidence",
    meaning:
      "How an owner was identified. Named on a practice site or an NPI authorized-official field is weaker than a pulled Secretary of State filing. No SOS filing was pulled in this pass.",
  },
];

export const NOT_DONE: string[] = [
  "No Texas Secretary of State filing was pulled for any clinic. Owner names come from practice sites, NPI authorized-official fields, and public profiles.",
  "No professional-license board record (TDLR, ECPTOTE) was pulled. Every license row in this app reads not pulled, which means the interactive search was not completed — not that a clinic is unlicensed.",
  "No deduplication or corporate-parent rollup was applied to the registry extract.",
  "No revenue, payer mix, volume, referral, or reimbursement data was used anywhere in this app.",
  "No drive-time, catchment, or sub-county demand modelling was done. Demand is a county child count.",
  "The six shortlisted markets are an editorial choice, not a model output. Hidalgo County has the state's second-largest registry capture and was deliberately not worked.",
];

export type ScreenStats = {
  capturedRecords: number;
  countiesWithCapture: number;
  countiesTotal: number;
  densityMin: number | null;
  densityMax: number | null;
  fragmentationAt100: number;
  quadrantsAssigned: number;
};

/**
 * Live stats from whatever extract is loaded, so the methodology page reports
 * the data in front of the reader rather than a number typed into prose.
 */
export function computeScreenStats(counties: CountyScoreRow[]): ScreenStats {
  const withCapture = counties.filter((county) => county.pediatric_provider_count > 0);
  const densities = withCapture
    .map((county) => county.density_per_10k)
    .filter((value): value is number => value !== null);

  return {
    capturedRecords: counties.reduce((sum, county) => sum + county.pediatric_provider_count, 0),
    countiesWithCapture: withCapture.length,
    countiesTotal: counties.length,
    densityMin: densities.length ? Math.min(...densities) : null,
    densityMax: densities.length ? Math.max(...densities) : null,
    fragmentationAt100: withCapture.filter((county) => county.single_location_pct === 100).length,
    quadrantsAssigned: counties.filter((county) => county.quadrant !== null).length,
  };
}
