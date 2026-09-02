"use client";

import { useMemo, useState } from "react";
import {
  QUADRANT_LABELS,
  QUADRANT_READS,
  fragmentationIsTrivial,
  quadrantThresholds,
  scoredCounties,
} from "@/lib/scoring";
import type { CountyScoreRow, StrategyMode } from "@/lib/workbench";

const WIDTH = 720;
const HEIGHT = 460;
const PAD = { top: 34, right: 22, bottom: 52, left: 58 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

function niceMax(value: number) {
  return Math.ceil(value * 10) / 10;
}

function countyLabel(name: string) {
  return name.replace(" County", "");
}

export default function QuadrantChart({
  counties,
  shortlistNames,
  selectedName,
  strategy,
  onSelect,
}: {
  counties: CountyScoreRow[];
  shortlistNames: string[];
  selectedName: string;
  strategy: StrategyMode;
  onSelect: (countyName: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const points = useMemo(() => scoredCounties(counties), [counties]);
  const thresholds = useMemo(() => quadrantThresholds(counties), [counties]);

  const scales = useMemo(() => {
    const maxDensity = niceMax(Math.max(0.2, ...points.map((p) => p.density_per_10k ?? 0)));
    const maxCount = Math.max(1, ...points.map((p) => p.pediatric_provider_count));
    return {
      x: (density: number) => PAD.left + (density / maxDensity) * PLOT_W,
      // Fragmentation is a percentage; the domain runs past 100 so the crowded
      // 100% band sits clear of the frame and leaves room for stacked labels.
      y: (pct: number) => PAD.top + ((112 - pct) / (112 - 40)) * PLOT_H,
      r: (count: number) => 4 + Math.sqrt(count / maxCount) * 8,
      maxDensity,
    };
  }, [points]);

  if (!thresholds) {
    return (
      <p className="panel p-5 text-sm text-[var(--ink-soft)]">
        No county has a captured provider, so there is no split to draw.
      </p>
    );
  }

  const midX = scales.x(thresholds.densityMedian);
  const midY = scales.y(thresholds.fragmentationMedian);
  const shortlisted = new Set(shortlistNames);
  const trivialCount = points.filter(fragmentationIsTrivial).length;
  const active = points.find((p) => p.county_name === (hovered ?? selectedName));

  // When almost every county sits at the same single-location share, the
  // horizontal median is the only split doing work. Say so instead of drawing
  // four quadrant labels around a sliver.
  const fragmentationIsDegenerate = thresholds.fragmentationMedian >= 99;

  // Labels on the crowded 100% band would overprint each other, so walk the
  // labelled counties left to right and stack near-neighbours onto tiers.
  const labelTier = new Map<string, number>();
  const labelled = points
    .filter((county) => shortlisted.has(county.county_name))
    .sort((a, b) => (a.density_per_10k ?? 0) - (b.density_per_10k ?? 0));
  let previousX = Number.NEGATIVE_INFINITY;
  let tier = 0;
  for (const county of labelled) {
    const cx = scales.x(county.density_per_10k ?? 0);
    tier = cx - previousX < 78 ? (tier + 1) % 4 : 0;
    labelTier.set(county.county_name, tier);
    previousX = cx;
  }

  // The strategy lens dims the counties the current thesis would not act on.
  const favoured = (county: CountyScoreRow) =>
    strategy === "deNovo"
      ? (county.density_per_10k ?? 0) <= thresholds.densityMedian
      : (county.single_location_pct ?? 0) >= thresholds.fragmentationMedian &&
        county.pediatric_provider_count >= 2;

  return (
    <article className="panel p-5" data-testid="quadrant-chart">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-faint)]">
            Screening 2×2 · median split over {thresholds.sampleSize} counties
          </p>
          <h2 className="serif mt-1 text-2xl font-semibold">Density vs fragmentation</h2>
        </div>
        <p className="max-w-xs text-xs leading-5 text-[var(--ink-faint)]">
          Every Texas county with at least one captured provider. Dot size is the captured
          provider count. Click a shortlisted market to open it.
        </p>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-4 w-full rounded-md border border-[var(--line)] bg-[var(--paper)]"
        role="img"
        aria-label="Scatter plot of captured provider density against single-location share, by county"
      >
        {/* quadrant tints — decorative, never a click target */}
        <g pointerEvents="none">
        {fragmentationIsDegenerate ? (
          <>
            {/* The vertical split carries no information here, so tint by half. */}
            <rect x={PAD.left} y={PAD.top} width={midX - PAD.left} height={PLOT_H}
              fill="var(--forest-soft)" opacity="0.7" />
            <rect x={midX} y={PAD.top} width={PAD.left + PLOT_W - midX} height={PLOT_H}
              fill="var(--paper-deep)" opacity="0.4" />
          </>
        ) : (
          <>
            <rect x={PAD.left} y={PAD.top} width={midX - PAD.left} height={midY - PAD.top}
              fill="var(--forest-soft)" opacity="0.75" />
            <rect x={midX} y={PAD.top} width={PAD.left + PLOT_W - midX} height={midY - PAD.top}
              fill="var(--paper-deep)" opacity="0.45" />
            <rect x={PAD.left} y={midY} width={midX - PAD.left} height={PAD.top + PLOT_H - midY}
              fill="var(--paper-deep)" opacity="0.3" />
            <rect x={midX} y={midY} width={PAD.left + PLOT_W - midX} height={PAD.top + PLOT_H - midY}
              fill="var(--paper-deep)" opacity="0.45" />
          </>
        )}

        {/* median crosshair */}
        <line x1={midX} y1={PAD.top} x2={midX} y2={PAD.top + PLOT_H}
          stroke="var(--line-strong)" strokeDasharray="4 3" />
        <line x1={PAD.left} y1={midY} x2={PAD.left + PLOT_W} y2={midY}
          stroke="var(--line-strong)" strokeDasharray="4 3" />

        {/* axes */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + PLOT_H} stroke="var(--line-strong)" />
        <line x1={PAD.left} y1={PAD.top + PLOT_H} x2={PAD.left + PLOT_W} y2={PAD.top + PLOT_H}
          stroke="var(--line-strong)" />

        <text x={PAD.left + PLOT_W / 2} y={HEIGHT - 12} textAnchor="middle"
          fill="var(--ink-faint)" fontSize="12" fontWeight="600">
          Captured providers per 10k children →
        </text>
        <text x={16} y={PAD.top + PLOT_H / 2} textAnchor="middle" fill="var(--ink-faint)"
          fontSize="12" fontWeight="600" transform={`rotate(-90 16 ${PAD.top + PLOT_H / 2})`}>
          Single-location share →
        </text>

        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const value = Number((scales.maxDensity * t).toFixed(2));
          return (
            <text key={t} x={scales.x(value)} y={PAD.top + PLOT_H + 16} textAnchor="middle"
              fill="var(--ink-faint)" fontSize="10">
              {value}
            </text>
          );
        })}
        {[50, 75, 100].map((pct) => (
          <text key={pct} x={PAD.left - 8} y={scales.y(pct) + 3} textAnchor="end"
            fill="var(--ink-faint)" fontSize="10">
            {pct}%
          </text>
        ))}
        </g>

        {fragmentationIsDegenerate ? (
          <>
            <text x={PAD.left + 10} y={PAD.top + PLOT_H - 12} fill="var(--forest-deep)"
              fontSize="11" fontWeight="700">
              ← Lower captured density · the target half
            </text>
            <text x={PAD.left + PLOT_W - 10} y={PAD.top + PLOT_H - 12} textAnchor="end"
              fill="var(--ink-faint)" fontSize="11" fontWeight="600">
              Higher captured density →
            </text>
          </>
        ) : (
          <>
            <text x={PAD.left + 10} y={PAD.top + 14} fill="var(--forest-deep)"
              fontSize="11" fontWeight="700">
              {QUADRANT_LABELS.underserved_fragmented} — the target read
            </text>
            <text x={PAD.left + PLOT_W - 10} y={PAD.top + 14} textAnchor="end"
              fill="var(--ink-faint)" fontSize="11" fontWeight="600">
              {QUADRANT_LABELS.saturated_fragmented}
            </text>
          </>
        )}

        {points.map((county) => {
          const cx = scales.x(county.density_per_10k ?? 0);
          const cy = scales.y(county.single_location_pct ?? 0);
          const isShortlisted = shortlisted.has(county.county_name);
          const isSelected = county.county_name === selectedName;
          const isTrivial = fragmentationIsTrivial(county);
          const dimmed = !favoured(county);

          return (
            <g key={county.county_fips}>
              <circle
                onMouseEnter={() => setHovered(county.county_name)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => isShortlisted && onSelect(county.county_name)}
                className={isShortlisted ? "cursor-pointer" : undefined}
                data-testid={`quadrant-dot-${county.county_fips}`}
                cx={cx}
                cy={cy}
                r={scales.r(county.pediatric_provider_count) + (isSelected ? 4 : 0)}
                fill={isShortlisted ? "var(--forest)" : "var(--ink-faint)"}
                fillOpacity={isTrivial ? 0.12 : dimmed ? 0.3 : isShortlisted ? 0.85 : 0.45}
                stroke={isSelected ? "var(--ink)" : isTrivial ? "var(--line-strong)" : "var(--card)"}
                strokeWidth={isSelected ? 2.5 : 1.25}
                strokeDasharray={isTrivial ? "3 2" : undefined}
              >
                <title>
                  {countyLabel(county.county_name)} · {county.pediatric_provider_count} captured ·{" "}
                  {county.density_per_10k}/10k · {county.single_location_pct}% single-location
                  {isTrivial ? " (single provider — share is trivially 100%)" : ""}
                </title>
              </circle>
              {isShortlisted ? (
                <text
                  pointerEvents="none"
                  x={cx}
                  y={
                    cy -
                    scales.r(county.pediatric_provider_count) -
                    8 -
                    (labelTier.get(county.county_name) ?? 0) * 13
                  }
                  textAnchor="middle"
                  fill={isSelected ? "var(--ink)" : "var(--ink-soft)"}
                  fontSize="11"
                  fontWeight={isSelected ? 700 : 600}
                >
                  {countyLabel(county.county_name)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="rounded-md border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5">
          {active ? (
            <>
              <p className="text-sm font-semibold">
                {countyLabel(active.county_name)}
                <span className="ml-2 font-normal text-[var(--ink-faint)]">
                  {active.pediatric_provider_count} captured · {active.density_per_10k}/10k ·{" "}
                  {active.single_location_pct}% single-location
                </span>
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--ink-soft)]">
                {active.quadrant ? QUADRANT_READS[active.quadrant] : "Not classified."}
              </p>
              {fragmentationIsTrivial(active) ? (
                <p className="mt-1 text-xs leading-5 text-[var(--risk)]">
                  One captured provider, so the fragmentation number is arithmetic, not a finding.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-xs text-[var(--ink-faint)]">Hover a county to read its position.</p>
          )}
        </div>
        <ul className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--ink-soft)]">
          <li>
            <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[var(--forest)]" />
            Shortlisted
          </li>
          <li>
            <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[var(--ink-faint)] opacity-50" />
            Other county
          </li>
          <li>
            <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full border border-dashed border-[var(--line-strong)]" />
            n=1
          </li>
        </ul>
      </div>

      <p className="mt-3 text-xs leading-5 text-[var(--risk)]" data-testid="quadrant-caveat">
        Read the axes with the sample in mind: {trivialCount} of {thresholds.sampleSize} plotted
        counties have exactly one captured provider, which forces their single-location share to
        100%. That drags the fragmentation median to {thresholds.fragmentationMedian}%
        {fragmentationIsDegenerate ? ", collapsing the vertical split entirely" : ""} — so the
        horizontal axis carries most of what this screen can honestly tell you, and the
        fragmentation read belongs to the verified clinic layer, not to this chart.
      </p>
    </article>
  );
}
