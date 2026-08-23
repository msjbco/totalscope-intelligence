import "server-only";

import { supabaseRest } from "@/lib/data/supabase-rest";
import type { ClientBranchLocation } from "@/lib/weather/contracts";

type BranchRow = {
  client_id: string;
  branch_id: string;
  client_name: string;
  branch_name: string;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  state_code: string | null;
  postal_code: string | null;
  location_precision: ClientBranchLocation["locationPrecision"];
};

export async function listInternalBranchLocations(): Promise<ClientBranchLocation[]> {
  const rows = await supabaseRest<BranchRow[]>("rpc/get_weather_internal_client_locations_v2");
  return rows.map((row) => ({ clientId: row.client_id, branchId: row.branch_id, clientName: row.client_name, branchName: row.branch_name, latitude: row.latitude, longitude: row.longitude, city: row.city, state: row.state_code, postalCode: row.postal_code, locationPrecision: row.location_precision }));
}
