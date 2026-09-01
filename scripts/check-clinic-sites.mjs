#!/usr/bin/env node
// Live-check verified clinic websites. Writes data/clinic-link-status.json.
// Does not rewrite ownership or invent filings.
//
// Usage: node scripts/check-clinic-sites.mjs

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const CLINICS_PATH = path.join(ROOT, "lib/verified-clinics.ts");
const OUT_PATH = path.join(ROOT, "data/clinic-link-status.json");
const TIMEOUT_MS = 12000;
const UA = "CatchmentLinkCheck/1.0 (+https://github.com/mohabbis/catchment)";

function extractClinics(source) {
  const start = source.indexOf("export const VERIFIED_CLINICS");
  const end = source.indexOf("export const REJECTED_RECORDS");
  const block = source.slice(start, end === -1 ? undefined : end);
  const ids = [...block.matchAll(/\n\s*id:\s*"([^"]+)"/g)].map((match) => match[1]);
  const urls = [...block.matchAll(/\n\s*websiteUrl:\s*"([^"]+)"/g)].map((match) => match[1]);
  if (ids.length !== urls.length) {
    throw new Error(`id/url mismatch: ${ids.length} ids vs ${urls.length} websiteUrl values`);
  }
  return ids.map((id, index) => ({ id, url: urls[index] }));
}

async function checkUrl(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,*/*" },
      signal: controller.signal,
    });
    return {
      ok: response.ok,
      status: response.status,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "request failed";
    const timedOut = message.toLowerCase().includes("abort");
    return {
      ok: false,
      status: null,
      error: timedOut ? "timeout" : message,
    };
  } finally {
    clearTimeout(timer);
  }
}

const source = await readFile(CLINICS_PATH, "utf8");
const clinics = extractClinics(source);
const checkedOn = new Date().toISOString().slice(0, 10);
const sites = {};

for (const clinic of clinics) {
  const result = await checkUrl(clinic.url);
  sites[clinic.id] = {
    ok: result.ok,
    status: result.status,
    checkedOn,
    url: clinic.url,
    ...(result.error ? { error: result.error } : {}),
  };
  const mark = result.ok ? "ok" : "FAIL";
  console.log(`${mark.padEnd(4)} ${clinic.id} ${result.status ?? result.error} ${clinic.url}`);
}

await writeFile(
  OUT_PATH,
  `${JSON.stringify({ checkedOn, sites }, null, 2)}\n`,
  "utf8"
);
console.log(`Wrote ${OUT_PATH} (${clinics.length} clinics, ${checkedOn})`);
