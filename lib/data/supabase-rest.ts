import { requireLiveEnvironment } from "./config";

export async function supabaseRest<T>(path: string): Promise<T> {
  const { url, serviceRoleKey } = requireLiveEnvironment();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Live data request failed (${response.status}): ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}
