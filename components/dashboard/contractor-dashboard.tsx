"use client";

import { useEffect, useState } from "react";
import { contractorRankings } from "@/lib/calculations";
import { SectionCard } from "@/components/ui/section-card";
import type { Claim } from "@/types/intelligence";
import { useDemoData } from "./data-context";

export function ContractorDashboard() {
  const { claims, data } = useDemoData();
  const ranks = contractorRankings(claims, data.contractors);
  const max = Math.max(1, ...ranks.map((item) => item.recovery));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const contractor = data.contractors.find((item) => item.id === selectedId) ?? null;
  const contractorClaims = contractor ? claims.filter((claim) => claim.contractorId === contractor.id) : [];
  const selectedClaim = contractorClaims.find((claim) => claim.id === selectedClaimId) ?? null;

  const closeProfile = () => {
    setSelectedClaimId(null);
    setSelectedId(null);
  };

  useEffect(() => {
    if (!selectedId) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (selectedClaimId) setSelectedClaimId(null);
        else closeProfile();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedId, selectedClaimId]);

  return (
    <>
      <SectionCard eyebrow="SYNTHETIC PERFORMANCE" title="Contractor rankings">
        <div className="contractor-ranks">
          {ranks.map((item, index) => (
            <button className="contractor-row-button" type="button" key={item.id} onClick={() => setSelectedId(item.id)}>
              <span className="rank-number">{String(index + 1).padStart(2, "0")}</span>
              <span className="contractor-name"><b>{item.name}</b><small>{data.contractors.find((entry) => entry.id === item.id)?.region} · View profile →</small></span>
              <span className="recovery-bar"><i style={{ width: `${item.recovery / max * 100}%` }} /><span>{item.recovery ? `$${item.recovery.toLocaleString()}` : "Unavailable"} additional RCV</span></span>
              <span className="contractor-row-metrics">
                <span><small>Files</small><b>{item.files}</b></span>
                <span><small>Closed</small><b>{item.closed}</b></span>
                <span><small>Close rate</small><b>{item.closeRate.toFixed(1)}%</b></span>
              </span>
            </button>
          ))}
        </div>
      </SectionCard>
      <p className="data-note">Demo Data · Rankings use synthetic additional RCV and are not claims about actual contractor performance.</p>

      {contractor && (
        <div className="contractor-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeProfile();
        }}>
          <section className="contractor-modal" role="dialog" aria-modal="true" aria-labelledby="contractor-modal-title">
            <header>
              <div><small>DEMO DATA · CONTRACTOR PROFILE</small><h2 id="contractor-modal-title">{contractor.name}</h2><p>{contractor.region} operating region</p></div>
              <button type="button" aria-label="Close contractor profile" onClick={closeProfile}>×</button>
            </header>
            {selectedClaim ? (
              <ContractorClaimProfile
                claim={selectedClaim}
                carrier={data.carriers.find((item) => item.id === selectedClaim.carrierId)?.name ?? "Unavailable"}
                adjuster={data.adjusters.find((item) => item.id === selectedClaim.adjusterId)?.name ?? "Unavailable"}
                onBack={() => setSelectedClaimId(null)}
              />
            ) : (
              <ContractorProfile
                claims={contractorClaims}
                carriers={data.carriers}
                adjusters={data.adjusters}
                onSelectClaim={setSelectedClaimId}
              />
            )}
          </section>
        </div>
      )}
    </>
  );
}

function ContractorProfile({ claims, carriers, adjusters, onSelectClaim }: {
  claims: ReturnType<typeof useDemoData>["claims"];
  carriers: ReturnType<typeof useDemoData>["data"]["carriers"];
  adjusters: ReturnType<typeof useDemoData>["data"]["adjusters"];
  onSelectClaim: (id: string) => void;
}) {
  const closed = claims.filter((claim) => claim.status === "closed");
  const active = claims.filter((claim) => claim.status !== "closed");
  const captured = claims.filter((claim) => claim.financialStatus === "captured" || claim.financialStatus === "partially_captured");
  const additionalRcv = captured.reduce((total, claim) => total + (claim.additionalRcv ?? 0), 0);
  const fees = captured.reduce((total, claim) => total + (claim.totalScopeFee ?? 0), 0);
  const states = [...new Set(claims.map((claim) => claim.state))];
  const carrierCounts = carriers.map((carrier) => ({
    name: carrier.name,
    count: claims.filter((claim) => claim.carrierId === carrier.id).length,
  })).filter((item) => item.count).sort((a, b) => b.count - a.count);

  return (
    <div className="contractor-modal-body">
      <div className="contractor-profile-kpis">
        <div><small>Total files</small><strong>{claims.length}</strong><span>Selected dashboard period</span></div>
        <div><small>Active inventory</small><strong>{active.length}</strong><span>{closed.length} files closed</span></div>
        <div><small>Additional RCV</small><strong>${additionalRcv.toLocaleString()}</strong><span>{captured.length} financially usable files</span></div>
        <div><small>TotalScope fees</small><strong>${fees.toLocaleString()}</strong><span>Synthetic recorded fees</span></div>
      </div>

      <div className="contractor-profile-grid">
        <section>
          <small>OPERATING FOOTPRINT</small><h3>Geography and service mix</h3>
          <dl>
            <div><dt>States represented</dt><dd>{states.join(", ") || "Unavailable"}</dd></div>
            <div><dt>Estimate-only files</dt><dd>{claims.filter((claim) => claim.serviceType === "estimate_only").length}</dd></div>
            <div><dt>Claim-handling files</dt><dd>{claims.filter((claim) => claim.serviceType === "claim_handling").length}</dd></div>
            <div><dt>Financial coverage</dt><dd>{claims.length ? `${(captured.length / claims.length * 100).toFixed(1)}%` : "Unavailable"}</dd></div>
          </dl>
        </section>
        <section>
          <small>CARRIER MIX</small><h3>Files by carrier</h3>
          <div className="contractor-carrier-mix">
            {carrierCounts.map((item) => <div key={item.name}><span>{item.name}</span><i><b style={{ width: `${item.count / claims.length * 100}%` }} /></i><strong>{item.count}</strong></div>)}
          </div>
        </section>
      </div>

      <section className="contractor-files">
        <header><div><small>CLAIM INVENTORY</small><h3>Files currently associated with this contractor</h3></div><span>{claims.length} records</span></header>
        <div className="contractor-files-table">
          <table>
            <thead><tr><th>Claim</th><th>Carrier</th><th>Adjuster</th><th>Location</th><th>Status</th><th>Additional RCV</th></tr></thead>
            <tbody>{claims.map((claim) => (
              <tr key={claim.id}>
                <th scope="row"><button className="contractor-claim-link" type="button" onClick={() => onSelectClaim(claim.id)}><b>{claim.claimNumber}</b><small>{claim.serviceType.replace("_", " ")} · opened {new Date(`${claim.openedAt}T00:00:00`).toLocaleDateString("en-US")}</small><em>View claim →</em></button></th>
                <td>{carriers.find((item) => item.id === claim.carrierId)?.name ?? "Unavailable"}</td>
                <td>{adjusters.find((item) => item.id === claim.adjusterId)?.name ?? "Unavailable"}</td>
                <td>{claim.state} {claim.zipCode}</td>
                <td><span className={`file-status ${claim.status}`}>{claim.status}</span></td>
                <td>{claim.additionalRcv === null ? "Unavailable" : `$${claim.additionalRcv.toLocaleString()}`}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>
      <p className="contractor-profile-note">Synthetic Demo Data only. Missing financial values are excluded rather than treated as zero.</p>
    </div>
  );
}

function ContractorClaimProfile({ claim, carrier, adjuster, onBack }: {
  claim: Claim;
  carrier: string;
  adjuster: string;
  onBack: () => void;
}) {
  const contractorMoney = (value: number | null) => value === null ? "Unavailable" : `$${value.toLocaleString()}`;
  return (
    <div className="contractor-claim-profile">
      <button className="contractor-profile-back" type="button" onClick={onBack}>← Back to contractor profile</button>
      <div className="contractor-claim-hero">
        <div><small>DEMO DATA · CLAIM DETAIL</small><h3>{claim.claimNumber}</h3><p>{carrier} · {claim.state} {claim.zipCode}</p></div>
        <span className={`file-status ${claim.status}`}>{claim.status}</span>
      </div>
      <div className="contractor-claim-facts">
        <div><small>Service type</small><strong>{claim.serviceType.replace("_", " ")}</strong></div>
        <div><small>Assigned adjuster</small><strong>{adjuster}</strong></div>
        <div><small>Opened</small><strong>{new Date(`${claim.openedAt}T00:00:00`).toLocaleDateString("en-US")}</strong></div>
        <div><small>Closed</small><strong>{claim.closedAt ? new Date(`${claim.closedAt}T00:00:00`).toLocaleDateString("en-US") : "Active"}</strong></div>
        <div><small>Financial availability</small><strong>{claim.financialStatus.replaceAll("_", " ")}</strong></div>
        <div><small>Source quarter</small><strong>{claim.sourceQuarter}</strong></div>
      </div>
      <section className="contractor-claim-financials">
        <header><small>FINANCIAL FACTS</small><h3>Captured claim values</h3></header>
        <div>
          <span><small>Initial RCV</small><strong>{contractorMoney(claim.originalRcv)}</strong></span>
          <span><small>Additional RCV</small><strong>{contractorMoney(claim.additionalRcv)}</strong></span>
          <span><small>Settled RCV</small><strong>{contractorMoney(claim.settledRcv)}</strong></span>
          <span><small>TotalScope fee</small><strong>{contractorMoney(claim.totalScopeFee)}</strong></span>
        </div>
        <p>Missing financial fields remain unavailable and are never treated as zero.</p>
      </section>
      <section className="contractor-claim-updates">
        <header><small>RECORDED ACTIVITY</small><h3>Updates and notes</h3></header>
        <ol>{claim.updates.map((update, index) => (
          <li key={`${update.at}-${index}`}><i /><div><b>{update.summary}</b><span>{new Date(`${update.at}T00:00:00`).toLocaleDateString("en-US")} · {update.author} · {update.type}</span></div></li>
        ))}</ol>
      </section>
    </div>
  );
}
