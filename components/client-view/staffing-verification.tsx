"use client";

import { useEffect, useMemo, useState } from "react";

type ReviewStatus = "active" | "departed" | "role_changed" | "branch_changed";
type Role =
  | "Company Administrator"
  | "Office Administrator"
  | "Sales Manager"
  | "Sales Representative"
  | "Operations Manager"
  | "Project Manager"
  | "Estimator"
  | "Other";
type Branch = "Charlotte" | "Raleigh";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: Role;
  branch: Branch;
};

type MemberReview = {
  status: ReviewStatus;
  nextRole?: Role;
  nextBranch?: Branch;
};

type NewMember = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  branch: Branch;
};

const ROLES: Role[] = [
  "Company Administrator",
  "Office Administrator",
  "Sales Manager",
  "Sales Representative",
  "Operations Manager",
  "Project Manager",
  "Estimator",
  "Other",
];

const TEAM: TeamMember[] = [
  { id: "tm", name: "Taylor Morgan", email: "taylor.morgan@summit-demo.example", role: "Company Administrator", branch: "Charlotte" },
  { id: "sb", name: "Sarah Bennett", email: "sarah.bennett@summit-demo.example", role: "Office Administrator", branch: "Charlotte" },
  { id: "mr", name: "Marcus Reed", email: "marcus.reed@summit-demo.example", role: "Sales Manager", branch: "Raleigh" },
  { id: "jc", name: "Jamie Collins", email: "jamie.collins@summit-demo.example", role: "Sales Representative", branch: "Charlotte" },
  { id: "df", name: "Danielle Foster", email: "danielle.foster@summit-demo.example", role: "Sales Representative", branch: "Raleigh" },
  { id: "kb", name: "Kevin Brooks", email: "kevin.brooks@summit-demo.example", role: "Sales Representative", branch: "Charlotte" },
  { id: "rh", name: "Rachel Hayes", email: "rachel.hayes@summit-demo.example", role: "Operations Manager", branch: "Raleigh" },
  { id: "et", name: "Eric Turner", email: "eric.turner@summit-demo.example", role: "Project Manager", branch: "Charlotte" },
];

const INITIAL_REVIEWS = Object.fromEntries(
  TEAM.map((member) => [member.id, { status: "active" as ReviewStatus }]),
) as Record<string, MemberReview>;

function emptyMember(index: number): NewMember {
  return {
    id: `new-${index}`,
    firstName: "",
    lastName: "",
    email: "",
    role: "Sales Representative",
    branch: "Charlotte",
  };
}

export function StaffingVerification() {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showSubmittedChanges, setShowSubmittedChanges] = useState(false);
  const [reviews, setReviews] = useState<Record<string, MemberReview>>(INITIAL_REVIEWS);
  const [newMembers, setNewMembers] = useState<NewMember[]>([]);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  const summary = useMemo(() => {
    const departed = Object.values(reviews).filter((review) => review.status === "departed").length;
    const roleChanges = Object.values(reviews).filter((review) => review.status === "role_changed").length;
    const branchChanges = Object.values(reviews).filter((review) => review.status === "branch_changed").length;
    const additions = newMembers.filter((member) => member.firstName || member.lastName || member.email).length;
    return { departed, roleChanges, branchChanges, additions, total: departed + roleChanges + branchChanges + additions };
  }, [newMembers, reviews]);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  function updateReview(id: string, status: ReviewStatus) {
    const member = TEAM.find((item) => item.id === id)!;
    setReviews((current) => ({
      ...current,
      [id]: {
        status,
        nextRole: status === "role_changed" ? member.role : undefined,
        nextBranch: status === "branch_changed" ? member.branch : undefined,
      },
    }));
  }

  function updateNewMember(id: string, field: keyof Omit<NewMember, "id">, value: string) {
    setNewMembers((current) => current.map((member) => member.id === id ? { ...member, [field]: value } : member));
  }

  function submitReview() {
    if (summary.total === 0) return;
    setSubmittedAt(new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date()));
    setSubmitted(true);
  }

  function resetDemo() {
    setReviews(INITIAL_REVIEWS);
    setNewMembers([]);
    setSubmitted(false);
    setSubmittedAt(null);
    setShowSubmittedChanges(false);
  }

  return (
    <section className="staffing-section" aria-labelledby="staffing-title">
      <div className="operations-section-heading">
        <div>
          <small>YOUR TEAM</small>
          <h2 id="staffing-title">Keep your TotalScope access current</h2>
        </div>
        {submitted && <span className="staffing-pending">Staffing review pending</span>}
      </div>
      <p className="staffing-intro">
        Review the people currently associated with your company. Mark anyone who is no longer with the organization,
        update changed roles, or add missing team members.
      </p>

      <div className="staffing-summary">
        <div><small>Active team members</small><strong>8</strong></div>
        <div><small>Administrators</small><strong>2</strong></div>
        <div><small>Sales representatives</small><strong>4</strong></div>
        <div><small>Operations staff</small><strong>2</strong></div>
        <div><small>Last verified</small><strong>May 15, 2026</strong></div>
        <div className="staffing-actions">
          <button type="button" className="button" onClick={() => setOpen(true)}>Quick Verification</button>
          <button type="button" className="text-button" onClick={() => setOpen(true)}>View full team</button>
        </div>
      </div>

      {submitted && (
        <div className="staffing-pending-panel">
          <div><small>SUBMITTED DATE</small><strong>{submittedAt}</strong></div>
          <div><small>REQUESTED CHANGES</small><strong>{summary.total}</strong></div>
          <div><small>STATUS</small><strong>Pending TotalScope review</strong></div>
          <button type="button" className="text-button" onClick={() => setOpen(true)}>Review submission →</button>
        </div>
      )}

      <details className="staffing-next">
        <summary>What happens next</summary>
        <p>Future workflow demonstration · no automatic write-back is active.</p>
        <ol>
          {["Submitted", "Under review", "Updated in TotalScope", "Verified by next sync", "Closed"].map((status, index) => (
            <li key={status}><span>{index + 1}</span><div><b>{status}</b><small>{[
              "Client submits a staffing review request.",
              "TotalScope receives an email and dashboard notification.",
              "TotalScope staff updates the primary TS system manually.",
              "The next user export confirms the requested changes.",
              "TSI closes the review with its historical record preserved.",
            ][index]}</small></div></li>
          ))}
        </ol>
      </details>

      {open && (
        <div className="staffing-modal-backdrop" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setOpen(false);
        }}>
          <section className="staffing-modal" role="dialog" aria-modal="true" aria-labelledby="staffing-modal-title">
            {!submitted ? (
              <>
                <header>
                  <div><small>SYNTHETIC TEAM · DEMO WORKFLOW</small><h2 id="staffing-modal-title">Verify your current team</h2><p>Everyone is assumed active unless you mark a change. Most reviews take less than one minute.</p></div>
                  <button type="button" onClick={() => setOpen(false)} aria-label="Close staffing verification">×</button>
                </header>
                <div className="staffing-modal-body">
                  <div className="staffing-roster" role="table" aria-label="Synthetic Summit Restoration Group team">
                    <div className="staffing-roster-head" role="row">
                      <span>Name</span><span>Current role</span><span>Branch</span><span>Status</span>
                    </div>
                    {TEAM.map((member) => {
                      const review = reviews[member.id];
                      return (
                        <div className="staffing-person" role="row" key={member.id}>
                          <div role="cell"><b>{member.name}</b><small>{member.email}</small></div>
                          <span role="cell">{member.role}</span>
                          <span role="cell">{member.branch}</span>
                          <div role="cell">
                            <select aria-label={`${member.name} status`} value={review.status} onChange={(event) => updateReview(member.id, event.target.value as ReviewStatus)}>
                              <option value="active">Still active</option>
                              <option value="departed">No longer with company</option>
                              <option value="role_changed">Role changed</option>
                              <option value="branch_changed">Branch changed</option>
                            </select>
                            {review.status === "role_changed" && (
                              <select aria-label={`${member.name} new role`} value={review.nextRole} onChange={(event) => setReviews((current) => ({ ...current, [member.id]: { ...review, nextRole: event.target.value as Role } }))}>
                                {ROLES.map((role) => <option key={role}>{role}</option>)}
                              </select>
                            )}
                            {review.status === "branch_changed" && (
                              <select aria-label={`${member.name} new branch`} value={review.nextBranch} onChange={(event) => setReviews((current) => ({ ...current, [member.id]: { ...review, nextBranch: event.target.value as Branch } }))}>
                                <option>Charlotte</option><option>Raleigh</option>
                              </select>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <section className="staffing-additions">
                    <div><small>ADD A MISSING TEAM MEMBER</small><h3>New staff requests</h3></div>
                    {newMembers.map((member, index) => (
                      <div className="staffing-new-row" key={member.id}>
                        <label>First name<input value={member.firstName} onChange={(event) => updateNewMember(member.id, "firstName", event.target.value)} /></label>
                        <label>Last name<input value={member.lastName} onChange={(event) => updateNewMember(member.id, "lastName", event.target.value)} /></label>
                        <label>Work email<input type="email" value={member.email} onChange={(event) => updateNewMember(member.id, "email", event.target.value)} /></label>
                        <label>Role<select value={member.role} onChange={(event) => updateNewMember(member.id, "role", event.target.value)}>{ROLES.map((role) => <option key={role}>{role}</option>)}</select></label>
                        <label>Branch<select value={member.branch} onChange={(event) => updateNewMember(member.id, "branch", event.target.value)}><option>Charlotte</option><option>Raleigh</option></select></label>
                        <button type="button" onClick={() => setNewMembers((current) => current.filter((item) => item.id !== member.id))} aria-label={`Remove new person ${index + 1}`}>Remove</button>
                      </div>
                    ))}
                    <button type="button" className="text-button" disabled={newMembers.length >= 2} onClick={() => setNewMembers((current) => [...current, emptyMember(current.length + 1)])}>+ Add another person</button>
                  </section>

                  <div className="staffing-change-summary" aria-live="polite">
                    <b>{summary.total} requested {summary.total === 1 ? "change" : "changes"}</b>
                    <span>{summary.departed} no longer active · {summary.roleChanges} role · {summary.branchChanges} branch · {summary.additions} new</span>
                  </div>
                </div>
                <footer>
                  <p>Requests remain pending until TotalScope reviews and manually updates the primary TS system. Historical assignments are preserved.</p>
                  <div><button type="button" className="button ghost" onClick={() => setOpen(false)}>Cancel</button><button type="button" className="button" disabled={summary.total === 0} onClick={submitReview}>Submit staffing review</button></div>
                </footer>
              </>
            ) : (
              <div className="staffing-success">
                <span>✓</span>
                <small>SYNTHETIC DEMO SUBMISSION</small>
                <h2 id="staffing-modal-title">Staffing review received</h2>
                <p>Thank you. TotalScope has been notified and will review these changes before updating the primary TotalScope system.</p>
                <dl>
                  <div><dt>Submitted by</dt><dd>Taylor Morgan</dd></div>
                  <div><dt>Company</dt><dd>Summit Restoration Group</dd></div>
                  <div><dt>Submitted at</dt><dd>{submittedAt}</dd></div>
                  <div><dt>Status</dt><dd>Pending TotalScope review</dd></div>
                </dl>
                {showSubmittedChanges && (
                  <div className="staffing-change-summary">
                    <b>{summary.total} requested changes</b>
                    <span>{summary.departed} no longer active · {summary.roleChanges} role · {summary.branchChanges} branch · {summary.additions} new</span>
                  </div>
                )}
                <div className="staffing-success-actions">
                  <button type="button" className="button ghost" onClick={() => setShowSubmittedChanges((value) => !value)}>View submitted changes</button>
                  <button type="button" className="button" onClick={() => setOpen(false)}>Done</button>
                </div>
                <button type="button" className="text-button staffing-reset" onClick={resetDemo}>Reset demo state</button>
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
