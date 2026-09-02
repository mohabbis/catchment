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
- Workflow states, clinic detail drawer, and a one-click IC brief export
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

There is no composite score and no market ranking. Two independent measures are
computed and reported as-is:

- **Density** — captured pediatric providers per 10,000 under-18 residents.
- **Fragmentation proxy** — share of captured records whose org identity (DBA,
  falling back to legal name) appears at a single address statewide.

Neither is used to order markets, for two reasons that the current capture makes
unavoidable:

1. The NPPES name-match returns 64 organization records for all of Texas, so
   density runs 0.05–0.33 per 10k across every shortlist market — one to two
   orders of magnitude below real supply. Sorting on it ranks query recall, not
   markets: ascending density puts Tarrant first on 3 captured records and
   Harris fourth on 11.
2. The fragmentation proxy reads 100% in 10 of the 12 counties clearing the
   capture floor, because multi-site brands file their sites under separate
   legal entities. An axis with no variance cannot separate markets, so the 2x2
   quadrant abstains rather than labelling everything "fragmented".

Market order in the app is the **curated shortlist** in `lib/workbench.ts` — an
editorial call about where clinic-level verification was actually done, stated
as one. Hidalgo County has the state's second-largest capture and is
deliberately not on it.

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
