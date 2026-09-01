"use client";

import { useEffect, useMemo, useState } from "react";
import { VERIFIED_CLINICS, type WorkflowState } from "@/lib/verified-clinics";
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
import { REJECTED_RECORDS } from "@/lib/verified-clinics";

type PipelineFilter = "all" | DiligenceStatus;
type CenterView = "thesis" | "compare" | "passes";
type MobilePane = "markets" | "thesis" | "pipeline";
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

const STATUS_LABELS: Record<DiligenceStatus, string> = {
  target_candidate: "Target",
  verified_operator: "Verified",
  competitor_benchmark: "Benchmark",
  registry_candidate: "Registry",
};

const STATUS_CHIP: Record<DiligenceStatus, string> = {
  target_candidate: "bg-[var(--forest-soft)] text-[var(--forest-deep)]",
  verified_operator: "bg-[var(--paper-deep)] text-[var(--ink-soft)]",
  competitor_benchmark: "bg-[var(--violet-soft)] text-[var(--violet)]",
  registry_candidate: "bg-[var(--amber-soft)] text-[var(--risk)]",
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

function asVerifiedItem(
  clinic: (typeof VERIFIED_CLINICS)[number]
): Extract<DiligenceItem, { kind: "verified" }> {
  return { kind: "verified", status: clinic.classification, ...clinic };
}

export default function Workbench({ shortlist }: { shortlist: ShortlistMarket[] }) {
  const [selectedCounty, setSelectedCounty] = useState(shortlist[0]?.county_name ?? "");
  const [compareCounty, setCompareCounty] = useState<string | null>(null);
  const [pipelineFilter, setPipelineFilter] = useState<PipelineFilter>("all");
  const [centerView, setCenterView] = useState<CenterView>("thesis");
  const [mobilePane, setMobilePane] = useState<MobilePane>("thesis");
  const [showAllRejected, setShowAllRejected] = useState(false);
  const [detail, setDetail] = useState<DetailSelection | null>(null);
  const [exported, setExported] = useState(false);
  const [workflowOverrides, setWorkflowOverrides] = useState<Record<string, WorkflowState>>({});

  useEffect(() => {
    setWorkflowOverrides(loadWorkflowOverrides());
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setDetail(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const conclusion = useMemo(() => buildExecutiveConclusion(shortlist), [shortlist]);
  const selected = shortlist.find((market) => market.county_name === selectedCounty) ?? shortlist[0];
  const compare =
    compareCounty && compareCounty !== selectedCounty
      ? shortlist.find((market) => market.county_name === compareCounty)
      : null;

  const metroMarkets = shortlist.filter((market) => isMetroMarket(market));
  const countyMarkets = shortlist.filter((market) => !isMetroMarket(market));

  const diligenceQueue = useMemo(
    () => (selected ? buildDiligenceQueue([selected]) : []),
    [selected]
  );

  const filteredPipeline = useMemo(() => {
    if (pipelineFilter === "all") return diligenceQueue;
    return diligenceQueue.filter((item) => itemStatus(item) === pipelineFilter);
  }, [diligenceQueue, pipelineFilter]);

  const groupedPipeline = useMemo(() => {
    const targets = filteredPipeline.filter((item) => item.status === "target_candidate");
    const map = filteredPipeline.filter(
      (item) => item.status === "verified_operator" || item.status === "competitor_benchmark"
    );
    const registry = filteredPipeline.filter((item) => item.status === "registry_candidate");
    return { targets, map, registry };
  }, [filteredPipeline]);

  const pipelineCounts = useMemo(() => {
    const counts: Record<PipelineFilter, number> = {
      all: diligenceQueue.length,
      target_candidate: 0,
      verified_operator: 0,
      competitor_benchmark: 0,
      registry_candidate: 0,
    };
    for (const item of diligenceQueue) counts[itemStatus(item)] += 1;
    return counts;
  }, [diligenceQueue]);

  const rejected = useMemo(() => {
    if (!selected) return [];
    if (showAllRejected) return REJECTED_RECORDS;
    return rejectedForMarket(selected, { includeStatewide: isMetroMarket(selected) });
  }, [selected, showAllRejected]);

  function selectMarket(countyName: string) {
    setSelectedCounty(countyName);
    setCenterView("thesis");
    setMobilePane("thesis");
    setDetail(null);
    if (compareCounty === countyName) setCompareCounty(null);
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
    setExported(true);
    window.setTimeout(() => setExported(false), 2200);
  }

  function openClinic(clinicId: string) {
    const clinic = VERIFIED_CLINICS.find((row) => row.id === clinicId);
    if (!clinic) return;
    const home =
      shortlist.find((market) => market.verifiedClinics.some((row) => row.id === clinic.id)) ??
      selected;
    if (home) {
      setSelectedCounty(home.county_name);
      setMobilePane("pipeline");
    }
    setCenterView("thesis");
    setDetail({ kind: "verified", item: asVerifiedItem(clinic) });
  }

  if (!selected) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-[var(--ink-soft)]">
        No shortlist markets available.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-1 border-b border-[var(--line)] px-3 py-2 lg:hidden">
        {(
          [
            ["markets", "Markets"],
            ["thesis", "Thesis"],
            ["pipeline", "Clinics"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMobilePane(value)}
            className={`btn btn-ghost flex-1 ${mobilePane === value ? "is-active" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[232px_minmax(0,1fr)_360px] xl:grid-cols-[250px_minmax(0,1fr)_400px]">
        <aside
          className={`min-h-0 flex-col border-[var(--line)] bg-[var(--card)] lg:flex lg:border-r ${
            mobilePane === "markets" ? "flex" : "hidden"
          }`}
        >
          <div className="border-b border-[var(--line)] px-4 py-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              Markets
            </h2>
            <p className="mt-1 text-xs leading-5 text-[var(--ink-soft)]">
              One metro, then the county cuts.
            </p>
          </div>
          <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {metroMarkets.map((market) => (
              <MarketButton
                key={market.county_name}
                market={market}
                selected={market.county_name === selectedCounty}
                featured
                subtitle="Metro rollup"
                onSelect={selectMarket}
              />
            ))}
            <p className="mt-3 px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              County cuts
            </p>
            {countyMarkets.map((market) => (
              <MarketButton
                key={market.county_name}
                market={market}
                selected={market.county_name === selectedCounty}
                onSelect={selectMarket}
              />
            ))}
          </nav>
        </aside>

        <section
          className={`min-h-0 flex-col overflow-y-auto px-4 py-4 lg:flex lg:px-6 ${
            mobilePane === "thesis" ? "flex" : "hidden"
          }`}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["thesis", "Thesis"],
                  ["compare", "Compare"],
                  ["passes", "Pass log"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  data-testid={`view-${value}`}
                  aria-pressed={centerView === value}
                  onClick={() => setCenterView(value)}
                  className={`btn btn-ghost ${centerView === value ? "is-active" : ""}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {centerView === "thesis" ? (
                <label className="flex items-center gap-2 text-xs text-[var(--ink-soft)]">
                  vs
                  <select
                    value={compareCounty ?? ""}
                    onChange={(event) => setCompareCounty(event.target.value || null)}
                    className="rounded-md border border-[var(--line-strong)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--ink)]"
                  >
                    <option value="">None</option>
                    {shortlist
                      .filter((market) => market.county_name !== selected.county_name)
                      .map((market) => (
                        <option key={market.county_name} value={market.county_name}>
                          {countyLabel(market.county_name)}
                        </option>
                      ))}
                  </select>
                </label>
              ) : null}
              <button
                type="button"
                data-testid="export-brief"
                onClick={exportBrief}
                className="btn btn-primary"
              >
                {exported ? "Brief saved" : "Export IC brief"}
              </button>
            </div>
          </div>

          {centerView === "compare" ? (
            <CompareAllTable
              shortlist={shortlist}
              selectedName={selected.county_name}
              onSelect={selectMarket}
            />
          ) : centerView === "passes" ? (
            <PassLog
              rejected={rejected}
              showAll={showAllRejected}
              onToggleAll={() => setShowAllRejected((value) => !value)}
            />
          ) : (
            <div className={`grid gap-4 ${compare ? "xl:grid-cols-2" : ""}`}>
              <ThesisCard market={selected} />
              {compare ? <ThesisCard market={compare} muted /> : null}
            </div>
          )}

          <ol className="mt-5 flex flex-col gap-2 border-t border-[var(--line)] pt-4">
            <li className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              Call next
            </li>
            <li className="flex flex-wrap gap-2">
              {conclusion.priorities.slice(0, 5).map((priority, index) => {
                const clinic = VERIFIED_CLINICS.find((row) => row.outreachRank === index + 1);
                return (
                  <button
                    key={priority}
                    type="button"
                    data-testid={clinic ? `call-next-${clinic.id}` : undefined}
                    onClick={() => clinic && openClinic(clinic.id)}
                    className="rounded-full border border-[var(--line-strong)] bg-[var(--card)] px-3 py-1.5 text-left text-xs text-[var(--ink-soft)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
                  >
                    <span className="font-semibold text-[var(--ink)]">{index + 1}.</span>{" "}
                    {clinic?.name ?? priority}
                  </button>
                );
              })}
            </li>
          </ol>
        </section>

        <aside
          className={`min-h-0 flex-col border-[var(--line)] bg-[var(--card)] lg:flex lg:border-l ${
            mobilePane === "pipeline" ? "flex" : "hidden"
          }`}
        >
          <div className="border-b border-[var(--line)] px-4 py-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                {countyLabel(selected.county_name)} clinics
              </h2>
              <span className="text-xs text-[var(--ink-faint)]">
                {pipelineCounts.target_candidate} targets
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {(
                [
                  ["all", "All"],
                  ["target_candidate", "Targets"],
                  ["verified_operator", "Verified"],
                  ["competitor_benchmark", "Pass"],
                  ["registry_candidate", "Registry"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPipelineFilter(value)}
                  className={`btn btn-ghost !px-2 !py-1 !text-[10px] ${
                    pipelineFilter === value ? "is-active" : ""
                  }`}
                >
                  {label} {pipelineCounts[value]}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3">
            <PipelineGroup
              title="Targets"
              empty="No targets in this cut."
              items={groupedPipeline.targets}
              selectedKey={detail ? itemKey(detail.item) : null}
              clinicWorkflow={clinicWorkflow}
              setClinicWorkflow={setClinicWorkflow}
              onOpen={setDetail}
            />
            {pipelineFilter === "all" ||
            pipelineFilter === "verified_operator" ||
            pipelineFilter === "competitor_benchmark" ? (
              <PipelineGroup
                title="On the map — not the outreach list"
                empty=""
                items={groupedPipeline.map}
                selectedKey={detail ? itemKey(detail.item) : null}
                clinicWorkflow={clinicWorkflow}
                setClinicWorkflow={setClinicWorkflow}
                onOpen={setDetail}
              />
            ) : null}
            {pipelineFilter === "all" || pipelineFilter === "registry_candidate" ? (
              <PipelineGroup
                title="Registry only — not clinics"
                empty=""
                items={groupedPipeline.registry}
                selectedKey={detail ? itemKey(detail.item) : null}
                clinicWorkflow={clinicWorkflow}
                setClinicWorkflow={setClinicWorkflow}
                onOpen={setDetail}
              />
            ) : null}
          </div>
        </aside>
      </div>

      {detail ? (
        <ClinicDetail
          selection={detail}
          workflow={detail.kind === "verified" ? clinicWorkflow(detail.item) : undefined}
          onWorkflowChange={
            detail.kind === "verified"
              ? (state) => setClinicWorkflow(detail.item.id, state)
              : undefined
          }
          onClose={() => setDetail(null)}
        />
      ) : null}
    </div>
  );
}

function MarketButton({
  market,
  selected,
  featured,
  subtitle,
  onSelect,
}: {
  market: ShortlistMarket;
  selected: boolean;
  featured?: boolean;
  subtitle?: string;
  onSelect: (countyName: string) => void;
}) {
  return (
    <button
      type="button"
      data-testid={`market-${market.county_fips || market.county_name}`}
      aria-current={selected ? "true" : undefined}
      aria-label={`Select ${countyLabel(market.county_name)}`}
      onClick={() => onSelect(market.county_name)}
      className={`mb-1 w-full rounded-md px-3 py-2.5 text-left transition-colors ${
        selected
          ? "bg-[var(--forest-soft)] ring-1 ring-[var(--forest)]"
          : featured
            ? "bg-[var(--paper)] hover:bg-[var(--paper-deep)]"
            : "hover:bg-[var(--paper)]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-[var(--ink)]">
            {countyLabel(market.county_name)}
          </div>
          {(subtitle || market.metroLabel) ? (
            <div className="mt-0.5 text-[11px] text-[var(--ink-faint)]">
              {subtitle ?? market.metroLabel}
            </div>
          ) : null}
        </div>
        <span className="text-[11px] tabular-nums text-[var(--ink-faint)]">
          {market.targetCount} tgt
        </span>
      </div>
    </button>
  );
}

function ThesisCard({ market, muted }: { market: ShortlistMarket; muted?: boolean }) {
  return (
    <article className={`panel p-5 ${muted ? "opacity-95" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-faint)]">
            {isMetroMarket(market) ? "Metro thesis" : "County cut"} · {market.evidence_confidence}
          </p>
          <h2
            data-testid="thesis-title"
            className="serif mt-1 text-3xl font-semibold tracking-tight text-[var(--ink)]"
          >
            {countyLabel(market.county_name)}
          </h2>
        </div>
      </div>

      <p className="serif mt-4 text-lg leading-7 text-[var(--ink)]">{market.narrative.headline}</p>
      <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">{market.narrative.rationale}</p>

      <div className="mt-5 rounded-md bg-[var(--forest-soft)] px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--forest)]">
          Next
        </p>
        <p className="mt-1 text-sm leading-6 text-[var(--forest-deep)]">
          {market.narrative.nextAction}
        </p>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-[11px] text-[var(--ink-faint)]">Children 0–17</dt>
          <dd className="mt-1 font-semibold tabular-nums">{formatChildren(market.population_under_18)}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-[var(--ink-faint)]">Targets</dt>
          <dd className="mt-1 font-semibold tabular-nums">{market.targetCount}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-[var(--ink-faint)]">Classified</dt>
          <dd className="mt-1 font-semibold tabular-nums">{market.verifiedClinics.length}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-[var(--ink-faint)]">Registry screen</dt>
          <dd className="mt-1 font-semibold tabular-nums">
            {market.pediatric_provider_count} · {formatDensity(market.density_per_10k)}/10k
          </dd>
        </div>
      </dl>

      <div className="mt-5 border-t border-[var(--line)] pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--risk)]">
          Risk
        </p>
        <p className="mt-1 text-sm leading-6 text-[var(--ink-soft)]">{market.narrative.risk}</p>
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-xs font-medium text-[var(--ink-faint)] hover:text-[var(--ink)]">
          Screening math (not clinic facts)
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <p className="text-xs leading-5 text-[var(--ink-soft)]">
            <span className="font-semibold text-[var(--ink)]">Supply. </span>
            {supplyGapReadout(market)}
          </p>
          <p className="text-xs leading-5 text-[var(--ink-soft)]">
            <span className="font-semibold text-[var(--ink)]">Consolidation. </span>
            {consolidationReadout(market)}
          </p>
        </div>
        {isMetroMarket(market) ? (
          <p className="mt-3 text-xs leading-5 text-[var(--ink-faint)]">
            DFW is one deal market. County rows stay so you can see thick evidence (Tarrant)
            versus a thinner Dallas-city cut.
          </p>
        ) : null}
      </details>
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
    <div className="panel overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[var(--paper)] text-[10px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
          <tr>
            <th className="px-4 py-3 font-semibold">Market</th>
            <th className="px-4 py-3 font-semibold">Kind</th>
            <th className="px-4 py-3 font-semibold">Children</th>
            <th className="px-4 py-3 font-semibold">Targets</th>
            <th className="px-4 py-3 font-semibold">Classified</th>
            <th className="px-4 py-3 font-semibold">Registry</th>
            <th className="px-4 py-3 font-semibold">Next</th>
          </tr>
        </thead>
        <tbody>
          {shortlist.map((market) => (
            <tr
              key={market.county_name}
              className={`cursor-pointer border-t border-[var(--line)] ${
                market.county_name === selectedName
                  ? "bg-[var(--forest-soft)]"
                  : "hover:bg-[var(--paper)]"
              }`}
              onClick={() => onSelect(market.county_name)}
            >
              <td className="px-4 py-3 font-medium">{countyLabel(market.county_name)}</td>
              <td className="px-4 py-3 text-[var(--ink-soft)]">
                {isMetroMarket(market) ? "Metro" : "County"}
              </td>
              <td className="px-4 py-3 tabular-nums">{formatChildren(market.population_under_18)}</td>
              <td className="px-4 py-3 tabular-nums">{market.targetCount}</td>
              <td className="px-4 py-3 tabular-nums">{market.verifiedClinics.length}</td>
              <td className="px-4 py-3 tabular-nums">{market.pediatric_provider_count}</td>
              <td className="max-w-xs px-4 py-3 text-xs leading-5 text-[var(--ink-soft)]">
                {market.narrative.nextAction}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PassLog({
  rejected,
  showAll,
  onToggleAll,
}: {
  rejected: typeof REJECTED_RECORDS;
  showAll: boolean;
  onToggleAll: () => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="serif text-2xl font-semibold">Pass / not a target</h2>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            Ruled out on purpose. Honesty is the differentiator.
          </p>
        </div>
        <button type="button" onClick={onToggleAll} className="btn btn-ghost">
          {showAll ? "This market" : "All passes"}
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {rejected.map((record) => (
          <article key={record.id} className="panel p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold">{record.name}</h3>
              <span className="chip bg-[var(--paper-deep)] text-[var(--ink-soft)]">
                {record.category.replaceAll("_", " ")}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{record.reason}</p>
            <p className="mt-2 text-xs text-[var(--ink-faint)]">
              {record.market}
              {record.sourceUrl ? (
                <>
                  {" · "}
                  <a
                    href={record.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[var(--forest)] hover:text-[var(--forest-deep)]"
                  >
                    Source
                  </a>
                </>
              ) : null}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

function PipelineGroup({
  title,
  empty,
  items,
  selectedKey,
  clinicWorkflow,
  setClinicWorkflow,
  onOpen,
}: {
  title: string;
  empty: string;
  items: DiligenceItem[];
  selectedKey: string | null;
  clinicWorkflow: (item: Extract<DiligenceItem, { kind: "verified" }>) => WorkflowState;
  setClinicWorkflow: (clinicId: string, state: WorkflowState) => void;
  onOpen: (selection: DetailSelection) => void;
}) {
  if (!items.length) {
    return empty ? <p className="px-1 text-xs text-[var(--ink-faint)]">{empty}</p> : null;
  }

  return (
    <div>
      <h3 className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
        {title}
      </h3>
      <div className="space-y-2">
        {items.map((item) => {
          const selected = selectedKey === itemKey(item);
          if (item.kind === "registry") {
            return (
              <button
                key={item.npi}
                type="button"
                data-testid={`clinic-${item.npi}`}
                onClick={() => onOpen({ kind: "registry", item })}
                className={`w-full rounded-md border border-dashed border-[var(--line-strong)] bg-[var(--paper)] px-3 py-2.5 text-left ${
                  selected ? "ring-1 ring-[var(--forest)]" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className={`chip ${STATUS_CHIP.registry_candidate}`}>Registry</span>
                </div>
                <p className="mt-1 text-xs text-[var(--ink-faint)]">
                  NPI {item.npi}
                  {item.city ? ` · ${item.city}` : ""}
                </p>
              </button>
            );
          }

          return (
            <article
              key={item.id}
              className={`rounded-md border border-[var(--line)] bg-[var(--card)] ${
                selected ? "ring-1 ring-[var(--forest)]" : ""
              }`}
            >
              <button
                type="button"
                data-testid={`clinic-${item.id}`}
                onClick={() => onOpen({ kind: "verified", item })}
                className="w-full px-3 py-2.5 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {item.outreachRank ? (
                      <span className="mr-1.5 text-[11px] font-semibold text-[var(--forest)]">
                        #{item.outreachRank}
                      </span>
                    ) : null}
                    <span className="text-sm font-semibold">{item.name}</span>
                  </div>
                  <span className={`chip ${STATUS_CHIP[item.status]}`}>
                    {STATUS_LABELS[item.status]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--ink-soft)]">
                  {ownershipHeadline(item)}
                  <span className="text-[var(--ink-faint)]">
                    {" · "}
                    {item.locationCount} site{item.locationCount === 1 ? "" : "s"}
                  </span>
                </p>
              </button>
              <div className="flex items-center justify-between border-t border-[var(--line)] px-3 py-1.5">
                <label className="flex items-center gap-2 text-[11px] text-[var(--ink-faint)]">
                  Status
                  <select
                    value={clinicWorkflow(item)}
                    onChange={(event) =>
                      setClinicWorkflow(item.id, event.target.value as WorkflowState)
                    }
                    className="rounded border border-[var(--line)] bg-[var(--card)] px-1.5 py-0.5 text-[11px] text-[var(--ink)]"
                  >
                    {WORKFLOW_ORDER.map((value) => (
                      <option key={value} value={value}>
                        {WORKFLOW_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </article>
          );
        })}
      </div>
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
    <div
      className="fixed inset-0 z-40 flex justify-end bg-[rgba(28,25,21,0.28)]"
      role="dialog"
      aria-modal="true"
      data-testid="clinic-drawer"
    >
      <button type="button" className="h-full flex-1 cursor-default" onClick={onClose} aria-label="Close drawer" />
      <aside className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-[var(--line)] bg-[var(--card)] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-faint)]">
              Sourcing trail
            </p>
            <h2 className="serif mt-1 text-2xl font-semibold leading-tight">{item.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Close
          </button>
        </div>

        <div className="space-y-6 px-5 py-5 text-sm">
          {selection.kind === "registry" ? (
            <>
              <p className="leading-6 text-[var(--ink-soft)]">
                NPPES name-match only. Candidate generation, not a verified clinic.
              </p>
              <p className="text-xs text-[var(--ink-faint)]">
                NPI {selection.item.npi}
                {selection.item.city ? ` · ${selection.item.city}` : ""}
              </p>
            </>
          ) : (
            <>
              <p className="leading-6 text-[var(--ink-soft)]">{selection.item.verificationNote}</p>

              <section>
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                  1. Ownership
                </h3>
                <p className="mt-1 font-medium">{ownershipHeadline(selection.item)}</p>
                <p className="mt-1 leading-6 text-[var(--ink-soft)]">{selection.item.ownershipSignal}</p>
                <p className="mt-2 text-xs leading-5 text-[var(--ink-faint)]">{selection.item.peSignal}</p>
              </section>

              <section>
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                  2. Scale
                </h3>
                <p className="mt-1">
                  {selection.item.locationCount} location{selection.item.locationCount === 1 ? "" : "s"} ·{" "}
                  {selection.item.footprint}
                </p>
                <p className="mt-1 text-[var(--ink-soft)]">{selection.item.clinicianEstimate}</p>
                <p className="mt-1 text-xs text-[var(--ink-faint)]">
                  {selection.item.services.join(" · ")}
                </p>
              </section>

              <section>
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                  3. Official site
                </h3>
                <a
                  href={selection.item.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block break-all font-medium text-[var(--forest)] hover:text-[var(--forest-deep)]"
                >
                  {selection.item.websiteUrl}
                </a>
              </section>

              {selection.item.licenseLookups.length > 0 ? (
                <section>
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                    4. License / SOS lookups
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {selection.item.licenseLookups.map((lookup) => (
                      <li key={lookup.url}>
                        <a
                          href={lookup.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-[var(--forest)] hover:text-[var(--forest-deep)]"
                        >
                          {lookup.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-[var(--ink-faint)]">
                    Lookups, not pulled filings.
                  </p>
                </section>
              ) : null}

              <section>
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                  5. Next action
                </h3>
                <p className="mt-1 leading-6">{selection.item.nextAction}</p>
                {workflow && onWorkflowChange ? (
                  <label className="mt-3 block text-xs text-[var(--ink-faint)]">
                    Workflow
                    <select
                      value={workflow}
                      onChange={(event) => onWorkflowChange(event.target.value as WorkflowState)}
                      className="mt-1 w-full rounded-md border border-[var(--line-strong)] bg-[var(--card)] px-2 py-1.5 text-xs text-[var(--ink)]"
                    >
                      {WORKFLOW_ORDER.map((value) => (
                        <option key={value} value={value}>
                          {WORKFLOW_LABELS[value]}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </section>

              <section>
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                  Sources
                </h3>
                <ol className="mt-2 list-decimal space-y-1.5 pl-4">
                  {selection.item.sources.map((source) => (
                    <li key={source.url}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-[var(--forest)] hover:text-[var(--forest-deep)]"
                      >
                        {source.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
