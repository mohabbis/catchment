-- catchment: TX pediatric therapy market-fragmentation analysis
-- Two tables only, per project scope. Public read-only; all writes are
-- server-side via the ingestion scripts using the service role key.

create table if not exists providers (
  npi text primary key,
  org_name text not null,
  dba_name text,
  address_line1 text,
  city text,
  state text not null default 'TX',
  zip text,
  county_fips text,
  county_name text,
  taxonomies text[] not null default '{}',
  provider_type text, -- SLP | OT | PT (primary discipline matched)
  pediatric_signal boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists providers_county_fips_idx on providers (county_fips);
create index if not exists providers_pediatric_signal_idx on providers (pediatric_signal);

create table if not exists county_scores (
  county_fips text primary key,
  county_name text not null,
  population_under_18 integer,
  pediatric_provider_count integer not null default 0,
  density_per_10k numeric,
  single_location_pct numeric,
  quadrant text, -- underserved_fragmented | underserved_consolidated | saturated_fragmented | saturated_consolidated
  updated_at timestamptz not null default now()
);

alter table providers enable row level security;
alter table county_scores enable row level security;

create policy "public read providers"
  on providers for select
  to anon, authenticated
  using (true);

create policy "public read county_scores"
  on county_scores for select
  to anon, authenticated
  using (true);

-- No insert/update/delete policies for anon/authenticated: writes only
-- happen via the service role key from the ingestion scripts, which
-- bypasses RLS by design.
