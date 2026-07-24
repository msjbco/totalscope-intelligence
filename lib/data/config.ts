import type { DataMode } from "@/types/live-intelligence";

export function getDataMode(): DataMode {
  const mode = process.env.TOTALSCOPE_DATA_MODE;
  if (mode !== "demo" && mode !== "live") {
    throw new Error("TOTALSCOPE_DATA_MODE must be explicitly set to \"demo\" or \"live\".");
  }
  return mode;
}

export type DeploymentEnvironment = "local" | "staging" | "production";

export function getDeploymentEnvironment(): DeploymentEnvironment {
  const value = process.env.TOTALSCOPE_DEPLOYMENT_ENV ?? "local";
  if (value !== "local" && value !== "staging" && value !== "production") {
    throw new Error("TOTALSCOPE_DEPLOYMENT_ENV must be local, staging, or production.");
  }
  return value;
}

export function requirePublicSupabaseEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Live mode requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  if (!/^https?:\/\//.test(url)) throw new Error("NEXT_PUBLIC_SUPABASE_URL must be an absolute HTTP(S) URL.");
  return { url: url.replace(/\/$/, ""), anonKey };
}

export function validateApplicationEnvironment() {
  const mode = getDataMode();
  const deployment = getDeploymentEnvironment();
  if (deployment !== "local" && mode !== "live") {
    throw new Error(`${deployment} deployments require TOTALSCOPE_DATA_MODE=live.`);
  }
  if (mode === "live") requirePublicSupabaseEnvironment();
  return { mode, deployment };
}
