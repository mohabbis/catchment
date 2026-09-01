"use client";

import { useMemo, useState } from "react";
import {
  buildDiligenceQueue,
  buildExecutiveConclusion,
  consolidationReadout,
  supplyGapReadout,
  type DiligenceItem,
  type DiligenceStatus,
  type ShortlistMarket,
} from "@/lib/workbench";

type PipelineFilter = "all" | DiligenceStatus;

const CONFIDENCE_STYLES: Record<ShortlistMarket["evidence_confidence"], string> = {
  "Strong directional": "bg-emerald-50 text-emerald-800 ring-emerald-200",
  Directional: "bg-sky-50 text-sky-800 ring-sky-200",
  Limited: "bg-amber-50 text-amber-900 ring-amber-200",
};

const STATUS_LABELS: Record<DiligenceStatus, string> = {
  target_candidate: "Potential target",
  verified_operator: "Verified clinic",
  competitor_benchmark: "Benchmark",
  registry_candidate: "Registry candidate",
};

const STATUS_STYLES: Record<DiligenceStatus, string> = {
  target_candidate: "bg-teal-50 text-teal-900 ring-teal-200",
  verified_operator: "bg-slate-100 text-slate-800 ring-slate-200",
  competitor_benchmark: "bg-violet-50 text-violet-900 ring-violet-200",
  registry_candidate: "bg-amber-50 text-amber-900 ring-amber-200",
};

function formatChildren(value: number | null) {
  if (value === null) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return value.toLocaleString();
}

function formatDensity(value: number | null) {
  return value === null ? "—" : value.toFixed(2).replace(/\.?0+$/, "");
}

function formatPct(value: number | null) {
  return value === null ? "—" : `${value.toFixed(0)}%`;
}

function countyLabel(name: string) {
  return name.replace(" County", "");
}

function itemStatus(item: DiligenceItem): DiligenceStatus {
  return item.kind === "verified" ? item.status : item.status;
}

function MarketEvidenceCard({ market }: { market: ShortlistMarket }) {
  const unmatched = market.registryCandidates.filter(
    (candidate) =>
      !market.verifiedClinics.some((clinic) => {
        const registryName = (candidate.dba_name || candidate.org_name).toLowerCase();
        const clinicName = clinic.name.toLowerCase();
        return registryName.includes(clinicName) || clinicName.includes(registryName);
      })
  );

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {market.metroLabel && (
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {market.metroLabel}
            </p>
          )}
          <h2 className="mt-0.5 text-xl font-semibold tracking-tight text-slate-950">
            {countyLabel(market.county_name)}
          </h2>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${CONFIDENCE_STYLES[market.evidence_confidence]}`}
        >
          {market.evidence_confidence}
        </span>
      </div>

      <p className="mt-3 text-sm font-medium leading-6 text-slate-900">{market.narrative.headline}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{market.narrative.rationale}</p>

      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div className="rounded-md bg-slate-50 p-3">
          <dt className="text-xs text-slate-500">Children</dt>
          <dd className="mt-1 font-semibold tabular-nums text-slate-950">
            {formatChildren(market.population_under_18)}
          </dd>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <dt className="text-xs text-slate-500">M&A screen rank</dt>
          <dd className="mt-1 font-semibold tabular-nums text-slate-950">
            {market.ma_rank ? `#${market.ma_rank}` : "—"}
          </dd>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <dt className="text-xs text-slate-500">Captured density</dt>
          <dd className="mt-1 font-semibold tabular-nums text-slate-950">
            {formatDensity(market.density_per_10k)} /10k
          </dd>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <dt className="text-xs text-slate-500">Fragmentation proxy</dt>
          <dd className="mt-1 font-semibold tabular-nums text-slate-950">
            {formatPct(market.single_location_pct)}
          </dd>
        </div>
      </dl>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-slate-200 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Supply gap
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">{supplyGapReadout(market)}</p>
        </div>
        <div className="rounded-md border border-slate-200 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Consolidation
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">{consolidationReadout(market)}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-amber-200 bg-amber-50/50 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-900">Risk</h3>
          <p className="mt-2 text-sm leading-6 text-amber-950">{market.narrative.risk}</p>
        </div>
        <div className="rounded-md border border-teal-200 bg-teal-50/50 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-teal-900">
            Next diligence step
          </h3>
          <p className="mt-2 text-sm leading-6 text-teal-950">{market.narrative.nextAction}</p>
        </div>
      </div>

      <details className="mt-5 rounded-md border border-slate-200">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700">
          {unmatched.length} unmatched registry candidate{unmatched.length === 1 ? "" : "s"} — not
          verified clinics
        </summary>
        <div className="border-t border-slate-200 px-4 py-3">
          {unmatched.length > 0 ? (
            <ul className="space-y-2">
              {unmatched.map((candidate) => (
                <li
                  key={candidate.npi}
                  className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm"
                >
                  <div className="font-medium text-slate-900">
                    {candidate.dba_name || candidate.org_name}
                  </div>
                  {candidate.dba_name && (
                    <div className="mt-0.5 text-xs text-slate-500">{candidate.org_name}</div>
                  )}
                  <div className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-slate-600">
                    <span>NPI {candidate.npi}</span>
                    {candidate.provider_type && (
                      <span>{candidate.provider_type.replaceAll("+", " · ")}</span>
                    )}
                    <span>
                      {[candidate.city, candidate.zip].filter(Boolean).join(" ")}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-600">
              No unmatched registry records in this market, or verification is still pending.
            </p>
          )}
        </div>
      </details>
    </article>
  );
}

function PipelineCard({ item }: { item: DiligenceItem }) {
  const status = itemStatus(item);

  if (item.kind === "registry") {
    return (
      <article className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium text-slate-900">{item.name}</h3>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ${STATUS_STYLES[status]}`}
          >
            {STATUS_LABELS[status]}
          </span>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-600">
          NPPES organization record only. Confirm operating clinic, services, and ownership before
          outreach.
        </p>
        <dl className="mt-2 space-y-1 text-xs text-slate-600">
          <div className="flex gap-2">
            <dt className="text-slate-500">NPI</dt>
            <dd>{item.npi}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-slate-500">Market</dt>
            <dd>{countyLabel(item.countyName)}</dd>
          </div>
          {item.providerType && (
            <div className="flex gap-2">
              <dt className="text-slate-500">Signal</dt>
              <dd>{item.providerType.replaceAll("+", " · ")}</dd>
            </div>
          )}
          {(item.city || item.zip) && (
            <div className="flex gap-2">
              <dt className="text-slate-500">Location</dt>
              <dd>{[item.city, item.zip].filter(Boolean).join(" ")}</dd>
            </div>
          )}
        </dl>
      </article>
    );
  }

  return (
    <article className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-slate-900">{item.name}</h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ${STATUS_STYLES[status]}`}
        >
          {STATUS_LABELS[status]}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-600">{item.verificationNote}</p>
      <dl className="mt-3 grid gap-1.5 text-xs">
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-slate-500">Footprint</dt>
          <dd className="text-slate-800">{item.footprint}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-slate-500">Services</dt>
          <dd className="text-slate-800">{item.services.join(" · ")}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-slate-500">Ownership</dt>
          <dd className="text-slate-800">{item.ownershipSignal}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-slate-500">Market</dt>
          <dd className="text-slate-800">{countyLabel(item.countyName)}</dd>
        </div>
      </dl>
      <div className="mt-3 flex flex-wrap gap-3 text-xs">
        <a
          href={item.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-teal-700 hover:text-teal-900"
        >
          Website
        </a>
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-slate-600 hover:text-slate-900"
        >
          Source
        </a>
        <span className="text-slate-400">Verified {item.verifiedAt}</span>
      </div>
    </article>
  );
}

export default function Workbench({ shortlist }: { shortlist: ShortlistMarket[] }) {
  const [selectedCounty, setSelectedCounty] = useState(shortlist[0]?.county_name ?? "");
  const [compareCounty, setCompareCounty] = useState<string | null>(null);
  const [pipelineFilter, setPipelineFilter] = useState<PipelineFilter>("all");
  const [marketFilter, setMarketFilter] = useState<string>("all");

  const conclusion = useMemo(() => buildExecutiveConclusion(shortlist), [shortlist]);
  const diligenceQueue = useMemo(() => buildDiligenceQueue(shortlist), [shortlist]);

  const selected = shortlist.find((market) => market.county_name === selectedCounty) ?? shortlist[0];
  const compare =
    compareCounty && compareCounty !== selectedCounty
      ? shortlist.find((market) => market.county_name === compareCounty)
      : null;

  const filteredPipeline = useMemo(() => {
    return diligenceQueue.filter((item) => {
      const status = itemStatus(item);
      const county = item.kind === "verified" ? item.countyName : item.countyName;
      if (marketFilter !== "all" && county !== marketFilter) return false;
      if (pipelineFilter === "all") return true;
      return status === pipelineFilter;
    });
  }, [diligenceQueue, marketFilter, pipelineFilter]);

  const pipelineCounts = useMemo(() => {
    const counts: Record<PipelineFilter, number> = {
      all: diligenceQueue.length,
      target_candidate: 0,
      verified_operator: 0,
      competitor_benchmark: 0,
      registry_candidate: 0,
    };
    for (const item of diligenceQueue) {
      counts[itemStatus(item)] += 1;
    }
    return counts;
  }, [diligenceQueue]);

  function toggleCompare(countyName: string) {
    if (compareCounty === countyName) {
      setCompareCounty(null);
      return;
    }
    if (countyName === selectedCounty) return;
    setCompareCounty(countyName);
  }

  if (!selected) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-600">
        No shortlist markets available.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[240px_minmax(0,1fr)_340px] xl:grid-cols-[260px_minmax(0,1fr)_380px]">
        {/* Left: shortlist */}
        <aside className="flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-950">Investment shortlist</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Six Texas markets ranked for acquisition sourcing. M&A screen rank shown as context.
            </p>
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto p-2">
            {shortlist.map((market) => {
              const isSelected = market.county_name === selectedCounty;
              const isComparing = market.county_name === compareCounty;
              return (
                <li key={market.county_name} className="mb-1">
                  <button
                    type="button"
                    onClick={() => setSelectedCounty(market.county_name)}
                    className={`w-full rounded-md px-3 py-2.5 text-left transition-colors ${
                      isSelected
                        ? "bg-teal-50 ring-1 ring-teal-200"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium text-slate-950">
                          {countyLabel(market.county_name)}
                        </div>
                        {market.metroLabel && (
                          <div className="mt-0.5 text-xs text-slate-500">{market.metroLabel}</div>
                        )}
                      </div>
                      <span className="text-xs tabular-nums text-slate-400">
                        {market.ma_rank ? `#${market.ma_rank}` : "—"}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-medium uppercase tracking-wide">
                      {market.targetCount > 0 && (
                        <span className="rounded bg-teal-100 px-1.5 py-0.5 text-teal-800">
                          {market.targetCount} target{market.targetCount === 1 ? "" : "s"}
                        </span>
                      )}
                      {market.verifiedClinics.length > 0 ? (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">
                          {market.verifiedClinics.length} verified
                        </span>
                      ) : (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">
                          Unverified
                        </span>
                      )}
                      {market.unmatchedRegistryCount > 0 && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">
                          {market.unmatchedRegistryCount} registry
                        </span>
                      )}
                    </div>
                  </button>
                  {market.county_name !== selectedCounty && (
                    <label className="mt-1 flex items-center gap-2 px-3 py-1 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={isComparing}
                        onChange={() => toggleCompare(market.county_name)}
                        className="size-3.5 rounded border-slate-300"
                      />
                      Compare with {countyLabel(selectedCounty)}
                    </label>
                  )}
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Center: thesis */}
        <section className="min-h-0 overflow-y-auto">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-950">
              {compare ? "Market comparison" : "Market thesis & evidence"}
            </h2>
            {compare && (
              <button
                type="button"
                onClick={() => setCompareCounty(null)}
                className="text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Clear comparison
              </button>
            )}
          </div>
          <div className={`grid gap-4 ${compare ? "xl:grid-cols-2" : ""}`}>
            <MarketEvidenceCard market={selected} />
            {compare && <MarketEvidenceCard market={compare} />}
          </div>
        </section>

        {/* Right: pipeline */}
        <aside className="flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-950">Clinic pipeline</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Verified clinics and unmatched registry candidates across the shortlist.
            </p>
          </div>

          <div className="space-y-2 border-b border-slate-200 px-3 py-3">
            <select
              value={marketFilter}
              onChange={(event) => setMarketFilter(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700"
            >
              <option value="all">All shortlist markets</option>
              {shortlist.map((market) => (
                <option key={market.county_name} value={market.county_name}>
                  {countyLabel(market.county_name)}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  ["all", "All"],
                  ["target_candidate", "Targets"],
                  ["verified_operator", "Verified"],
                  ["competitor_benchmark", "Benchmarks"],
                  ["registry_candidate", "Registry"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPipelineFilter(value)}
                  className={`rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wide ${
                    pipelineFilter === value
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {label} ({pipelineCounts[value]})
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {filteredPipeline.length > 0 ? (
              filteredPipeline.map((item) => (
                <PipelineCard
                  key={item.kind === "verified" ? item.id : item.npi}
                  item={item}
                />
              ))
            ) : (
              <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                No pipeline items match the current filters.
              </p>
            )}
          </div>
        </aside>
      </div>

      {/* Executive conclusion */}
      <section className="border-t border-slate-200 bg-white px-4 py-5 lg:px-6">
        <h2 className="text-sm font-semibold text-slate-950">Executive conclusion</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-700">{conclusion.thesis}</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Investigate next
            </h3>
            <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-sm leading-6 text-slate-700">
              {conclusion.priorities.map((priority) => (
                <li key={priority}>{priority}</li>
              ))}
            </ol>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Evidence caveats
            </h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm leading-6 text-slate-600">
              {conclusion.caveats.map((caveat) => (
                <li key={caveat}>{caveat}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
