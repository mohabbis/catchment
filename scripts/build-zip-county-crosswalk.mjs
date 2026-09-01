#!/usr/bin/env node
// Builds a ZIP -> TX county lookup from the Census Bureau's ZCTA-to-County
// Relationship File (2020 vintage). Static, no-auth, no live geocoding.
//
// Substituted for HUD's USPS ZIP-County Crosswalk: HUD's file server sits
// behind bot-protection (AWS WAF) that blocks scripted downloads. This
// Census file serves the same purpose — a static public crosswalk — from
// the same source we already use for population data.
//
// A ZCTA can span multiple counties; where that happens we assign it to
// the county with the largest land-area overlap.
//
// Usage: node scripts/build-zip-county-crosswalk.mjs
// Output: data/zip_county_tx.json

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const SOURCE_URL =
  "https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt";
const TX_STATE_FIPS = "48";

async function main() {
  const res = await fetch(SOURCE_URL);
  if (!res.ok) {
    throw new Error(`Census relationship file request failed: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  const lines = text.split("\n").filter(Boolean);
  const header = lines[0].replace(/^﻿/, "").split("|");
  const zctaIdx = header.indexOf("GEOID_ZCTA5_20");
  const countyFipsIdx = header.indexOf("GEOID_COUNTY_20");
  const countyNameIdx = header.indexOf("NAMELSAD_COUNTY_20");
  const landAreaIdx = header.indexOf("AREALAND_PART");

  // zip -> { county_fips, county_name, landArea } keeping the largest overlap
  const bestByZip = new Map();

  for (const line of lines.slice(1)) {
    const cols = line.split("|");
    const zip = cols[zctaIdx];
    const countyFips = cols[countyFipsIdx];
    if (!zip || !countyFips || !countyFips.startsWith(TX_STATE_FIPS)) continue;

    const landArea = Number(cols[landAreaIdx]) || 0;
    const existing = bestByZip.get(zip);
    if (!existing || landArea > existing.landArea) {
      bestByZip.set(zip, {
        county_fips: countyFips,
        county_name: cols[countyNameIdx],
        landArea,
      });
    }
  }

  const crosswalk = Object.fromEntries(
    Array.from(bestByZip.entries()).map(([zip, { county_fips, county_name }]) => [
      zip,
      { county_fips, county_name },
    ])
  );

  const zipCount = Object.keys(crosswalk).length;
  console.log(`Built crosswalk for ${zipCount} TX ZIP codes`);

  const outDir = path.join(process.cwd(), "data");
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, "zip_county_tx.json");
  await writeFile(outPath, JSON.stringify(crosswalk, null, 2));
  console.log(`Wrote crosswalk to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
