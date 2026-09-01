"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildDiligenceQueue,
  buildExecutiveConclusion,
  buildIcBrief,
  consolidationReadout,
  isMetroMarket,
  ownershipHeadline,
  rejectedForMarket,
  supplyGapReadout,
  type DiligenceItem,
  type DiligenceStatus,
  type ShortlistMarket,
} from "@/lib/workbench";
import { REJECTED_RECORDS, type WorkflowState } from "@/lib/verified-clinics";

type PipelineFilter = "all" | DiligenceStatus;
type DetailSelection =
  | { kind: "verified"; item: Extract<DiligenceItem, { kind: "verified" }> }
  | { kind: "registry"; item: Extract<DiligenceItem, { kind: "registry" }> };

const WORKFLOW_KEY = "catchment-clinic-workflow";
const WORKFLOW_ORDER: WorkflowState[] = [
  "identified",
  "verified",
  "target",
  "outreach",
  "passed",
];

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

const WORKFLOW_LABELS: Record<WorkflowState, string> = {
  identified: "Identified",
  verified: "Verified",
  target: "Target",
  outreach: "Outreach",
  passed: "Passed",
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
  return item.status;
}

function itemKey(item: DiligenceItem) {
  return item.kind === "verified" ? item.id : item.npi;
}

function loadWorkflowOverrides(): Record<string, WorkflowState> {
  try {
    const raw = window.localStorage.getItem(WORKFLOW_KEY);
    return raw ? (JSON.parse(raw) as Record<string, WorkflowState>) : {};
  } catch {
    return {};
  }
}

function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function MarketEvidenceCard({ market }: { market: ShortlistMarket }) {
  const unmatched = market.unmatchedRegistryCount;

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
          <dt className="text-xs text-slate-500">Children 0–17</dt>
          <dd className="mt-1 font-semibold tabular-nums text-slate-950">
            {formatChildren(market.population_under_18)}
          </dd>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <dt className="text-xs text-slate-500">Classified clinics</dt>
          <dd className="mt-1 font-semibold tabular-nums text-slate-950">
            {market.verifiedClinics.length}
          </dd>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <dt className="text-xs text-slate-500">Registry screen</dt>
          <dd className="mt-1 font-semibold tabular-nums text-slate-950">
            {market.pediatric_provider_count} · {formatDensity(market.density_per_10k)}/10k
          </dd>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <dt className="text-xs text-slate-500">Targets</dt>
          <dd className="mt-1 font-semibold tabular-nums text-slate-950">{market.targetCount}</dd>
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

      {isMetroMarket(market) ? (
        <p className="mt-4 text-xs leading-5 text-slate-500">
          DFW is one deal market. County rows stay so you can see where evidence is thick
          (Tarrant) versus still thinner (Dallas city proper). Registry density is a screen,
          not a clinic census.
        </p>
      ) : null}

      <p className="mt-4 text-xs text-slate-500">
        {unmatched} unmatched registry candidate{unmatched === 1 ? "" : "s"} in the pipeline —
        not verified clinics.
      </p>
    </article>
  );
}

function CompareAllTable({
  shortlist,
  selectedName,
  onSelect,
}: {
  shortlist: ShortlistMarket[];
  selectedName: string;
  onSelect: (countyName: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2 font-semibold">Market</th>
            <th className="px-3 py-2 font-semibold">Kind</th>
            <th className="px-3 py-2 font-semibold">Children</th>
            <th className="px-3 py-2 font-semibold">Classified</th>
            <th className="px-3 py-2 font-semibold">Targets</th>
            <th className="px-3 py-2 font-semibold">Registry</th>
            <th className="px-3 py-2 font-semibold">Confidence</th>
            <th className="px-3 py-2 font-semibold">Next</th>
          </tr>
        </thead>
        <tbody>
          {shortlist.map((market) => (
            <tr
              key={market.county_name}
              className={`cursor-pointer border-t border-slate-100 ${
                market.county_name === selectedName ? "bg-teal-50" : "hover:bg-slate-50"
              }`}
              onClick={() => onSelect(market.county_name)}
            >
              <td className="px-3 py-2 font-medium text-slate-950">
                {countyLabel(market.county_name)}
              </td>
              <td className="px-3 py-2 text-slate-600">
                {isMetroMarket(market) ? "Metro rollup" : "County"}
              </td>
              <td className="px-3 py-2 tabular-nums">{formatChildren(market.population_under_18)}</td>
              <td className="px-3 py-2 tabular-nums">{market.verifiedClinics.length}</td>
              <td className="px-3 py-2 tabular-nums">{market.targetCount}</td>
              <td className="px-3 py-2 tabular-nums">{market.pediatric_provider_count}</td>
              <td className="px-3 py-2">{market.evidence_confidence}</td>
              <td className="max-w-xs px-3 py-2 text-slate-600">{market.narrative.nextAction}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Workbench({ shortlist }: { shortlist: ShortlistMarket[] }) {
  const [selectedCounty, setSelectedCounty] = useState(shortlist[0]?.county_name ?? "");
  const [compareCounty, setCompareCounty] = useState<string | null>(null);
  const [pipelineFilter, setPipelineFilter] = useState<PipelineFilter>("all");
  const [marketFilter, setMarketFilter] = useState<string>(shortlist[0]?.county_name ?? "all");
  const [showCompareAll, setShowCompareAll] = useState(false);
  const [showRejected, setShowRejected] = useState(false);
  const [showAllRejected, setShowAllRejected] = useState(false);
  const [detail, setDetail] = useState<DetailSelection | null>(null);
  const [workflowOverrides, setWorkflowOverrides] = useState<Record<string, WorkflowState>>({});

  useEffect(() => {
    setWorkflowOverrides(loadWorkflowOverrides());
  }, []);

  const conclusion = useMemo(() => buildExecutiveConclusion(shortlist), [shortlist]);
  const selected = shortlist.find((market) => market.county_name === selectedCounty) ?? shortlist[0];
  const compare =
    compareCounty && compareCounty !== selectedCounty
      ? shortlist.find((market) => market.county_name === compareCounty)
      : null;

  const queueMarkets = useMemo(() => {
    if (marketFilter === "all") {
      return shortlist.filter((market) => !isMetroMarket(market));
    }
    return shortlist.filter((market) => market.county_name === marketFilter);
  }, [marketFilter, shortlist]);

  const diligenceQueue = useMemo(() => buildDiligenceQueue(queueMarkets), [queueMarkets]);

  const filteredPipeline = useMemo(() => {
    if (pipelineFilter === "all") return diligenceQueue;
    return diligenceQueue.filter((item) => itemStatus(item) === pipelineFilter);
  }, [diligenceQueue, pipelineFilter]);

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

  const rejected = useMemo(() => {
    if (!selected) return [];
    if (showAllRejected) return REJECTED_RECORDS;
    return rejectedForMarket(selected, { includeStatewide: isMetroMarket(selected) });
  }, [selected, showAllRejected]);

  function selectMarket(countyName: string) {
    setSelectedCounty(countyName);
    setMarketFilter(countyName);
    setDetail(null);
    if (compareCounty === countyName) setCompareCounty(null);
  }

  function toggleCompare(countyName: string) {
    if (compareCounty === countyName) {
      setCompareCounty(null);
      return;
    }
    if (countyName === selectedCounty) return;
    setCompareCounty(countyName);
  }

  function clinicWorkflow(item: Extract<DiligenceItem, { kind: "verified" }>): WorkflowState {
    return workflowOverrides[item.id] ?? item.defaultWorkflow;
  }

  function setClinicWorkflow(clinicId: string, state: WorkflowState) {
    const next = { ...workflowOverrides, [clinicId]: state };
    setWorkflowOverrides(next);
    window.localStorage.setItem(WORKFLOW_KEY, JSON.stringify(next));
  }

  function exportBrief() {
    if (!selected) return;
    downloadMarkdown(
      `catchment-ic-brief-${selected.county_fips || selected.county_name.toLowerCase().replace(/\s+/g, "-")}.md`,
      buildIcBrief(selected, buildDiligenceQueue([selected]), rejected)
    );
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
        <aside className="flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-950">Investment shortlist</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              DFW as one metro, then the six county cuts. Algorithm rank is a footnote.
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
                    onClick={() => selectMarket(market.county_name)}
                    className={`w-full rounded-md px-3 py-2.5 text-left transition-colors ${
                      isSelected ? "bg-teal-50 ring-1 ring-teal-200" : "hover:bg-slate-50"
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
                        {isMetroMarket(market)
                          ? "Metro"
                          : market.ma_rank
                            ? `#${market.ma_rank}`
                            : "—"}
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
                          {market.verifiedClinics.length} classified
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

        <section className="min-h-0 overflow-y-auto">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-950">
              {showCompareAll
                ? "Side-by-side markets"
                : compare
                  ? "Market comparison"
                  : "Market thesis & evidence"}
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowCompareAll((value) => !value)}
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {showCompareAll ? "Hide compare-all" : "Compare all markets"}
              </button>
              <button
                type="button"
                onClick={exportBrief}
                className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800"
              >
                Export IC brief
              </button>
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
          </div>
          {showCompareAll ? (
            <CompareAllTable
              shortlist={shortlist}
              selectedName={selected.county_name}
              onSelect={selectMarket}
            />
          ) : (
            <div className={`grid gap-4 ${compare ? "xl:grid-cols-2" : ""}`}>
              <MarketEvidenceCard market={selected} />
              {compare && <MarketEvidenceCard market={compare} />}
            </div>
          )}
        </section>

        <aside className="flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-950">Clinic pipeline</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Classified operators for the selected market. Open a card for the sourcing trail.
            </p>
          </div>

          <div className="space-y-2 border-b border-slate-200 px-3 py-3">
            <select
              value={marketFilter}
              onChange={(event) => setMarketFilter(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700"
            >
              <option value="all">All county markets</option>
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
              filteredPipeline.map((item) => {
                const status = itemStatus(item);
                const selectedCard = detail && itemKey(detail.item) === itemKey(item);
                if (item.kind === "registry") {
                  return (
                    <button
                      key={item.npi}
                      type="button"
                      onClick={() => setDetail({ kind: "registry", item })}
                      className={`w-full rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-left ${
                        selectedCard ? "ring-2 ring-teal-400" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-medium text-slate-900">{item.name}</h3>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ${STATUS_STYLES[status]}`}
                        >
                          {STATUS_LABELS[status]}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-600">
                        NPPES record only. Confirm operating clinic, services, and ownership
                        before outreach.
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        NPI {item.npi}
                        {item.city ? ` · ${item.city}` : ""}
                      </p>
                    </button>
                  );
                }

                const workflow = clinicWorkflow(item);
                return (
                  <article
                    key={item.id}
                    className={`rounded-md border border-slate-200 bg-white p-3 shadow-sm ${
                      selectedCard ? "ring-2 ring-teal-400" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setDetail({ kind: "verified", item })}
                      className="w-full text-left"
                    >
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
                          <dt className="w-16 shrink-0 text-slate-500">Owner</dt>
                          <dd className="text-slate-800">{ownershipHeadline(item)}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="w-16 shrink-0 text-slate-500">Size</dt>
                          <dd className="text-slate-800">
                            {item.locationCount} site{item.locationCount === 1 ? "" : "s"}
                            {item.clinicianEstimate ? ` · ${item.clinicianEstimate}` : ""}
                          </dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="w-16 shrink-0 text-slate-500">Footprint</dt>
                          <dd className="text-slate-800">{item.footprint}</dd>
                        </div>
                      </dl>
                    </button>
                    <label className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
                      Status
                      <select
                        value={workflow}
                        onChange={(event) =>
                          setClinicWorkflow(item.id, event.target.value as WorkflowState)
                        }
                        className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] text-slate-700"
                      >
                        {WORKFLOW_ORDER.map((value) => (
                          <option key={value} value={value}>
                            {WORKFLOW_LABELS[value]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </article>
                );
              })
            ) : (
              <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                No pipeline items match the current filters.
              </p>
            )}
          </div>
        </aside>
      </div>

      {detail ? (
        <ClinicDetail
          selection={detail}
          workflow={
            detail.kind === "verified" ? clinicWorkflow(detail.item) : undefined
          }
          onWorkflowChange={
            detail.kind === "verified"
              ? (state) => setClinicWorkflow(detail.item.id, state)
              : undefined
          }
          onClose={() => setDetail(null)}
        />
      ) : null}

      <section className="border-t border-slate-200 bg-white px-4 py-5 lg:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">Executive conclusion</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-700">{conclusion.thesis}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowRejected((value) => !value)}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {showRejected ? "Hide pass log" : "Show pass / rejected"}
          </button>
        </div>
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

      {showRejected ? (
        <section className="border-t border-slate-200 bg-slate-50 px-4 py-5 lg:px-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">Pass / not a target</h2>
              <p className="mt-1 text-xs text-slate-500">
                Ruled out on purpose. Honesty is the differentiator.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAllRejected((value) => !value)}
              className="text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              {showAllRejected ? "This market only" : "Show all passes"}
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rejected.map((record) => (
              <article key={record.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-medium text-slate-950">{record.name}</h3>
                  <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                    {record.category.replaceAll("_", " ")}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-600">{record.reason}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {record.market}
                  {record.sourceUrl ? (
                    <>
                      {" · "}
                      <a
                        href={record.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-teal-700 hover:text-teal-900"
                      >
                        Source
                      </a>
                    </>
                  ) : null}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ClinicDetail({
  selection,
  workflow,
  onWorkflowChange,
  onClose,
}: {
  selection: DetailSelection;
  workflow?: WorkflowState;
  onWorkflowChange?: (state: WorkflowState) => void;
  onClose: () => void;
}) {
  const item = selection.item;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/30" role="dialog" aria-modal="true">
      <button type="button" className="h-full flex-1 cursor-default" onClick={onClose} aria-label="Close drawer" />
      <aside className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Sourcing trail
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">{item.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="space-y-5 px-5 py-5 text-sm">
          {selection.kind === "registry" ? (
            <>
              <p className="leading-6 text-slate-700">
                NPPES name-match only. This is candidate generation, not a verified clinic.
              </p>
              <dl className="space-y-2 text-xs">
                <div>
                  <dt className="text-slate-500">NPI</dt>
                  <dd className="mt-0.5 text-slate-900">{selection.item.npi}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Market</dt>
                  <dd className="mt-0.5 text-slate-900">{selection.item.countyName}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Location</dt>
                  <dd className="mt-0.5 text-slate-900">
                    {[selection.item.city, selection.item.zip].filter(Boolean).join(" ") || "—"}
                  </dd>
                </div>
              </dl>
              <p className="text-xs text-slate-500">
                Next: confirm a live website, pediatric mix, and legal owner before any outreach.
              </p>
            </>
          ) : (
            <>
              <p className="leading-6 text-slate-700">{selection.item.verificationNote}</p>
              <dl className="grid gap-3 text-xs">
                <div>
                  <dt className="text-slate-500">Classification</dt>
                  <dd className="mt-0.5 text-slate-900">{STATUS_LABELS[selection.item.status]}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Ownership</dt>
                  <dd className="mt-0.5 text-slate-900">{ownershipHeadline(selection.item)}</dd>
                  <p className="mt-1 leading-5 text-slate-600">{selection.item.ownershipSignal}</p>
                </div>
                <div>
                  <dt className="text-slate-500">PE / sponsor signal</dt>
                  <dd className="mt-0.5 leading-5 text-slate-900">{selection.item.peSignal}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Locations</dt>
                  <dd className="mt-0.5 text-slate-900">
                    {selection.item.locationCount} · {selection.item.footprint}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Size signal</dt>
                  <dd className="mt-0.5 text-slate-900">{selection.item.clinicianEstimate}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Pediatric / disciplines</dt>
                  <dd className="mt-0.5 text-slate-900">{selection.item.services.join(" · ")}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Next action</dt>
                  <dd className="mt-0.5 leading-5 text-slate-900">{selection.item.nextAction}</dd>
                </div>
              </dl>

              {workflow && onWorkflowChange ? (
                <label className="block text-xs text-slate-500">
                  Workflow
                  <select
                    value={workflow}
                    onChange={(event) => onWorkflowChange(event.target.value as WorkflowState)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
                  >
                    {WORKFLOW_ORDER.map((value) => (
                      <option key={value} value={value}>
                        {WORKFLOW_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Official site
                </h3>
                <a
                  href={selection.item.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block break-all text-sm font-medium text-teal-700 hover:text-teal-900"
                >
                  {selection.item.websiteUrl}
                </a>
              </div>

              {selection.item.licenseLookups.length > 0 ? (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    License / SOS lookups
                  </h3>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {selection.item.licenseLookups.map((lookup) => (
                      <li key={lookup.url}>
                        <a
                          href={lookup.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-teal-700 hover:text-teal-900"
                        >
                          {lookup.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-slate-500">
                    Lookups, not pulled filings. Confirm members and licenses before IC.
                  </p>
                </div>
              ) : null}

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Sources
                </h3>
                <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-sm">
                  {selection.item.sources.map((source) => (
                    <li key={source.url}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-teal-700 hover:text-teal-900"
                      >
                        {source.label}
                      </a>
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-xs text-slate-400">
                  Website-verified {selection.item.verifiedAt}
                </p>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
