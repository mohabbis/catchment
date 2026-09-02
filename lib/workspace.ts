import type { WorkflowState } from "@/lib/verified-clinics";

// Clinic workflow + notes are per-browser and stay there. There is no sync,
// no account, and no server copy — the drawer copy ("stays on this laptop")
// is the whole contract. Do not reintroduce a shared table behind it.

export const WORKFLOW_STORAGE_KEY = "catchment-clinic-workflow";
export const NOTES_STORAGE_KEY = "catchment-clinic-notes";
export const WORKSPACE_CACHE_KEY = "catchment-clinic-workspace";

export type WorkspaceEntry = {
  workflow?: WorkflowState;
  note: string;
  updatedAt: string;
};

export type WorkspaceMap = Record<string, WorkspaceEntry>;

/** Stable identity so the server snapshot never re-renders on its own. */
const EMPTY_WORKSPACE: WorkspaceMap = {};

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
    // Quota or private mode — the in-memory snapshot still holds for this session.
  }
}

// --- External store, so components read storage without an effect ----------

let snapshot: WorkspaceMap | null = null;
const listeners = new Set<() => void>();

export function subscribeWorkspace(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function getWorkspaceSnapshot(): WorkspaceMap {
  if (!snapshot) snapshot = loadLocalWorkspace();
  return snapshot;
}

/** The server has no localStorage; it renders an empty workspace. */
export function getServerWorkspaceSnapshot(): WorkspaceMap {
  return EMPTY_WORKSPACE;
}

export function setWorkspaceEntry(clinicId: string, entry: WorkspaceEntry) {
  snapshot = { ...getWorkspaceSnapshot(), [clinicId]: entry };
  writeLocalWorkspace(snapshot);
  for (const listener of listeners) listener();
}

export function notesFromWorkspace(map: WorkspaceMap): Record<string, string> {
  const notes: Record<string, string> = {};
  for (const [clinicId, entry] of Object.entries(map)) {
    if (entry.note.trim()) notes[clinicId] = entry.note;
  }
  return notes;
}
