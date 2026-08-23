import "server-only";

import { supabaseRest } from "@/lib/data/supabase-rest";

export type LiveClientLocation = {
  id: string;
  displayName: string;
  streetAddress: string | null;
  city: string | null;
  stateCode: string | null;
  postalCode: string | null;
  locationPrecision: string;
  geocodingStatus: string;
};

export type LiveClient = {
  id: string;
  displayName: string;
  lifecycleStatus: "current" | "inactive" | "unknown";
  sourceStatusCode: string | null;
  locations: LiveClientLocation[];
};

type ClientRow = { id: string; display_name: string; lifecycle_status: LiveClient["lifecycleStatus"]; source_status_code: string | null };
type BranchRow = { id: string; client_id: string; display_name: string; street_address: string | null; city: string | null; state_code: string | null; postal_code: string | null; location_precision: string; geocoding_status: string };

export async function liveClients(): Promise<LiveClient[]> {
  const [clients, branches] = await Promise.all([
    supabaseRest<ClientRow[]>("clients?restricted_master_data=eq.true&select=id,display_name,lifecycle_status,source_status_code&order=display_name"),
    supabaseRest<BranchRow[]>("branches?restricted_master_data=eq.true&select=id,client_id,display_name,street_address,city,state_code,postal_code,location_precision,geocoding_status&order=display_name"),
  ]);
  return clients.map((client) => ({ id: client.id, displayName: client.display_name, lifecycleStatus: client.lifecycle_status, sourceStatusCode: client.source_status_code, locations: branches.filter((branch) => branch.client_id === client.id).map((branch) => ({ id: branch.id, displayName: branch.display_name, streetAddress: branch.street_address, city: branch.city, stateCode: branch.state_code, postalCode: branch.postal_code, locationPrecision: branch.location_precision, geocodingStatus: branch.geocoding_status })) }));
}

export async function liveClient(clientId: string) {
  return (await liveClients()).find((client) => client.id === clientId) ?? null;
}
