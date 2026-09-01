#!/usr/bin/env node
// Pulls TX county-level population under 18 from the Census ACS 5-Year API
// (2023 vintage), table B09001 (Population Under 18 Years by Age), variable
// B09001_001E = total under-18 population. Requires CENSUS_API_KEY in env.
//
// Usage: node scripts/fetch-census-population.mjs
// Output: data/census_population_tx.json

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { loadEnvLocal } from "./lib/load-env.mjs";

await loadEnvLocal();

const ACS_YEAR = 2023;
const TX_STATE_FIPS = "48";

async function main() {
  const apiKey = process.env.CENSUS_API_KEY;
  if (!apiKey) {
    throw new Error("Missing CENSUS_API_KEY in .env.local");
  }

  const url = new URL(`https://api.census.gov/data/${ACS_YEAR}/acs/acs5`);
  url.searchParams.set("get", "NAME,B09001_001E");
  url.searchParams.set("for", "county:*");
  url.searchParams.set("in", `state:${TX_STATE_FIPS}`);
  url.searchParams.set("key", apiKey);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Census API request failed: ${res.status} ${res.statusText}`);
  }
  const rows = await res.json();
  const [header, ...data] = rows;
  const nameIdx = header.indexOf("NAME");
  const popIdx = header.indexOf("B09001_001E");
  const stateIdx = header.indexOf("state");
  const countyIdx = header.indexOf("county");

  const counties = data.map((row) => {
    const countyFips = `${row[stateIdx]}${row[countyIdx]}`;
    return {
      county_fips: countyFips,
      county_name: row[nameIdx].replace(", Texas", ""),
      population_under_18: Number(row[popIdx]),
    };
  });

  console.log(`Fetched under-18 population for ${counties.length} TX counties`);

  const outDir = path.join(process.cwd(), "data");
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, "census_population_tx.json");
  await writeFile(outPath, JSON.stringify(counties, null, 2));
  console.log(`Wrote ${counties.length} records to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
