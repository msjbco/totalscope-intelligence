import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/shell";
import { DemoNotice, MetricCard, PageNav, money } from "@/components/operations/operations-ui";
import { operationKpi, operationsClients, operationsDataHealth, operationsFiles, operationsHandlers } from "@/lib/operations/demo-repository";

export default function OperationsPage() {
  const files = operationsFiles();
  const clients = operationsClients();
  const handlers = operationsHandlers();
  const health = operationsDataHealth();
  const attention = [
    { label: "Stalled files", value: operationKpi("stalled_files").value, href: "/operations/files?attention=stalled" },
    { label: "Aging files", value: operationKpi("aging_files").value, href: "/operations/files?attention=aging" },
    { label: "Failed payments", value: operationKpi("failed_payments").value, href: "/operations/data-health" },
    { label: "Missing financial values", value: health.missingFinancial, href: "/operations/data-health" },
  ];
  return <DashboardShell title="Executive Operations" eyebrow="TOTALSCOPE INTELLIGENCE · C3">
    <DemoNotice/><PageNav/>
    <section aria-labelledby="executive-summary"><div className="operations-section-heading"><div><small>EXECUTIVE SUMMARY</small><h2 id="executive-summary">What requires leadership attention today?</h2></div><span>Evaluation as of Jun 30, 2026</span></div>
      <div className="operations-metric-grid">
        {["new_files","active_files","completed_files","settlement_gain","approved_charges","client_net_gain","roi"].map((key) => <MetricCard key={key} kpi={operationKpi(key)} href={key.includes("file") ? "/operations/files" : "/operations/clients"} />)}
        <article className="card operations-metric"><i className="green"/><small>Data Health</small><strong>{health.kpiAvailability.toFixed(0)}%</strong><p>Versioned KPIs with authoritative inputs available.</p><footer><span>{health.missingFinancial} files limited</span><Link href="/operations/data-health">Review →</Link></footer></article>
      </div>
    </section>
    <div className="operations-layout">
      <section className="card attention-panel"><header><div><small>ATTENTION REQUIRED</small><h2>Operational fires</h2></div><Link href="/operations/data-health">Open Data Health →</Link></header>
        {attention.map((item) => <Link href={item.href} key={item.label} className="attention-row"><span>{item.label}</span><strong>{String(item.value ?? "—")}</strong><em>Investigate →</em></Link>)}
      </section>
      <section className="card trend-panel"><header><small>OPERATIONAL MIX</small><h2>Service and client activity</h2></header>
        <div className="trend-bars" role="img" aria-label="Synthetic file volume by client">
          {clients.map((client) => <div key={client.id}><span>{client.name}</span><i><b style={{width:`${client.files.length / files.length * 100}%`}}/></i><strong>{client.files.length}</strong></div>)}
        </div>
        <footer><span>{operationKpi("estimate_only_files").value as number} estimate-only</span><span>{operationKpi("claim_handling_files").value as number} claim-handling</span></footer>
      </section>
    </div>
    <div className="operations-layout">
      <section className="card performance-panel"><header><div><small>PERFORMANCE</small><h2>Claim-handler production</h2></div><Link href="/operations/handlers">All handlers →</Link></header>
        {handlers.map((handler) => <Link href={`/operations/handlers/${handler.id}`} className="performance-row" key={handler.id}><div><b>{handler.name}</b><small>{handler.completed} completed · {handler.active} active</small></div><strong>{money(handler.totalSettlementGainMinor)}</strong><span className={handler.eligibleForComparison ? "eligible" : "limited"}>{handler.eligibleForComparison ? "Comparable" : `Below n=${handler.minimumCohort}`}</span></Link>)}
      </section>
      <section className="card financial-panel"><header><small>FINANCIAL RESULTS</small><h2>Traceable value creation</h2></header>
        {["initial_carrier_amount","final_settlement_amount","collected_amount","refunds","processor_fees","net_collections"].map((key) => { const kpi=operationKpi(key); return <div key={key}><span>{kpi.label}</span><strong>{typeof kpi.value === "number" ? money(kpi.value) : "Unavailable"}</strong></div>})}
      </section>
    </div>
  </DashboardShell>;
}
