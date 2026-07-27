import Link from "next/link";
import type { EvaluatedKpi } from "@/lib/analytics/kpis";

export const money = (value: number | null) => value === null ? "Unavailable" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value / 100);
export const number = (value: number | null) => value === null ? "Unavailable" : new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
export const percent = (value: number | null) => value === null ? "Unavailable" : `${(value * 100).toFixed(0)}%`;

export function DemoNotice() {
  return <div className="operations-demo" role="note"><b>Demo Data</b><span>Synthetic C3 validation dataset · captured June 30, 2026 · no live integrations</span></div>;
}

export function MetricCard({ kpi, href, tone = "cyan" }: { kpi: EvaluatedKpi; href?: string; tone?: string }) {
  const value = typeof kpi.value === "number"
    ? kpi.unit === "currency_minor" ? money(kpi.value) : kpi.unit === "ratio" ? percent(kpi.value) : number(kpi.value)
    : kpi.value === null ? "Unavailable" : `${Object.keys(kpi.value).length} groups`;
  return <article className="card operations-metric">
    <i className={tone} />
    <small>{kpi.label}</small><strong>{value}</strong>
    <p>{kpi.explanation}</p>
    <footer><span>{kpi.coveragePercent.toFixed(0)}% coverage · {kpi.status}</span>{href && <Link href={href}>Review →</Link>}</footer>
  </article>;
}

export function PageNav() {
  return <nav className="operations-tabs" aria-label="Operations sections">
    <Link href="/operations">Overview</Link><Link href="/operations/clients">Clients</Link>
    <Link href="/operations/files">Files</Link><Link href="/operations/handlers">Handlers</Link>
    <Link href="/operations/data-health">Data Health</Link>
  </nav>;
}

export function OperationsTable({ children, labels }: { children: React.ReactNode; labels: string[] }) {
  return <div className="card operations-table-wrap"><table className="operations-table"><thead><tr>{labels.map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

export function EmptyValue({ children }: { children: React.ReactNode }) {
  return children === null || children === undefined ? <span className="unavailable">Unavailable</span> : <>{children}</>;
}
