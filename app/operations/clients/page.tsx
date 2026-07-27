import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/shell";
import { DemoNotice, OperationsTable, PageNav, money, percent } from "@/components/operations/operations-ui";
import { operationsClients } from "@/lib/operations/demo-repository";

export default function ClientsPage() {
  return <DashboardShell title="Client Operations" eyebrow="CLIENT & BRANCH PERFORMANCE"><DemoNotice/><PageNav/>
    <div className="operations-section-heading"><div><small>CLIENT PORTFOLIO</small><h2>Operational and financial outcomes by client</h2></div><span>Summary first · file support one click away</span></div>
    <OperationsTable labels={["Client","Branches","Files","Active","Completed","Settlement gain","Approved charges","Net gain","ROI"]}>
      {operationsClients().map((client) => <tr key={client.id}><th scope="row"><Link href={`/operations/clients/${client.id}`}>{client.name}</Link></th><td>{client.branches.length}</td><td>{client.files.length}</td><td>{client.active}</td><td>{client.completed}</td><td>{money(client.settlementGainMinor)}</td><td>{money(client.approvedChargesMinor)}</td><td>{money(client.netGainMinor)}</td><td>{percent(client.roi)}</td></tr>)}
    </OperationsTable>
  </DashboardShell>;
}
