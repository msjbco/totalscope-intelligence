import "server-only";

import { requirePublicSupabaseEnvironment } from "./config";
import { createClient } from "@/lib/supabase/server";

export async function supabaseRest<T>(path: string): Promise<T> {
  const { url, anonKey } = requirePublicSupabaseEnvironment();
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Authentication required.");
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Authenticated session is unavailable.");
  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${session.access_token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Authenticated data request failed (${response.status}).`);
  }
  return response.json() as Promise<T>;
}
