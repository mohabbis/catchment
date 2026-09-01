#!/usr/bin/env node
// Joins providers -> ZIP-to-county crosswalk -> population, computes
// county_scores via lib/scoring.ts, and writes both tables to Supabase
// using the service role key (server-side only, bypasses RLS).
//
// Usage: node scripts/aggregate-county-scores.ts
// Reads: data/npi_tx_raw.json, data/zip_county_tx.json, data/census_population_tx.json
// Writes: providers, county_scores (Supabase)

import { readFile } from "node:fs/promises";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { computeCountyScores, type Provider, type CountyPopulation } from "../lib/scoring.ts";
import { loadEnvLocal } from "./lib/load-env.mjs";

type RawNpiProvider = Omit<Provider, "county_fips" | "county_name">;

function log(msg: string) {
  fs.writeSync(1, `${msg}\n`);
}

async function readJson<T>(relPath: string): Promise<T> {
  const text = await readFile(new URL(relPath, import.meta.url), "utf-8");
  return JSON.parse(text) as T;
}

async function main() {
  await loadEnvLocal();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const rawProviders = await readJson<RawNpiProvider[]>("../data/npi_tx_raw.json");
  const zipCrosswalk = await readJson<Record<string, { county_fips: string; county_name: string }>>(
    "../data/zip_county_tx.json"
  );
  const populations = await readJson<CountyPopulation[]>("../data/census_population_tx.json");

  const providers: Provider[] = rawProviders.map((r) => {
    const county = r.zip ? zipCrosswalk[r.zip] : undefined;
    return {
      npi: r.npi,
      org_name: r.org_name,
      dba_name: r.dba_name,
      address_line1: r.address_line1,
      city: r.city,
      zip: r.zip,
      county_fips: county?.county_fips ?? null,
      county_name: county?.county_name ?? null,
      all_matched_taxonomies: r.all_matched_taxonomies,
      provider_types: r.provider_types,
      pediatric_signal: r.pediatric_signal,
    };
  });

  const unmatched = providers.filter((p) => !p.county_fips);
  log(`Providers: ${providers.length} total, ${unmatched.length} with no county match (bad/missing ZIP)`);
  for (const p of unmatched) {
    log(`  ! unmatched zip="${p.zip}" org="${p.org_name}"`);
  }

  const scores = computeCountyScores(providers, populations);
  const withProviders = scores.filter((s) => s.pediatric_provider_count > 0);
  log(`County scores: ${scores.length} counties, ${withProviders.length} with >=1 pediatric provider`);

  // providers table
  const providerRows = providers.map((p) => ({
    npi: p.npi,
    org_name: p.org_name,
    dba_name: p.dba_name,
    address_line1: p.address_line1,
    city: p.city,
    state: "TX",
    zip: p.zip,
    county_fips: p.county_fips,
    county_name: p.county_name,
    taxonomies: p.all_matched_taxonomies,
    provider_type: p.provider_types.join("+"),
    pediatric_signal: p.pediatric_signal,
  }));

  const { error: providersError } = await supabase.from("providers").upsert(providerRows, { onConflict: "npi" });
  if (providersError) throw new Error(`providers upsert failed: ${providersError.message}`);
  log(`Upserted ${providerRows.length} rows into providers`);

  const countyRows = scores.map((s) => ({
    county_fips: s.county_fips,
    county_name: s.county_name,
    population_under_18: s.population_under_18,
    pediatric_provider_count: s.pediatric_provider_count,
    density_per_10k: s.density_per_10k,
    single_location_pct: s.single_location_pct,
    quadrant: s.quadrant,
    updated_at: new Date().toISOString(),
  }));

  const { error: countyError } = await supabase
    .from("county_scores")
    .upsert(countyRows, { onConflict: "county_fips" });
  if (countyError) throw new Error(`county_scores upsert failed: ${countyError.message}`);
  log(`Upserted ${countyRows.length} rows into county_scores`);

  const topTargets = withProviders
    .filter((s) => s.quadrant === "underserved_fragmented")
    .sort((a, b) => (a.density_per_10k ?? 0) - (b.density_per_10k ?? 0));
  log(`\nTop underserved_fragmented counties (${topTargets.length}):`);
  for (const t of topTargets.slice(0, 10)) {
    log(
      `  ${t.county_name}: density=${t.density_per_10k}/10k, single_location_pct=${t.single_location_pct}%, providers=${t.pediatric_provider_count}`
    );
  }
}

main().catch((err) => {
  fs.writeSync(2, `${err.stack ?? err}\n`);
  process.exit(1);
});
