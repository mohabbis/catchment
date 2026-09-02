import {
  DEMAND_QUERY,
  GEOGRAPHY_QUERY,
  LABEL_DICTIONARY,
  METHODOLOGY_STATEMENT,
  METRIC_DEFINITIONS,
  NOT_DONE,
  SUPPLY_QUERY,
  type ScreenParameter,
  type ScreenStats,
} from "@/lib/methodology";
import { COVERAGE_BANDS, portfolioCoverage } from "@/lib/coverage";
import { VERIFIED_CLINICS } from "@/lib/verified-clinics";

function ParameterTable({ rows }: { rows: ScreenParameter[] }) {
  return (
    <dl className="mt-3 divide-y divide-[var(--line)] border-y border-[var(--line)]">
      {rows.map((row) => (
        <div key={row.label} className="grid gap-1 py-3 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-4">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-faint)]">
            {row.label}
          </dt>
          <dd>
            <p className="font-mono text-xs leading-5 text-[var(--ink)]">{row.value}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--ink-soft)]">{row.note}</p>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function MethodPanel({ stats }: { stats: ScreenStats }) {
  const coverage = portfolioCoverage(VERIFIED_CLINICS);

  return (
    <div className="space-y-6" data-testid="method-panel">
      <section className="panel p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-faint)]">
          Methodology
        </p>
        <h2 className="serif mt-1 text-2xl font-semibold leading-tight">
          What was measured, and what it does not establish
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">{METHODOLOGY_STATEMENT}</p>

        <div className="mt-5 rounded-md bg-[var(--amber-soft)] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--risk)]">
            Read this before the numbers
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--ink-soft)]">
            The screening layer is weak and is not used to rank markets. Market order is a curated
            editorial shortlist. The verified clinic layer — named operators, dated checks, and the
            pass log — is the work this app is actually offering.
          </p>
        </div>
      </section>

      <section className="panel p-5" data-testid="method-live-stats">
        <h3 className="serif text-lg font-semibold">The extract in front of you</h3>
        <p className="mt-1 text-xs leading-5 text-[var(--ink-soft)]">
          Computed from the loaded registry extract at render time, not typed into copy.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-[11px] text-[var(--ink-faint)]">Captured records, statewide</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{stats.capturedRecords}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-[var(--ink-faint)]">Counties with any capture</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">
              {stats.countiesWithCapture}
              <span className="text-sm font-normal text-[var(--ink-faint)]">
                {" / "}
                {stats.countiesTotal}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-[var(--ink-faint)]">Density range, per 10k</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">
              {stats.densityMin === null || stats.densityMax === null
                ? "—"
                : `${stats.densityMin}–${stats.densityMax}`}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-[var(--ink-faint)]">Counties at 100% fragmentation</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{stats.fragmentationAt100}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs leading-5 text-[var(--ink-soft)]">
          {stats.quadrantsAssigned === 0
            ? "The density × fragmentation quadrant is assigned to zero counties. The fragmentation axis does not separate on this extract, so the quadrant abstains rather than labelling every county fragmented."
            : `The quadrant is assigned to ${stats.quadrantsAssigned} counties on this extract.`}
        </p>
      </section>

      <section className="panel p-5">
        <h3 className="serif text-lg font-semibold">Supply — the provider screen</h3>
        <ParameterTable rows={SUPPLY_QUERY} />
      </section>

      <section className="panel p-5">
        <h3 className="serif text-lg font-semibold">Demand — the child-population denominator</h3>
        <ParameterTable rows={DEMAND_QUERY} />
      </section>

      <section className="panel p-5">
        <h3 className="serif text-lg font-semibold">Geography — how a record becomes a market</h3>
        <ParameterTable rows={GEOGRAPHY_QUERY} />
      </section>

      <section className="panel p-5" data-testid="metric-definitions">
        <h3 className="serif text-lg font-semibold">Metric definitions</h3>
        <p className="mt-1 text-xs leading-5 text-[var(--ink-soft)]">
          Formula, denominator, deduplication rule, and the limit that follows from it.
        </p>
        <div className="mt-4 space-y-4">
          {METRIC_DEFINITIONS.map((metric) => (
            <article
              key={metric.term}
              className="rounded-md border border-[var(--line)] bg-[var(--paper)] px-4 py-3"
            >
              <h4 className="text-sm font-semibold text-[var(--ink)]">{metric.term}</h4>
              <p className="mt-1 text-xs leading-5 text-[var(--ink-soft)]">{metric.plain}</p>
              <dl className="mt-3 space-y-1.5 text-xs leading-5">
                <div className="sm:flex sm:gap-3">
                  <dt className="w-28 shrink-0 font-semibold text-[var(--ink-faint)]">Formula</dt>
                  <dd className="font-mono text-[var(--ink)]">{metric.formula}</dd>
                </div>
                {metric.denominator !== "—" ? (
                  <div className="sm:flex sm:gap-3">
                    <dt className="w-28 shrink-0 font-semibold text-[var(--ink-faint)]">
                      Denominator
                    </dt>
                    <dd className="text-[var(--ink-soft)]">{metric.denominator}</dd>
                  </div>
                ) : null}
                {metric.dedup !== "—" ? (
                  <div className="sm:flex sm:gap-3">
                    <dt className="w-28 shrink-0 font-semibold text-[var(--ink-faint)]">
                      Deduplication
                    </dt>
                    <dd className="text-[var(--ink-soft)]">{metric.dedup}</dd>
                  </div>
                ) : null}
                <div className="sm:flex sm:gap-3">
                  <dt className="w-28 shrink-0 font-semibold text-[var(--risk)]">Limit</dt>
                  <dd className="text-[var(--ink-soft)]">{metric.limit}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="panel p-5" data-testid="verified-layer-coverage">
        <h3 className="serif text-lg font-semibold">Verified layer — how complete it is</h3>
        <p className="mt-1 text-xs leading-5 text-[var(--ink-soft)]">
          Clinic records are classified by hand from public sites, NPI records, and public profiles.
          These counts say how far that got.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-[11px] text-[var(--ink-faint)]">Clinics classified</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{coverage.clinics}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-[var(--ink-faint)]">Owner named</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">
              {coverage.ownersNamed}
              <span className="text-sm font-normal text-[var(--ink-faint)]">
                {" / "}
                {coverage.clinics}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-[var(--ink-faint)]">SOS filings pulled</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums text-[var(--risk)]">
              {coverage.filingsPulled}
              <span className="text-sm font-normal text-[var(--ink-faint)]">
                {" / "}
                {coverage.clinics}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-[var(--ink-faint)]">License rows pulled</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums text-[var(--risk)]">
              {coverage.licenseRowsPulled}
              <span className="text-sm font-normal text-[var(--ink-faint)]">
                {" / "}
                {coverage.licenseRowsRecorded}
              </span>
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs leading-5 text-[var(--ink-soft)]">
          Owner names come from clinic sites and NPI authorized-official fields. No Texas Secretary
          of State filing and no professional-license board record was pulled in this pass. Every
          such row reads <span className="font-semibold text-[var(--ink)]">not pulled</span>, which
          means the search was not completed — not that a clinic is unlicensed or its ownership is
          in doubt. Site reachability was checked automatically: {coverage.sitesReachable} of{" "}
          {coverage.sitesChecked} responded
          {coverage.checkedOn ? ` as of ${coverage.checkedOn}` : ""}.
        </p>
      </section>

      <section className="panel p-5" data-testid="coverage-bands">
        <h3 className="serif text-lg font-semibold">How research coverage is scored</h3>
        <p className="mt-1 text-xs leading-5 text-[var(--ink-soft)]">
          Every clinic file carries the same five checks: owner identified, entity filing pulled,
          license board record, site live-check, and sponsor/PE press scan. A completed check counts
          1, an indicative one counts 0.5, an unrun one counts 0. A market&rsquo;s percentage is its
          clinics&rsquo; scores over the checks that apply to them.
        </p>
        <dl className="mt-3 divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {COVERAGE_BANDS.map((band) => (
            <div key={band.label} className="grid gap-1 py-2 sm:grid-cols-[190px_minmax(0,1fr)] sm:gap-4">
              <dt className="text-xs font-semibold text-[var(--ink)]">{band.label}</dt>
              <dd className="text-xs leading-5 text-[var(--ink-soft)]">{band.rule}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs leading-5 text-[var(--risk)]">
          No market currently reaches the top band. With zero SOS filings and zero license-board
          records pulled anywhere in this pass, two of the five checks are open on every clinic, so
          the ceiling on this data is around 40%. The band stays defined and unreached rather than
          being lowered until something qualifies.
        </p>
        <p className="mt-2 text-xs leading-5 text-[var(--ink-soft)]">
          Coverage measures diligence effort. It is deliberately reported next to the preliminary
          target count so a long candidate list — which partly reflects hours spent — cannot be read
          as a strong market.
        </p>
      </section>

      <section className="panel p-5" data-testid="not-done">
        <h3 className="serif text-lg font-semibold text-[var(--risk)]">What was not done</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--ink-soft)]">
          {NOT_DONE.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section className="panel p-5">
        <h3 className="serif text-lg font-semibold">What the labels mean</h3>
        <dl className="mt-3 space-y-3">
          {LABEL_DICTIONARY.map((entry) => (
            <div key={entry.term}>
              <dt className="text-sm font-semibold text-[var(--ink)]">{entry.term}</dt>
              <dd className="mt-0.5 text-xs leading-5 text-[var(--ink-soft)]">{entry.meaning}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
