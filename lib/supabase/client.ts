"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requirePublicSupabaseEnvironment } from "@/lib/data/config";

export function createClient() {
  const { url, anonKey } = requirePublicSupabaseEnvironment();
  return createBrowserClient(url, anonKey);
}
