import type { DataMode } from "@/types/live-intelligence";

export function getDataMode(): DataMode {
  const mode = process.env.TOTALSCOPE_DATA_MODE ?? "demo";
  if (mode !== "demo" && mode !== "live") {
    throw new Error(`Invalid TOTALSCOPE_DATA_MODE "${mode}". Expected "demo" or "live".`);
  }
  return mode;
}

export function requireLiveEnvironment() {
  if (process.env.TOTALSCOPE_INTERNAL_ACCESS_ENABLED !== "true") {
    throw new Error("Live operational access is disabled. Set TOTALSCOPE_INTERNAL_ACCESS_ENABLED=true only in a protected local environment.");
  }
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Live mode requires server-only SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  return { url: url.replace(/\/$/, ""), serviceRoleKey };
}
