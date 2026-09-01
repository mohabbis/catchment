"use client";

import { useMemo, useState } from "react";
import { QUADRANT_LABELS, type Quadrant } from "@/lib/scoring";

export type CountyScoreRow = {
  county_fips: string;
  county_name: string;
  population_under_18: number | null;
  pediatric_provider_count: number;
  density_per_10k: number | null;
  single_location_pct: number | null;
  quadrant: Quadrant | null;
};

type SortKey =
  | "county_name"
  | "population_under_18"
  | "pediatric_provider_count"
  | "density_per_10k"
  | "single_location_pct"
  | "quadrant";

const QUADRANT_BADGE: Record<Quadrant, string> = {
  underserved_fragmented:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  underserved_consolidated:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  saturated_fragmented: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  saturated_consolidated: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

function Th({
  label,
  sortKey,
  active,
  dir,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  active: boolean;
  dir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={`cursor-pointer select-none whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 ${
        align === "right" ? "text-right" : "text-left"
      }`}
      onClick={() => onSort(sortKey)}
    >
      {label}
      {active && <span className="ml-1">{dir === "asc" ? "↑" : "↓"}</span>}
    </th>
  );
}

export default function CountyTable({ counties }: { counties: CountyScoreRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("density_per_10k");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [quadrantFilter, setQuadrantFilter] = useState<"all" | Quadrant>("all");
  const [search, setSearch] = useState("");
  const [showZeroProvider, setShowZeroProvider] = useState(false);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    let rows = counties;
    if (!showZeroProvider) rows = rows.filter((c) => c.pediatric_provider_count > 0);
    if (quadrantFilter !== "all") rows = rows.filter((c) => c.quadrant === quadrantFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((c) => c.county_name.toLowerCase().includes(q));
    }
    return rows;
  }, [counties, showZeroProvider, quadrantFilter, search]);

  const sorted = useMemo(() => {
    const dirMult = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === "string" && typeof bv === "string") {
        return av.localeCompare(bv) * dirMult;
      }
      return ((av as number) - (bv as number)) * dirMult;
    });
  }, [filtered, sortKey, sortDir]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search county…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
        />
        <select
          value={quadrantFilter}
          onChange={(e) => setQuadrantFilter(e.target.value as "all" | Quadrant)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="all">All quadrants</option>
          {(Object.keys(QUADRANT_LABELS) as Quadrant[]).map((q) => (
            <option key={q} value={q}>
              {QUADRANT_LABELS[q]}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={showZeroProvider}
            onChange={(e) => setShowZeroProvider(e.target.checked)}
            className="rounded border-zinc-300 dark:border-zinc-700"
          />
          Show counties with zero captured providers
        </label>
        <span className="ml-auto text-sm text-zinc-500 dark:text-zinc-400">
          {sorted.length} {sorted.length === 1 ? "county" : "counties"}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full border-collapse bg-white text-sm dark:bg-zinc-950">
          <thead className="border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <Th label="County" sortKey="county_name" active={sortKey === "county_name"} dir={sortDir} onSort={handleSort} />
              <Th label="Under-18 pop." sortKey="population_under_18" active={sortKey === "population_under_18"} dir={sortDir} onSort={handleSort} align="right" />
              <Th label="Providers" sortKey="pediatric_provider_count" active={sortKey === "pediatric_provider_count"} dir={sortDir} onSort={handleSort} align="right" />
              <Th label="Density /10k" sortKey="density_per_10k" active={sortKey === "density_per_10k"} dir={sortDir} onSort={handleSort} align="right" />
              <Th label="Single-location %" sortKey="single_location_pct" active={sortKey === "single_location_pct"} dir={sortDir} onSort={handleSort} align="right" />
              <Th label="Quadrant" sortKey="quadrant" active={sortKey === "quadrant"} dir={sortDir} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr
                key={c.county_fips}
                className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-900 dark:hover:bg-zinc-900/50"
              >
                <td className="whitespace-nowrap px-3 py-2 font-medium">{c.county_name}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                  {c.population_under_18?.toLocaleString() ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                  {c.pediatric_provider_count}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                  {c.density_per_10k ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                  {c.single_location_pct !== null ? `${c.single_location_pct}%` : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {c.quadrant ? (
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${QUADRANT_BADGE[c.quadrant]}`}
                    >
                      {QUADRANT_LABELS[c.quadrant]}
                    </span>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-zinc-500">
                  No counties match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
