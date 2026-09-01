# Catchment

Catchment is a public-data market analysis tool for Texas pediatric therapy
expansion strategy. It combines demographic and provider-supply data to screen
counties for preliminary de novo clinic development and acquisition-sourcing
attractiveness across speech therapy, occupational therapy, and physical therapy.

This is an independent work sample. It is not commissioned by Oaklin Lane and
does not use Oaklin Lane proprietary data.

**Live:** https://catchment-oaklin.vercel.app
**Memo:** [`memo/oaklin-lane-market-memo.pdf`](memo/oaklin-lane-market-memo.pdf)

## Stack

Next.js App Router, TypeScript, React, Supabase Postgres, Vercel, public Census
data, and public NPPES/NPI data.

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
cp .env.example .env.local   # fill in Supabase + Census API keys
npm run dev                   # http://localhost:3000
```

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`: browser-safe Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: browser-safe Supabase anon key.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only ingestion key. Do not expose in
  client-side code or Vercel public builds unless a server-only workflow needs
  it.
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
