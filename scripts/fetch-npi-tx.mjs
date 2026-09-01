#!/usr/bin/env node
// Pulls TX org-level (NPI-2) pediatric therapy providers from the NPPES NPI
// Registry API. No API key required.
//
// Methodology note (deviation from a naive "pull everything" approach):
// A first pass tried the obvious thing — three broad taxonomy_description
// searches (Speech-Language Pathologist / Occupational Therapist / Physical
// Therapist) with no name filter. That runs into a wall: TX org-level NPI
// records tagged with any of these taxonomies include a huge number of
// general-purpose organizations (home health agencies, hospices, hospital
// systems, DME suppliers) that list therapy as one line among many services.
// A single taxonomy search alone passed 120,000+ records with no sign of
// terminating — not useful data, and not remotely close to "pediatric
// therapy clinics."
//
// Since the paper's own pediatric_signal heuristic is a name-match (org
// name / DBA contains "pediatric," "kids," "child," "children"), and since
// BOTH scoring axes (density, fragmentation) only ever use
// pediatric_signal=true records, there's no loss in pushing that same
// heuristic into the query itself: search organization_name wildcards
// crossed with each taxonomy, instead of fetching the entire irrelevant
// universe and filtering client-side. Same criterion, tractable result set.
// The trade-off, stated plainly: a pediatric practice with a taxonomy-only
// signal (e.g. a "Physical Therapist, Pediatrics" specialty code) but a
// name that doesn't say "pediatric" would be missed here. That's a known,
// narrower version of the limitation the handoff already calls out.
//
// Usage: node scripts/fetch-npi-tx.mjs
// Output: data/npi_tx_raw.json

import { writeFile, mkdir } from "node:fs/promises";
import fs from "node:fs";
import path from "node:path";

const NPPES_BASE = "https://npiregistry.cms.hhs.gov/api/";
const PAGE_LIMIT = 200;
const REQUEST_DELAY_MS = 300;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_RETRIES = 3;
const MAX_PAGES_PER_QUERY = 25; // safety cap: 5,000 records per keyword x taxonomy combo

// Synchronous, unbuffered write so progress is visible immediately even
// when stdout is redirected to a file (Node fully-buffers piped stdout).
function log(msg) {
  fs.writeSync(1, `${msg}\n`);
}

const TAXONOMY_SEARCHES = [
  { label: "SLP", description: "Speech-Language Pathologist" },
  { label: "OT", description: "Occupational Therapist" },
  { label: "PT", description: "Physical Therapist" },
];

// Distinct keyword roots only — wildcard substring match already covers
// plurals/variants (pediatric -> pediatrics; child -> children, childhood).
const NAME_KEYWORDS = ["pediatric", "kids", "child", "peds"];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage({ taxonomyDescription, organizationName, skip }) {
  const url = new URL(NPPES_BASE);
  url.searchParams.set("version", "2.1");
  url.searchParams.set("enumeration_type", "NPI-2");
  url.searchParams.set("taxonomy_description", taxonomyDescription);
  url.searchParams.set("organization_name", organizationName);
  url.searchParams.set("state", "TX");
  url.searchParams.set("limit", String(PAGE_LIMIT));
  url.searchParams.set("skip", String(skip));

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) {
        throw new Error(`NPPES request failed: ${res.status} ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      clearTimeout(timer);
      const isLast = attempt === MAX_RETRIES;
      log(`  ! request error (attempt ${attempt}/${MAX_RETRIES}, skip=${skip}): ${err.message}`);
      if (isLast) throw err;
      await sleep(1000 * attempt);
    }
  }
}

async function fetchAllForCombo({ taxonomyLabel, taxonomyDescription, keyword }) {
  const organizationName = `*${keyword}*`;
  const results = [];
  let skip = 0;
  let page = 0;

  while (true) {
    const data = await fetchPage({ taxonomyDescription, organizationName, skip });
    const batch = data.results ?? [];
    results.push(...batch);
    page += 1;

    if (batch.length < PAGE_LIMIT) break;
    if (page >= MAX_PAGES_PER_QUERY) {
      log(
        `  ! [${taxonomyLabel}/"${keyword}"] hit ${MAX_PAGES_PER_QUERY}-page safety cap at ${results.length} records — stopping this combo`
      );
      break;
    }
    skip += PAGE_LIMIT;
    await sleep(REQUEST_DELAY_MS);
  }

  log(`[${taxonomyLabel}/"${keyword}"]: ${results.length} records`);
  return results.map((r) => ({ ...r, __searchLabel: taxonomyLabel }));
}

function extractDbaName(basic, otherNames) {
  const dba = (otherNames ?? []).find((n) =>
    (n.type ?? n.type_desc ?? "").toLowerCase().includes("doing business")
  );
  return dba?.organization_name ?? null;
}

function extractLocationAddress(addresses) {
  const addr =
    (addresses ?? []).find((a) => a.address_purpose === "LOCATION") ??
    (addresses ?? [])[0];
  if (!addr) return {};
  return {
    address_line1: addr.address_1 ?? null,
    city: addr.city ?? null,
    state: addr.state ?? null,
    zip: (addr.postal_code ?? "").slice(0, 5) || null,
  };
}

function computePediatricSignal(orgName, dbaName, taxonomyDescs) {
  const haystack = [orgName, dbaName, ...taxonomyDescs]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return NAME_KEYWORDS.some((kw) => haystack.includes(kw)) || haystack.includes("children");
}

function normalizeRecord(raw) {
  const basic = raw.basic ?? {};
  const orgName = basic.organization_name ?? basic.name ?? "";
  const dbaName = extractDbaName(basic, raw.other_names);
  const taxonomyDescs = (raw.taxonomies ?? []).map((t) => t.desc).filter(Boolean);
  const address = extractLocationAddress(raw.addresses);

  return {
    npi: raw.number,
    org_name: orgName,
    dba_name: dbaName,
    ...address,
    all_matched_taxonomies: Array.from(new Set(taxonomyDescs)),
    pediatric_signal: computePediatricSignal(orgName, dbaName, taxonomyDescs),
    __searchLabel: raw.__searchLabel,
  };
}

async function main() {
  const allRaw = [];
  for (const taxonomy of TAXONOMY_SEARCHES) {
    for (const keyword of NAME_KEYWORDS) {
      const records = await fetchAllForCombo({
        taxonomyLabel: taxonomy.label,
        taxonomyDescription: taxonomy.description,
        keyword,
      });
      allRaw.push(...records);
      await sleep(REQUEST_DELAY_MS);
    }
  }

  const byNpi = new Map();
  for (const raw of allRaw) {
    const normalized = normalizeRecord(raw);
    const existing = byNpi.get(normalized.npi);
    if (!existing) {
      byNpi.set(normalized.npi, {
        ...normalized,
        provider_types: [normalized.__searchLabel],
      });
    } else {
      existing.provider_types = Array.from(
        new Set([...existing.provider_types, normalized.__searchLabel])
      );
      existing.all_matched_taxonomies = Array.from(
        new Set([...existing.all_matched_taxonomies, ...normalized.all_matched_taxonomies])
      );
      existing.pediatric_signal = existing.pediatric_signal || normalized.pediatric_signal;
    }
  }

  const deduped = Array.from(byNpi.values()).map(({ __searchLabel, ...rest }) => rest);

  const pediatricCount = deduped.filter((r) => r.pediatric_signal).length;
  log(`\nTotal unique TX org NPIs (name-matched search): ${deduped.length}`);
  log(`Confirmed pediatric_signal=true on normalize: ${pediatricCount}`);

  const outDir = path.join(process.cwd(), "data");
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, "npi_tx_raw.json");
  await writeFile(outPath, JSON.stringify(deduped, null, 2));
  log(`\nWrote ${deduped.length} records to ${outPath}`);
}

main().catch((err) => {
  fs.writeSync(2, `${err.stack ?? err}\n`);
  process.exit(1);
});
