export type ClinicClassification =
  | "target_candidate"
  | "verified_operator"
  | "competitor_benchmark";

export type VerifiedClinic = {
  id: string;
  countyName: "Harris County" | "Bexar County" | "Tarrant County";
  name: string;
  websiteUrl: string;
  sourceUrl: string;
  services: Array<"SLP" | "OT" | "PT" | "ABA">;
  footprint: string;
  ownershipSignal: string;
  classification: ClinicClassification;
  verificationNote: string;
  verifiedAt: "2026-09-01";
};

export const VERIFIED_CLINICS: VerifiedClinic[] = [
  {
    id: "kids-developmental-clinic",
    countyName: "Harris County",
    name: "Kids Developmental Clinic",
    websiteUrl: "https://www.kidsdevelopmentalclinic.com/",
    sourceUrl: "https://www.kidsdevelopmentalclinic.com/clinics/",
    services: ["SLP", "OT", "PT"],
    footprint: "4 Houston-area clinics",
    ownershipSignal: "Ownership not established",
    classification: "verified_operator",
    verificationNote: "Official site lists four clinics, addresses, and multidisciplinary therapy facilities.",
    verifiedAt: "2026-09-01",
  },
  {
    id: "wishing-well",
    countyName: "Harris County",
    name: "Wishing Well Pediatric Therapy Center",
    websiteUrl: "https://wishingwellpediatrics.com/",
    sourceUrl: "https://wishingwellpediatrics.com/locations/",
    services: ["SLP", "OT", "PT"],
    footprint: "2 Houston clinics",
    ownershipSignal: "Ownership not established",
    classification: "target_candidate",
    verificationNote: "Official site verifies two outpatient pediatric rehabilitation locations.",
    verifiedAt: "2026-09-01",
  },
  {
    id: "therapy-at-the-zone",
    countyName: "Harris County",
    name: "Therapy At The Zone",
    websiteUrl: "https://www.therapyatthezone.com/",
    sourceUrl: "https://www.therapyatthezone.com/",
    services: ["SLP", "OT", "PT"],
    footprint: "1 Houston clinic",
    ownershipSignal: "Independent therapist structure; entity needs confirmation",
    classification: "target_candidate",
    verificationNote: "Operating clinic and disciplines verified; shared-practice structure needs diligence.",
    verifiedAt: "2026-09-01",
  },
  {
    id: "cole-houston",
    countyName: "Harris County",
    name: "Cole Pediatric Therapy",
    websiteUrl: "https://www.colehealth.com/",
    sourceUrl: "https://www.colehealth.com/contact/",
    services: ["SLP", "OT", "PT", "ABA"],
    footprint: "10 Greater Houston locations; 24 company-wide",
    ownershipSignal: "Scaled multi-market platform",
    classification: "competitor_benchmark",
    verificationNote: "Official location directory verifies a scaled regional footprint.",
    verifiedAt: "2026-09-01",
  },
  {
    id: "pediatric-therapy-specialists",
    countyName: "Bexar County",
    name: "Pediatric Therapy Specialists",
    websiteUrl: "https://pedts.com/",
    sourceUrl: "https://pedts.com/",
    services: ["SLP", "OT", "PT"],
    footprint: "San Antonio footprint; location count unresolved",
    ownershipSignal: "Ownership not established",
    classification: "target_candidate",
    verificationNote: "Official site verifies active services and clinicians; full footprint needs confirmation.",
    verifiedAt: "2026-09-01",
  },
  {
    id: "brighton-center",
    countyName: "Bexar County",
    name: "Brighton Center",
    websiteUrl: "https://brightonsa.org/",
    sourceUrl: "https://brightonsa.org/south-texas-pediatric-therapy-services-3-6/",
    services: ["SLP", "OT", "PT"],
    footprint: "3 San Antonio campus addresses",
    ownershipSignal: "Nonprofit",
    classification: "competitor_benchmark",
    verificationNote: "Verified pediatric therapy participant; not a conventional acquisition lead.",
    verifiedAt: "2026-09-01",
  },
  {
    id: "healthlink-pediatric-clinic",
    countyName: "Bexar County",
    name: "Healthlink Pediatric Clinic",
    websiteUrl:
      "https://www.baptisthealthsystem.com/locations/detail/healthlink-pediatric-clinic?c=BBHHP",
    sourceUrl:
      "https://www.baptisthealthsystem.com/locations/detail/healthlink-pediatric-clinic?c=BBHHP",
    services: ["SLP", "OT", "PT"],
    footprint: "1 identified San Antonio clinic",
    ownershipSignal: "Baptist Health System",
    classification: "competitor_benchmark",
    verificationNote: "Hospital-system clinic with official services, address, phone, and hours.",
    verifiedAt: "2026-09-01",
  },
  {
    id: "cole-san-antonio",
    countyName: "Bexar County",
    name: "Cole Pediatric Therapy",
    websiteUrl: "https://www.colehealth.com/",
    sourceUrl: "https://www.colehealth.com/contact/",
    services: ["SLP", "OT", "PT", "ABA"],
    footprint: "2 San Antonio sites plus Schertz",
    ownershipSignal: "Scaled multi-market platform",
    classification: "competitor_benchmark",
    verificationNote: "Verified scaled operator; useful as a market benchmark, not an assumed target.",
    verifiedAt: "2026-09-01",
  },
  {
    id: "anchor-pediatric-therapy",
    countyName: "Tarrant County",
    name: "Anchor Pediatric Therapy, LLC",
    websiteUrl: "https://www.anchortherapytx.com/",
    sourceUrl: "https://www.anchortherapytx.com/contact",
    services: ["SLP", "OT"],
    footprint: "2 Fort Worth clinics",
    ownershipSignal: "Ownership not established",
    classification: "target_candidate",
    verificationNote: "Official contact page verifies two operating locations; no PT service shown.",
    verifiedAt: "2026-09-01",
  },
  {
    id: "cowtown-pediatrix",
    countyName: "Tarrant County",
    name: "Cowtown Pediatrix Clinic, LLC",
    websiteUrl: "https://cowtownpediatrixclinic.com/",
    sourceUrl: "https://cowtownpediatrixclinic.com/",
    services: ["SLP", "OT"],
    footprint: "1 Fort Worth clinic",
    ownershipSignal: "Founder-led signal; ownership requires confirmation",
    classification: "target_candidate",
    verificationNote: "Official site verifies a named founder, active services, and operation since 2013.",
    verifiedAt: "2026-09-01",
  },
  {
    id: "therapedia",
    countyName: "Tarrant County",
    name: "Therapedia, LLC",
    websiteUrl: "https://www.therapediacenter.com/",
    sourceUrl: "https://www.therapediacenter.com/",
    services: ["SLP", "OT", "PT"],
    footprint: "2 clinics: Keller and Justin",
    ownershipSignal: "Licensed PT founder ownership stated",
    classification: "target_candidate",
    verificationNote: "Strongest verified clinician-owned sourcing lead in the current set.",
    verifiedAt: "2026-09-01",
  },
  {
    id: "jump-start",
    countyName: "Tarrant County",
    name: "Jump Start Pediatric Therapy Center, LLC",
    websiteUrl: "https://www.jumpstartcenter.com/",
    sourceUrl: "https://www.jumpstartcenter.com/",
    services: ["SLP"],
    footprint: "1 North Fort Worth clinic",
    ownershipSignal: "Ownership not established",
    classification: "target_candidate",
    verificationNote: "Official site verifies pediatric speech focus, named clinicians, and operation since 2009.",
    verifiedAt: "2026-09-01",
  },
];
