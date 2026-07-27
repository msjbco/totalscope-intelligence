import { DashboardShell } from "@/components/dashboard/shell";
import { DemoNotice, OperationsTable, PageNav } from "@/components/operations/operations-ui";
import { operationsDataHealth } from "@/lib/operations/demo-repository";

export default function DataHealthPage() {
  const health = operationsDataHealth();
  return <DashboardShell title="Data Health" eyebrow="ADMINISTRATOR REVIEW SURFACE"><DemoNotice/><PageNav/>
    <div className="operations-summary-strip"><div><small>KPI availability</small><strong>{health.kpiAvailability.toFixed(0)}%</strong></div><div><small>Financial coverage</small><strong>{health.financialCoverage.toFixed(0)}%</strong></div><div><small>Missing dates</small><strong>{health.missingDates}</strong></div><div><small>Missing financial</small><strong>{health.missingFinancial}</strong></div><div><small>Unmatched financial</small><strong>{health.unmatchedFinancial}</strong></div><div><small>Ambiguous mappings</small><strong>{health.ambiguousMappings}</strong></div></div>
    <div className="operations-section-heading"><div><small>IMPORT HISTORY</small><h2>Deterministic fixture reconciliation</h2></div><span>Captured {new Date(health.capturedAt).toLocaleString("en-US")}</span></div>
    <OperationsTable labels={["Source","Status","Records","Open issues"]}>{health.imports.map((run) => <tr key={run.source}><th scope="row">{run.source}</th><td><span className="eligible">{run.status}</span></td><td>{run.records}</td><td>{run.issues}</td></tr>)}</OperationsTable>
    <section className="card detail-panel data-health-evidence"><header><small>VALIDATION EVIDENCE</small><h2>Source-level integrity</h2></header><dl className="detail-list"><div><dt>Fixture fingerprint</dt><dd>{health.fixtureFingerprint}</dd></div><div><dt>Duplicate/conflicting rows</dt><dd>{health.duplicateRecords}</dd></div><div><dt>Low-confidence mappings</dt><dd>{health.lowConfidenceMappings}</dd></div><div><dt>Financial interpretation</dt><dd>Zero, missing, unavailable, and not applicable remain distinct.</dd></div></dl></section>
  </DashboardShell>;
}
