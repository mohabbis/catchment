import { getSupabaseClient } from "@/lib/supabase";
import { QUADRANT_LABELS, type Quadrant } from "@/lib/scoring";
import CountyTable, { type CountyScoreRow } from "@/components/CountyTable";

export const revalidate = 3600;

async function getCountyScores(): Promise<CountyScoreRow[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("county_scores")
    .select(
      "county_fips, county_name, population_under_18, pediatric_provider_count, density_per_10k, single_location_pct, quadrant"
    )
    .order("county_name", { ascending: true });

  if (error) throw new Error(`Failed to load county_scores: ${error.message}`);
  return (data ?? []) as CountyScoreRow[];
}

export default async function Home() {
  const counties = await getCountyScores();
  const withProviders = counties.filter((c) => c.pediatric_provider_count > 0);

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <h1 className="text-2xl font-semibold tracking-tight">catchment</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            Texas counties ranked by pediatric therapy (speech, OT, PT) market opportunity —
            provider density vs. market fragmentation, from NPPES registry and Census ACS data.
          </p>
          <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">TX counties</dt>
              <dd className="font-medium">{counties.length}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">With a captured pediatric provider</dt>
              <dd className="font-medium">{withProviders.length}</dd>
            </div>
            {(Object.keys(QUADRANT_LABELS) as Quadrant[]).map((q) => (
              <div key={q}>
                <dt className="text-zinc-500 dark:text-zinc-400">{QUADRANT_LABELS[q]}</dt>
                <dd className="font-medium">
                  {withProviders.filter((c) => c.quadrant === q).length}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <CountyTable counties={counties} />
      </main>

      <footer className="border-t border-zinc-200 px-6 py-6 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
        <div className="mx-auto max-w-6xl">
          Data: NPPES NPI Registry (org-level SLP/OT/PT providers, name-matched for pediatric
          signal), Census ACS 5-Year (under-18 population), Census ZCTA-to-County Relationship
          File (ZIP crosswalk). See the methodology memo for limitations.
        </div>
      </footer>
    </div>
  );
}
