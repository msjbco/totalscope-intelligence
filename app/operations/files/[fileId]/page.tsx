import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/shell";
import { DemoNotice, PageNav, money } from "@/components/operations/operations-ui";
import { operationsFiles } from "@/lib/operations/demo-repository";

export default async function FilePage({ params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const file = operationsFiles().find((item) => item.id === fileId);
  if (!file) notFound();
  return <DashboardShell title={file.id} eyebrow="CANONICAL FILE DETAIL"><DemoNotice/><PageNav/>
    <div className="operations-layout">
      <section className="card detail-panel"><header><small>OPERATIONAL IDENTITY</small><h2>Authoritative file facts</h2></header><dl className="detail-list">
        <div><dt>Client</dt><dd>{file.clientName}</dd></div><div><dt>Branch</dt><dd>{file.branchName}</dd></div><div><dt>Service</dt><dd>{file.serviceType.replace("_"," ")}</dd></div><div><dt>Status / stage</dt><dd>{file.status.replaceAll("_"," ")}</dd></div>
        <div><dt>Carrier</dt><dd>{file.carrierName ?? "Unavailable"}</dd></div><div><dt>Assignment</dt><dd>{file.handlerName} · {file.assignmentType?.replaceAll("_"," ")}</dd></div>
        <div><dt>Submitted</dt><dd>{file.submittedAt ? new Date(file.submittedAt).toLocaleString("en-US") : "Unavailable"}</dd></div><div><dt>Completed</dt><dd>{file.completedAt ? new Date(file.completedAt).toLocaleString("en-US") : "Not applicable — active"}</dd></div>
      </dl></section>
      <section className="card detail-panel"><header><small>FINANCIAL RESULTS</small><h2>Captured canonical facts</h2></header><dl className="detail-list">
        <div><dt>Initial carrier amount</dt><dd>{money(file.initialRcvMinor)}</dd></div><div><dt>Final settlement</dt><dd>{money(file.finalRcvMinor)}</dd></div><div><dt>Settlement gain</dt><dd>{money(file.settlementGainMinor)}</dd></div><div><dt>Approved charges</dt><dd>{money(file.approvedChargesMinor)}</dd></div>
      </dl><div className="derived-callout"><small>AVAILABILITY</small><strong>{file.financialAvailability.replace("_"," ")}</strong><p>Unavailable facts are never converted to zero. This result is traceable through the lineage section below.</p></div></section>
    </div>
    <div className="operations-layout">
      <section className="card detail-panel"><header><small>LIFECYCLE</small><h2>Status timeline</h2></header><ol className="operations-timeline">{file.timeline.map((event) => <li key={event.status_event_id}><i/><div><b>{event.status.replaceAll("_"," ")}</b><span>{new Date(event.effective_at).toLocaleString("en-US")}</span></div></li>)}</ol></section>
      <section className="card detail-panel"><header><small>SUPPORTING METADATA</small><h2>Notes and documents</h2></header><div className="live-narrative">{file.notes.length} note record{file.notes.length===1?"":"s"} · {file.documents.length} document record{file.documents.length===1?"":"s"}. Content and binary documents remain outside this viewer surface.</div></section>
    </div>
    <section className="card detail-panel"><header><small>SOURCE LINEAGE</small><h2>Why these facts can be trusted</h2></header><table className="operations-table"><thead><tr><th>Canonical field</th><th>Source</th><th>Confidence / availability</th></tr></thead><tbody>{file.lineage.map((line) => <tr key={line.field}><th scope="row">{line.field}</th><td>{line.source}</td><td>{line.confidence.replace("_"," ")}</td></tr>)}</tbody></table></section>
  </DashboardShell>;
}
