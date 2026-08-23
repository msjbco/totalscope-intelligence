"use client";

import { useState } from "react";
import { averageAdditionalRcv, averageCycleTime, carrierMix, financialCoverage } from "@/lib/calculations";
import type { Claim } from "@/types/intelligence";
import { SectionCard } from "@/components/ui/section-card";
import { useDemoData } from "./data-context";

function money(value: number | null) {
  return value === null ? "Unavailable" : `$${value.toLocaleString()}`;
}

export function CarrierDashboard() {
  const { claims, data } = useDemoData();
  const mix = carrierMix(claims, data.carriers);
  const [selectedCarrierId, setSelectedCarrierId] = useState<string | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const selectedCarrier = data.carriers.find((carrier) => carrier.id === selectedCarrierId) ?? null;
  const carrierClaims = selectedCarrier ? claims.filter((claim) => claim.carrierId === selectedCarrier.id) : [];
  const carrierAdjusters = selectedCarrier
    ? data.adjusters.filter((adjuster) => adjuster.carrierId === selectedCarrier.id)
    : [];

  const closeDetails = () => {
    setSelectedClaim(null);
    setSelectedCarrierId(null);
  };

  return (
    <div className="carrier-layout">
      <SectionCard eyebrow="FILE DISTRIBUTION" title="Carrier mix">
        <div className="rank-table carrier-rank-table">
          <div className="rank-head">
            <span>Carrier</span><span>Files</span><span>Mix</span><span>Avg. additional RCV</span><span>Cycle time</span><span>Financial coverage</span>
          </div>
          {mix.map((item, index) => {
            const rows = claims.filter((claim) => claim.carrierId === item.id);
            const recovery = averageAdditionalRcv(rows);
            const cycle = averageCycleTime(rows);
            const coverage = financialCoverage(rows);
            return (
              <div className="rank-row" key={item.id}>
                <button className="carrier-name-button" type="button" onClick={() => setSelectedCarrierId(item.id)}>
                  <i>{index + 1}</i><span>{item.name}</span><em>View details →</em>
                </button>
                <span>{item.count}</span>
                <span>{item.share.toFixed(1)}%</span>
                <span>{recovery.value === null ? "Unavailable" : `$${Math.round(recovery.value).toLocaleString()}`}</span>
                <span>{cycle.value === null ? "—" : `${cycle.value.toFixed(1)} d`}</span>
                <span>{coverage.value?.toFixed(1) ?? "0"}% <em className={`grade g-${coverage.metadata.confidence}`}>{coverage.metadata.confidence}</em></span>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard eyebrow="INTERPRETATION" title="Carrier performance notes">
        <div className="method-grid">
          <p><b>Mix</b> measures file-count concentration, not insurance capacity.</p>
          <p><b>Recovery</b> excludes unavailable, invalid, and not-applicable financial records.</p>
          <p><b>Cycle time</b> uses only files with valid opened and closed dates.</p>
          <p><b>Coverage</b> is shown beside every financial comparison to prevent false precision.</p>
        </div>
      </SectionCard>

      {selectedCarrier && (
        <>
          <button className="drawer-overlay" aria-label="Close carrier details" onClick={closeDetails} />
          <aside className="claim-drawer carrier-drawer" role="dialog" aria-modal="true" aria-label={`${selectedCarrier.name} details`}>
            <header>
              <div><small>DEMO DATA · CARRIER PROFILE</small><h2>{selectedCarrier.name}</h2></div>
              <button type="button" aria-label="Close carrier details" onClick={closeDetails}>×</button>
            </header>
            <div className="drawer-body">
              {!selectedClaim ? (
                <>
                  <p className="carrier-drawer-intro">
                    Operational summary for files currently included by the global dashboard filters.
                  </p>
                  <dl>
                    <div><dt>Selected files</dt><dd>{carrierClaims.length}</dd></div>
                    <div><dt>Portfolio mix</dt><dd>{mix.find((item) => item.id === selectedCarrier.id)?.share.toFixed(1) ?? "0.0"}%</dd></div>
                    <div><dt>Assigned adjusters</dt><dd>{carrierAdjusters.length}</dd></div>
                    <div><dt>Active files</dt><dd>{carrierClaims.filter((claim) => claim.status !== "closed").length}</dd></div>
                  </dl>
                  <h3>Claims handled with this carrier</h3>
                  <div className="carrier-claim-list">
                    {carrierClaims.map((claim) => {
                      const contractor = data.contractors.find((item) => item.id === claim.contractorId);
                      return (
                        <button type="button" key={claim.id} onClick={() => setSelectedClaim(claim)}>
                          <span><b>{claim.claimNumber}</b><small>{contractor?.name ?? "Contractor unavailable"} · {claim.state} {claim.zipCode}</small></span>
                          <span><em className={`file-status ${claim.status}`}>{claim.status}</em><small>{claim.serviceType.replace("_", " ")}</small></span>
                          <i>→</i>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <ClaimDetail
                  claim={selectedClaim}
                  contractor={data.contractors.find((item) => item.id === selectedClaim.contractorId)?.name ?? "Unavailable"}
                  adjuster={data.adjusters.find((item) => item.id === selectedClaim.adjusterId)?.name ?? "Unavailable"}
                  onBack={() => setSelectedClaim(null)}
                />
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

function ClaimDetail({ claim, contractor, adjuster, onBack }: {
  claim: Claim;
  contractor: string;
  adjuster: string;
  onBack: () => void;
}) {
  return (
    <div className="carrier-claim-detail">
      <button className="carrier-back-button" type="button" onClick={onBack}>← Back to carrier claims</button>
      <small>DEMO CLAIM DETAIL</small>
      <h3>{claim.claimNumber}</h3>
      <p>{contractor} · {claim.state} {claim.zipCode}</p>
      <dl>
        <div><dt>Status</dt><dd>{claim.status}</dd></div>
        <div><dt>Service</dt><dd>{claim.serviceType.replace("_", " ")}</dd></div>
        <div><dt>Opened</dt><dd>{new Date(`${claim.openedAt}T00:00:00`).toLocaleDateString("en-US")}</dd></div>
        <div><dt>Closed</dt><dd>{claim.closedAt ? new Date(`${claim.closedAt}T00:00:00`).toLocaleDateString("en-US") : "Active"}</dd></div>
        <div><dt>Assigned adjuster</dt><dd>{adjuster}</dd></div>
        <div><dt>Financial status</dt><dd>{claim.financialStatus.replaceAll("_", " ")}</dd></div>
        <div><dt>Initial RCV</dt><dd>{money(claim.originalRcv)}</dd></div>
        <div><dt>Additional RCV</dt><dd>{money(claim.additionalRcv)}</dd></div>
        <div><dt>Settled RCV</dt><dd>{money(claim.settledRcv)}</dd></div>
        <div><dt>TotalScope fee</dt><dd>{money(claim.totalScopeFee)}</dd></div>
      </dl>
      <h3>Recorded updates</h3>
      <ol>
        {claim.updates.map((update) => (
          <li key={`${update.at}-${update.type}`}>
            <i />
            <div><b>{update.summary}</b><span>{new Date(`${update.at}T00:00:00`).toLocaleDateString("en-US")} · {update.author}</span></div>
          </li>
        ))}
      </ol>
    </div>
  );
}
