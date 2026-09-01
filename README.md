# catchment

Market-fragmentation analysis of Texas pediatric therapy (speech, OT, PT) providers,
built as a work sample for [Oaklin Lane](https://oaklinlane.com)'s application
process. Answers: which TX counties are underserved and fragmented enough to be
good acquisition or de-novo targets?

**Live:** https://catchment-oaklin.vercel.app
**Memo:** [`memo/oaklin-lane-market-memo.pdf`](memo/oaklin-lane-market-memo.pdf)

## Methodology (see the memo for the full write-up and limitations)

Pediatric SLP/OT/PT org-level providers pulled from the NPPES NPI Registry,
name-matched for a pediatric signal ("pediatric," "kids," "child," "peds" in
org name or DBA) crossed with each discipline's taxonomy — necessary because
an unfiltered taxonomy pull returns 120,000+ TX orgs dominated by home health
agencies and hospitals that list therapy as one of many services, not
pediatric clinics. Providers are mapped to counties via the Census
ZCTA-to-County Relationship File (no live geocoding) and scored against
Census ACS 5-Year under-18 population.

Each county gets two independent scores, not a blended index:
**density** (pediatric providers per 10k under-18 residents) and
**fragmentation** (% of provider locations belonging to a single-address
org statewide). Counties are plotted on a 2x2; the target quadrant is
low-density + high-fragmentation.

## Stack

Next.js (App Router) on Vercel, Supabase Postgres (`providers` +
`county_scores`, RLS public-read-only, writes via service role key from
ingestion scripts only).

## Local setup

```sh
npm install
cp .env.example .env.local   # fill in Supabase + Census API keys
npm run dev                   # http://localhost:3000
```

## Rebuilding the data

```sh
node scripts/fetch-npi-tx.mjs              # -> data/npi_tx_raw.json
node scripts/fetch-census-population.mjs   # -> data/census_population_tx.json
node scripts/build-zip-county-crosswalk.mjs # -> data/zip_county_tx.json
node scripts/aggregate-county-scores.ts    # joins + scores + writes to Supabase
```

## Non-goals

One state (TX only), no interactive map, no auth, two Supabase tables max,
no composite/weighted opportunity score. See `memo/` for why.
