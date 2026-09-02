// Research completeness — how much of the standing check-list is actually done.
//
// The point of this module is to keep depth of diligence separate from
// attractiveness of a market. Counting preliminary targets rewards the markets
// that got the most hours; this counts the checks instead, and reports the ones
// that were never run as loudly as the ones that were.
//
// Nothing here infers a check that was not recorded. A `not_pulled` row is
// reported as open, never softened into "clear".

import { linkStatusFor } from "@/lib/clinic-links";
import type { VerifiedClinic } from "@/lib/verified-clinics";
import type { ShortlistMarket } from "@/lib/workbench";

export type CheckState = "done" | "partial" | "open";

export type ResearchCheck = {
  label: string;
  state: CheckState;
  detail: string;
  checkedOn: string | null;
};

export const CHECK_STATE_LABELS: Record<CheckState, string> = {
  done: "Done",
  partial: "Indicative",
  open: "Not pulled",
};

export type OwnershipConfidence = {
  level: "filing" | "indicative" | "none";
  label: string;
  basis: string;
};

/**
 * Ownership confidence is about provenance, not certainty of the name. A name
 * printed on a clinic's own About page is real evidence and still not a filing.
 */
export function ownershipConfidence(clinic: VerifiedClinic): OwnershipConfidence {
  if (clinic.sosCheck.status === "sos_named") {
    return {
      level: "filing",
      label: "Confirmed in filing",
      basis: `Texas SOS entity record, checked ${clinic.sosCheck.checkedOn}.`,
    };
  }
  if (!clinic.ownerName) {
    return {
      level: "none",
      label: "Not established",
      basis:
        "No owner name found in this pass. Entity members are unknown until a filing is pulled.",
    };
  }
  if (clinic.sosCheck.status === "npi_named") {
    return {
      level: "indicative",
      label: "Indicative — NPI authorized official",
      basis: `Named as authorized official on the NPI record, checked ${clinic.sosCheck.checkedOn}. Not a filing, and an authorized official is not necessarily an owner.`,
    };
  }
  if (clinic.sosCheck.status === "site_named") {
    return {
      level: "indicative",
      label: "Indicative — named on practice site",
      basis: `Named as owner or founder on the clinic's own site, checked ${clinic.sosCheck.checkedOn}. Self-published, and not a filing.`,
    };
  }
  return {
    level: "indicative",
    label: "Indicative — unconfirmed",
    basis: `Owner name from public research, checked ${clinic.sosCheck.checkedOn}. No entity record was pulled.`,
  };
}

/** The standing check-list applied to every clinic file, done or not. */
export function clinicChecks(clinic: VerifiedClinic): ResearchCheck[] {
  const confidence = ownershipConfidence(clinic);
  const link = linkStatusFor(clinic.id);
  const licenseFound = clinic.licenseChecks.filter((check) => check.status === "found");
  const licenseRows = clinic.licenseChecks.length;

  return [
    {
      label: "Owner identified",
      state: confidence.level === "filing" ? "done" : confidence.level === "none" ? "open" : "partial",
      detail: confidence.basis,
      checkedOn: clinic.sosCheck.checkedOn,
    },
    {
      label: "Entity filing pulled",
      state: clinic.sosCheck.status === "sos_named" ? "done" : "open",
      detail:
        clinic.sosCheck.status === "sos_named"
          ? clinic.sosCheck.note
          : "No Texas SOS filing pulled in this pass. Legal name, standing, and members are unconfirmed.",
      checkedOn: clinic.sosCheck.checkedOn,
    },
    {
      label: "License board record",
      state: licenseFound.length ? "done" : licenseRows ? "open" : "open",
      detail: licenseRows
        ? licenseFound.length
          ? `${licenseFound.length} of ${licenseRows} board row${licenseRows === 1 ? "" : "s"} found.`
          : `${licenseRows} board row${licenseRows === 1 ? "" : "s"} recorded, none pulled. Interactive search not completed — do not read this as unlicensed.`
        : "No board row recorded for this entity in this pass.",
      checkedOn: clinic.licenseChecks[0]?.checkedOn ?? null,
    },
    {
      label: "Site live-check",
      state: link ? (link.ok ? "done" : "open") : "open",
      detail: link
        ? link.ok
          ? `Reachable, HTTP ${link.status ?? "ok"}.`
          : `Not confirmed reachable (HTTP ${link.status ?? "n/a"}${link.error ? `, ${link.error}` : ""}).`
        : "Automated live-check not run for this site.",
      checkedOn: link?.checkedOn ?? null,
    },
    {
      label: "Sponsor-press / PE scan",
      state: "partial",
      detail: `${clinic.peSignal} A web scan finding nothing is not clearance.`,
      checkedOn: clinic.verifiedAt,
    },
  ];
}

export type Completeness = {
  done: number;
  partial: number;
  open: number;
  total: number;
  /** Partial checks count half — indicative evidence is worth less than a filing, not nothing. */
  score: number;
  pct: number;
};

export function completenessOf(checks: ResearchCheck[]): Completeness {
  const done = checks.filter((check) => check.state === "done").length;
  const partial = checks.filter((check) => check.state === "partial").length;
  const open = checks.filter((check) => check.state === "open").length;
  const total = checks.length;
  const score = done + partial * 0.5;
  return {
    done,
    partial,
    open,
    total,
    score,
    pct: total ? Math.round((score / total) * 100) : 0,
  };
}

export function clinicCompleteness(clinic: VerifiedClinic): Completeness {
  return completenessOf(clinicChecks(clinic));
}

export type MarketCoverage = Completeness & {
  clinicsClassified: number;
  registryNamesUnworked: number;
  ownersNamed: number;
  filingsPulled: number;
  label: string;
};

/**
 * Market-level coverage. Deliberately reported next to the target count so a
 * long call list cannot be mistaken for a strong market when it is really a
 * well-researched one.
 */
export function marketCoverage(market: ShortlistMarket): MarketCoverage {
  const clinics = market.verifiedClinics;
  const totals = clinics.reduce(
    (acc, clinic) => {
      const completeness = clinicCompleteness(clinic);
      return {
        done: acc.done + completeness.done,
        partial: acc.partial + completeness.partial,
        open: acc.open + completeness.open,
        total: acc.total + completeness.total,
        score: acc.score + completeness.score,
      };
    },
    { done: 0, partial: 0, open: 0, total: 0, score: 0 }
  );

  const pct = totals.total ? Math.round((totals.score / totals.total) * 100) : 0;

  return {
    ...totals,
    pct,
    clinicsClassified: clinics.length,
    registryNamesUnworked: market.unmatchedRegistryCount,
    ownersNamed: clinics.filter((clinic) => clinic.ownerName).length,
    filingsPulled: clinics.filter((clinic) => clinic.sosCheck.status === "sos_named").length,
    label: coverageLabel(clinics.length, pct),
  };
}

export type CoverageBand = {
  label: string;
  rule: string;
};

/**
 * Coverage bands describe research depth only. They are exported so the Method
 * panel can print the thresholds — an unexplained percentage is the same
 * opacity problem as an unexplained density score, just smaller.
 *
 * On the current pass no market reaches "Substantially worked", because no SOS
 * filing and no license-board record was pulled anywhere. That ceiling is the
 * honest reading of the check-list, not a bug in the bands: the top band stays
 * defined and unreached rather than being lowered until something qualifies.
 */
export const COVERAGE_BANDS: CoverageBand[] = [
  { label: "Not researched", rule: "no clinic classified in this market" },
  { label: "Thin", rule: "fewer than 4 clinics classified" },
  { label: "Partial", rule: "4+ clinics classified, under 60% of the check-list complete" },
  { label: "Substantially worked", rule: "4+ clinics classified, 60% or more complete" },
];

export function coverageLabel(clinicCount: number, pct: number): string {
  if (clinicCount === 0) return COVERAGE_BANDS[0].label;
  if (clinicCount < 4) return COVERAGE_BANDS[1].label;
  if (pct >= 60) return COVERAGE_BANDS[3].label;
  return COVERAGE_BANDS[2].label;
}

export type PortfolioCoverage = {
  clinics: number;
  ownersNamed: number;
  filingsPulled: number;
  licenseRowsPulled: number;
  licenseRowsRecorded: number;
  sitesChecked: number;
  sitesReachable: number;
  checkedOn: string | null;
};

/** The one-line honesty check across the whole verified layer. */
export function portfolioCoverage(clinics: VerifiedClinic[]): PortfolioCoverage {
  const licenseRows = clinics.flatMap((clinic) => clinic.licenseChecks);
  const links = clinics.map((clinic) => linkStatusFor(clinic.id));

  return {
    clinics: clinics.length,
    ownersNamed: clinics.filter((clinic) => clinic.ownerName).length,
    filingsPulled: clinics.filter((clinic) => clinic.sosCheck.status === "sos_named").length,
    licenseRowsPulled: licenseRows.filter((row) => row.status === "found").length,
    licenseRowsRecorded: licenseRows.length,
    sitesChecked: links.filter(Boolean).length,
    sitesReachable: links.filter((link) => link?.ok).length,
    checkedOn: clinics[0]?.verifiedAt ?? null,
  };
}
