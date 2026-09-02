export const WHAT_IT_IS = {
  kicker: "What this is",
  title: "A sourcing workbench for Texas pediatric therapy clinics",
  lede:
    "Catchment answers three questions for Oaklin Lane: which markets deserve a look, which named clinics operate there, and what public evidence supports a call. It is not a census, a CRM, or a finished investment memo.",
  body:
    "The work is the named founders, the pass log, and the dated ownership checks. The public-data layer is thinner than it looks: the NPPES name-match returned 64 org records for all of Texas, so it generates candidates and does not rank markets. Every query parameter, denominator, and skipped step is written out under Method. If a filing was not pulled, the row says so — and in this pass, none were.",
};

export const WHO_IT_IS_FOR = [
  {
    title: "For",
    body: "Someone who needs to decide who to call this week in DFW, Houston, Austin, or San Antonio — and what not to confuse with a target.",
  },
  {
    title: "Not for",
    body: "Underwriting revenue, clearing PE, establishing that a market is underserved, or treating a registry row as a clinic. Headcounts from public profiles are estimates. “No PE press found” is not clearance.",
  },
];

export const SESSION_STEPS = [
  {
    n: "1",
    title: "Choose a market",
    body: "Start with a metro: DFW, Houston, or Austin. San Antonio is Bexar County only. County rows under the metros are thinner slices of the same place — not extra deals.",
  },
  {
    n: "2",
    title: "Read why it matters",
    body: "The middle column is the argument: the thesis, who to call, who to pass, and the risks. Compare and the pass log sit next to it. The map is city-level and approximate.",
  },
  {
    n: "3",
    title: "Open a named clinic",
    body: "The right column lists preliminary targets first. Open one. The drawer is the trail: owner and how confidently they were identified, a research-completeness checklist, dated license/SOS rows, site, next action. Notes stay on this laptop.",
  },
  {
    n: "4",
    title: "Check the method",
    body: "The Method tab is the data dictionary: the exact NPPES query, the Census denominator, how a ZIP becomes a county, what deduplication was applied (none), and what was never pulled. Read it before quoting any number.",
  },
  {
    n: "5",
    title: "Forward a brief",
    body: "When the argument is ready to send, save it as markdown or print / save a PDF. Same content either way. No new facts are invented for the brief.",
  },
] as const;

export const GLOSSARY = [
  {
    term: "Metro",
    meaning:
      "The deal market. DFW is Dallas + Tarrant + Collin. Houston adds Fort Bend and Montgomery to the child count. Austin adds Williamson and Hays. Those extra counties are not separate shortlist rows unless a verified clinic lives there.",
  },
  {
    term: "County slice",
    meaning:
      "A thinner cut of a metro so you can see Tarrant evidence next to a Dallas-city cut. Do not rank a county density number as if it were the operator.",
  },
  {
    term: "Preliminary target",
    meaning:
      "A named clinic worth a qualifying call on current public evidence. Not a bid, not a clearance, and not a confirmation that the business is independent or available. Ownership, entity status, and independence are open on most of them.",
  },
  {
    term: "Research coverage",
    meaning:
      "How much of the standing check-list a market has had done. It measures diligence effort, not market quality — a market with more preliminary targets may simply have been researched harder.",
  },
  {
    term: "Ownership confidence",
    meaning:
      "How the owner was identified. A name on a practice site or an NPI authorized-official field is indicative; a pulled Secretary of State filing would be confirmation. No SOS filing was pulled in this pass, so no clinic reads as confirmed.",
  },
  {
    term: "Verified / on the map",
    meaning:
      "A real clinic that is not the outreach list — boutique, or useful as context.",
  },
  {
    term: "Pass / benchmark",
    meaning:
      "Ruled out on purpose: scaled platform, hospital, nonprofit, closed, home health, or the buyer’s own sites.",
  },
  {
    term: "Registry",
    meaning:
      "An NPPES name-match only. Candidate generation, not a verified clinic. Hidden unless you ask for it.",
  },
  {
    term: "NPPES",
    meaning:
      "The federal provider registry. Used here as a screen. The pull behind this app is 64 org records for the whole state and it missed Cole, KDC, Synaptic, Therapy Spot, and Frisco Feeding. Density measures what that query found, not local supply, so no market is ranked on it.",
  },
  {
    term: "Fragmentation proxy",
    meaning:
      "Share of captured records whose org identity appears at one address statewide. It reads ~100% in almost every captured county — multi-site brands file under separate entities — so it is reported, not used to separate markets.",
  },
  {
    term: "Why these six markets",
    meaning:
      "An editorial call, not a model output. They are the large metro markets where clinic-level verification was actually done. Hidalgo County has the state's second-largest registry capture and is deliberately not here.",
  },
  {
    term: "SOS / license row",
    meaning:
      "A dated public check. “Not pulled” means the interactive search was not finished — not that the clinic is unlicensed or the members are unknown forever. Across this pass, zero SOS filings and zero license-board records were pulled; every such row reads not pulled.",
  },
  {
    term: "Method",
    meaning:
      "The center-pane tab holding the full data dictionary: query parameters, denominators, deduplication (none applied), geographic assignment, metric formulas, and an explicit list of what was not done.",
  },
] as const;

export const CAVEATS = [
  "NPPES is a candidate screen, not a clinic census — 64 org records statewide.",
  "Density and fragmentation are shown for transparency. No market is ranked on either.",
  "Ownership notes come from practice sites, NPI authorized officials, and public profiles — not pulled Texas SOS filings. Zero filings and zero license-board records were pulled in this pass.",
  "Preliminary target counts partly reflect research effort. Read them next to research coverage, not as a market ranking.",
  "“No PE press found” is not clearance.",
  "Oaklin Lane’s Lake Highlands and Rockwall clinics are the buyer, not targets.",
  "This is an independent work sample. It was not commissioned by Oaklin Lane.",
] as const;

export const TOUR_STEPS = [
  {
    id: "markets",
    title: "Choose a market",
    body: "Start with a metro on the left. DFW, Houston, and Austin are the deal markets. County names under them are slices, not new opportunities.",
  },
  {
    id: "thesis",
    title: "Read the argument",
    body: "This column is why the market matters and what to do next. Screening values are shown with their limits, and the Method tab holds the full data dictionary. You do not need either to make a call.",
  },
  {
    id: "clinics",
    title: "Open a clinic",
    body: "Preliminary targets are the qualifying-call list. Click a name. Other lists (verified, pass, registry) stay out of the way until you ask.",
  },
  {
    id: "drawer",
    title: "Read the trail",
    body: "Owner and how confidently they were identified, a research-completeness checklist showing what is still open, the site, and the next action. If a check was not pulled, the row says so. Add a note if you want — it stays on this laptop.",
  },
  {
    id: "export",
    title: "Forward a brief",
    body: "Save markdown or print a PDF when you want to send the argument. The brief includes the pass log, caveats, and any note you wrote.",
  },
] as const;
