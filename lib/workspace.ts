import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { WorkflowState } from "@/lib/verified-clinics";

export const WORKFLOW_STORAGE_KEY = "catchment-clinic-workflow";
export const NOTES_STORAGE_KEY = "catchment-clinic-notes";
export const WORKSPACE_KEY_STORAGE = "catchment-workspace-key";
export const WORKSPACE_CACHE_KEY = "catchment-clinic-workspace";

export type WorkspaceEntry = {
  workflow?: WorkflowState;
  note: string;
  updatedAt: string;
};

export type WorkspaceMap = Record<string, WorkspaceEntry>;

type RemoteRow = {
  clinic_id: string;
  workspace_key: string;
  workflow: string | null;
  note: string | null;
  updated_at: string;
};

function optionalBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export function getOrCreateWorkspaceKey(): string {
  try {
    const existing = window.localStorage.getItem(WORKSPACE_KEY_STORAGE);
    if (existing) return existing;
    const next = crypto.randomUUID();
    window.localStorage.setItem(WORKSPACE_KEY_STORAGE, next);
    return next;
  } catch {
    return "local-only";
  }
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function loadLocalWorkspace(): WorkspaceMap {
  const cached = readJson<WorkspaceMap>(WORKSPACE_CACHE_KEY, {});
  const legacyWorkflow = readJson<Record<string, WorkflowState>>(WORKFLOW_STORAGE_KEY, {});
  const legacyNotes = readJson<Record<string, string>>(NOTES_STORAGE_KEY, {});
  const merged: WorkspaceMap = { ...cached };

  for (const [clinicId, workflow] of Object.entries(legacyWorkflow)) {
    const existing = merged[clinicId];
    merged[clinicId] = {
      ...existing,
      note: existing?.note ?? "",
      updatedAt: existing?.updatedAt ?? new Date(0).toISOString(),
      workflow,
    };
  }

  for (const [clinicId, note] of Object.entries(legacyNotes)) {
    const existing = merged[clinicId];
    merged[clinicId] = {
      ...existing,
      workflow: existing?.workflow,
      updatedAt: existing?.updatedAt ?? new Date(0).toISOString(),
      note,
    };
  }

  return merged;
}

export function writeLocalWorkspace(map: WorkspaceMap) {
  try {
    window.localStorage.setItem(WORKSPACE_CACHE_KEY, JSON.stringify(map));
    const workflow: Record<string, WorkflowState> = {};
    const notes: Record<string, string> = {};
    for (const [clinicId, entry] of Object.entries(map)) {
      if (entry.workflow) workflow[clinicId] = entry.workflow;
      if (entry.note) notes[clinicId] = entry.note;
    }
    window.localStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(workflow));
    window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // Quota or private mode — UI still holds state for this session.
  }
}

function mergeWorkspace(local: WorkspaceMap, remote: RemoteRow[]): WorkspaceMap {
  const next = { ...local };
  for (const row of remote) {
    const current = next[row.clinic_id];
    const remoteTime = Date.parse(row.updated_at) || 0;
    const localTime = current ? Date.parse(current.updatedAt) || 0 : 0;
    if (!current || remoteTime >= localTime) {
      next[row.clinic_id] = {
        workflow: (row.workflow as WorkflowState | null) ?? current?.workflow,
        note: row.note ?? "",
        updatedAt: row.updated_at,
      };
    }
  }
  return next;
}

export async function hydrateWorkspace(): Promise<WorkspaceMap> {
  const local = loadLocalWorkspace();
  const client = optionalBrowserClient();
  if (!client) return local;

  try {
    const workspaceKey = getOrCreateWorkspaceKey();
    const { data, error } = await client
      .from("clinic_workspace")
      .select("clinic_id, workspace_key, workflow, note, updated_at")
      .eq("workspace_key", workspaceKey);
    if (error || !data) return local;
    const merged = mergeWorkspace(local, data as RemoteRow[]);
    writeLocalWorkspace(merged);
    return merged;
  } catch {
    return local;
  }
}

export async function persistWorkspaceEntry(
  clinicId: string,
  entry: WorkspaceEntry
): Promise<boolean> {
  const client = optionalBrowserClient();
  if (!client) return false;

  try {
    const { error } = await client.from("clinic_workspace").upsert(
      {
        clinic_id: clinicId,
        workspace_key: getOrCreateWorkspaceKey(),
        workflow: entry.workflow ?? null,
        note: entry.note,
        updated_at: entry.updatedAt,
      },
      { onConflict: "clinic_id,workspace_key" }
    );
    return !error;
  } catch {
    return false;
  }
}

export function notesFromWorkspace(map: WorkspaceMap): Record<string, string> {
  const notes: Record<string, string> = {};
  for (const [clinicId, entry] of Object.entries(map)) {
    if (entry.note.trim()) notes[clinicId] = entry.note;
  }
  return notes;
}
