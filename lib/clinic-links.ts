import raw from "@/data/clinic-link-status.json";

export type ClinicLinkStatus = {
  ok: boolean;
  status: number | null;
  checkedOn: string;
  url: string;
  error?: string;
};

export type ClinicLinkStatusFile = {
  checkedOn: string | null;
  sites: Record<string, ClinicLinkStatus>;
};

const file = raw as ClinicLinkStatusFile;

export function linkStatusFor(clinicId: string): ClinicLinkStatus | null {
  return file.sites[clinicId] ?? null;
}

export function linkStatusHeadline(clinicId: string): string | null {
  const row = linkStatusFor(clinicId);
  if (!row) return null;
  if (row.ok) return `Site live as of ${row.checkedOn} (HTTP ${row.status ?? "ok"})`;
  if (row.status === 404) return `Site 404 as of ${row.checkedOn}`;
  if (row.error) return `Site check failed ${row.checkedOn}: ${row.error}`;
  return `Site not confirmed live as of ${row.checkedOn} (HTTP ${row.status ?? "n/a"})`;
}
