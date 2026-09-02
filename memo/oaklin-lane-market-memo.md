# TX Pediatric Therapy Market Fragmentation — County Opportunity Screen

**Prepared for:** Oaklin Lane | **Prepared by:** Muhammad Rafiq | **Date:** September 2026

**Question:** Which Texas counties are underserved and fragmented enough to be good
acquisition or de-novo targets for pediatric speech, OT, and PT services?

> **Correction appended 2026-09-02.** The county ranking below does not hold, and
> the app no longer uses it. Ranking by ascending captured density sorts counties
> by how badly the NPPES name-match failed there, not by how underserved they are:
> Tarrant places first on **3** captured records while Harris places fourth on 11.
> The fragmentation column is worse — it reads 100% in 10 of the 12 counties that
> clear the capture floor, because multi-site brands file their sites under
> separate legal entities, so it separates nothing. The limitations section below
> named both effects but the recommendation was still built on them, which is the
> error. Treat the table as a record of the screen's output, not as a
> recommendation. The defensible unit of work is the verified clinic layer in the
> app: named operators, dated ownership and license checks, and the pass log.

## Methodology

**Providers:** NPPES NPI Registry, org-level (NPI-2) records for Speech-Language
Pathologist, Occupational Therapist, and Physical Therapist taxonomies in TX,
name-matched for pediatric signal (org name or DBA containing "pediatric,"
"kids," "child," or "peds"). **Population:** Census ACS 5-Year 2023, under-18
population by county. **Geography:** Census ZCTA-to-County Relationship File
maps each provider's ZIP to a county (no live geocoding).

**Scoring:** a 2x2 quadrant on two independent axes — no blended index with
invented weights.
- **Density** = pediatric providers per 10,000 under-18 residents. Low = underserved.
- **Fragmentation** = % of pediatric provider locations belonging to an org
  (by DBA, or legal name) that appears at only one address statewide. High =
  fragmented, i.e. small independent operators rather than an existing
  multi-location competitor.

The target quadrant is **low density + high fragmentation**: underserved
markets where existing providers are small enough to be realistic
acquisition or partnership targets, not scaled competitors.

## Top 5 Recommended Counties

Filtered to counties with ≥2 captured providers (a 1-provider county is
trivially "100% single-location" and not a meaningful fragmentation read),
ranked by density ascending:

| County | Under-18 Pop. | Providers | Density /10k | Single-Location % |
|---|---:|---:|---:|---:|
| Tarrant (Fort Worth) | 548,477 | 3 | 0.05 | 100% |
| Bexar (San Antonio) | 508,025 | 4 | 0.08 | 100% |
| Denton (DFW suburb) | 224,897 | 2 | 0.09 | 100% |
| Harris (Houston) | 1,243,425 | 11 | 0.09 | 100% |
| Travis (Austin) | 267,667 | 4 | 0.15 | 100% |

These are Texas's largest metros, not overlooked small towns — and that's
the point. Standard healthcare-services roll-up logic: large addressable
child population, thin per-capita coverage even among the providers we can
identify, and the operators we do find are single-location. That's a
consolidation platform waiting to happen, not a market to avoid because
it's "already saturated." Harris and Tarrant stand out — largest population
base with lowest density in the set.

## Data Limitations (read before acting on this)

1. **`pediatric_signal` is a name-matching heuristic**, not a clinical
   classification. It will miss practices with non-obvious names, and can
   be noisy in the other direction — one captured record was a pediatric
   *gastroenterology* practice pulled in via a tangential speech-therapy
   staff taxonomy, not a therapy clinic itself.
2. **The provider universe is a name-matched subset, not a census.** A
   first-pass pull of *every* TX org carrying an SLP/OT/PT taxonomy topped
   120,000 records with no sign of terminating — dominated by home health
   agencies, hospices, and hospital systems listing therapy as one of many
   services, not pediatric clinics. That set is intractable and irrelevant
   here, so providers were instead found by searching organization-name
   keywords ("pediatric," "kids," "child," "peds") crossed with each
   taxonomy — the same heuristic, pushed into the query. **Effect: absolute
   provider counts and density are conservative undercounts everywhere.**
   Read rankings as directional/relative, not an exact census.
3. **Fragmentation likely skews toward "single-location."** A
   multi-location group whose branches don't all carry a pediatric-signal
   name will look more independent than it is. This affects every county
   the same direction, so relative comparisons hold up better than any one
   county's absolute number.
4. **County assignment is ZIP-to-county, not exact address geocoding** —
   standard practice at this level of aggregation, but a provider near a
   county line could be attributed to the wrong side in rare cases.

**Bottom line:** this is a defensible first-pass screen built on free,
public data in a few days, not a substitute for a real census. A
production engagement should license complete rosters from the TX
speech-language pathology, OT, and PT licensing boards — which list every
licensed practice location — to get reliable absolute counts and
fragmentation figures before committing capital to a specific county.
