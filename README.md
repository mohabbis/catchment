# Catchment

Catchment is a deal-origination workbench for Texas pediatric therapy (SLP / OT /
PT). It answers three questions: which markets deserve attention, which real
clinics operate there, and what evidence supports that.

This is an independent work sample. It is not commissioned by Oaklin Lane and
does not use Oaklin Lane proprietary data.

**Live:** https://catchment-oaklin.vercel.app
**Memo:** [`memo/oaklin-lane-market-memo.pdf`](memo/oaklin-lane-market-memo.pdf)

The app is an IC workbench, not a county dashboard:

- Ranked shortlist with **DFW as one metro** (Dallas + Tarrant + Collin), then
  the six county cuts
- Website-verified clinics with ownership, size signals, license/SOS lookup
  links, and a sourcing trail
- Pass / not-a-target log (Cole, NAPA, Oaklin Lane’s own clinics, closed sites)
- An interactive screening 2×2 (captured density vs single-location share) that
  plots every Texas county with a captured provider and shows its own sample-size
  limits rather than hiding them
- An Acquire / Build lens that re-ranks the shortlist against the two different
  questions, surfacing the M&A and de-novo screen ranks
- Workflow states, clinic detail drawer, and a one-click IC brief export
- First-run walkthrough plus an in-app guide and glossary
- Census + NPPES used as **screening only** — never as a clinic census

## Stack

Next.js App Router, TypeScript, React, Supabase Postgres (optional), Vercel,
public Census data, and public NPPES/NPI data. If Supabase env is missing, the
app boots from the checked-in extract in `data/`.

## Data Sources

- NPPES / NPI Registry: provider and organization records used as a proxy for
  local therapy-provider supply.
- U.S. Census ACS 5-Year: county under-18 population.
- Census ZCTA-to-County Relationship File: ZIP-to-county mapping for provider
  locations.

## Methodology

Pediatric SLP/OT/PT organization-level providers are pulled from the NPPES NPI
Registry, name-matched for pediatric signals such as "pediatric", "kids",
"child", and "peds" in organization names or DBA names, then crossed with
therapy taxonomy matches. Providers are mapped to counties through ZIP codes and
the Census ZCTA-to-County Relationship File, then normalized against Census ACS
under-18 population.

The app presents separate screening scores:

- De novo opportunity: emphasizes larger child population and lower captured
  provider density.
- M&A opportunity: emphasizes captured provider count, market scale, and a
  single-location organization proxy for fragmentation.

Scores are directional indexes for initial market screening, not investment
recommendations.

## Local setup

```sh
npm install
npm run dev                   # http://localhost:3000 — works without Supabase
cp .env.example .env.local    # optional: fill in Supabase + Census API keys
```

Optional environment variables (Supabase is the live registry source when set):

- `NEXT_PUBLIC_SUPABASE_URL`: browser-safe Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: browser-safe Supabase anon key.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only ingestion key. Do not expose in
  client-side code or Vercel public builds unless a server-only workflow needs
  it.

Clinic workflow states and notes are never sent anywhere — they live in the
browser's localStorage only.
- `CENSUS_API_KEY`: optional Census API key used by data-fetch scripts.

## Rebuilding the data

```sh
node scripts/fetch-npi-tx.mjs              # -> data/npi_tx_raw.json
node scripts/fetch-census-population.mjs   # -> data/census_population_tx.json
node scripts/build-zip-county-crosswalk.mjs # -> data/zip_county_tx.json
node scripts/aggregate-county-scores.ts    # joins + scores + writes to Supabase
```

## Security

Supabase Row Level Security is enabled. Anonymous and authenticated users may
`SELECT` public screening tables. They should not be able to insert, update, or
delete provider or score records. Data ingestion uses the service-role key from
local/server-side scripts only.

## Deployment

The production Vercel project needs these public variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Then deploy with:

```sh
npx vercel --prod
```

## Limitations

- NPPES is not a definitive competitor database.
- Provider practice locations may be stale or duplicated.
- Provider records may include individual practitioners, hospital-employed
  clinicians, or non-pediatric organizations.
- Pediatric specialization is inferred from public registry text and taxonomy
  matches, not verified clinic-level diligence.
- County analysis is a market-screening layer; real site selection requires
  ZIP, neighborhood, referral-source, payer, labor, and real-estate analysis.
