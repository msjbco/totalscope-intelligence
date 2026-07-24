import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ApplicationRole = "viewer" | "staging_admin";

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user;
}

export async function requireUser() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireLiveUser() {
  if (process.env.TOTALSCOPE_DATA_MODE === "live") return requireUser();
  return null;
}

export async function requireRole(required: ApplicationRole) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("application_profiles")
    .select("role,active")
    .eq("user_id", user.id)
    .single();
  if (error || !data?.active || data.role !== required) redirect("/dashboard?access=denied");
  return { user, role: data.role as ApplicationRole };
}
