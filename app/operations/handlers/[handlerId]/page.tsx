import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/shell";
import { DemoNotice, OperationsTable, PageNav, money, number } from "@/components/operations/operations-ui";
import { operationsHandlers } from "@/lib/operations/demo-repository";

export default async function HandlerPage({ params }: { params: Promise<{ handlerId: string }> }) {
  const { handlerId } = await params;
  const handler = operationsHandlers().find((item) => item.id === handlerId);
  if (!handler) notFound();
  return <DashboardShell title={handler.name} eyebrow="CLAIM-HANDLER REVIEW"><DemoNotice/><PageNav/>
    {!handler.eligibleForComparison && <div className="cohort-warning"><b>Comparative ranking withheld</b><span>{handler.completed} completed files are below the configured minimum cohort of {handler.minimumCohort}. Production counts remain available without implying a reliable ranking.</span></div>}
    <div className="operations-summary-strip"><div><small>Assigned</small><strong>{handler.files.length}</strong></div><div><small>Active workload</small><strong>{handler.active}</strong></div><div><small>Completed</small><strong>{handler.completed}</strong></div><div><small>Average cycle</small><strong>{handler.averageCycleDays === null ? "Unavailable" : `${number(handler.averageCycleDays)} days`}</strong></div><div><small>Total settlement gain</small><strong>{money(handler.totalSettlementGainMinor)}</strong></div><div><small>Average gain</small><strong>{money(handler.averageSettlementGainMinor)}</strong></div></div>
    <OperationsTable labels={["File","Client","Status","Carrier","Settlement gain"]}>{handler.files.map((file) => <tr key={file.id}><th scope="row"><Link href={`/operations/files/${file.id}`}>{file.id}</Link></th><td>{file.clientName}</td><td>{file.status.replaceAll("_"," ")}</td><td>{file.carrierName ?? "Unavailable"}</td><td>{money(file.settlementGainMinor)}</td></tr>)}</OperationsTable>
  </DashboardShell>;
}
