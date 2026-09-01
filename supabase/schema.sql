-- catchment: TX pediatric therapy market-fragmentation analysis
-- providers + county_scores are public read-only; writes go through the
-- ingestion scripts using the service role key.
-- clinic_workspace is a demo-only public notepad (no auth). Anyone with
-- the URL can read/write. Do not store secrets or treat it as a CRM.

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

-- No insert/update/delete policies on providers / county_scores for
-- anon/authenticated: writes only happen via the service role key from
-- the ingestion scripts, which bypasses RLS by design.

create table if not exists clinic_workspace (
  clinic_id text not null,
  workspace_key text not null,
  workflow text,
  note text,
  updated_at timestamptz not null default now(),
  primary key (clinic_id, workspace_key)
);

create index if not exists clinic_workspace_key_idx on clinic_workspace (workspace_key);

alter table clinic_workspace enable row level security;

create policy "public read clinic_workspace"
  on clinic_workspace for select
  to anon, authenticated
  using (true);

create policy "public insert clinic_workspace"
  on clinic_workspace for insert
  to anon, authenticated
  with check (true);

create policy "public update clinic_workspace"
  on clinic_workspace for update
  to anon, authenticated
  using (true)
  with check (true);
