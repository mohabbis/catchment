export const WHAT_IT_IS = {
  kicker: "What this is",
  title: "A sourcing workbench for Texas pediatric therapy clinics",
  lede:
    "Catchment answers three questions for Oaklin Lane: which markets deserve a look, which named clinics operate there, and what public evidence supports a call. It is not a census, a CRM, or a finished investment memo.",
  body:
    "Census and NPPES numbers only screen counties. The work is the named founders, the pass log, and the dated ownership and license checks. If a filing was not pulled, the row says so.",
};

export const WHO_IT_IS_FOR = [
  {
    title: "For",
    body: "Someone who needs to decide who to call this week in DFW, Houston, Austin, or San Antonio — and what not to confuse with a target.",
  },
  {
    title: "Not for",
    body: "Underwriting revenue, clearing PE, or treating a registry row as a clinic. LinkedIn headcount is an estimate. “No PE press found” is not clearance.",
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
    body: "The right column lists targets first. Open one. The drawer is the trail: owner, dated license/SOS check, site, next action. Notes stay on this laptop.",
  },
  {
    n: "4",
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
    term: "Target",
    meaning:
      "A named clinic worth a call on current public evidence. Not a bid, and not a clearance.",
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
      "The federal provider registry. Used here as a screen. It missed Cole, KDC, Synaptic, and others. Density is a hypothesis.",
  },
  {
    term: "SOS / license row",
    meaning:
      "A dated public check. “Not pulled” means the interactive search was not finished — not that the clinic is unlicensed or the members are unknown forever.",
  },
] as const;

export const CAVEATS = [
  "NPPES is a candidate screen, not a clinic census.",
  "Ownership notes come from practice sites, NPI authorized officials, and public profiles — not pulled Texas SOS filings.",
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
    body: "This column is why the market matters and what to do next. Screening math is behind a disclosure. You do not need it to make a call.",
  },
  {
    id: "clinics",
    title: "Open a clinic",
    body: "Targets are the call list. Click a name. Other lists (verified, pass, registry) stay out of the way until you ask.",
  },
  {
    id: "drawer",
    title: "Read the trail",
    body: "Owner, dated SOS/license check, site, and next action. If a number was not pulled, the row says so. Add a note if you want — it stays on this laptop.",
  },
  {
    id: "export",
    title: "Forward a brief",
    body: "Save markdown or print a PDF when you want to send the argument. The brief includes the pass log, caveats, and any note you wrote.",
  },
] as const;
