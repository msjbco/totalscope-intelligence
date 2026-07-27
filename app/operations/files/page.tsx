import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/shell";
import { DemoNotice, OperationsTable, PageNav, money } from "@/components/operations/operations-ui";
import { operationsFiles } from "@/lib/operations/demo-repository";

export default function FilesPage() {
  return <DashboardShell title="Operational Files" eyebrow="TRACEABLE FILE INVENTORY"><DemoNotice/><PageNav/>
    <div className="operations-section-heading"><div><small>SUPPORTING RECORDS</small><h2>Every result connects to a canonical file</h2></div><span>{operationsFiles().length} synthetic files</span></div>
    <OperationsTable labels={["File","Client / branch","Service","Status","Handler","Carrier","Submitted","Settlement gain","Data"]}>
      {operationsFiles().map((file) => <tr key={file.id}><th scope="row"><Link href={`/operations/files/${file.id}`}>{file.id}</Link></th><td><b>{file.clientName}</b><small>{file.branchName}</small></td><td>{file.serviceType.replace("_"," ")}</td><td>{file.status.replaceAll("_"," ")}</td><td>{file.handlerName}</td><td>{file.carrierName ?? "Unavailable"}</td><td>{file.submittedAt ? new Date(file.submittedAt).toLocaleDateString("en-US") : "Unavailable"}</td><td>{money(file.settlementGainMinor)}</td><td><span className={`financial-status ${file.financialAvailability}`}>{file.financialAvailability.replace("_"," ")}</span></td></tr>)}
    </OperationsTable>
  </DashboardShell>;
}
