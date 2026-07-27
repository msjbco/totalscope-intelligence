import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/shell";
import { DemoNotice, OperationsTable, PageNav, money, percent } from "@/components/operations/operations-ui";
import { operationsClients } from "@/lib/operations/demo-repository";

export default async function ClientPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
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
