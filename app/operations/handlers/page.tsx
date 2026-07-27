import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/shell";
import { DemoNotice, OperationsTable, PageNav, money, number } from "@/components/operations/operations-ui";
import { operationsHandlers } from "@/lib/operations/demo-repository";

export default function HandlersPage() {
  return <DashboardShell title="Claim-Handler Performance" eyebrow="PRODUCTION WITH SAMPLE-SIZE GUARDRAILS"><DemoNotice/><PageNav/>
    <div className="operations-section-heading"><div><small>PERFORMANCE</small><h2>Counts remain visible; rankings require the comparative threshold</h2></div><span>Default minimum cohort: 10 completed files</span></div>
    <OperationsTable labels={["Handler","Assigned","Active","Completed","Average cycle","Settlement gain","Eligibility"]}>
      {operationsHandlers().map((handler) => <tr key={handler.id}><th scope="row"><Link href={`/operations/handlers/${handler.id}`}>{handler.name}</Link></th><td>{handler.files.length}</td><td>{handler.active}</td><td>{handler.completed}</td><td>{handler.averageCycleDays === null ? "Unavailable" : `${number(handler.averageCycleDays)} days`}</td><td>{money(handler.totalSettlementGainMinor)}</td><td><span className={handler.eligibleForComparison ? "eligible" : "limited"}>{handler.eligibleForComparison ? "Eligible" : `Not ranked · n<${handler.minimumCohort}`}</span></td></tr>)}
    </OperationsTable>
  </DashboardShell>;
}
