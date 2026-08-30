import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/shell";
import { DemoNotice, OperationsTable, PageNav, money, percent } from "@/components/operations/operations-ui";
import { operationsClients } from "@/lib/operations/demo-repository";
import { getDataMode } from "@/lib/data/config";
import { liveClients } from "@/lib/operations/live-client-repository";

export default async function ClientsPage() {
  if (getDataMode() === "live") {
    const clients = await liveClients();
    return <DashboardShell title="Client Operations" eyebrow="GOVERNED CLIENT MASTER" mode="live" showFilters={false}><PageNav/>
      <div className="operations-section-heading"><div><small>INTERNAL CLIENT DIRECTORY</small><h2>Authoritative companies and locations</h2></div><span>Restricted to TotalScope administrators</span></div>
      <OperationsTable labels={["Client","Locations","Lifecycle","Source status","Geocoding"]}>
        {clients.map((client) => <tr key={client.id}><th scope="row"><Link href={`/operations/clients/${client.id}`}>{client.displayName}</Link></th><td>{client.locations.length}</td><td>{client.lifecycleStatus}</td><td>{client.sourceStatusCode ?? "Unavailable"}</td><td>{client.locations.filter((location) => location.geocodingStatus === "matched").length} of {client.locations.length} matched</td></tr>)}
      </OperationsTable>
    </DashboardShell>;
  }
  return <DashboardShell title="Client Operations" eyebrow="CLIENT & BRANCH PERFORMANCE"><DemoNotice/><PageNav/>
    <div className="operations-section-heading"><div><small>CLIENT PORTFOLIO</small><h2>Operational and financial outcomes by client</h2></div><span>Summary first · file support one click away</span></div>
    <OperationsTable labels={["Client","Branches","Files","Active","Completed","Settlement gain","Approved charges","Net gain","ROI"]}>
      {operationsClients().map((client) => <tr key={client.id}><th scope="row"><Link href={`/operations/clients/${client.id}`}>{client.name}</Link></th><td>{client.branches.length}</td><td>{client.files.length}</td><td>{client.active}</td><td>{client.completed}</td><td>{money(client.settlementGainMinor)}</td><td>{money(client.approvedChargesMinor)}</td><td>{money(client.netGainMinor)}</td><td>{percent(client.roi)}</td></tr>)}
    </OperationsTable>
  </DashboardShell>;
}
