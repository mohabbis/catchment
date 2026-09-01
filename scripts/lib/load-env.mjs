// Minimal .env.local loader for standalone scripts (Next.js auto-loads
// .env.local itself, but these scripts run outside the Next.js process).
// No dependency needed for something this small.
import { readFile } from "node:fs/promises";

export async function loadEnvLocal() {
  let contents;
  try {
    contents = await readFile(".env.local", "utf-8");
  } catch {
    return;
  }
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
