import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/shell";
import { DemoNotice, OperationsTable, PageNav, money, percent } from "@/components/operations/operations-ui";
import { operationsClients } from "@/lib/operations/demo-repository";
import { getDataMode } from "@/lib/data/config";
import { liveClient } from "@/lib/operations/live-client-repository";

export default async function ClientPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  if (getDataMode() === "live") {
    const client = await liveClient(clientId);
    if (!client) notFound();
    return <DashboardShell title={client.displayName} eyebrow="GOVERNED CLIENT PROFILE" mode="live" showFilters={false}><PageNav/>
      <div className="operations-summary-strip"><div><small>Locations</small><strong>{client.locations.length}</strong></div><div><small>Lifecycle</small><strong>{client.lifecycleStatus}</strong></div><div><small>Source status</small><strong>{client.sourceStatusCode ?? "Unavailable"}</strong></div><div><small>Geocoded</small><strong>{client.locations.filter((location) => location.geocodingStatus === "matched").length}</strong></div></div>
      <OperationsTable labels={["Location","Address","Precision","Geocoding"]}>
        {client.locations.map((location) => <tr key={location.id}><th scope="row">{location.displayName}</th><td>{[location.streetAddress, location.city, location.stateCode, location.postalCode].filter(Boolean).join(", ") || "Unavailable"}</td><td>{location.locationPrecision.replaceAll("_", " ")}</td><td>{location.geocodingStatus.replaceAll("_", " ")}</td></tr>)}
      </OperationsTable>
      <section className="card detail-panel"><header><small>DATA GOVERNANCE</small><h2>Interpretation guidance</h2></header><p className="live-narrative">This internal profile preserves source identity and lifecycle uncertainty. Contact details are intentionally excluded from this browser surface. Exact Weather exposure is unavailable until a governed geocoder supplies defensible location precision.</p></section>
    </DashboardShell>;
  }
  const client = operationsClients().find((item) => item.id === clientId);
  if (!client) notFound();
  return <DashboardShell title={client.name} eyebrow="CLIENT OPERATIONAL REVIEW"><DemoNotice/><PageNav/>
    <div className="operations-summary-strip">
      <div><small>Files</small><strong>{client.files.length}</strong></div><div><small>Active</small><strong>{client.active}</strong></div>
      <div><small>Completed</small><strong>{client.completed}</strong></div><div><small>Settlement gain</small><strong>{money(client.settlementGainMinor)}</strong></div>
      <div><small>Approved charges</small><strong>{money(client.approvedChargesMinor)}</strong></div><div><small>Net gain</small><strong>{money(client.netGainMinor)}</strong></div><div><small>ROI</small><strong>{percent(client.roi)}</strong></div>
    </div>
    <div className="operations-layout">
      <section className="card detail-panel"><header><small>BRANCHES</small><h2>Operating footprint</h2></header><div className="detail-list">{client.branches.map((branch) => <div key={branch.branch_id}><dt>{branch.branch_name}</dt><dd>{client.files.filter((file) => file.branchId === branch.branch_id).length} files</dd></div>)}</div></section>
      <section className="card detail-panel"><header><small>DATA LIMITATIONS</small><h2>Interpretation guidance</h2></header><div className="live-narrative">Results use synthetic fixtures. Carrier mix excludes unavailable carriers. Cycle-time measures require both authoritative submitted and completed dates. Missing amounts are excluded from financial denominators.</div></section>
    </div>
    <OperationsTable labels={["File","Branch","Service","Status","Carrier","Settlement gain","Charges"]}>
      {client.files.map((file) => <tr key={file.id}><th scope="row"><Link href={`/operations/files/${file.id}`}>{file.id}</Link></th><td>{file.branchName}</td><td>{file.serviceType.replace("_"," ")}</td><td>{file.status.replaceAll("_"," ")}</td><td>{file.carrierName ?? "Unavailable"}</td><td>{money(file.settlementGainMinor)}</td><td>{money(file.approvedChargesMinor)}</td></tr>)}
    </OperationsTable>
  </DashboardShell>;
}
