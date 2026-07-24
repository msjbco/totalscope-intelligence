import { NextResponse } from "next/server";
import { getDataMode, requirePublicSupabaseEnvironment } from "@/lib/data/config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const mode = getDataMode();
    if (mode === "demo") {
      return NextResponse.json({ app:"ok",configuration:"ok",database:"not_configured" });
    }
    const { url, anonKey } = requirePublicSupabaseEnvironment();
    const response = await fetch(`${url}/rest/v1/rpc/totalscope_health`, {
      method:"POST",
      headers:{apikey:anonKey,Authorization:`Bearer ${anonKey}`,"Content-Type":"application/json"},
      body:"{}",
      cache:"no-store",
    });
    const healthy=response.ok;
    return NextResponse.json(
      {app:"ok",configuration:"ok",database:healthy?"ok":"unavailable"},
      {status:healthy?200:503},
    );
  } catch {
    return NextResponse.json(
      {app:"ok",configuration:"invalid",database:"not_checked"},
      {status:503},
    );
  }
}
