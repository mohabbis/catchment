import { VERIFIED_CLINICS, type VerifiedClinic } from "@/lib/verified-clinics";

const WIDTH = 720;
const HEIGHT = 420;
const WEST = -106.65;
const EAST = -93.51;
const SOUTH = 25.84;
const NORTH = 36.5;

const METRO_LABELS = [
  { id: "dfw", label: "DFW", lat: 32.9, lng: -96.9 },
  { id: "houston", label: "Houston", lat: 29.85, lng: -95.4 },
  { id: "austin", label: "Austin", lat: 30.4, lng: -97.75 },
  { id: "san-antonio", label: "San Antonio", lat: 29.55, lng: -98.5 },
] as const;

function project(lat: number, lng: number) {
  const x = ((lng - WEST) / (EAST - WEST)) * WIDTH;
  const y = ((NORTH - lat) / (NORTH - SOUTH)) * HEIGHT;
  return { x, y };
}

function dotFill(clinic: VerifiedClinic) {
  if (clinic.classification === "target_candidate") return "var(--forest)";
  if (clinic.classification === "verified_operator") return "var(--ink)";
  return "var(--violet)";
}

export default function CatchmentMap({
  selectedClinicId,
  onOpenClinic,
}: {
  selectedClinicId: string | null;
  onOpenClinic: (clinicId: string) => void;
}) {
  return (
    <article className="panel p-5" data-testid="catchment-map">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-faint)]">
            Approximate metro map
          </p>
          <h2 className="serif mt-1 text-2xl font-semibold">Verified clinics</h2>
        </div>
        <p className="max-w-sm text-xs leading-5 text-[var(--ink-faint)]">
          City-level coordinates, approximate. Not a rooftop map. Click a dot to open the
          sourcing drawer.
        </p>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-4 w-full rounded-md border border-[var(--line)] bg-[var(--paper)]"
        role="img"
        aria-label="Approximate Texas catchment map of verified clinics"
      >
        <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="var(--paper)" />
        {METRO_LABELS.map((metro) => {
          const point = project(metro.lat, metro.lng);
          return (
            <text
              key={metro.id}
              x={point.x}
              y={point.y - 18}
              textAnchor="middle"
              fill="var(--ink-faint)"
              fontSize="13"
              fontWeight="600"
            >
              {metro.label}
            </text>
          );
        })}
        {VERIFIED_CLINICS.map((clinic) => {
          const point = project(clinic.lat, clinic.lng);
          const selected = clinic.id === selectedClinicId;
          return (
            <g key={clinic.id} transform={`translate(${point.x} ${point.y})`}>
              <circle
                r={selected ? 8 : 6}
                fill={dotFill(clinic)}
                opacity={selected ? 1 : 0.88}
                stroke={selected ? "var(--ink)" : "var(--card)"}
                strokeWidth={selected ? 2 : 1}
                className="cursor-pointer"
                data-testid={`map-dot-${clinic.id}`}
                onClick={() => onOpenClinic(clinic.id)}
              >
                <title>
                  {clinic.name} · {clinic.city}
                </title>
              </circle>
            </g>
          );
        })}
      </svg>

      <ul className="mt-3 flex flex-wrap gap-4 text-[11px] text-[var(--ink-soft)]">
        <li>
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[var(--forest)]" />
          Target
        </li>
        <li>
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[var(--ink)]" />
          Verified
        </li>
        <li>
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[var(--violet)]" />
          Pass / benchmark
        </li>
      </ul>
    </article>
  );
}
