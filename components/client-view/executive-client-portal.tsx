"use client";

import Link from "next/link";
import { useState } from "react";
import { StaffingVerification } from "./staffing-verification";
import { clientPortalDemo as demo } from "@/config/client-view/demo-client-portal";

type PortalClient = {
  name: string;
  files: Array<{
    id: string;
    branchName: string;
    serviceType: string;
    status: string;
    carrierName: string | null;
    settlementGainMinor: number | null;
    approvedChargesMinor: number | null;
  }>;
  active: number;
  completed: number;
  settlementGainMinor: number;
  approvedChargesMinor: number;
  netGainMinor: number;
  roi: number | null;
};

const money = (minor: number | null) => minor === null ? "Unavailable" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(minor / 100);
const percent = (value: number | null) => value === null ? "Unavailable" : `${Math.round(value * 100)}%`;

export function ExecutiveClientPortal({ client }: { client: PortalClient }) {
  const [branch, setBranch] = useState<"Charlotte" | "Raleigh">("Charlotte");
  const [prompt, setPrompt] = useState<string | null>(null);
  const selectedBranch = demo.branches.find((item) => item.name === branch)!;

  return (
    <>
      <section className="client-preview-banner" role="note">
        <div><b>Demo Client View</b><span>Synthetic data scoped to {client.name}</span></div>
        <p>Long-term portal vision · no client-authenticated session, live integration, or automatic write-back.</p>
      </section>

      <section className="portal-hero" aria-labelledby="portal-summary">
        <div className="portal-section-heading"><div><small>EXECUTIVE SUMMARY</small><h2 id="portal-summary">Your business, in one clear view</h2></div><span>Illustrative data · as of {demo.asOf}</span></div>
        <div className="portal-kpi-grid">
          {[
            ["Submitted files", client.files.length],
            ["Active files", client.active],
            ["Completed files", client.completed],
            ["Settlement gain", money(client.settlementGainMinor)],
            ["TotalScope fees", money(client.approvedChargesMinor)],
            ["Client net gain", money(client.netGainMinor)],
            ["ROI", percent(client.roi)],
          ].map(([label, value]) => <article key={label}><small>{label}</small><strong>{value}</strong></article>)}
          <article className="portal-health-score"><small>CLIENT HEALTH SCORE</small><strong>{demo.health.score}<em>/100</em></strong><b>{demo.health.label}</b><p>{demo.health.explanation}</p></article>
        </div>
      </section>

      <section className="portal-partnership" aria-labelledby="partnership-title">
        <div>
          <small>YOUR PARTNERSHIP WITH TOTALSCOPE</small>
          <h2 id="partnership-title">Since Joining TotalScope</h2>
          <p>Six years of claim outcomes, operational support, and measurable value creation.</p>
          <dl>
            <div><dt>Client since</dt><dd>{demo.partnership.since}</dd></div>
            <div><dt>Files processed</dt><dd>{demo.partnership.files}</dd></div>
            <div><dt>Settlement gains</dt><dd>{demo.partnership.gains}</dd></div>
            <div><dt>TotalScope fees</dt><dd>{demo.partnership.fees}</dd></div>
          </dl>
        </div>
        <div className="portal-value-created">
          <small>NET VALUE CREATED</small><strong>{demo.partnership.netValue}</strong><span>{demo.partnership.roi} overall ROI</span>
          <div>{demo.partnership.impact.map((item) => <p key={item}>✓ {item}</p>)}</div>
        </div>
      </section>

      <div className="portal-feature-grid">
        <section className="portal-weather card">
          <header><div><small>WEATHER OPPORTUNITY</small><h2>Storm activity near your footprint</h2></div><span>Illustrative</span></header>
          <div className="portal-weather-main"><strong>{demo.weather.events}</strong><span>recent weather events</span></div>
          <dl><div><dt>Nearest event</dt><dd>{demo.weather.type}<small>{demo.weather.distance}</small></dd></div><div><dt>Potential affected ZIPs</dt><dd>{demo.weather.zips}</dd></div><div><dt>Estimated roofs</dt><dd>{demo.weather.roofs}</dd></div><div><dt>Branches nearby</dt><dd>{demo.weather.branches}</dd></div></dl>
          <Link className="button" href="/weather">Review Opportunity</Link>
        </section>
        <section className="portal-opportunity card">
          <header><small>REVENUE OPPORTUNITY</small><h2>Estimated Revenue Opportunity</h2></header>
          <strong>{demo.opportunity.total}</strong>
          <div>{demo.opportunity.parts.map(([label, value, share]) => <div key={label}><span>{label}<b>{value}</b></span><i><em style={{ width: `${share}%` }} /></i></div>)}</div>
          <button className="button ghost" type="button" disabled title="Future report workflow">View Opportunity Report</button>
        </section>
      </div>

      <StaffingVerification />

      <section className="portal-recommendations" aria-labelledby="recommendations-title">
        <div className="portal-section-heading"><div><small>EXECUTIVE RECOMMENDATIONS</small><h2 id="recommendations-title">Recommended This Month</h2></div><span>Illustrative recommendations · not production AI</span></div>
        <div>{demo.recommendations.map((item) => <article key={item.title}><header><span className={`portal-priority ${item.priority.toLowerCase()}`}>{item.priority}</span><small>{item.impact}</small></header><h3>{item.title}</h3><p>{item.detail}</p><footer><small>RECOMMENDED ACTION</small><b>{item.action}</b></footer></article>)}</div>
      </section>

      <div className="portal-two-column">
        <section className="card portal-benchmarks">
          <header><small>BENCHMARKS</small><h2>Compared with Similar Roofing Companies</h2><p>Illustrative comparison against anonymized peer companies.</p></header>
          <div>{demo.benchmarks.map((item) => <article key={item.label}><span>{item.label}</span><strong>{item.value}</strong><em className={item.tone}>{item.tone === "up" ? "↑" : "↓"} {item.standing}</em></article>)}</div>
        </section>
        <section className="card portal-branch">
          <header><div><small>BRANCH PERFORMANCE</small><h2>Compare your operating teams</h2></div><div className="portal-segmented">{demo.branches.map((item) => <button type="button" className={branch === item.name ? "active" : ""} onClick={() => setBranch(item.name)} key={item.name}>{item.name}</button>)}</div></header>
          <div className="portal-branch-score"><strong>{selectedBranch.score}</strong><span>Health score</span><em>{selectedBranch.trend} trend</em></div>
          <dl><div><dt>ROI</dt><dd>{selectedBranch.roi}</dd></div><div><dt>Average supplement</dt><dd>{selectedBranch.supplement}</dd></div><div><dt>Files submitted</dt><dd>{selectedBranch.files}</dd></div><div><dt>Completion rate</dt><dd>{selectedBranch.completion}</dd></div></dl>
        </section>
      </div>

      <div className="portal-two-column">
        <section className="card portal-carriers">
          <header><small>CARRIER INTELLIGENCE</small><h2>Approval performance by carrier</h2></header>
          <table><thead><tr><th>Carrier</th><th>Approval time</th><th>Avg. supplement</th><th>Approval</th></tr></thead><tbody>{demo.carriers.map((item, index) => <tr key={item.name}><th>{item.name}{index === 0 && <small>Most profitable · fastest</small>}</th><td>{item.approval}</td><td>{item.supplement}</td><td>{item.rate}</td></tr>)}</tbody></table>
        </section>
        <section className="card portal-wins">
          <header><small>RECENT WINS</small><h2>Momentum worth recognizing</h2></header>
          <div>{demo.wins.map(([label, value, detail]) => <article key={label}><span>✓</span><div><small>{label}</small><strong>{value}</strong><p>{detail}</p></div></article>)}</div>
        </section>
      </div>

      <section className="portal-activity" aria-labelledby="activity-title">
        <div className="portal-section-heading"><div><small>CURRENT ACTIVITY</small><h2 id="activity-title">Files moving through TotalScope</h2></div><span>Only {client.name} records are shown</span></div>
        <div className="portal-table-wrap card"><table><thead><tr><th>File</th><th>Branch</th><th>Status</th><th>Assigned employee</th><th>Days active</th><th>Next milestone</th><th>Priority</th></tr></thead><tbody>{client.files.map((file, index) => { const detail = demo.fileDetails[index]; return <tr key={file.id}><th>{file.id}<small>{file.serviceType.replace("_", " ")} · {file.carrierName ?? "Carrier unavailable"}</small></th><td>{file.branchName}</td><td><span className="portal-status">{file.status.replaceAll("_", " ")}</span></td><td>{detail.employee}</td><td>{detail.days}</td><td>{detail.milestone}</td><td><span className={`portal-priority ${detail.priority.toLowerCase()}`}>{detail.priority}</span></td></tr>; })}</tbody></table></div>
      </section>

      <div className="portal-three-column">
        <section className="card portal-timeline"><header><small>ACTIVITY TIMELINE</small><h2>What changed recently</h2></header><ol>{demo.timeline.map(([when, title, detail]) => <li key={title}><i/><time>{when}</time><div><b>{title}</b><span>{detail}</span></div></li>)}</ol></section>
        <section className="card portal-attention"><header><small>UPCOMING ATTENTION</small><h2>What needs a decision</h2></header><div>{demo.attention.map(([title, detail, action]) => <article key={title}><div><b>{title}</b><span>{detail}</span></div><button type="button" disabled>{action}</button></article>)}</div></section>
        <section className="card portal-industry"><header><small>INDUSTRY PULSE</small><h2>Your regional operating climate</h2><p>Illustrative industry indicators.</p></header><div>{demo.industry.map(([label, value, detail]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>)}</div></section>
      </div>

      <section className="portal-ask" aria-labelledby="ask-title">
        <small>FUTURE CAPABILITY · ILLUSTRATIVE ONLY</small><h2 id="ask-title">Ask TotalScope Intelligence</h2><p>Turn governed operational facts into clear, traceable answers.</p>
        <div>{demo.prompts.map((item) => <button type="button" onClick={() => setPrompt(item)} key={item}>{item}<span>→</span></button>)}</div>
        <section aria-live="polite"><b>{prompt ?? "Select a question to preview the experience."}</b><p>{prompt ? "A future TotalScope response would summarize the relevant governed facts, show supporting files, and explain data limitations here." : "No AI request is sent from this demonstration."}</p></section>
      </section>
    </>
  );
}
