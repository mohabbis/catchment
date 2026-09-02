"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CatchmentMap from "@/components/CatchmentMap";
import IcBriefPrint from "@/components/IcBriefPrint";
import MethodPanel from "@/components/MethodPanel";
import { linkStatusHeadline } from "@/lib/clinic-links";
import {
  CHECK_STATE_LABELS,
  clinicChecks,
  clinicCompleteness,
  marketCoverage,
  ownershipConfidence,
  type CheckState,
} from "@/lib/coverage";
import type { ScreenStats } from "@/lib/methodology";
import {
  LICENSE_STATUS_LABELS,
  REJECTED_RECORDS,
  SOS_STATUS_LABELS,
  VERIFIED_CLINICS,
  type WorkflowState,
} from "@/lib/verified-clinics";
import {
  hydrateWorkspace,
  notesFromWorkspace,
  persistWorkspaceEntry,
  writeLocalWorkspace,
  type WorkspaceEntry,
  type WorkspaceMap,
} from "@/lib/workspace";
import {
  buildDiligenceQueue,
  buildExecutiveConclusion,
  buildIcBrief,
  consolidationReadout,
  isMetroMarket,
  licenseCheckLine,
  ownershipHeadline,
  rejectedForMarket,
  sosCheckLine,
  supplyGapReadout,
  type DiligenceItem,
  type DiligenceStatus,
  type FocusRequest,
  type ShortlistMarket,
} from "@/lib/workbench";

type PipelineFilter = "all" | DiligenceStatus;
type CenterView = "thesis" | "compare" | "passes" | "map" | "method";
type MobilePane = "markets" | "thesis" | "pipeline";
type DetailSelection =
  | { kind: "verified"; item: Extract<DiligenceItem, { kind: "verified" }> }
  | { kind: "registry"; item: Extract<DiligenceItem, { kind: "registry" }> };

const WORKFLOW_ORDER: WorkflowState[] = [
  "identified",
  "verified",
  "target",
  "outreach",
  "passed",
];

// "Preliminary" is load-bearing: ownership, entity status, and independence are
// open on most of these names, and "Target" reads like an approved one.
const STATUS_LABELS: Record<DiligenceStatus, string> = {
  target_candidate: "Prelim. target",
  verified_operator: "Verified",
  competitor_benchmark: "Benchmark",
  registry_candidate: "Registry",
};

const CHECK_STATE_CHIP: Record<CheckState, string> = {
  done: "bg-[var(--forest-soft)] text-[var(--forest-deep)]",
  partial: "bg-[var(--paper-deep)] text-[var(--ink-soft)]",
  open: "bg-[var(--amber-soft)] text-[var(--risk)]",
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

function countyLabel(name: string) {
  return name.replace(" County", "");
}

function itemStatus(item: DiligenceItem): DiligenceStatus {
  return item.status;
}

function itemKey(item: DiligenceItem) {
  return item.kind === "verified" ? item.id : item.npi;
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

export default function Workbench({
  shortlist,
  screenStats,
  focusRequest = null,
}: {
  shortlist: ShortlistMarket[];
  screenStats: ScreenStats;
  focusRequest?: FocusRequest | null;
}) {
  const [selectedCounty, setSelectedCounty] = useState(shortlist[0]?.county_name ?? "");
  const [compareCounty, setCompareCounty] = useState<string | null>(null);
  const [pipelineFilter, setPipelineFilter] = useState<PipelineFilter>("target_candidate");
  const [centerView, setCenterView] = useState<CenterView>("thesis");
  const [mobilePane, setMobilePane] = useState<MobilePane>("thesis");
  const [showAllRejected, setShowAllRejected] = useState(false);
  const [showMoreLists, setShowMoreLists] = useState(false);
  const [detail, setDetail] = useState<DetailSelection | null>(null);
  const [exported, setExported] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspaceMap>({});
  const persistTimers = useRef<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    hydrateWorkspace().then((map) => {
      if (!cancelled) setWorkspace(map);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Adjusting state during render rather than in an effect: this reacts to a new
  // request from the parent, and an effect here would render the stale market first.
  const [appliedFocus, setAppliedFocus] = useState(focusRequest);
  if (focusRequest !== appliedFocus) {
    setAppliedFocus(focusRequest);
    if (focusRequest) {
      setSelectedCounty(focusRequest.market);
      setCenterView("thesis");
      setMobilePane("thesis");
      setDetail(null);
    }
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (printOpen) {
        setPrintOpen(false);
        return;
      }
      setDetail(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [printOpen]);

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
    return workspace[item.id]?.workflow ?? item.defaultWorkflow;
  }

  function clinicNote(clinicId: string): string {
    return workspace[clinicId]?.note ?? "";
  }

  function patchWorkspace(clinicId: string, patch: Partial<WorkspaceEntry>) {
    const nextEntry: WorkspaceEntry = {
      note: workspace[clinicId]?.note ?? "",
      workflow: workspace[clinicId]?.workflow,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    const next = { ...workspace, [clinicId]: nextEntry };
    setWorkspace(next);
    writeLocalWorkspace(next);
    window.clearTimeout(persistTimers.current[clinicId]);
    persistTimers.current[clinicId] = window.setTimeout(() => {
      void persistWorkspaceEntry(clinicId, nextEntry);
    }, 400);
  }

  function setClinicWorkflow(clinicId: string, state: WorkflowState) {
    patchWorkspace(clinicId, { workflow: state });
  }

  function briefNotes() {
    return notesFromWorkspace(workspace);
  }

  function exportBrief() {
    if (!selected) return;
    downloadMarkdown(
      `catchment-ic-brief-${selected.county_fips || selected.county_name.toLowerCase().replace(/\s+/g, "-")}.md`,
      buildIcBrief(selected, buildDiligenceQueue([selected]), rejected, briefNotes())
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

  const nextStep = detail
    ? "This panel is the clinic file. Status and notes are at the bottom."
    : `Open a clinic profile on the right. ${
        conclusion.priorities[0]
          ? `Suggested first call: ${
              VERIFIED_CLINICS.find((row) => row.outreachRank === 1)?.name ?? "the top-ranked candidate"
            }.`
          : "Preliminary targets are the qualifying-call list."
      }`;

  return (
    <>
    <div className="workbench-chrome flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-1 border-b border-[var(--line)] px-3 py-2 lg:hidden">
        {(
          [
            ["markets", "1. Market"],
            ["thesis", "2. Case"],
            ["pipeline", "3. Clinics"],
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

      <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[240px_minmax(0,1fr)_380px] xl:grid-cols-[260px_minmax(0,1fr)_400px]">
        <aside
          className={`min-h-0 flex-col border-[var(--line)] bg-[var(--card)] lg:flex lg:border-r ${
            mobilePane === "markets" ? "flex" : "hidden"
          }`}
        >
          <div className="border-b border-[var(--line)] px-4 py-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              1. Market
            </h2>
            <p className="mt-1 text-xs leading-5 text-[var(--ink-soft)]">
              Start with a metro. Counties below are slices of the same place.
            </p>
          </div>
          <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {metroMarkets.map((market) => (
              <MarketButton
                key={market.county_name}
                market={market}
                selected={market.county_name === selectedCounty}
                featured
                subtitle={market.metroLabel ?? "Deal market"}
                onSelect={selectMarket}
              />
            ))}
            <p className="mt-3 px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              County slices
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
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                2. Case
              </h2>
              <p className="mt-1 max-w-xl text-xs leading-5 text-[var(--ink-soft)]">{nextStep}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="export-brief"
                onClick={exportBrief}
                className="btn btn-primary"
              >
                {exported ? "Brief saved" : "Save brief"}
              </button>
              <button
                type="button"
                data-testid="print-brief"
                onClick={() => setPrintOpen(true)}
                className="btn btn-ghost"
              >
                Print
              </button>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            {(
              [
                ["thesis", "Overview"],
                ["compare", "Compare"],
                ["passes", "Passed"],
                ["map", "Map"],
                ["method", "Method"],
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
            {centerView === "thesis" ? (
              <label className="ml-auto flex items-center gap-2 text-xs text-[var(--ink-soft)]">
                Compare with
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
          ) : centerView === "method" ? (
            <MethodPanel stats={screenStats} />
          ) : centerView === "map" ? (
            <CatchmentMap
              selectedClinicId={detail?.kind === "verified" ? detail.item.id : null}
              onOpenClinic={openClinic}
            />
          ) : (
            <div className={`grid gap-4 ${compare ? "xl:grid-cols-2" : ""}`}>
              <ThesisCard market={selected} />
              {compare ? <ThesisCard market={compare} muted /> : null}
            </div>
          )}

          {centerView === "thesis" ? (
            <div className="mt-5 border-t border-[var(--line)] pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                Suggested first five qualifying calls
              </p>
              <div className="mt-2 flex flex-col gap-2">
                {conclusion.priorities.slice(0, 5).map((priority, index) => {
                  const clinic = VERIFIED_CLINICS.find((row) => row.outreachRank === index + 1);
                  return (
                    <button
                      key={priority}
                      type="button"
                      data-testid={clinic ? `call-next-${clinic.id}` : undefined}
                      onClick={() => clinic && openClinic(clinic.id)}
                      className="flex items-start justify-between gap-3 rounded-md border border-[var(--line)] bg-[var(--card)] px-3 py-2.5 text-left text-sm hover:border-[var(--ink)]"
                    >
                      <span>
                        <span className="font-semibold text-[var(--forest)]">{index + 1}. </span>
                        <span className="font-semibold">{clinic?.name ?? priority}</span>
                        {clinic?.ownerName ? (
                          <span className="text-[var(--ink-soft)]"> — {clinic.ownerName}</span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-xs text-[var(--ink-faint)]">Open</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>

        <aside
          className={`min-h-0 flex-col border-[var(--line)] bg-[var(--card)] lg:flex lg:border-l ${
            mobilePane === "pipeline" ? "flex" : "hidden"
          }`}
        >
          <div className="border-b border-[var(--line)] px-4 py-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              3. Clinics
            </h2>
            <p className="mt-1 text-xs leading-5 text-[var(--ink-soft)]">
              {countyLabel(selected.county_name)} · {pipelineCounts.target_candidate} preliminary
              outreach candidate{pipelineCounts.target_candidate === 1 ? "" : "s"}. Open a name for
              the file.
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setPipelineFilter("target_candidate")}
                className={`btn btn-ghost !px-2 !py-1 !text-[10px] ${
                  pipelineFilter === "target_candidate" ? "is-active" : ""
                }`}
              >
                Prelim. targets {pipelineCounts.target_candidate}
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = !showMoreLists;
                  setShowMoreLists(next);
                  if (!next) setPipelineFilter("target_candidate");
                }}
                className={`btn btn-ghost !px-2 !py-1 !text-[10px] ${showMoreLists ? "is-active" : ""}`}
              >
                More lists
              </button>
            </div>
            {showMoreLists ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {(
                  [
                    ["all", "Everything"],
                    ["verified_operator", "On the map"],
                    ["competitor_benchmark", "Passed"],
                    ["registry_candidate", "Unverified names"],
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
            ) : null}
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3">
            {pipelineFilter === "all" || pipelineFilter === "target_candidate" ? (
              <PipelineGroup
                title="Preliminary targets — qualifying calls"
                empty="No preliminary targets in this market."
                items={groupedPipeline.targets}
                selectedKey={detail ? itemKey(detail.item) : null}
                onOpen={setDetail}
              />
            ) : null}
            {pipelineFilter === "all" ||
            pipelineFilter === "verified_operator" ||
            pipelineFilter === "competitor_benchmark" ? (
              <PipelineGroup
                title="On the map — not the call list"
                empty=""
                items={groupedPipeline.map}
                selectedKey={detail ? itemKey(detail.item) : null}
                onOpen={setDetail}
              />
            ) : null}
            {pipelineFilter === "all" || pipelineFilter === "registry_candidate" ? (
              <PipelineGroup
                title="Unverified registry names"
                empty=""
                items={groupedPipeline.registry}
                selectedKey={detail ? itemKey(detail.item) : null}
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
          note={detail.kind === "verified" ? clinicNote(detail.item.id) : ""}
          onWorkflowChange={
            detail.kind === "verified"
              ? (state) => setClinicWorkflow(detail.item.id, state)
              : undefined
          }
          onNoteChange={
            detail.kind === "verified"
              ? (value) => patchWorkspace(detail.item.id, { note: value })
              : undefined
          }
          onClose={() => setDetail(null)}
        />
      ) : null}

    </div>
      {printOpen ? (
        <IcBriefPrint
          selected={selected}
          queue={diligenceQueue}
          rejected={rejected}
          notes={briefNotes()}
          onClose={() => setPrintOpen(false)}
        />
      ) : null}
    </>
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
  const coverage = marketCoverage(market);
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
          {subtitle ? (
            <div className="mt-0.5 text-[11px] leading-4 text-[var(--ink-faint)]">{subtitle}</div>
          ) : null}
        </div>
        <span className="shrink-0 text-right text-[11px] leading-4 text-[var(--ink-faint)]">
          <span className="tabular-nums">{market.targetCount}</span> prelim.
          <br />
          <span className="text-[10px]">{coverage.label} coverage</span>
        </span>
      </div>
    </button>
  );
}

function ThesisCard({ market, muted }: { market: ShortlistMarket; muted?: boolean }) {
  const coverage = marketCoverage(market);
  return (
    <article className={`panel p-5 ${muted ? "opacity-95" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-faint)]">
            {isMetroMarket(market) ? "Deal market" : "County slice"}
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
          What to do next
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
          <dt className="text-[11px] text-[var(--ink-faint)]">Preliminary targets</dt>
          <dd className="mt-1 font-semibold tabular-nums">{market.targetCount}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-[var(--ink-faint)]">Clinics classified</dt>
          <dd className="mt-1 font-semibold tabular-nums">{market.verifiedClinics.length}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-[var(--ink-faint)]">Research coverage</dt>
          <dd className="mt-1 font-semibold tabular-nums" data-testid="market-coverage">
            {coverage.label}
            <span className="ml-1 text-xs font-normal text-[var(--ink-faint)]">
              {coverage.clinicsClassified ? `${coverage.pct}%` : ""}
            </span>
          </dd>
        </div>
      </dl>

      <p className="mt-2 text-[11px] leading-4 text-[var(--ink-faint)]">
        Coverage is how much of the standing check-list is done here ({coverage.ownersNamed} of{" "}
        {coverage.clinicsClassified} clinics with a named owner, {coverage.filingsPulled} with an SOS
        filing pulled). It measures research effort, not market quality — a longer candidate list can
        just mean more hours went in.
      </p>

      <dl
        className="mt-4 grid grid-cols-2 gap-3 rounded-md bg-[var(--paper)] px-4 py-3 text-sm sm:grid-cols-3"
        data-testid="screen-values"
      >
        <div>
          <dt className="text-[11px] text-[var(--ink-faint)]">Captured records</dt>
          <dd className="mt-1 font-semibold tabular-nums">{market.pediatric_provider_count}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-[var(--ink-faint)]">Density / 10k children</dt>
          <dd className="mt-1 font-semibold tabular-nums">{market.density_per_10k ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-[var(--ink-faint)]">Single-location share</dt>
          <dd className="mt-1 font-semibold tabular-nums">
            {market.single_location_pct === null ? "n/a" : `${market.single_location_pct}%`}
          </dd>
        </div>
        <p className="col-span-2 text-[11px] leading-4 text-[var(--ink-faint)] sm:col-span-3">
          Screening values, shown so they can be checked. They are not used to rank markets — open
          Method for the query, the denominator, the deduplication rule (there is none), and why the
          fragmentation axis abstains.
        </p>
      </dl>

      <div className="mt-5 border-t border-[var(--line)] pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--risk)]">
          Risk
        </p>
        <p className="mt-1 text-sm leading-6 text-[var(--ink-soft)]">{market.narrative.risk}</p>
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-xs font-medium text-[var(--ink-faint)] hover:text-[var(--ink)]">
          How these screening values were computed
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
            DFW, Houston, and Austin are deal markets. County rows stay so you can see thick
            evidence versus a thinner city cut. Fort Bend, Montgomery, Williamson, and Hays add
            children to the metro totals but are not shortlist rows.
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
    <div className="panel">
      <div className="border-b border-[var(--line)] px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--risk)]">
          Read this table carefully
        </p>
        <p className="mt-1 text-xs leading-5 text-[var(--ink-soft)]">
          Preliminary targets, classified clinics, and registry names all partly reflect how much
          research each market received — not how attractive it is. The coverage column is there so
          research depth cannot be mistaken for market quality. Markets are not ranked here; row
          order is the curated shortlist.
        </p>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[60rem] text-left align-top text-sm">
        <thead className="bg-[var(--paper)] text-[10px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
          <tr>
            <th className="px-4 py-3 font-semibold">Market</th>
            <th className="px-4 py-3 font-semibold">Kind</th>
            <th className="px-4 py-3 font-semibold">Children</th>
            <th className="px-4 py-3 font-semibold">Density /10k</th>
            <th className="px-4 py-3 font-semibold">Prelim. targets</th>
            <th className="px-4 py-3 font-semibold">Classified</th>
            <th className="px-4 py-3 font-semibold">Registry</th>
            <th className="whitespace-nowrap px-4 py-3 font-semibold">Research coverage</th>
            <th className="w-[22rem] px-4 py-3 font-semibold">Next (full text on Overview)</th>
          </tr>
        </thead>
        <tbody>
          {shortlist.map((market) => {
            const coverage = marketCoverage(market);
            return (
            <tr
              key={market.county_name}
              className={`cursor-pointer border-t border-[var(--line)] ${
                market.county_name === selectedName
                  ? "bg-[var(--forest-soft)]"
                  : "hover:bg-[var(--paper)]"
              }`}
              onClick={() => onSelect(market.county_name)}
            >
              <td className="px-4 py-3 align-top font-medium">{countyLabel(market.county_name)}</td>
              <td className="px-4 py-3 align-top text-[var(--ink-soft)]">
                {isMetroMarket(market) ? "Metro" : "County"}
              </td>
              <td className="px-4 py-3 align-top tabular-nums">
                {formatChildren(market.population_under_18)}
              </td>
              <td className="px-4 py-3 align-top tabular-nums text-[var(--ink-soft)]">
                {market.density_per_10k ?? "—"}
              </td>
              <td className="px-4 py-3 align-top tabular-nums">{market.targetCount}</td>
              <td className="px-4 py-3 align-top tabular-nums">{market.verifiedClinics.length}</td>
              <td className="px-4 py-3 align-top tabular-nums">
                {market.pediatric_provider_count}
              </td>
              <td className="whitespace-nowrap px-4 py-3 align-top text-xs">
                <span className="font-medium">{coverage.label}</span>
                {coverage.clinicsClassified ? (
                  <span className="text-[var(--ink-faint)]"> · {coverage.pct}%</span>
                ) : null}
              </td>
              <td className="px-4 py-3 align-top text-xs leading-5 text-[var(--ink-soft)]">
                {/* Clamped: the full text is on the market's Overview card, and an
                    unbounded cell here stretches every row to the height of its
                    longest next-action. */}
                <span className="line-clamp-3">{market.narrative.nextAction}</span>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
      </div>
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
          <h2 className="serif text-2xl font-semibold">Passed — not a target</h2>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            These names were reviewed and set aside so they do not re-enter the call list.
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
  onOpen,
}: {
  title: string;
  empty: string;
  items: DiligenceItem[];
  selectedKey: string | null;
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
  note,
  onWorkflowChange,
  onNoteChange,
  onClose,
}: {
  selection: DetailSelection;
  workflow?: WorkflowState;
  note?: string;
  onWorkflowChange?: (state: WorkflowState) => void;
  onNoteChange?: (note: string) => void;
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
              Clinic file
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
                {(() => {
                  const confidence = ownershipConfidence(selection.item);
                  return (
                    <p className="mt-1.5 text-xs leading-5" data-testid="ownership-confidence">
                      <span
                        className={`chip ${
                          confidence.level === "filing"
                            ? CHECK_STATE_CHIP.done
                            : confidence.level === "none"
                              ? CHECK_STATE_CHIP.open
                              : CHECK_STATE_CHIP.partial
                        }`}
                      >
                        {confidence.label}
                      </span>{" "}
                      <span className="text-[var(--ink-faint)]">{confidence.basis}</span>
                    </p>
                  );
                })()}
                <p className="mt-2 leading-6 text-[var(--ink-soft)]">{selection.item.ownershipSignal}</p>
                <p className="mt-2 text-xs leading-5 text-[var(--ink-faint)]" data-testid="sos-check">
                  {sosCheckLine(selection.item.sosCheck)}. {selection.item.sosCheck.note}
                </p>
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
                {linkStatusHeadline(selection.item.id) ? (
                  <p className="mt-2 text-xs text-[var(--ink-faint)]" data-testid="site-live-check">
                    {linkStatusHeadline(selection.item.id)}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-[var(--ink-faint)]">
                    Live-check not run yet. Use scripts/check-clinic-sites.mjs.
                  </p>
                )}
              </section>

              <section data-testid="license-checks">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                  4. License / SOS
                </h3>
                {selection.item.licenseChecks.length ? (
                  <ul className="mt-2 space-y-2">
                    {selection.item.licenseChecks.map((check) => (
                      <li key={`${selection.item.id}-${check.board}`}>
                        <p className="font-medium">
                          {check.board}: {LICENSE_STATUS_LABELS[check.status]}
                        </p>
                        <p className="mt-0.5 text-xs leading-5 text-[var(--ink-faint)]">
                          {licenseCheckLine(check)}. {check.note}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs leading-5 text-[var(--ink-faint)]">
                    No board row in this pass. {SOS_STATUS_LABELS[selection.item.sosCheck.status]}.
                  </p>
                )}
                {selection.item.licenseLookups.length > 0 ? (
                  <>
                    <ul className="mt-3 space-y-1.5">
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
                      Lookup links stay so the next person can re-check. Rows above are the recorded
                      pass — not invented numbers.
                    </p>
                  </>
                ) : null}
              </section>

              <section data-testid="research-completeness">
                {(() => {
                  const checks = clinicChecks(selection.item);
                  const completeness = clinicCompleteness(selection.item);
                  return (
                    <>
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                          5. Research completeness
                        </h3>
                        <span className="text-xs tabular-nums text-[var(--ink-faint)]">
                          {completeness.pct}% · {completeness.open} open
                        </span>
                      </div>
                      <ul className="mt-2 space-y-2">
                        {checks.map((check) => (
                          <li key={check.label}>
                            <p className="flex items-center gap-2">
                              <span className={`chip ${CHECK_STATE_CHIP[check.state]}`}>
                                {CHECK_STATE_LABELS[check.state]}
                              </span>
                              <span className="font-medium">{check.label}</span>
                              {check.checkedOn ? (
                                <span className="ml-auto text-[11px] tabular-nums text-[var(--ink-faint)]">
                                  {check.checkedOn}
                                </span>
                              ) : null}
                            </p>
                            <p className="mt-0.5 text-xs leading-5 text-[var(--ink-faint)]">
                              {check.detail}
                            </p>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-3 text-xs leading-5 text-[var(--ink-faint)]">
                        Open rows are work that has not been done, not findings. Nothing here is a
                        clearance.
                      </p>
                    </>
                  );
                })()}
              </section>

              <section>
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                  6. Next action
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
                {onNoteChange ? (
                  <label className="mt-3 block text-xs text-[var(--ink-faint)]">
                    Workspace note
                    <textarea
                      data-testid="clinic-note"
                      value={note ?? ""}
                      onChange={(event) => onNoteChange(event.target.value)}
                      rows={4}
                      placeholder="Call notes stay on this laptop. Not a CRM."
                      className="mt-1 w-full rounded-md border border-[var(--line-strong)] bg-[var(--card)] px-2 py-1.5 text-xs leading-5 text-[var(--ink)]"
                    />
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
