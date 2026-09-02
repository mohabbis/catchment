import {
  LICENSE_STATUS_LABELS,
  SOS_STATUS_LABELS,
  type RejectedRecord,
} from "@/lib/verified-clinics";
import {
  isMetroMarket,
  licenseCheckLine,
  ownershipHeadline,
  sosCheckLine,
  type DiligenceItem,
  type ShortlistMarket,
} from "@/lib/workbench";

export default function IcBriefPrint({
  selected,
  queue,
  rejected,
  notes,
  onClose,
}: {
  selected: ShortlistMarket;
  queue: DiligenceItem[];
  rejected: RejectedRecord[];
  notes: Record<string, string>;
  onClose: () => void;
}) {
  const ranked = [...selected.verifiedClinics]
    .filter((clinic) => clinic.outreachRank !== null)
    .sort((a, b) => (a.outreachRank ?? 99) - (b.outreachRank ?? 99));
  const registryItems = queue.filter((item) => item.kind === "registry");

  return (
    <div id="ic-brief" className="ic-brief" data-testid="ic-brief">
      <div className="ic-brief-toolbar no-print">
        <p className="text-xs text-[var(--ink-soft)]">
          Forwardable IC brief · {selected.county_name}
        </p>
        <div className="flex gap-2">
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            Print / Save PDF
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <article className="ic-brief-page">
        <p className="kicker">Catchment · Oaklin Lane · Texas</p>
        <h1>IC brief — {selected.county_name}</h1>
        <p className="lede">
          Evidence: {selected.evidence_confidence}.{" "}
          {selected.metroLabel ?? (isMetroMarket(selected) ? "Metro market" : "County market")}.
        </p>

        <h2>Thesis</h2>
        <p className="serif-body">{selected.narrative.headline}</p>
        <p>{selected.narrative.rationale}</p>

        <h2>Why this market</h2>
        <ul>
          <li>Scale: {(selected.population_under_18 ?? 0).toLocaleString()} children 0–17</li>
          <li>
            Registry capture (not supply): {selected.pediatric_provider_count} NPPES name-matched
            records, {selected.density_per_10k ?? "n/a"}/10k. From a 64-record statewide pull that
            missed Cole, KDC, Synaptic, Therapy Spot, and Frisco Feeding — this counts what the
            query found, not what operates here.
          </li>
          <li>
            Fragmentation proxy:{" "}
            {selected.single_location_pct === null
              ? "n/a"
              : `${selected.single_location_pct}% single-location — reads ~100% across almost every captured county, so it does not separate markets`}
            .
          </li>
          <li>Risk: {selected.narrative.risk}</li>
          <li>Next: {selected.narrative.nextAction}</li>
        </ul>

        {ranked.length ? (
          <>
            <h2>Ranked targets</h2>
            <ol>
              {ranked.map((clinic) => (
                <li key={clinic.id}>
                  <strong>{clinic.name}</strong> — {ownershipHeadline(clinic)}. {clinic.nextAction}
                </li>
              ))}
            </ol>
          </>
        ) : null}

        <h2>Classified clinics</h2>
        {selected.verifiedClinics.map((clinic) => {
          const note = notes[clinic.id]?.trim();
          return (
            <section key={clinic.id} className="clinic-block">
              <h3>
                {clinic.outreachRank ? `#${clinic.outreachRank} ` : ""}
                {clinic.name}
              </h3>
              <ul>
                <li>Classification: {clinic.classification}</li>
                <li>
                  Ownership: {ownershipHeadline(clinic)} — {clinic.ownershipSignal}
                </li>
                <li>SOS / NPI check: {sosCheckLine(clinic.sosCheck)}</li>
                <li>SOS note: {clinic.sosCheck.note}</li>
                <li>PE signal: {clinic.peSignal}</li>
                <li>
                  Locations: {clinic.locationCount} ({clinic.footprint})
                </li>
                <li>Size signal: {clinic.clinicianEstimate}</li>
                <li>Services: {clinic.services.join(", ")}</li>
                <li>Next action: {clinic.nextAction}</li>
                <li>Website: {clinic.websiteUrl}</li>
                <li>Notes: {clinic.verificationNote}</li>
                {clinic.licenseChecks.length ? (
                  <li>
                    License / SOS
                    <ul>
                      {clinic.licenseChecks.map((check) => (
                        <li key={`${clinic.id}-${check.board}`}>
                          {licenseCheckLine(check)} — {check.note}
                        </li>
                      ))}
                    </ul>
                  </li>
                ) : (
                  <li>
                    License / SOS: no board row in this pass ({SOS_STATUS_LABELS[clinic.sosCheck.status]}
                    ).
                  </li>
                )}
                {note ? <li>Workspace note: {note}</li> : null}
              </ul>
            </section>
          );
        })}

        {registryItems.length ? (
          <>
            <h2>Unmatched registry candidates (not verified clinics)</h2>
            <ul>
              {registryItems.map((item) =>
                item.kind === "registry" ? (
                  <li key={item.npi}>
                    {item.name} — NPI {item.npi}
                    {item.city ? `, ${item.city}` : ""}
                  </li>
                ) : null
              )}
            </ul>
          </>
        ) : null}

        {rejected.length ? (
          <>
            <h2>Pass / not a target</h2>
            <ul>
              {rejected.map((record) => (
                <li key={record.id}>
                  <strong>{record.name}</strong> ({record.category.replaceAll("_", " ")}) —{" "}
                  {record.reason}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <h2>Caveats</h2>
        <ul>
          <li>NPPES is a candidate-generation screen, not a clinic census.</li>
          <li>
            SOS and license rows are dated checks from this pass. Interactive board/SOS search was
            not completed — do not read {LICENSE_STATUS_LABELS.not_pulled.toLowerCase()} as
            unlicensed or uncleared.
          </li>
          <li>Ownership notes are web/NPI research, not Texas SOS filings.</li>
          <li>“No PE press found” is not clearance.</li>
          <li>Oaklin Lane’s own clinics are the buyer, not targets.</li>
        </ul>
      </article>
    </div>
  );
}
