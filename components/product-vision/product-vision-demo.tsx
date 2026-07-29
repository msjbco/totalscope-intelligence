"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { PRODUCT_VISION_SCREENS, PRODUCT_VISION_SECTIONS } from "@/config/product-vision/screens";
import { PRODUCT_VISION_DISCLOSURE, type VisionScreen } from "@/lib/product-vision/model";

type DetailRow = { primary: string; secondary: string; context: string };
type DetailData = {
  columns: [string, string, string];
  rows: readonly DetailRow[];
  trend: readonly number[];
  action: string;
  summary: string;
};
type SupportingRecordDetail = {
  title: string; kind: string; description: string; stats: readonly [string, string][]; evidence: readonly string[];
  owner: string; source: string; action: string;
};
type RoofingCompany = { name: string; city: string; distance: number; contact: string; phone: string; email: string; client: boolean; slug: string };
type DemoFile = {
  id: string; client: string; property: string; carrier: string; service: string; handler: string; estimator: string;
  status: string; opened: string; daysOpen: number; lastNote: string; financial: string; initialRcv: string; finalRcv: string;
  stallReason?: string; nextAction: string; timeline: readonly [string, string][];
};

const DEMO_FILES: readonly DemoFile[] = [
  { id: "SRG-26041", client: "Summit Roofing Group", property: "7421 Westgate Ave · Overland Park, KS", carrier: "State Farm", service: "Claim handling", handler: "Julie Morgan", estimator: "Evan Brooks", status: "Carrier review", opened: "Jun 24, 2026", daysOpen: 6, lastNote: "42 minutes ago", financial: "Captured", initialRcv: "$18,240", finalRcv: "Pending", nextAction: "Carrier scope conference scheduled for Jul 1.", timeline: [["Jun 24", "File submitted"], ["Jun 25", "Estimate completed"], ["Jun 27", "Carrier package delivered"], ["Jun 30", "Conference confirmed"]] },
  { id: "HBR-26018", client: "Harbor Property Recovery", property: "118 Dockside Dr · Wilmington, NC", carrier: "Travelers", service: "Estimate only", handler: "Marcus Reed", estimator: "Nina Patel", status: "Client action required", opened: "May 18, 2026", daysOpen: 43, lastNote: "12 days ago", financial: "Partially captured", initialRcv: "$9,880", finalRcv: "Unavailable", stallReason: "No activity note for 12 days; requested roof photos have not been uploaded by the client.", nextAction: "Contact client operations lead and resend the secure photo request.", timeline: [["May 18", "File opened"], ["May 20", "Estimate drafted"], ["Jun 10", "Photo supplement requested"], ["Jun 18", "Last client note"]] },
  { id: "APX-26007", client: "Apex Exteriors", property: "904 S Peoria Ave · Tulsa, OK", carrier: "Allstate", service: "Claim handling", handler: "Taylor Brooks", estimator: "Evan Brooks", status: "Executive attention", opened: "Apr 29, 2026", daysOpen: 62, lastNote: "9 days ago", financial: "Captured", initialRcv: "$24,610", finalRcv: "$27,900", stallReason: "Carrier desk adjuster has not responded to three documented follow-ups over nine days.", nextAction: "Escalate to the carrier supervisor and schedule a documented scope review.", timeline: [["Apr 29", "Claim handling opened"], ["May 4", "Initial package submitted"], ["Jun 14", "Second follow-up"], ["Jun 21", "Third follow-up · no response"]] },
  { id: "PKR-26052", client: "Peak Restoration", property: "3118 Blake St · Denver, CO", carrier: "North Star Mutual", service: "Estimate only", handler: "Unassigned", estimator: "Nina Patel", status: "New intake", opened: "Jun 30, 2026", daysOpen: 0, lastNote: "18 minutes ago", financial: "Not applicable", initialRcv: "Unavailable", finalRcv: "Unavailable", nextAction: "Complete intake validation and assign an estimator by 2 PM.", timeline: [["Jun 30 · 8:41", "Submission received"], ["Jun 30 · 8:44", "Documents indexed"], ["Jun 30 · 9:02", "Intake validation started"]] },
  { id: "SRG-26038", client: "Summit Roofing Group", property: "8804 Mission Rd · Prairie Village, KS", carrier: "North Star Mutual", service: "Claim handling", handler: "Julie Morgan", estimator: "Nina Patel", status: "Completed", opened: "May 2, 2026", daysOpen: 19, lastNote: "Closed Jun 20", financial: "Captured", initialRcv: "$21,300", finalRcv: "$33,950", nextAction: "Include the $12,650 settlement gain in the June client review.", timeline: [["May 2", "File opened"], ["May 6", "Estimate submitted"], ["May 18", "Carrier conference"], ["May 21", "Final scope approved"], ["Jun 20", "Payment reconciled"]] },
] as const;

function fileById(id: string) {
  return DEMO_FILES.find((file) => file.id === id);
}

function fileRowsForMetric(key: string, label: string): readonly DetailRow[] {
  const ids = key.includes("new") ? ["PKR-26052", "SRG-26041", "HBR-26018"] :
    key.includes("completed") ? ["SRG-26038", "SRG-26041", "PKR-26052"] :
    key.includes("stalled") ? ["HBR-26018", "APX-26007", "SRG-26041"] :
    key.includes("aging") ? ["APX-26007", "HBR-26018", "SRG-26038"] :
    ["SRG-26041", "HBR-26018", "APX-26007", "PKR-26052"];
  return ids.map((id) => {
    const file = fileById(id)!;
    const context = file.stallReason ? file.stallReason : `${file.handler} · last activity ${file.lastNote} · ${file.nextAction}`;
    return { primary: file.id, secondary: `${file.status} · ${file.daysOpen} days open`, context: `${label}: ${context}` };
  });
}

const KANSAS_CITY_ROOFERS: readonly RoofingCompany[] = [
  { name: "Prairie Shield Roofing", city: "Overland Park, KS", distance: 11, contact: "Avery Collins", phone: "(913) 555-0104", email: "avery@prairieshield.example", client: true, slug: "prairie-shield-roofing" },
  { name: "Heartland Peak Exteriors", city: "Kansas City, MO", distance: 14, contact: "Jordan Ellis", phone: "(816) 555-0118", email: "jordan@heartlandpeak.example", client: false, slug: "heartland-peak-exteriors" },
  { name: "Blue River Restoration", city: "Lee’s Summit, MO", distance: 24, contact: "Morgan Hayes", phone: "(816) 555-0131", email: "morgan@blueriver.example", client: true, slug: "blue-river-restoration" },
  { name: "Sunflower State Roofing", city: "Olathe, KS", distance: 27, contact: "Casey Bennett", phone: "(913) 555-0146", email: "casey@sunflowerstate.example", client: false, slug: "sunflower-state-roofing" },
  { name: "Northland Roof & Storm", city: "Liberty, MO", distance: 31, contact: "Riley Foster", phone: "(816) 555-0159", email: "riley@northlandstorm.example", client: false, slug: "northland-roof-storm" },
  { name: "Flint Hills Exteriors", city: "Lawrence, KS", distance: 44, contact: "Taylor Monroe", phone: "(785) 555-0163", email: "taylor@flinthills.example", client: true, slug: "flint-hills-exteriors" },
  { name: "Midwest Apex Roofing", city: "St. Joseph, MO", distance: 58, contact: "Cameron Wells", phone: "(816) 555-0177", email: "cameron@midwestapex.example", client: false, slug: "midwest-apex-roofing" },
  { name: "Crossroads Commercial Roofing", city: "Topeka, KS", distance: 63, contact: "Drew Parker", phone: "(785) 555-0182", email: "drew@crossroadsroofing.example", client: false, slug: "crossroads-commercial-roofing" },
] as const;
const OKLAHOMA_ROOFERS: readonly RoofingCompany[] = [
  { name: "Red River Roofing Partners", city: "Tulsa, OK", distance: 9, contact: "Alexis Grant", phone: "(918) 555-0108", email: "alexis@redriverroofing.example", client: true, slug: "red-river-roofing" },
  { name: "Green Country Exteriors", city: "Broken Arrow, OK", distance: 17, contact: "Devin Ross", phone: "(918) 555-0122", email: "devin@greencountry.example", client: false, slug: "green-country-exteriors" },
  { name: "Sooner Storm Restoration", city: "Owasso, OK", distance: 22, contact: "Jamie Carter", phone: "(918) 555-0139", email: "jamie@soonerstorm.example", client: false, slug: "sooner-storm-restoration" },
  { name: "Osage Commercial Roofing", city: "Bartlesville, OK", distance: 43, contact: "Skyler Price", phone: "(918) 555-0151", email: "skyler@osagecommercial.example", client: true, slug: "osage-commercial-roofing" },
  { name: "Frontier Roof Systems", city: "Muskogee, OK", distance: 48, contact: "Parker Lane", phone: "(918) 555-0168", email: "parker@frontierroof.example", client: false, slug: "frontier-roof-systems" },
] as const;
const WILMINGTON_ROOFERS: readonly RoofingCompany[] = [
  { name: "Cape Fear Roofing Group", city: "Wilmington, NC", distance: 6, contact: "Quinn Bailey", phone: "(910) 555-0106", email: "quinn@capefearroofing.example", client: true, slug: "cape-fear-roofing" },
  { name: "Coastal Pine Exteriors", city: "Leland, NC", distance: 12, contact: "Emerson Gray", phone: "(910) 555-0127", email: "emerson@coastalpines.example", client: false, slug: "coastal-pine-exteriors" },
  { name: "Atlantic Shield Restoration", city: "Hampstead, NC", distance: 19, contact: "Reese Howard", phone: "(910) 555-0142", email: "reese@atlanticshield.example", client: true, slug: "atlantic-shield-restoration" },
  { name: "Crystal Coast Roofworks", city: "Jacksonville, NC", distance: 48, contact: "Rowan Scott", phone: "(910) 555-0156", email: "rowan@crystalcoast.example", client: false, slug: "crystal-coast-roofworks" },
  { name: "Grand Strand Exteriors", city: "Myrtle Beach, SC", distance: 74, contact: "Sage Murphy", phone: "(843) 555-0173", email: "sage@grandstrand.example", client: false, slug: "grand-strand-exteriors" },
] as const;

function companiesForStorm(storm: string) {
  if (/oklahoma|wind/i.test(storm)) return OKLAHOMA_ROOFERS;
  if (/wilmington|flood/i.test(storm)) return WILMINGTON_ROOFERS;
  return KANSAS_CITY_ROOFERS;
}

function supportingRecordDetail(row: DetailRow, item: string, screen: VisionScreen): SupportingRecordDetail {
  const key = `${item} ${row.primary} ${row.secondary}`.toLowerCase();
  if (/pay-|inv-|payment|financial|refund|charge|collect|fee/.test(key)) return {
    title: row.primary, kind: "Financial event", description: row.secondary,
    stats: [["Amount / reason", row.secondary], ["Reconciliation", row.context], ["Age", "6 business days"], ["Status", "Action required"]],
    evidence: ["Invoice and payment event are deterministically linked", "Failure reason retained from the processor event", "No duplicate collection attempt detected", "Client billing owner is available"],
    owner: row.context.split("·")[0]?.trim() || "Finance", source: "Illustrative Stripe event + invoice ledger", action: "Contact the authorized billing owner, update the payment method securely, and reconcile the successful event.",
  };
  if (/harbor|summit|apex|peak|branch|client|submission/.test(key)) return {
    title: row.primary, kind: "Client and branch signal", description: row.secondary,
    stats: [["Submission signal", row.secondary], ["Operating context", row.context], ["Trailing window", "60 days"], ["Data coverage", "96%"]],
    evidence: ["Submission volume compared with the branch trailing range", "Inactive days exclude weekends and holidays", "Company-wide performance separated from branch contribution", "Recent storm opportunity reviewed independently"],
    owner: "Client Success · Account owner", source: "Illustrative client master + canonical file submissions", action: "Review the branch-level trend with the client and agree on a measured 30-day follow-up.",
  };
  if (/julie|marcus|taylor|nina|handler|cycle|cohort|carrier/.test(key)) return {
    title: row.primary, kind: "Handler performance record", description: row.secondary,
    stats: [["Performance", row.secondary], ["Carrier / workload", row.context], ["Completed cohort", "14 qualifying files"], ["Confidence", "B · measured"]],
    evidence: ["Only completed files enter cycle-time comparison", "Minimum comparative cohort is 10 files", "Carrier mix is disclosed beside the result", "Active workload is shown before routing recommendations"],
    owner: "Operations leadership", source: "Illustrative assignments + status history + financial facts", action: "Confirm capacity and carrier fit before changing the next assignment.",
  };
  if (/monday|stripe|source|data|validation|lineage|sync|import|coverage/.test(key)) return {
    title: row.primary, kind: "Data-source health record", description: row.secondary,
    stats: [["Health", row.secondary], ["Validation", row.context], ["Last checked", "08:47 ET"], ["Lineage", "Source → canonical fact → KPI"]],
    evidence: ["Artifact fingerprint retained", "Row counts reconciled before finalization", "Validation issues remain visible in the review queue", "Browser access excludes raw administrative tables"],
    owner: "Staging administrator", source: "Illustrative ingestion ledger + validation results", action: "Resolve open validation issues and rerun the governed readiness check.",
  };
  if (/high priority|growth attention|exception|recommend/.test(key)) return {
    title: row.primary, kind: "Recommendation evidence", description: row.secondary,
    stats: [["Signal", row.secondary], ["Intervention", row.context], ["Confidence", "91%"], ["Review window", "48 hours"]],
    evidence: ["Contributing metrics meet their coverage threshold", "Affected records are individually traceable", "Priority reflects estimated operational impact", "Recommendation remains advisory and owner-approved"],
    owner: row.context.split("·")[1]?.trim() || "Executive operations", source: "Illustrative governed KPIs + deterministic recommendation rules", action: row.context,
  };
  return {
    title: row.primary, kind: `${screen.title} supporting record`, description: row.secondary,
    stats: [["Result", row.secondary], ["Context", row.context], ["Coverage", "94%"], ["Status", "Illustrative example"]],
    evidence: [`Record supports the ${metricParts(item).label} view`, "Underlying values retain source provenance", "Missing fields remain explicitly unavailable", "Example is isolated from live operational data"],
    owner: "Illustrative accountable owner", source: "Product Vision Demo Data", action: `Review this ${metricParts(item).label.toLowerCase()} example and its underlying source evidence.`,
  };
}

function metricParts(item: string) {
  const parts = item.split("·").map((part) => part.trim());
  return { label: parts[0], value: parts[1] ?? parts[0] };
}

function metricExplanation(label: string) {
  const definitions: Record<string, string> = {
    "Active files": "Files currently requiring TotalScope action. Leadership uses this to understand workload and capacity.",
    "Aging files": "Open files beyond the expected service-stage window. Aging highlights avoidable cycle-time and client-experience risk.",
    "Stalled files": "Files with no meaningful activity inside the configured update window. Each result remains traceable to its activity timeline.",
    "Settlement gain": "Final approved RCV less captured initial RCV, calculated only where both values are valid.",
    "ROI": "Net client gain divided by approved TotalScope fees. Unavailable financial inputs are excluded, never treated as zero.",
    "Financial coverage": "The share of qualifying files with sufficient captured financial facts to calculate governed financial KPIs.",
    "Weather events": "Illustrative storm signals mapped to client branches and expected operational demand; not a live forecast.",
  };
  return definitions[label] ?? `${label} is calculated from governed, traceable facts. Open the metric to see examples, context, and why it matters.`;
}

function detailData(item: string, screen: VisionScreen): DetailData {
  const { label } = metricParts(item);
  const key = label.toLowerCase();
  const seed = [...label].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const trend = [0, 1, 2, 3, 4, 5].map((index) => 30 + ((seed + index * 17) % 58));
  const base = {
    trend,
    summary: metricExplanation(label),
    action: `Review the highest-impact ${label.toLowerCase()} examples with the accountable owner.`,
  };

  if (/^tsi essential/.test(key)) return {
    ...base,
    columns: ["Essential capability", "Included scope", "Client value"],
    rows: [
      { primary: "File visibility", secondary: "Current and completed files", context: "One place to understand active TotalScope work" },
      { primary: "Monthly summary", secondary: "One client-level digest", context: "Submission, status, and completed-outcome recap" },
      { primary: "Basic financial value", secondary: "Completed measurable files", context: "Settlement gain and paid-fee context" },
      { primary: "Email support", secondary: "Standard response window", context: "Product and data-question assistance" },
    ],
    action: "Use Essential when a growing contractor needs consistent visibility without multi-branch analytics.",
  };
  if (/^tsi professional/.test(key)) return {
    ...base,
    columns: ["Professional capability", "Included scope", "Executive value"],
    rows: [
      { primary: "Executive dashboard", secondary: "Full operational and financial KPIs", context: "Client, branch, carrier, and outcome views" },
      { primary: "Executive Intelligence Report", secondary: "Monthly leadership brief", context: "Trends, attention items, and recommendations" },
      { primary: "Branch + carrier analysis", secondary: "Up to 10 branches", context: "Comparative performance with coverage context" },
      { primary: "Priority support", secondary: "Accelerated response window", context: "Reporting and account-review assistance" },
    ],
    action: "Use Professional for established contractors that manage performance through recurring leadership reviews.",
  };
  if (/^tsi enterprise/.test(key)) return {
    ...base,
    columns: ["Enterprise capability", "Included scope", "Strategic value"],
    rows: [
      { primary: "Multi-entity intelligence", secondary: "Custom branch and business hierarchy", context: "Consolidated and entity-level executive views" },
      { primary: "Custom KPI governance", secondary: "Approved definitions and cohorts", context: "Organization-specific operating measures" },
      { primary: "Benchmarking", secondary: "Approved regional and peer cohorts", context: "Privacy-governed comparative perspective" },
      { primary: "Executive partnership", secondary: "Dedicated review cadence", context: "Custom reporting, enablement, and support" },
    ],
    action: "Use Enterprise for complex multi-branch organizations requiring governed customization and executive partnership.",
  };

  if (/high priority/.test(key)) return {
    ...base,
    columns: ["Affected file", "Evidence", "Required intervention"],
    rows: [
      { primary: "APX-26007", secondary: "62 days open · no carrier reply in 9 days", context: "Escalate to carrier supervisor · Taylor Brooks · today" },
      { primary: "HBR-26018", secondary: "43 days open · no client note in 12 days", context: "Call client operations lead · Marcus Reed · today" },
      { primary: "SRG-26044", secondary: "39 days open · handler at 118% capacity", context: "Reassign to Julie Morgan · Operations · by noon" },
      { primary: "PKR-26022", secondary: "36 days open · estimate revision queued 6 days", context: "Prioritize revision · Estimating lead · tomorrow" },
    ],
    action: "Approve the four-file capacity rebalance and confirm ownership before today’s operations stand-up.",
  };
  if (/growth attention/.test(key)) return {
    ...base,
    columns: ["Contributing branch", "Submission signal", "Recommended engagement"],
    rows: [
      { primary: "Harbor · Wilmington", secondary: "8 files · down 31% over 60 days", context: "Schedule account review · relationship owner · within 3 days" },
      { primary: "Harbor · Myrtle Beach", secondary: "3 files · down 44% over 60 days", context: "Review recent storm opportunity · sales lead · this week" },
      { primary: "Harbor · Raleigh", secondary: "No submissions in 24 days", context: "Confirm operating status · client success · today" },
      { primary: "Harbor · Charleston", secondary: "Stable · 12 files", context: "Use healthy branch practices in recovery plan" },
    ],
    action: "Open a 30-minute submission-health review with Harbor Roofing and its three declining branches.",
  };
  if (/financial exception/.test(key)) return {
    ...base,
    columns: ["Payment exception", "Amount and cause", "Resolution owner"],
    rows: [
      { primary: "PAY-88421 · INV-10491", secondary: "$1,690 · expired card", context: "Breson · send secure payment update · today" },
      { primary: "PAY-88377 · INV-10473", secondary: "$1,980 · insufficient funds", context: "Finance · retry approved for Jul 2" },
      { primary: "PAY-88294 · INV-10428", secondary: "$950 · bank declined", context: "Account owner · confirm alternate method · within 2 days" },
    ],
    action: "Resolve the three failed payments representing $4,620 before the weekly revenue close.",
  };

  if (/weather|storm|hail|wind|flood/.test(key)) return {
    ...base,
    columns: ["Storm", "Affected branches", "Expected impact"],
    rows: [
      { primary: "Kansas City hail", secondary: "Overland Park · Lee’s Summit", context: "42–58 inspections · 2 estimator shifts recommended" },
      { primary: "Oklahoma wind", secondary: "Tulsa · Broken Arrow", context: "28–36 inspections · handler demand beginning in 48h" },
      { primary: "Wilmington flooding", secondary: "Wilmington Coastal", context: "14–20 inspections · water-loss expertise required" },
    ],
    action: "Confirm branch coverage and reserve two flex estimators for the Kansas City hail response.",
  };
  if (/settlement|charge|gain|roi|collect|refund|fee|payment|revenue|mrr|arr|pricing/.test(key)) return {
    ...base,
    columns: ["Financial event", "Amount", "Reconciliation"],
    rows: [
      { primary: `${label} · INV-10482`, secondary: "$4,280", context: "Summit Roofing · Paid Jun 18 · Stripe matched" },
      { primary: `${label} · INV-10467`, secondary: "$2,940", context: "Harbor Property · Paid Jun 11 · Bank deposit verified" },
      { primary: `${label} · RF-00218`, secondary: "($375)", context: "Approved refund · Jun 7 · Original payment linked" },
      { primary: `${label} · INV-10491`, secondary: "$1,690", context: "Apex Exteriors · Pending 6 days · Follow-up assigned" },
    ],
    action: key.includes("refund") ? "Review the linked refund reason and confirm the client credit is complete." : "Review the unmatched or pending financial event before the Friday collections meeting.",
  };
  if (/client|branch|submission|retention|renewal|account|enterprise/.test(key)) return {
    ...base,
    columns: ["Client / branch", "Current signal", "Supporting context"],
    rows: [
      { primary: "Summit Roofing · Overland Park", secondary: "↑ 18% submissions", context: "24 files · 96% data coverage · healthy" },
      { primary: "Harbor Property · Wilmington", secondary: "↓ 31% submissions", context: "8 files · last submission 19 days ago · attention" },
      { primary: "Apex Exteriors · Tulsa", secondary: "Stable", context: "16 files · 4 active claim-handling files" },
      { primary: "Peak Restoration · Denver", secondary: "New branch", context: "6 files in first 30 days · onboarding on track" },
    ],
    action: "Schedule a submission-health conversation with Harbor Property and review the three contributing branches.",
  };
  if (/handler|cycle|workload|cohort|carrier|turnaround/.test(key)) return {
    ...base,
    columns: ["Handler", "Performance", "Operating context"],
    rows: [
      { primary: "Julie Morgan", secondary: "19d median · 14 closed", context: "State Farm 42% · 6 active · qualifying cohort" },
      { primary: "Marcus Reed", secondary: "24d median · 11 closed", context: "Travelers 36% · 8 active · qualifying cohort" },
      { primary: "Taylor Brooks", secondary: "31d median · 7 closed", context: "Allstate 51% · 9 active · below cohort" },
      { primary: "Nina Patel", secondary: "21d median · 12 closed", context: "North Star 39% · 5 active · qualifying cohort" },
    ],
    action: "Route the next qualifying State Farm assignment to Julie if her active workload remains below eight.",
  };
  if (/source|data|coverage|validation|lineage|sync|import|reconcile|missing|kpi/.test(key)) return {
    ...base,
    columns: ["Source", "Health", "Validation evidence"],
    rows: [
      { primary: "Monday archive", secondary: "Current · 4,281 rows", context: "14 review issues · imported 08:42 ET" },
      { primary: "Stripe transactions", secondary: "Current · 642 events", context: "3 unmatched payments · reconciled 08:47 ET" },
      { primary: "Client master", secondary: "Healthy · 68 clients", context: "100% stable keys · synced 08:39 ET" },
      { primary: "Weather opportunity", secondary: "Illustrative only", context: "No live feed · demo events clearly labeled" },
    ],
    action: "Resolve the 14 Monday validation issues before relying on the affected comparative KPIs.",
  };
  if (/document|note|file|active|aging|stalled|completed|status|outcome|estimate/.test(key)) return {
    ...base,
    columns: ["File", "Current state", "Owner and next action"],
    rows: fileRowsForMetric(key, label),
    action: key.includes("stalled") || key.includes("aging") ? "Escalate APX-26007 and reassign available handler capacity today." : base.action,
  };
  return {
    ...base,
    columns: ["Example", "Illustrative result", "Why it matters"],
    rows: [
      { primary: `${label} · Example A`, secondary: `${screen.title} · improving`, context: "Measured from governed inputs · 94% coverage" },
      { primary: `${label} · Example B`, secondary: `${screen.title} · stable`, context: "Within trailing operating range" },
      { primary: `${label} · Example C`, secondary: `${screen.title} · attention`, context: "Supporting evidence available · owner assigned" },
    ],
  };
}

export function ProductVisionDemo({ open, onClose, initialScreen = 1 }: { open: boolean; onClose: () => void; initialScreen?: number }) {
  const [index, setIndex] = useState(Math.min(24, Math.max(0, initialScreen - 1)));
  const [detail, setDetail] = useState<{ item: string; screen: VisionScreen } | null>(null);
  const move = useCallback((delta: number) => {
    setDetail(null);
    setIndex((value) => Math.min(24, Math.max(0, value + delta)));
  }, []);

  useEffect(() => {
    if (!open) return;
    const key = (event: KeyboardEvent) => {
      if (detail && event.key === "Escape") return setDetail(null);
      if (event.key === "ArrowRight") move(1);
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open, onClose, move, detail]);

  if (!open) return null;
  const current = PRODUCT_VISION_SCREENS[index];

  return (
    <div className="vision-overlay" role="dialog" aria-modal="true" aria-labelledby="vision-title">
      <header className="vision-header">
        <div className="vision-brand"><span className="vision-mark">TS</span><div><small>PRODUCT VISION</small><b>TotalScope Intelligence</b></div></div>
        <nav aria-label="Demo sections">{PRODUCT_VISION_SECTIONS.map((section) => {
          const first = PRODUCT_VISION_SCREENS.findIndex((item) => item.section === section);
          return <button key={section} className={current.section === section ? "active" : ""} onClick={() => { setIndex(first); setDetail(null); }}>{section}</button>;
        })}</nav>
        <button className="vision-exit" onClick={onClose} aria-label="Exit Product Vision Demo">Exit demo <span>×</span></button>
      </header>

      <main className={`vision-stage template-${current.template}`}>
        <div className="vision-copy">
          <div className="vision-meta"><span>{current.section}</span><em>{current.status}</em></div>
          {current.persona && <p className="vision-persona">{current.persona}</p>}
          <h1 id="vision-title">{current.title}</h1>
          <h2>{current.question}</h2>
          <p>{current.message}</p>
          <div className="vision-story">
            <span><b>Today</b> fragmented signals require manual reconciliation.</span>
            <span><b>With TSI</b> governed facts reveal the action and supporting evidence.</span>
            <span><b>Leadership value</b> faster decisions with confidence.</span>
          </div>
        </div>
        <VisionCanvas screen={current} onOpen={(item) => setDetail({ item, screen: current })} />
      </main>

      <footer className="vision-footer">
        <p>{PRODUCT_VISION_DISCLOSURE}</p>
        <div className="vision-progress" aria-hidden="true"><i style={{ width: `${((index + 1) / 25) * 100}%` }} /></div>
        <div className="vision-controls">
          <button onClick={() => move(-1)} disabled={index === 0}>← Previous</button>
          <span>{index + 1} of 25</span>
          <button onClick={() => move(1)} disabled={index === 24}>Next →</button>
        </div>
      </footer>
      {detail && <MetricDetail item={detail.item} screen={detail.screen} onClose={() => setDetail(null)} />}
    </div>
  );
}

function VisionCanvas({ screen, onOpen }: { screen: VisionScreen; onOpen: (item: string) => void }) {
  let content: React.ReactNode = <HighlightGrid items={screen.highlights} template={screen.template} onOpen={onOpen} />;
  if (screen.template === "dashboard") content = <div className="vision-dashboard"><HighlightGrid items={screen.highlights} template={screen.template} onOpen={onOpen} /><StormMap onOpen={onOpen} /><button className="vision-recommendation" onClick={() => onOpen("High priority · Rebalance 7 aging files · 91% confidence")}><span>RECOMMENDED NEXT ACTION</span><b>Rebalance seven aging files toward available handler capacity.</b><em>91% confidence · Estimated 4-day cycle-time improvement →</em></button></div>;
  if (screen.template === "pipeline") content = <OutcomePipeline items={screen.highlights} />;
  if (screen.template === "pricing") content = <PricingCards onOpen={onOpen} />;
  if (screen.template === "revenue") content = <RevenueModel items={screen.highlights} onOpen={onOpen} />;
  if (screen.template === "report-cover") content = <ReportCover onOpen={onOpen} />;
  if (screen.template === "report") content = <ExecutiveReport onOpen={onOpen} />;
  if (screen.template === "file-detail") content = <FileTrace onOpen={onOpen} />;
  if (screen.template === "ask") content = <AskTsi questions={screen.highlights} onOpen={onOpen} />;
  if (screen.template === "closing") content = <VisionFlow items={screen.highlights} />;
  return (
    <section className="vision-canvas" aria-label={`${screen.title} illustrative interface`}>
      <div className="vision-canvas-bar"><div><span /><span /><span /></div><b>{screen.template === "client-health" ? "Client Health · Harbor Roofing" : screen.section === "Client experience" ? "Client Portal · Summit Roofing Group" : "Executive Operations · Demo Data"}</b><em>Illustrative</em></div>
      <div className={`vision-mock vision-mock-${screen.template}`}>{content}</div>
    </section>
  );
}

function HighlightGrid({ items, template, onOpen }: { items: readonly string[]; template: string; onOpen: (item: string) => void }) {
  return <div className={`vision-highlight-grid grid-${template}`}>{items.map((item, index) => {
    const { label, value } = metricParts(item);
    return <button className="vision-kpi" key={item} onClick={() => onOpen(item)} aria-label={`Open ${label} details`}>
      <span className="vision-info" tabIndex={0} aria-label={`About ${label}`} data-tip={metricExplanation(label)}>i</span>
      <small>{label}</small><b>{value}</b>
      <span className="vision-kpi-context">{index % 3 === 0 ? "↑ 12% vs prior period" : index % 3 === 1 ? "Within operating range" : "Requires review"}</span>
      <Sparkline seed={index} />
      <strong>View evidence <span>→</span></strong>
    </button>;
  })}</div>;
}

function Sparkline({ seed }: { seed: number }) {
  const paths = ["4,31 25,24 45,27 66,13 88,18 110,7", "4,12 25,17 45,14 66,25 88,21 110,29", "4,28 25,25 45,17 66,20 88,10 110,14"];
  return <svg className="vision-spark" viewBox="0 0 114 36" role="img" aria-label="Illustrative six-period trend"><polyline points={paths[seed % paths.length]} /></svg>;
}

function StormMap({ onOpen }: { onOpen: (item: string) => void }) {
  const [selected, setSelected] = useState(0);
  const storms = [
    { name: "Kansas City hail", type: "Hail · 2.1 in", branches: "2 branches", inspections: "42–58", staff: "+2 estimator shifts", x: 43, y: 45, tone: "severe" },
    { name: "Oklahoma wind", type: "Wind · 74 mph", branches: "2 branches", inspections: "28–36", staff: "+1 handler pod", x: 45, y: 62, tone: "warning" },
    { name: "Wilmington flooding", type: "Flood · 4.8 in", branches: "1 branch", inspections: "14–20", staff: "Water-loss specialist", x: 78, y: 66, tone: "water" },
  ] as const;
  const active = storms[selected];
  return <section className="storm-map-card" aria-label="Illustrative storm opportunity map">
    <header><div><small>WEATHER OPPORTUNITY · DEMO DATA</small><b>Three events may change next week’s workload</b></div><button onClick={() => onOpen("Weather events · 3")}>Open storm portfolio →</button></header>
    <div className="storm-map-body">
      <div className="storm-map" role="img" aria-label="Illustrative central and eastern United States storm map">
        <svg viewBox="0 0 620 260" aria-hidden="true">
          <path className="map-land" d="M42 42L129 28 205 43 278 30 353 44 421 41 480 63 544 59 574 91 557 119 574 145 542 169 510 211 460 205 421 227 370 212 316 228 266 207 212 218 178 192 120 199 91 164 54 141 66 105Z"/>
          <path className="map-state" d="M126 31v164M205 43l7 175M278 31l-12 176M353 44l17 168M421 42v185M480 63l-20 142M66 105h491M54 141h488M91 164h440"/>
          <path className="storm-track hail" d="M195 104c40-35 83-21 114 12s70 24 103-1"/>
          <path className="storm-track wind" d="M211 176c48-28 92-20 134 7s80 21 121-6"/>
          <path className="storm-track flood" d="M454 177c31-20 62-12 90 13"/>
        </svg>
        {storms.map((storm, index) => <button key={storm.name} className={`storm-pin ${storm.tone} ${selected === index ? "active" : ""}`} style={{ left: `${storm.x}%`, top: `${storm.y}%` }} onMouseEnter={() => setSelected(index)} onFocus={() => setSelected(index)} onClick={() => { setSelected(index); onOpen(`${storm.name} · ${storm.type}`); }} aria-label={`${storm.name}: ${storm.type}, ${storm.inspections} expected inspections`}><i /><span><b>{storm.name}</b><small>{storm.type} · {storm.inspections} inspections</small></span></button>)}
        <div className="map-legend"><span><i className="severe" /> Hail</span><span><i className="warning" /> Wind</span><span><i className="water" /> Flood</span></div>
      </div>
      <aside><small>SELECTED EVENT</small><h4>{active.name}</h4><p>{active.type}</p><dl><div><dt>Affected</dt><dd>{active.branches}</dd></div><div><dt>Expected inspections</dt><dd>{active.inspections}</dd></div><div><dt>Staffing impact</dt><dd>{active.staff}</dd></div></dl><button onClick={() => onOpen(`${active.name} · ${active.type}`)}>View event evidence →</button></aside>
    </div>
  </section>;
}

function OutcomePipeline({ items }: { items: readonly string[] }) {
  return <div className="vision-outcome-pipeline">
    <div className="pipeline-sources">{items.slice(0, 6).map((item, index) => <span key={item}><i>{["☁", "◆", "M", "✎", "$", "▤"][index]}</i>{item}</span>)}</div>
    <div className="pipeline-engine"><small>TSI RECONCILIATION ENGINE</small><b>Connect, validate, and explain every signal</b><div><i /><i /><i /><i /></div></div>
    <div className="pipeline-findings"><span className="danger">12 stalled files</span><span className="warning">3 declining clients</span><span className="success">$428K client gain</span></div>
    <div className="pipeline-report"><small>MONDAY EXECUTIVE BRIEF</small><b>What changed. Why it matters. What to do next.</b></div>
  </div>;
}

function PricingCards({ onOpen }: { onOpen: (item: string) => void }) {
  const plans = [["TSI Essential", "$99 / month", "Visibility for a growing operator"], ["TSI Professional", "$299 / month", "Executive intelligence and benchmarking"], ["TSI Enterprise", "$750–$1,500 / month", "Multi-branch operating intelligence"]];
  return <div className="vision-pricing">{plans.map((plan, index) => <button onClick={() => onOpen(plan.join(" · "))} className={index === 1 ? "featured" : ""} key={plan[0]}><small>{index === 1 ? "MOST COMPLETE" : "ILLUSTRATIVE"}</small><h3>{plan[0]}</h3><strong>{plan[1]}</strong><p>{plan[2]}</p><span>Explore plan →</span></button>)}</div>;
}

function RevenueModel({ onOpen }: { items: readonly string[]; onOpen: (item: string) => void }) {
  const [tiers, setTiers] = useState([
    { name: "Essential", users: 50, fee: 99, color: "#0f8b8d" },
    { name: "Professional", users: 40, fee: 299, color: "#2878d0" },
    { name: "Enterprise", users: 10, fee: 1000, color: "#d19438" },
  ]);
  const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  const updateTier = (index: number, field: "users" | "fee", value: number) =>
    setTiers((current) => current.map((tier, tierIndex) => tierIndex === index ? { ...tier, [field]: value } : tier));
  const mrr = tiers.reduce((sum, tier) => sum + tier.users * tier.fee, 0);
  const arr = mrr * 12;
  const totalUsers = tiers.reduce((sum, tier) => sum + tier.users, 0);
  const blendedRevenue = totalUsers ? mrr / totalUsers : 0;

  return <div className="revenue-calculator">
    <header><div><small>ILLUSTRATIVE BUSINESS MODEL</small><h3>Recurring revenue calculator</h3><p>Adjust subscribers and monthly fees to explore potential MRR and ARR. This scenario is not a forecast.</p></div><button onClick={() => setTiers([{ name: "Essential", users: 50, fee: 99, color: "#0f8b8d" }, { name: "Professional", users: 40, fee: 299, color: "#2878d0" }, { name: "Enterprise", users: 10, fee: 1000, color: "#d19438" }])}>Reset example</button></header>
    <div className="revenue-calculator-grid">
      <section className="revenue-tier-controls" aria-label="Subscription assumptions">
        {tiers.map((tier, index) => <article key={tier.name} style={{ "--tier-color": tier.color } as CSSProperties}>
          <div className="revenue-tier-title"><span>{tier.name}</span><b>{money(tier.users * tier.fee)}<small> MRR</small></b></div>
          <label><span>Subscribers <output>{tier.users}</output></span><input aria-label={`${tier.name} subscribers`} type="range" min="0" max="250" step="1" value={tier.users} onChange={(event) => updateTier(index, "users", Number(event.target.value))} /></label>
          <label><span>Monthly fee <output>{money(tier.fee)}</output></span><input aria-label={`${tier.name} monthly fee`} type="range" min={index === 0 ? 49 : index === 1 ? 149 : 500} max={index === 0 ? 249 : index === 1 ? 749 : 2500} step={index === 2 ? 50 : 10} value={tier.fee} onChange={(event) => updateTier(index, "fee", Number(event.target.value))} /></label>
        </article>)}
      </section>
      <aside className="revenue-results" aria-live="polite">
        <small>CALCULATED SCENARIO</small><div className="revenue-result-primary"><span>Monthly recurring revenue</span><b>{money(mrr)}</b></div><div className="revenue-result-primary annual"><span>Annual recurring revenue</span><b>{money(arr)}</b></div>
        <dl><div><dt>Total subscribers</dt><dd>{totalUsers}</dd></div><div><dt>Blended monthly revenue</dt><dd>{money(blendedRevenue)}</dd></div></dl>
        <div className="revenue-mix"><small>MRR BY TIER</small>{tiers.map((tier) => { const tierMrr = tier.users * tier.fee; const share = mrr ? Math.round(tierMrr / mrr * 100) : 0; return <button key={tier.name} onClick={() => onOpen(`${tier.name} revenue scenario Â· ${tier.users} subscribers at ${money(tier.fee)} monthly`)}><span><i style={{ background: tier.color }} />{tier.name}<em>{share}%</em></span><b>{money(tierMrr)}</b></button>; })}</div>
        <p>Demo Data Â· Calculated instantly from the illustrative assumptions shown.</p>
      </aside>
    </div>
  </div>;
}

function ReportCover({ onOpen }: { onOpen: (item: string) => void }) {
  const topics = ["Carrier scorecards", "Storm History Impact", "Contractor benchmarks"];
  return <div className="vision-report-showcase"><div className="vision-report-cover" aria-label="Illustrative State of Roofing Claims and Restoration report cover"><small>2027 INDUSTRY INTELLIGENCE</small><h3>The State of Roofing Claims & Restoration</h3><div className="cover-map">TSI</div><p>Powered by TotalScope Intelligence</p></div><div className="report-thumbnails">{topics.map((topic) => <button key={topic} onClick={() => onOpen(topic)}>{topic}<span>Explore evidence →</span></button>)}</div></div>;
}

function ExecutiveReport({ onOpen }: { onOpen: (item: string) => void }) {
  return <div className="executive-report"><aside><small>JUNE 2026</small><b>Executive Intelligence Report</b><span>Summit Roofing Group</span><nav>Executive summary<br />Financial outcomes<br />Attention items<br />Branch trends<br />Recommendations</nav></aside><section><header><span>Prepared for leadership</span><div><button disabled>Share</button><button onClick={() => onOpen("Executive report · Download preview")}>Download PDF</button></div></header><h3>Growth is healthy. Seven aging files require attention.</h3><div className="report-kpis"><b>$396.7K<small>Net client benefit</small></b><b>1,243%<small>ROI</small></b><b>91<small>Completed outcomes</small></b></div><div className="report-chart"><i /><i /><i /><i /><i /><i /></div><p><span>Recommendation</span> Rebalance seven aging files toward available handler capacity before Friday.</p></section></div>;
}

function FileTrace({ onOpen }: { onOpen: (item: string) => void }) {
  const steps = ["File", "Notes", "Documents", "Carrier", "Timeline", "Settlement", "Invoice", "Payment", "Evidence"];
  return <div className="file-trace"><div className="trace-summary"><small>TSI-1001 · COMPLETED</small><b>$4,000 settlement gain</b><span>North Star Mutual · Summit Roofing Group</span></div><div className="trace-steps">{steps.map((step, index) => <button key={step} onClick={() => onOpen(`${step} · TSI-1001`)}><i>{index + 1}</i><span>{step}</span><small>{index < 7 ? "Verified" : "4 sources"}</small></button>)}</div><div className="trace-proof"><b>Every conclusion has a source.</b><span>Initial estimate → carrier correspondence → approved scope → invoice → settled payment</span></div></div>;
}

function AskTsi({ questions, onOpen }: { questions: readonly string[]; onOpen: (item: string) => void }) {
  return <div className="vision-ask"><div className="ask-orb">TSI</div><h3>Ask governed operational data</h3>{questions.map((question) => <button key={question} onClick={() => onOpen(question)}>{question}<span>→</span></button>)}<div className="ask-input">What trends should leadership discuss Monday morning? <span>Ask</span></div></div>;
}

function VisionFlow({ items }: { items: readonly string[] }) {
  return <div className="vision-closing"><div className="vision-closing-flow">{items.map((item, index) => <div key={item}><strong>{item}</strong>{index < items.length - 1 && <span>→</span>}</div>)}</div><p>Not another dashboard. The operating intelligence layer for TotalScope.</p></div>;
}

function MetricDetail({ item, screen, onClose }: { item: string; screen: VisionScreen; onClose: () => void }) {
  const { label, value } = metricParts(item);
  const data = detailData(item, screen);
  const [selectedStorm, setSelectedStorm] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<DemoFile | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<DetailRow | null>(null);
  const isStorm = /weather|storm|hail|wind|flood/i.test(item);
  const isOperationalFileMetric = /^(new files|active files|completed files|stalled files|aging files)$/i.test(label);
  const isRecommendation = screen.template === "recommendations";
  const isFinancialMetric = screen.template === "financial";
  const isClientHealthMetric = screen.template === "client-health";
  const isHandlerMetric = screen.template === "handlers";
  const isDataHealthMetric = screen.template === "data-health";
  const isClientDetailMetric = screen.template === "client-detail";
  const isClientPortalMetric = screen.template === "client-portal";
  const isActiveWorkMetric = screen.template === "active-work";
  const isOutcomeMetric = screen.template === "outcomes";
  const isBenchmarkMetric = screen.template === "benchmarks";
  const isPricingTier = screen.template === "pricing";
  const isStrategicValueMetric = screen.template === "value";
  const isIndustryReportMetric = screen.template === "report-cover";
  const isMarketPricingMetric = screen.template === "market-pricing";
  const isIntelligenceProductMetric = screen.template === "products";
  const isObservationMetric = screen.template === "observations";
  return <div className="vision-detail-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <aside className="vision-detail" role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <header><div><small>ILLUSTRATIVE DRILL-DOWN</small>{isStorm ? <button className="storm-detail-title" onClick={() => setSelectedStorm(label)}><h3 id="detail-title">{label}</h3><span>View roofing companies within 100 miles →</span></button> : <h3 id="detail-title">{label}</h3>}</div><button onClick={onClose} aria-label="Close metric details">×</button></header>
      <div className="detail-value"><b>{value}</b><span>Demo Data · {screen.title}</span></div>
      <section><h4>Why leadership should care</h4><p>{data.summary}</p></section>
      {isOperationalFileMetric && <OperationalFileSummary label={label} />}
      {isStorm ? <StormEvidence storm={label} /> : isRecommendation ? <RecommendationEvidence label={label} /> : isFinancialMetric ? <FinancialEvidence label={label} /> : isClientHealthMetric ? <ClientHealthEvidence label={label} /> : isHandlerMetric ? <HandlerEvidence label={label} /> : isDataHealthMetric ? <DataHealthEvidence label={label} /> : isClientDetailMetric ? <ClientDetailEvidence label={label} /> : isClientPortalMetric ? <ClientPortalEvidence label={label} /> : isActiveWorkMetric ? <ActiveWorkEvidence label={label} /> : isOutcomeMetric ? <CompletedOutcomeEvidence label={label} /> : isBenchmarkMetric ? <BenchmarkEvidence label={label} /> : isPricingTier ? <PricingTierEvidence label={label} /> : isStrategicValueMetric ? <StrategicValueEvidence label={label} /> : isIndustryReportMetric ? <IndustryReportEvidence label={label} /> : isMarketPricingMetric ? <MarketPricingEvidence label={label} /> : isIntelligenceProductMetric ? <IntelligenceProductEvidence label={label} /> : isObservationMetric ? <ObservationEvidence label={label} /> : <section><h4>Six-period illustrative trend</h4><div className="detail-chart"><span>Trend</span>{data.trend.map((height, index) => <i key={index} style={{ height: `${height}%` }}><small>{["Jan", "Feb", "Mar", "Apr", "May", "Jun"][index]}</small></i>)}</div></section>}
      <section><div className="detail-section-title"><h4>Supporting examples</h4><span>{data.rows.length} records</span></div><table><thead><tr>{data.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{data.rows.map((row) => <tr key={`${row.primary}-${row.secondary}`}><td>{isStorm ? <button className="storm-table-link" onClick={() => setSelectedStorm(row.primary)} aria-label={`View roofing companies near ${row.primary}`}>{row.primary}</button> : fileById(row.primary) ? <button className="file-table-link" onClick={() => setSelectedFile(fileById(row.primary)!)} aria-label={`Open file statistics for ${row.primary}`}>{row.primary}</button> : <button className="record-table-link" onClick={() => setSelectedRecord(row)} aria-label={`Open supporting information for ${row.primary}`}>{row.primary}</button>}</td><td>{row.secondary}</td><td>{row.context}</td></tr>)}</tbody></table></section>
      <section className="detail-action"><div><small>RECOMMENDED NEXT ACTION</small><b>{data.action}</b></div><button onClick={onClose}>Return to presentation</button></section>
    </aside>
    {selectedStorm && <ContractorRadiusModal storm={selectedStorm} onClose={() => setSelectedStorm(null)} />}
    {selectedFile && <FileStatsModal file={selectedFile} onClose={() => setSelectedFile(null)} />}
    {selectedRecord && <SupportingRecordModal row={selectedRecord} item={item} screen={screen} onClose={() => setSelectedRecord(null)} />}
  </div>;
}

function MarketPricingEvidence({ label }: { label: string }) {
  const key = label.toLowerCase();
  const model = key.includes("digital") ? ["Individual report access", "Analysts, operators, and advisors", "Single named-user download", "Annual edition", "Aggregated national findings and methodology appendix", "No redistribution or company-wide access"] :
    key.includes("company") ? ["Company-wide report license", "Restoration companies and regional operators", "Up to 25 internal users", "Annual edition", "Report, internal presentation rights, and leadership briefing", "No external redistribution or raw cohort data"] :
      key.includes("enterprise") ? ["Enterprise intelligence license", "Carriers, national operators, and large service organizations", "Negotiated enterprise access", "Annual + approved updates", "Executive briefing, extended exhibits, and entity access", "Custom work and data extracts scoped separately"] :
        key.includes("regional") ? ["Regional market analysis", "Market-entry, strategy, and operating teams", "One approved geography", "Point-in-time study", "Historical storm impact, carrier mix, contractor activity, and operating benchmarks", "Not a weather forecast or investment recommendation"] :
          ["Benchmark subscription", "Operators needing recurring peer context", "Qualified anonymized cohorts", "Quarterly or approved cadence", "Versioned benchmarks, cohort notes, and coverage disclosures", "Pricing varies with scope; peer identities remain private"];
  return <section className="commercial-evidence">
    <div className="commercial-hero"><small>ILLUSTRATIVE COMMERCIAL MODEL</small><h4>{model[0]}</h4><p>{model[1]}</p></div>
    <div className="commercial-grid"><article><small>LICENSE SCOPE</small><b>{model[2]}</b></article><article><small>DELIVERY</small><b>{model[3]}</b></article></div>
    <div className="commercial-detail"><article><h4>Included value</h4><p>{model[4]}</p></article><article><h4>Commercial boundary</h4><p>{model[5]}</p></article></div>
    <div className="commercial-gate"><small>REQUIRED BEFORE SALE</small><b>Privacy review · minimum cohort approval · licensing terms · legal approval · publication QA</b></div>
  </section>;
}

function IntelligenceProductEvidence({ label }: { label: string }) {
  const key = label.toLowerCase();
  const model = key.includes("regional") ? ["Regional market report", "Leadership evaluating a geography", "Historical claim activity, carrier mix, storm impact, and contractor density", "Quarterly or commissioned", "Market-entry and resource-allocation context"] :
    key.includes("carrier") ? ["Carrier scorecard", "Contractor and carrier-relations leaders", "Response time, cycle time, follow-up burden, and settlement movement", "Quarterly", "Prepare carrier conversations using comparable cohorts"] :
      key.includes("contractor") ? ["Contractor benchmark", "Restoration operators", "Submission health, cycle time, financial coverage, and completed outcomes", "Quarterly", "Identify operating strengths and qualified improvement areas"] :
        key.includes("storm") ? ["Storm-response intelligence", "Operations and business-development teams", "Historical event footprints, claim response, inspection demand, and recovery periods", "After verified events", "Understand observed impact and mobilization patterns"] :
          key.includes("outlook") ? ["Industry outlook", "Executives, investors, and strategic partners", "Observed claim, service, carrier, and operating trends", "Annual", "Plan from documented structural changes—not speculative forecasts"] :
            key.includes("supplier") ? ["Supplier report", "Manufacturers and distributors", "Anonymized category demand, regional repair mix, and seasonality", "Quarterly", "Inform inventory and field-support strategy"] :
              key.includes("due diligence") ? ["PE due-diligence brief", "Approved investors and advisors", "Anonymized market structure, operating benchmarks, and risk indicators", "Commissioned", "Support diligence questions with governed industry evidence"] :
                ["Custom research", "Approved enterprise stakeholders", "A tightly defined question and qualified dataset", "Commissioned", "Answer a specific strategic question with documented methodology"];
  return <section className="product-evidence">
    <div className="product-evidence-hero"><small>CONCEPTUAL INTELLIGENCE PRODUCT</small><h4>{model[0]}</h4><p>Designed for: {model[1]}</p></div>
    <div className="product-evidence-flow"><div><i>1</i><span><small>GOVERNED INPUTS</small><b>{model[2]}</b></span></div><div><i>2</i><span><small>DELIVERY CADENCE</small><b>{model[3]}</b></span></div><div><i>3</i><span><small>DECISION SUPPORTED</small><b>{model[4]}</b></span></div></div>
    <div className="product-evidence-boundary"><small>PRODUCT GATE</small><b>Requires anonymization, minimum cohorts, source rights, privacy review, legal approval, and a published methodology.</b></div>
  </section>;
}

function ObservationEvidence({ label }: { label: string }) {
  const key = label.toLowerCase();
  const model = key.includes("submission") ? {
    title: "Submission volume declined 18% versus the prior comparable period.", trigger: "Material decrease exceeds the configured 10% threshold.",
    metrics: [["Current period", "164 files"], ["Prior period", "200 files"], ["Change", "−18%"], ["Coverage", "96%"]],
    contributors: [["North branch", "−18 files", "50% of decline"], ["Coastal branch", "−5 files", "14% of decline"], ["Metro branch", "−3 files", "8% of decline"]],
    confidence: "B · Measured volume; three branch-status confirmations pending", decision: "Validate branch operations before initiating a client-health intervention.",
  } : key.includes("carrier") ? {
    title: "The qualified State Farm cohort closed eight days faster.", trigger: "Cycle-time improvement exceeds the configured five-day materiality threshold.",
    metrics: [["Current median", "24 days"], ["Comparison", "32 days"], ["Completed cohort", "38 files"], ["Coverage", "92%"]],
    contributors: [["First response", "−3.1 days", "Largest measured driver"], ["Scope review", "−2.8 days", "Fewer repeat contacts"], ["Closeout", "−2.1 days", "Faster documentation"]],
    confidence: "A · Qualified cohort with authoritative completion dates", decision: "Review the operating pattern before treating the carrier relationship as causal.",
  } : {
    title: "Failed payments increased for a second consecutive week.", trigger: "Two-period increase and dollar exposure exceed the configured alert threshold.",
    metrics: [["Failed events", "7"], ["Amount at risk", "$9,840"], ["Week-over-week", "+40%"], ["Reconciled", "100%"]],
    contributors: [["Expired cards", "$4,620", "3 accounts"], ["Insufficient funds", "$3,100", "2 accounts"], ["Processor decline", "$2,120", "2 accounts"]],
    confidence: "A · Measured Stripe events reconciled to billing records", decision: "Prioritize recoverable failures and confirm account-owner outreach.",
  };
  return <section className="observation-evidence">
    <div className="observation-hero"><small>DETERMINISTIC OBSERVATION</small><h4>{model.title}</h4><p>{model.trigger}</p></div>
    <div className="observation-metrics">{model.metrics.map(([caption, value]) => <span key={caption}><small>{caption}</small><b>{value}</b></span>)}</div>
    <div className="observation-contributors"><h4>What contributed</h4>{model.contributors.map(([name, value, context]) => <div key={name}><b>{name}</b><strong>{value}</strong><span>{context}</span></div>)}</div>
    <div className="observation-confidence"><div><small>CONFIDENCE</small><b>{model.confidence}</b></div><div><small>LEADERSHIP DECISION</small><b>{model.decision}</b></div></div>
  </section>;
}

function IndustryReportEvidence({ label }: { label: string }) {
  const storm = label.toLowerCase().includes("storm");
  const contractor = label.toLowerCase().includes("contractor");
  const model = storm ? {
    eyebrow: "HISTORICAL INDUSTRY ANALYSIS", headline: "How documented storms changed roofing-claim activity",
    facts: [["Study window", "2019–2026"], ["Illustrative events", "184"], ["Regions analyzed", "12"], ["Forecasting", "Not included"]],
    rows: [["Major hail events", "+68%", "Claim intake in affected ZIPs during the following 30 days"], ["Severe wind events", "+41%", "Inspection demand during the following 21 days"], ["Coastal flooding", "+29%", "Water-loss and specialty-file mix during the following 45 days"], ["Operational recovery", "37 days", "Median time for submission volume to return to baseline"]],
    source: "Conceptual sources: NOAA/NCEI historical storm records, National Weather Service event archives, and governed anonymized TSI claim cohorts.",
    boundary: "This analysis describes observed historical relationships. It does not predict when or where a future storm will occur.",
  } : contractor ? {
    eyebrow: "ANONYMIZED OPERATING BENCHMARKS", headline: "How restoration operators compare within qualified cohorts",
    facts: [["Illustrative cohort", "126 firms"], ["Minimum cohort", "10 firms"], ["Regions", "9"], ["Identities", "Anonymized"]],
    rows: [["Submission consistency", "82nd percentile", "Files submitted in a stable weekly cadence"], ["Completed-file cycle time", "24 days", "Median for comparable claim-handling files"], ["Financial-data coverage", "91%", "Files with usable captured financial facts"], ["Document responsiveness", "3.2 days", "Median time to provide requested client documents"]],
    source: "Conceptual source: governed, anonymized canonical file facts grouped by region, service mix, and operating scale.",
    boundary: "No contractor is ranked across incomparable cohorts, and no peer identity is disclosed.",
  } : {
    eyebrow: "CARRIER PERFORMANCE SCORECARD", headline: "How carrier cohorts differ across comparable claim files",
    facts: [["Illustrative carriers", "18"], ["Qualified cohorts", "11"], ["Closed files", "2,480"], ["Coverage", "94%"]],
    rows: [["Response time", "8.4 days", "Median first documented carrier response"], ["Cycle time", "31 days", "Median open-to-authoritative-close interval"], ["Settlement movement", "+$6,850", "Median final RCV less initial RCV where both are captured"], ["Re-contact rate", "22%", "Files requiring three or more documented follow-ups"]],
    source: "Conceptual source: canonical claim timelines, carrier correspondence metadata, and captured financial facts.",
    boundary: "Scorecards use minimum cohort rules, display coverage, and distinguish correlation from carrier causation.",
  };
  return <section className="industry-report-evidence">
    <div className="industry-report-heading"><small>{model.eyebrow}</small><h4>{model.headline}</h4></div>
    <div className="industry-report-facts">{model.facts.map(([caption, value]) => <span key={caption}><small>{caption}</small><b>{value}</b></span>)}</div>
    <div className="industry-report-table"><div className="industry-report-table-head"><b>{storm ? "Historical event type" : contractor ? "Benchmark dimension" : "Scorecard measure"}</b><b>Illustrative result</b><b>Interpretation</b></div>{model.rows.map(([name, value, context]) => <div key={name}><b>{name}</b><strong>{value}</strong><span>{context}</span></div>)}</div>
    <div className="industry-report-source"><small>CONCEPTUAL DATA SOURCES</small><p>{model.source}</p></div>
    <div className="industry-report-boundary"><small>IMPORTANT LIMITATION</small><b>{model.boundary}</b></div>
  </section>;
}

function StrategicValueEvidence({ label }: { label: string }) {
  const key = label.toLowerCase();
  const model = key.includes("retention") ? {
    outcome: "Make delivered value visible before renewal risk appears.", decision: "Which clients need a value review now?",
    facts: [["Illustrative clients", "24"], ["Strong value proof", "17"], ["Review needed", "5"], ["Coverage limited", "2"]],
    evidence: [["Value realization", "Settlement gains, completed outcomes, and fees reconciled"], ["Relationship signal", "Submission consistency and unresolved friction"], ["Intervention", "Schedule a measured value review for five accounts"]],
    guardrail: "Retention risk is a qualified operational signal—not a prediction of client behavior.",
  } : key.includes("submission") ? {
    outcome: "Connect client engagement to healthy, consistent file flow.", decision: "Where is submission activity changing?",
    facts: [["Expected cadence", "Weekly"], ["Healthy branches", "8 of 11"], ["Below cadence", "3"], ["Open opportunity", "14 files"]],
    evidence: [["Cadence", "Compare actual submissions with the client’s agreed operating rhythm"], ["Context", "Separate seasonality, closures, and missing-source periods"], ["Intervention", "Review three declining branches with the account owner"]],
    guardrail: "No decline is classified without validating branch status and data completeness.",
  } : key.includes("sales") ? {
    outcome: "Demonstrate that TotalScope provides measurable operating clarity.", decision: "What proof belongs in the next prospect conversation?",
    facts: [["Outcome stories", "6"], ["Measured KPIs", "12"], ["Industries", "Roofing + restoration"], ["Demo status", "Illustrative"]],
    evidence: [["Proof point", "Traceable settlement-value and cycle-time examples"], ["Differentiator", "Operational attention paired with source evidence"], ["Sales asset", "Role-specific demonstration using synthetic scenarios"]],
    guardrail: "Illustrative content must never be represented as actual customer results.",
  } : key.includes("account review") ? {
    outcome: "Replace manual reconciliation with a prepared leadership conversation.", decision: "What changed, why, and what should happen next?",
    facts: [["Review cadence", "Monthly"], ["Sections prepared", "5"], ["Open actions", "7"], ["Evidence links", "18"]],
    evidence: [["Executive summary", "Outcomes, operational attention, and data confidence"], ["Account narrative", "Branch, carrier, and submission context"], ["Follow-through", "Named owners and due dates for agreed actions"]],
    guardrail: "Every review conclusion retains its calculation definition and supporting records.",
  } : key.includes("enterprise") ? {
    outcome: "Show complex operators one governed view across entities and branches.", decision: "Can leadership compare performance without losing local context?",
    facts: [["Illustrative entities", "3"], ["Branches", "18"], ["Role views", "4"], ["Hierarchy", "Configurable"]],
    evidence: [["Consolidation", "Parent, entity, region, and branch rollups"], ["Comparability", "Cohort thresholds and consistent KPI definitions"], ["Control", "Role-scoped access with source-level provenance"]],
    guardrail: "Enterprise hierarchy, custom KPIs, and security scope require approved implementation.",
  } : key.includes("renewal") ? {
    outcome: "Anchor renewal discussions in documented value and future operating priorities.", decision: "What should the client carry into the next term?",
    facts: [["Value window", "Trailing 12 months"], ["Measured outcomes", "91"], ["Open priorities", "4"], ["Coverage", "93%"]],
    evidence: [["Delivered value", "Completed outcomes and reconciled financial benefit"], ["Adoption", "Usage, submissions, and leadership-review participation"], ["Next-term plan", "Specific goals with measurable checkpoints"]],
    guardrail: "Renewal materials distinguish measured, inferred, and unavailable information.",
  } : {
    outcome: "Give clients a clear explanation of what TotalScope did and why it mattered.", decision: "Can every important number be understood and verified?",
    facts: [["KPI definitions", "Versioned"], ["Source lineage", "Retained"], ["Coverage shown", "Every KPI"], ["Unknowns", "Never zero-filled"]],
    evidence: [["Plain language", "Narrative context accompanies every material metric"], ["Traceability", "Users can move from conclusion to file-level evidence"], ["Confidence", "Coverage and limitations remain visible"]],
    guardrail: "Transparency includes limitations; the interface does not hide missing or questionable data.",
  };
  return <section className="strategic-value-evidence">
    <div className="strategic-value-hero"><small>STRATEGIC VALUE PATH</small><h4>{model.outcome}</h4><p><b>Leadership question:</b> {model.decision}</p></div>
    <div className="strategic-value-facts">{model.facts.map(([caption, value]) => <span key={caption}><small>{caption}</small><b>{value}</b></span>)}</div>
    <div className="strategic-value-proof"><h4>How TSI creates this value</h4>{model.evidence.map(([title, detail], index) => <div key={title}><i>{index + 1}</i><span><b>{title}</b><small>{detail}</small></span></div>)}</div>
    <div className="strategic-value-guardrail"><small>GOVERNANCE BOUNDARY</small><b>{model.guardrail}</b></div>
  </section>;
}

function PricingTierEvidence({ label }: { label: string }) {
  const professional = label.includes("Professional");
  const enterprise = label.includes("Enterprise");
  const model = enterprise ? {
    name: "TSI Enterprise", price: "$750–$1,500 / month", fit: "Complex, multi-branch restoration organizations",
    scope: [["Branches", "Custom hierarchy"], ["Users", "Custom"], ["Reporting", "Custom cadence"], ["Support", "Dedicated partner"]],
    included: ["Everything in Professional", "Multi-entity executive consolidation", "Approved custom KPI definitions", "Regional and anonymized peer benchmarks", "Custom Executive Intelligence Reports", "Executive enablement and priority support"],
    journey: [["Discover", "Confirm entities, leaders, and decisions"], ["Configure", "Approve KPI and cohort definitions"], ["Validate", "Reconcile source and organizational hierarchy"], ["Launch", "Executive review and adoption plan"]],
    boundary: "Custom scope, pricing, integrations, and benchmarks require separate approval and contracting.",
  } : professional ? {
    name: "TSI Professional", price: "$299 / month", fit: "Established contractors using data in leadership reviews",
    scope: [["Branches", "Up to 10"], ["Users", "Up to 15"], ["Reporting", "Monthly executive brief"], ["Support", "Priority"]],
    included: ["Everything in Essential", "Full operational and financial dashboard", "Branch and carrier performance", "Client health and attention views", "Monthly Executive Intelligence Report", "Trends and qualified recommendations"],
    journey: [["Connect", "Confirm client and branch master data"], ["Validate", "Review KPI coverage and limitations"], ["Launch", "Invite leadership and operations users"], ["Review", "Monthly Executive Intelligence Report"]],
    boundary: "Custom KPIs, multi-entity consolidation, and external peer benchmarking belong to Enterprise.",
  } : {
    name: "TSI Essential", price: "$99 / month", fit: "Growing contractors seeking simple, reliable visibility",
    scope: [["Branches", "1"], ["Users", "Up to 3"], ["Reporting", "Monthly summary"], ["Support", "Standard email"]],
    included: ["Current and completed file visibility", "Submission and status summary", "Basic completed-outcome reporting", "Measured financial-value overview", "Monthly client digest", "Transparent data-coverage notices"],
    journey: [["Activate", "Confirm company and primary branch"], ["Review", "Validate current file visibility"], ["Invite", "Add up to three users"], ["Receive", "Monthly performance summary"]],
    boundary: "Branch comparison, carrier analysis, recommendations, and executive reports belong to Professional.",
  };
  return <section className="pricing-tier-evidence">
    <div className="pricing-tier-hero"><small>ILLUSTRATIVE BUSINESS MODEL</small><h4>{model.name}</h4><b>{model.price}</b><p>Best for: {model.fit}</p></div>
    <div className="pricing-tier-scope">{model.scope.map(([caption, value]) => <span key={caption}><small>{caption}</small><b>{value}</b></span>)}</div>
    <div className="pricing-tier-grid"><article><h4>What is included</h4>{model.included.map((feature) => <p key={feature}><i>✓</i>{feature}</p>)}</article><article><h4>Example onboarding journey</h4>{model.journey.map(([step, detail], index) => <p key={step}><i>{index + 1}</i><span><b>{step}</b><small>{detail}</small></span></p>)}</article></div>
    <div className="pricing-tier-boundary"><small>PLAN BOUNDARY</small><b>{model.boundary}</b></div>
  </section>;
}

function ActiveWorkEvidence({ label }: { label: string }) {
  const key = label.toLowerCase();
  const model = key.includes("estimating") ? {
    headline: "18 files are being translated into carrier-ready estimates.", status: "On track",
    facts: [["Drafting", "8"], ["Quality review", "6"], ["Awaiting documents", "4"], ["Median stage age", "2.4 days"]],
    steps: [["Scope received", 18, "Complete"], ["Estimate drafting", 14, "In progress"], ["Quality review", 6, "In progress"], ["Ready to deliver", 3, "Today"]],
    message: "Your team can help four files move faster by providing the requested photographs and measurements.",
  } : key.includes("actively handled") ? {
    headline: "24 files are receiving active claim-handling support.", status: "Progressing normally",
    facts: [["Carrier communication", "10"], ["Scope review", "7"], ["Supplement work", "5"], ["Final review", "2"]],
    steps: [["Evidence prepared", 24, "Complete"], ["Carrier engagement", 19, "Active"], ["Scope agreement", 9, "Active"], ["Outcome documented", 2, "Near completion"]],
    message: "TotalScope owns the next action on 21 files; three have scheduled joint calls with your team.",
  } : key.includes("awaiting carrier") ? {
    headline: "Nine files are waiting on a documented carrier response.", status: "Follow-ups scheduled",
    facts: [["Under 5 days", "5"], ["5–10 days", "3"], ["Over 10 days", "1"], ["Next follow-ups", "7"]],
    steps: [["Initial package sent", 9, "Complete"], ["First follow-up", 7, "Complete"], ["Second follow-up", 3, "Scheduled"], ["Escalation", 1, "Recommended"]],
    message: "TotalScope is managing these follow-ups. One file has reached the escalation threshold and is already flagged.",
  } : key.includes("client action") ? {
    headline: "Four files need a small action from your team.", status: "Client action requested",
    facts: [["Photos requested", "2"], ["Signed documents", "1"], ["Property access", "1"], ["Oldest request", "4 days"]],
    steps: [["SRG-26057", 75, "Upload roof photos"], ["SRG-26049", 55, "Sign authorization"], ["SRG-26046", 45, "Confirm inspection"], ["SRG-26042", 30, "Upload invoice"]],
    message: "Completing these four requests is the fastest way to prevent avoidable cycle-time delays.",
  } : key.includes("nearing") ? {
    headline: "Eleven files are approaching a documented outcome.", status: "Expected soon",
    facts: [["Final carrier review", "5"], ["Scope agreed", "3"], ["Payment pending", "2"], ["Closeout review", "1"]],
    steps: [["Scope agreement", 11, "Complete"], ["Final documentation", 8, "Active"], ["Financial confirmation", 5, "Active"], ["Closeout", 3, "Ready"]],
    message: "These files are close, but completion dates remain dependent on authoritative carrier and payment events.",
  } : {
    headline: "Seven files are older than their expected service-stage window.", status: "Attention recommended",
    facts: [["31–45 days", "4"], ["46–60 days", "2"], ["Over 60 days", "1"], ["Client dependencies", "2"]],
    steps: [["Carrier delay", 3, "Follow-up active"], ["Missing client item", 2, "Action requested"], ["Complex scope", 1, "Specialist review"], ["Ownership transition", 1, "Reassigned"]],
    message: "Each aging file includes a specific cause, accountable owner, and next action—age alone does not explain the situation.",
  };
  return <section className="active-work-evidence">
    <div className="client-story-hero"><small>ACTIVE WORK · SUMMIT ROOFING GROUP</small><h4>{model.headline}</h4><p>{model.status}</p></div>
    <div className="active-work-facts">{model.facts.map(([caption, value]) => <span key={caption}><small>{caption}</small><b>{value}</b></span>)}</div>
    <div className="active-work-steps">{model.steps.map(([name, value, status]) => <div key={name}><span><b>{name}</b><small>{status}</small></span><i><em style={{ width: `${typeof value === "number" ? value : Math.min(100, Number(value) * 5)}%` }} /></i></div>)}</div>
    <div className="client-story-outcome"><span>WHAT YOU SHOULD KNOW</span><b>{model.message}</b></div>
  </section>;
}

function CompletedOutcomeEvidence({ label }: { label: string }) {
  const key = label.toLowerCase();
  const project = key.includes("26041") ? {
    id: "SRG-26041", carrier: "State Farm", branch: "Overland Park", initial: "$31,200", final: "$49,600", increase: "$18,400", fee: "$1,380", net: "$17,020", roi: "1,233%", days: "24 days",
    timeline: [["May 4", "Initial carrier scope captured"], ["May 7", "TotalScope estimate completed"], ["May 15", "Carrier review conference"], ["May 27", "Final scope approved"]],
  } : key.includes("26038") ? {
    id: "SRG-26038", carrier: "North Star Mutual", branch: "Lee’s Summit", initial: "$21,300", final: "$33,950", increase: "$12,650", fee: "$950", net: "$11,700", roi: "1,232%", days: "19 days",
    timeline: [["May 2", "File opened"], ["May 6", "Estimate submitted"], ["May 18", "Scope agreement"], ["May 21", "Outcome documented"]],
  } : {
    id: "SRG-26029", carrier: "Travelers", branch: "Overland Park", initial: "$18,750", final: "$28,550", increase: "$9,800", fee: "$735", net: "$9,065", roi: "1,233%", days: "27 days",
    timeline: [["Apr 11", "Initial scope captured"], ["Apr 16", "Supplement delivered"], ["Apr 29", "Carrier response"], ["May 8", "Final approval documented"]],
  };
  return <section className="completed-outcome-evidence">
    <div className="outcome-hero"><small>COMPLETED PROJECT · {project.id}</small><h4>{project.increase} additional approved value</h4><p>{project.carrier} · {project.branch} branch · completed in {project.days}</p></div>
    <div className="outcome-bridge"><span><small>Before</small><b>{project.initial}</b><p>Initial carrier amount</p></span><i>→</i><span className="after"><small>After</small><b>{project.final}</b><p>Final approved amount</p></span></div>
    <div className="outcome-facts"><span><small>Increase</small><b>{project.increase}</b></span><span><small>TotalScope fee</small><b>{project.fee}</b></span><span><small>Net client benefit</small><b>{project.net}</b></span><span><small>Illustrative ROI</small><b>{project.roi}</b></span></div>
    <div className="outcome-timeline">{project.timeline.map(([date, event], index) => <span key={date}><i className={index === project.timeline.length - 1 ? "complete" : ""} /><small>{date}</small><b>{event}</b></span>)}</div>
  </section>;
}

function BenchmarkEvidence({ label }: { label: string }) {
  const key = label.toLowerCase();
  const model = key.includes("submission") ? {
    title: "Monthly submission momentum", note: "Summit is growing faster than its trailing six-month range.",
    series: [["Jan", 24, "24"], ["Feb", 27, "27"], ["Mar", 25, "25"], ["Apr", 31, "31"], ["May", 32, "32"], ["Jun", 38, "38"]],
    facts: [["Current month", "38"], ["Prior month", "32"], ["Change", "+18.8%"], ["Healthy range", "28–36"]],
  } : key.includes("settlement") ? {
    title: "Average settlement-gain comparison", note: "Summit’s measured average is above its own trailing range and the anonymized peer reference.",
    series: [["Summit current", 82, "$4,710"], ["Summit trailing", 66, "$3,820"], ["Regional peers", 58, "$3,340"], ["Top quartile", 91, "$5,240"]],
    facts: [["Summit current", "$4,710"], ["Trailing average", "$3,820"], ["Peer median", "$3,340"], ["Coverage", "92%"]],
  } : key.includes("turnaround") ? {
    title: "Turnaround-time comparison", note: "Lower is better. Summit’s completed files are closing four days faster than the anonymized peer median.",
    series: [["Summit", 55, "22 days"], ["Trailing Summit", 65, "26 days"], ["Regional peers", 72, "29 days"], ["Top quartile", 45, "18 days"]],
    facts: [["Current median", "22d"], ["Prior median", "26d"], ["Peer median", "29d"], ["Improvement", "4 days"]],
  } : key.includes("branch") ? {
    title: "Branch comparison", note: "Charleston leads growth while Wilmington is the clearest client-development opportunity.",
    series: [["Charleston", 91, "+22%"], ["Overland Park", 78, "+12%"], ["Tulsa", 64, "+3%"], ["Wilmington", 38, "−31%"]],
    facts: [["Top volume", "Overland Park"], ["Fastest growth", "Charleston"], ["Attention", "Wilmington"], ["Branches", "4"]],
  } : key.includes("carrier") ? {
    title: "Carrier response patterns", note: "Carrier comparisons reflect Summit’s own completed-file experience and disclose cohort size.",
    series: [["State Farm", 65, "19d · n=18"], ["North Star", 74, "23d · n=14"], ["Travelers", 86, "27d · n=11"], ["Allstate", 100, "31d · n=8"]],
    facts: [["Fastest median", "State Farm"], ["Largest cohort", "State Farm"], ["Below cohort", "Allstate"], ["Coverage", "100%"]],
  } : {
    title: "Anonymized peer benchmark", note: "Peer comparisons use approved aggregation rules and never expose another contractor’s identity.",
    series: [["Summit", 84, "Top 28%"], ["Regional median", 61, "50th percentile"], ["Peer upper quartile", 76, "75th percentile"], ["Peer leaders", 94, "Top 10%"]],
    facts: [["Peer cohort", "42 companies"], ["Region", "Multi-state"], ["Minimum cohort", "10"], ["Privacy", "Anonymized"]],
  };
  return <section className="benchmark-evidence">
    <div className="benchmark-title"><div><small>SUMMIT ROOFING GROUP</small><h4>{model.title}</h4></div><span>CLIENT-OWNED + APPROVED PEER DATA</span></div>
    <div className="benchmark-facts">{model.facts.map(([caption, value]) => <span key={caption}><small>{caption}</small><b>{value}</b></span>)}</div>
    <div className="benchmark-series">{model.series.map(([name, percent, value]) => <div key={name}><span><b>{name}</b><small>{value}</small></span><i><em style={{ width: `${percent}%` }} /></i></div>)}</div>
    <div className="client-story-outcome"><span>WHAT THIS MEANS FOR SUMMIT</span><b>{model.note}</b></div>
  </section>;
}

function ClientPortalEvidence({ label }: { label: string }) {
  const key = label.toLowerCase();
  const model = key.includes("submitted") ? {
    eyebrow: "YOUR SUBMISSION STORY", headline: "Your branches submitted 38 files this month.", summary: "That is six more opportunities than last month, with consistent activity across all four branches.",
    moments: [["Overland Park", "14 files", "Leading submission volume"], ["Charleston", "11 files", "Up 22% from last month"], ["Tulsa", "8 files", "Consistent with your normal range"], ["Wilmington", "5 files", "Opportunity to rebuild momentum"]],
    outcome: "Your submission activity is healthy overall. We recommend a short check-in with Wilmington to understand the recent slowdown.",
  } : key.includes("active") ? {
    eyebrow: "WORK IN PROGRESS", headline: "64 files are actively moving toward an outcome.", summary: "Most files are progressing normally. Nine are waiting on a carrier and four need information from your team.",
    moments: [["Actively handled", "24 files", "TotalScope is moving these forward"], ["In estimating", "18 files", "Scope preparation underway"], ["Awaiting carrier", "9 files", "Follow-ups already scheduled"], ["Your action", "4 files", "Photos or documents requested"]],
    outcome: "Your TotalScope team is managing the carrier follow-ups. The four client-action files are the fastest opportunity to prevent delays.",
  } : key.includes("completed") ? {
    eyebrow: "COMPLETED OUTCOMES", headline: "91 files reached a documented outcome this quarter.", summary: "Your completed work produced measurable results while maintaining a 22-day median turnaround.",
    moments: [["Completed in 30 days", "73 files", "80% of completed outcomes"], ["Completed in 31–45 days", "14 files", "Complex carrier review"], ["Over 45 days", "4 files", "Each includes delay context"], ["Financially measurable", "84 files", "92% outcome coverage"]],
    outcome: "Most completed files closed within 30 days. The four longer files remain visible with their specific carrier or documentation delays.",
  } : key.includes("settlement") ? {
    eyebrow: "VALUE CREATED", headline: "TotalScope helped document $428,600 in settlement gains.", summary: "This represents the difference between captured initial carrier amounts and approved final amounts on financially complete files.",
    moments: [["Scope corrections", "$176,400", "Missing or reduced scope restored"], ["Code requirements", "$121,800", "Supported code-related additions"], ["Supplemental damage", "$89,600", "Additional documented damage"], ["Other approvals", "$40,800", "Additional supported line items"]],
    outcome: "Every included gain is tied to captured initial and final values. Files without complete financial data are excluded—not counted as zero.",
  } : key.includes("fees") ? {
    eyebrow: "YOUR INVESTMENT", headline: "You paid $31,900 for completed TotalScope services.", summary: "Charges shown here are approved and paid. This client view does not include predicted or upcoming charges.",
    moments: [["Claim handling", "$22,400", "Completed claim-support services"], ["Estimate services", "$9,500", "Completed estimating work"], ["Payment status", "100% paid", "No past-due balance shown"], ["Refunds", "$0", "No succeeded refunds this period"]],
    outcome: "Your paid-service total is fully reconciled to completed work and payment records.",
  } : key.includes("net client") ? {
    eyebrow: "NET CLIENT BENEFIT", headline: "After paid fees, your measured net benefit is $396,700.", summary: "This is the settlement value created on qualifying files after subtracting approved, paid TotalScope fees.",
    moments: [["Settlement gains", "$428,600", "Measured value created"], ["TotalScope fees", "($31,900)", "Approved and paid"], ["Net benefit", "$396,700", "Value retained by your company"], ["Coverage", "92%", "Qualifying completed outcomes"]],
    outcome: "For the measured cohort, your company retained more than ninety-two cents of every dollar of documented gain.",
  } : {
    eyebrow: "RETURN ON INVESTMENT", headline: "Every $1 paid to TotalScope corresponded to $12.43 in net client benefit.", summary: "ROI compares your measured net benefit with approved TotalScope fees on files where both values are available.",
    moments: [["Net client benefit", "$396,700", "Measured after approved fees"], ["Fees paid", "$31,900", "Completed services only"], ["Client ROI", "1,243%", "Net benefit ÷ paid fees"], ["Qualifying outcomes", "84 files", "Complete financial inputs"]],
    outcome: "This result applies only to financially complete outcomes. It is a historical measure—not a promise of future results.",
  };
  return <section className="client-portal-evidence">
    <div className="client-story-hero"><small>{model.eyebrow}</small><h4>{model.headline}</h4><p>{model.summary}</p></div>
    <div className="client-story-moments">{model.moments.map(([title, value, context], index) => <article key={title}><span>{index + 1}</span><div><small>{title}</small><b>{value}</b><p>{context}</p></div></article>)}</div>
    <div className="client-story-outcome"><span>WHAT THIS MEANS FOR SUMMIT</span><b>{model.outcome}</b></div>
  </section>;
}

function ClientDetailEvidence({ label }: { label: string }) {
  const key = label.toLowerCase();
  const model = key.includes("branches") ? {
    title: "Summit branch operating profile", status: "2 active branches",
    facts: [["Branches", "2"], ["Total files", "4"], ["Active files", "2"], ["Completed files", "2"]],
    rows: [["Overland Park", "3 files", 75, "1 active · 2 completed"], ["Lee’s Summit", "1 file", 25, "1 active · 0 completed"]],
    interpretation: "Overland Park currently represents 75% of Summit’s TotalScope volume and both completed outcomes.",
  } : key === "files" ? {
    title: "Summit file inventory", status: "4 governed files",
    facts: [["Total files", "4"], ["Estimate only", "1"], ["Claim handling", "3"], ["Financial coverage", "100%"]],
    rows: [["SRG-26041", "Claim handling", 88, "Carrier review · active"], ["SRG-26038", "Claim handling", 100, "Completed · $12.65K gain"], ["SRG-26029", "Claim handling", 100, "Completed · $9.8K gain"], ["SRG-26052", "Estimate only", 38, "Intake validation · active"]],
    interpretation: "Three of four files use claim handling; every file remains individually traceable from intake through financial outcome.",
  } : key.includes("active / completed") ? {
    title: "Current workflow balance", status: "2 active · 2 completed",
    facts: [["Active", "2"], ["Completed", "2"], ["Stalled", "0"], ["Median cycle", "21 days"]],
    rows: [["Carrier review", "1 file", 50, "SRG-26041"], ["Intake validation", "1 file", 50, "SRG-26052"], ["Completed under 25d", "2 files", 100, "SRG-26038 · SRG-26029"]],
    interpretation: "Summit has no stalled files; one active file is in carrier review and one is progressing through intake.",
  } : key.includes("settlement") ? {
    title: "Summit settlement-gain evidence", status: "$6,500 captured gain",
    facts: [["Initial RCV", "$29,400"], ["Final RCV", "$35,900"], ["Settlement gain", "$6,500"], ["Coverage", "2 of 2 completed"]],
    rows: [["SRG-26038", "$4,000 gain", 62, "North Star Mutual"], ["SRG-26029", "$2,500 gain", 38, "State Farm"]],
    interpretation: "Both completed Summit files have captured initial and final RCV, providing complete financial coverage for this result.",
  } : key.includes("approved") || key.includes("charge") ? {
    title: "Summit approved-charge ledger", status: "$1,090 approved",
    facts: [["Estimate charges", "$390"], ["Claim-handling charges", "$700"], ["Paid", "$890"], ["Open · current", "$200"]],
    rows: [["INV-10482", "$500", 46, "Paid · SRG-26038"], ["INV-10467", "$390", 36, "Paid · SRG-26029"], ["INV-10503", "$200", 18, "Open · SRG-26041"]],
    interpretation: "Only approved client-billable charges are included; predicted future billing is excluded.",
  } : {
    title: "Summit net-client-gain bridge", status: "$5,410 net gain",
    facts: [["Settlement gain", "$6,500"], ["Approved charges", "($1,090)"], ["Net client gain", "$5,410"], ["Illustrative ROI", "496%"]],
    rows: [["SRG-26038", "$3,500 net gain", 65, "$4,000 gain − $500 fee"], ["SRG-26029", "$2,110 net gain", 39, "$2,500 gain − $390 fee"], ["SRG-26041", "Not yet measurable", 12, "Final RCV unavailable"]],
    interpretation: "Active files remain unavailable for net-gain calculation until authoritative final financial facts are captured.",
  };
  return <section className="client-detail-evidence">
    <div className="client-detail-title"><div><h4>{model.title}</h4><p>Summit Roofing Group · illustrative client evidence.</p></div><span>{model.status}</span></div>
    <div className="client-detail-facts">{model.facts.map(([caption, value]) => <span key={caption}><small>{caption}</small><b>{value}</b></span>)}</div>
    <div className="client-detail-rows">{model.rows.map(([name, value, percent, context]) => <div key={name}><span><b>{name}</b><small>{value}</small></span><i><em style={{ width: `${percent}%` }} /></i><strong>{context}</strong></div>)}</div>
    <div className="client-detail-interpretation"><small>CLIENT INTERPRETATION</small><b>{model.interpretation}</b></div>
  </section>;
}

function DataHealthEvidence({ label }: { label: string }) {
  const key = label.toLowerCase();
  const model = key.includes("source health") ? {
    title: "Source freshness and availability", status: "5 of 6 sources current",
    facts: [["Healthy", "4"], ["Delayed", "1"], ["Illustrative only", "1"], ["Oldest delay", "18 min"]],
    rows: [["Monday archive", "Current", 100, "Imported 08:42 ET"], ["Stripe events", "Current", 100, "Reconciled 08:47 ET"], ["Client master", "Current", 100, "Synced 08:39 ET"], ["Assignments", "Current", 100, "Synced 08:41 ET"], ["Documents", "Delayed", 72, "18 minutes behind"], ["Weather", "Demo only", 40, "No live feed"]],
    interpretation: "Operational KPIs remain available; document-dependent observations disclose the 18-minute source delay.",
  } : key.includes("reconciled") ? {
    title: "Record reconciliation control", status: "4,281 source rows accounted for",
    facts: [["Source rows", "4,281"], ["Canonical matches", "4,244"], ["Review queue", "37"], ["Silently discarded", "0"]],
    rows: [["Matched by stable key", "4,102", 96, "Deterministic match"], ["Matched by approved crosswalk", "142", 78, "Crosswalk version retained"], ["Needs review", "31", 42, "Ambiguous relationship"], ["Invalid", "6", 20, "Preserved with issue"]],
    interpretation: "Every source row is matched, queued, or marked invalid. No questionable row is silently discarded.",
  } : key.includes("financial coverage") ? {
    title: "Financial-field coverage", status: "83% of qualifying files measurable",
    facts: [["Qualifying files", "100"], ["Fully captured", "83"], ["Partially captured", "11"], ["Not captured", "6"]],
    rows: [["Initial RCV", "92%", 92, "8 unavailable"], ["Final RCV", "86%", 86, "14 unavailable"], ["Approved fees", "95%", 95, "5 unavailable"], ["Payments", "89%", 89, "11 unavailable"], ["Processor fees", "83%", 83, "17 unavailable"]],
    interpretation: "Unavailable amounts are excluded from financial KPIs and never substituted with numeric zero.",
  } : key.includes("validation") || key.includes("exception") ? {
    title: "Validation-exception review queue", status: "14 open issues · none silently ignored",
    facts: [["Critical", "1"], ["High", "3"], ["Medium", "6"], ["Low", "4"]],
    rows: [["Duplicate external key", "1 issue", 100, "Import blocked"], ["Invalid close date", "3 issues", 75, "KPI excluded"], ["Unmatched payment", "4 issues", 55, "Finance review"], ["Missing branch", "4 issues", 45, "Canonical review"], ["Unknown tag", "2 issues", 25, "Non-blocking"]],
    interpretation: "The critical duplicate-key issue blocks affected promotion; lower-severity issues remain visible with explicit KPI impact.",
  } : key.includes("lineage") ? {
    title: "Field-level lineage completeness", status: "98% of material fields traceable",
    facts: [["Material fields", "8,640"], ["Complete lineage", "8,467"], ["Review required", "173"], ["Lineage versions", "3"]],
    rows: [["File identity", "100%", 100, "Source row → canonical file"], ["Status", "99%", 99, "History event retained"], ["Assignments", "98%", 98, "Person crosswalk retained"], ["Financial facts", "96%", 96, "Event and field source"], ["Document metadata", "94%", 94, "Source artifact retained"]],
    interpretation: "Material conclusions remain traceable to source artifacts, raw records, normalization attempts, and versioned canonical fields.",
  } : key.includes("sync") ? {
    title: "Synchronization readiness", status: "One delayed source",
    facts: [["On time", "4 sources"], ["Delayed", "1 source"], ["Failed", "0"], ["Next scheduled", "09:00 ET"]],
    rows: [["Client master", "3 min ago", 100, "Healthy"], ["Assignments", "5 min ago", 96, "Healthy"], ["Stripe", "8 min ago", 90, "Healthy"], ["Monday", "13 min ago", 82, "Within SLA"], ["Documents", "18 min behind", 55, "Delayed"]],
    interpretation: "The document source is delayed but not failed; affected features expose freshness rather than presenting stale data as current.",
  } : {
    title: "KPI availability and blockers", status: "97% of catalog available",
    facts: [["KPI definitions", "34"], ["Available", "33"], ["Limited", "1"], ["Unavailable", "0"]],
    rows: [["Operational throughput", "Available", 100, "100% required inputs"], ["Cycle time", "Available", 100, "Authoritative dates"], ["Settlement gain", "Available", 83, "Financial coverage disclosed"], ["Client ROI", "Available", 83, "Zero denominators excluded"], ["Document completeness", "Limited", 72, "Source delayed"]],
    interpretation: "Availability is evaluated from versioned KPI requirements; a limited KPI discloses its missing or delayed dependency.",
  };
  return <section className="data-health-evidence">
    <div className="data-health-title"><div><h4>{model.title}</h4><p>Illustrative validation and governance evidence.</p></div><span>{model.status}</span></div>
    <div className="data-health-facts">{model.facts.map(([caption, value]) => <span key={caption}><small>{caption}</small><b>{value}</b></span>)}</div>
    <div className="data-health-rows">{model.rows.map(([name, value, percent, context]) => <div key={name}><span><b>{name}</b><small>{value}</small></span><i><em style={{ width: `${percent}%` }} /></i><strong>{context}</strong></div>)}</div>
    <div className="data-health-interpretation"><small>TRUST INTERPRETATION</small><b>{model.interpretation}</b></div>
  </section>;
}

function HandlerEvidence({ label }: { label: string }) {
  const key = label.toLowerCase();
  const model = key.includes("completed") ? {
    title: "Completed-file qualification", status: "Three handlers qualify",
    facts: [["Completed files", "44"], ["Qualifying handlers", "3"], ["Below cohort", "1"], ["Completion coverage", "100%"]],
    rows: [["Julie Morgan", "14 completed", 88, "Qualifies"], ["Nina Patel", "12 completed", 76, "Qualifies"], ["Marcus Reed", "11 completed", 69, "Qualifies"], ["Taylor Brooks", "7 completed", 44, "Below n=10"]],
    interpretation: "Comparative conclusions use only handlers with at least 10 completed files; Taylor’s counts remain visible but are not ranked.",
  } : key.includes("workload") || key.includes("active") ? {
    title: "Current workload and capacity", status: "One handler above target",
    facts: [["Active files", "28"], ["Target capacity", "8 each"], ["Available capacity", "5 files"], ["Over-capacity handlers", "1"]],
    rows: [["Taylor Brooks", "9 active", 100, "118% of target"], ["Marcus Reed", "8 active", 89, "At target"], ["Julie Morgan", "6 active", 67, "2-file capacity"], ["Nina Patel", "5 active", 56, "3-file capacity"]],
    interpretation: "Taylor’s workload is above the operating target while Julie and Nina have measured capacity for appropriate reassignments.",
  } : key.includes("average cycle") ? {
    title: "Average cycle-time distribution", status: "Carrier mix materially affects results",
    facts: [["Portfolio average", "24.6 days"], ["Fastest qualifying", "19.8 days"], ["Slowest qualifying", "28.4 days"], ["Coverage", "100%"]],
    rows: [["Julie Morgan", "19.8 days", 70, "State Farm 42%"], ["Nina Patel", "22.1 days", 78, "North Star 39%"], ["Marcus Reed", "25.6 days", 90, "Travelers 36%"], ["Taylor Brooks", "31.4 days", 100, "Below cohort"]],
    interpretation: "Average cycle time includes every completed qualifying file and is shown beside carrier mix to prevent misleading comparisons.",
  } : key.includes("median") ? {
    title: "Median cycle time and outliers", status: "Median reduces outlier distortion",
    facts: [["Portfolio median", "23 days"], ["Fastest qualifying", "19 days"], ["Files over 45d", "4"], ["Interquartile range", "16–31d"]],
    rows: [["Julie Morgan", "19-day median", 61, "2 files over 30d"], ["Nina Patel", "21-day median", 68, "1 file over 30d"], ["Marcus Reed", "24-day median", 77, "3 files over 30d"], ["Taylor Brooks", "31-day median", 100, "Below cohort"]],
    interpretation: "The median represents the typical completed file while the outlier count preserves visibility into unusually long files.",
  } : key.includes("settlement") ? {
    title: "Settlement outcome context", status: "Financial coverage limits comparison",
    facts: [["Captured gain", "$91,400"], ["Financial coverage", "83%"], ["Qualifying handlers", "3"], ["Median gain/file", "$2,180"]],
    rows: [["Julie Morgan", "$31,800 gain", 92, "12 of 14 captured"], ["Nina Patel", "$25,600 gain", 75, "10 of 12 captured"], ["Marcus Reed", "$22,100 gain", 65, "9 of 11 captured"], ["Taylor Brooks", "$11,900 gain", 35, "Below cohort"]],
    interpretation: "Missing financial facts are excluded, never treated as zero; coverage is displayed before any outcome comparison.",
  } : {
    title: "Comparative-cohort rule", status: "Centralized threshold · n=10",
    facts: [["Minimum cohort", "10 files"], ["Qualifying handlers", "3"], ["Excluded from ranking", "1"], ["Configuration source", "Analytics Engine"]],
    rows: [["Julie Morgan", "14 completed", 100, "Eligible"], ["Nina Patel", "12 completed", 86, "Eligible"], ["Marcus Reed", "11 completed", 79, "Eligible"], ["Taylor Brooks", "7 completed", 50, "Counts only"]],
    interpretation: "The minimum comparative cohort is configured centrally. Changing it does not require dashboard calculations or component changes.",
  };
  return <section className="handler-evidence">
    <div className="handler-evidence-title"><div><h4>{model.title}</h4><p>Illustrative performance evidence with qualification context.</p></div><span>{model.status}</span></div>
    <div className="handler-facts">{model.facts.map(([caption, value]) => <span key={caption}><small>{caption}</small><b>{value}</b></span>)}</div>
    <div className="handler-comparison">{model.rows.map(([name, value, percent, context]) => <div key={name}><span><b>{name}</b><small>{value}</small></span><i><em style={{ width: `${percent}%` }} /></i><strong>{context}</strong></div>)}</div>
    <div className="handler-interpretation"><small>LEADERSHIP INTERPRETATION</small><b>{model.interpretation}</b></div>
  </section>;
}

function ClientHealthEvidence({ label }: { label: string }) {
  const key = label.toLowerCase();
  const model = key.includes("submission") ? {
    title: "Submission cadence and consistency", status: "Healthy with one declining branch",
    facts: [["Trailing 60 days", "84 files"], ["Expected range", "78–92"], ["Active branches", "4 of 4"], ["Cadence confidence", "92%"]],
    bars: [["Wk 1", 14, "12"], ["Wk 2", 18, "16"], ["Wk 3", 12, "10"], ["Wk 4", 20, "19"], ["Wk 5", 15, "13"], ["Wk 6", 9, "8"]],
    callout: "Wilmington is 31% below its branch range; company-wide submissions remain within range.",
  } : key.includes("friction") ? {
    title: "Operational-friction breakdown", status: "Attention required",
    facts: [["Files with friction", "11"], ["Median delay added", "6.4 days"], ["Client dependencies", "4"], ["Carrier dependencies", "5"]],
    bars: [["Carrier response", 34, "5 files"], ["Missing photos", 27, "4 files"], ["Ownership handoff", 20, "3 files"], ["Estimate revision", 13, "2 files"], ["Other", 6, "1 file"]],
    callout: "Carrier response and missing client photographs explain 61% of modeled avoidable delay.",
  } : key.includes("financial") ? {
    title: "Client-value composition", status: "Positive · coverage limited",
    facts: [["Settlement gain", "$428,600"], ["Approved fees", "$31,900"], ["Net client gain", "$396,700"], ["Financial coverage", "83%"]],
    bars: [["Net client benefit", 82, "$396.7K"], ["Approved TS fees", 7, "$31.9K"], ["Unavailable cohort", 11, "17%"]],
    callout: "Financial conclusions cover 83% of qualifying files; unavailable records are excluded rather than zero-filled.",
  } : key.includes("branch") ? {
    title: "Branch performance comparison", status: "Three healthy · one attention",
    facts: [["Branches", "4"], ["Top branch", "Charleston"], ["Largest decline", "Wilmington"], ["Completed outcomes", "91"]],
    bars: [["Charleston", 88, "Healthy · +14%"], ["Overland Park", 76, "Healthy · +8%"], ["Tulsa", 64, "Stable · +1%"], ["Wilmington", 38, "Attention · −31%"]],
    callout: "Wilmington drives the client’s submission decline while Charleston provides a useful internal benchmark.",
  } : {
    title: "Data limitations and confidence", status: "Usable with disclosed limitations",
    facts: [["Overall coverage", "89%"], ["Missing financial facts", "17 files"], ["Missing activity dates", "3 files"], ["Invalid records", "1"]],
    bars: [["Canonical identity", 100, "100%"], ["Status history", 96, "96%"], ["Assignments", 93, "93%"], ["Financial facts", 83, "83%"], ["Document links", 79, "79%"]],
    callout: "Financial and document coverage limit selected conclusions; affected KPIs disclose their own coverage and confidence.",
  };
  return <section className="client-health-evidence">
    <div className="client-health-title"><div><h4>{model.title}</h4><p>Illustrative diagnostic for this client-health dimension.</p></div><span>{model.status}</span></div>
    <div className="client-health-facts">{model.facts.map(([caption, value]) => <span key={caption}><small>{caption}</small><b>{value}</b></span>)}</div>
    <div className="client-health-bars">{model.bars.map(([caption, percent, value]) => <div key={caption}><span><b>{caption}</b><small>{value}</small></span><i><em style={{ width: `${percent}%` }} /></i></div>)}</div>
    <div className="client-health-callout"><small>LEADERSHIP INTERPRETATION</small><b>{model.callout}</b></div>
  </section>;
}

function FinancialEvidence({ label }: { label: string }) {
  const key = label.toLowerCase();
  const model = key.includes("settlement") ? {
    title: "Settlement value bridge", subtitle: "Captured initial RCV to approved final RCV",
    facts: [["Initial RCV", "$48,900"], ["Final RCV", "$61,400"], ["Settlement gain", "$12,500"], ["Coverage", "4 of 5 files"]],
    formula: "$61,400 final RCV − $48,900 initial RCV = $12,500 settlement gain",
    segments: [["Scope corrections", "$5,200", 42], ["Code upgrades", "$3,850", 31], ["Supplemental damage", "$2,300", 18], ["Other approved", "$1,150", 9]],
    note: "One file is excluded because its initial RCV was not captured.",
  } : key.includes("approved") || key.includes("charge") ? {
    title: "Approved-charge composition", subtitle: "Client-billable, non-voided invoice charges",
    facts: [["Estimate fees", "$790"], ["Claim-handling fees", "$900"], ["Approved total", "$1,690"], ["Invoices", "5"]],
    formula: "$790 estimate fees + $900 claim-handling fees = $1,690 approved charges",
    segments: [["Paid", "$1,290", 76], ["Open · current", "$300", 18], ["Past due", "$100", 6]],
    note: "Predicted future charges are excluded from this client-billable total.",
  } : key.includes("net client") ? {
    title: "Client net-gain reconciliation", subtitle: "Value created after approved client costs",
    facts: [["Settlement gain", "$12,500"], ["Approved fees", "($1,690)"], ["Refunds + processor fees", "($158)"], ["Net client gain", "$10,652"]],
    formula: "$12,500 − $1,690 − $100 − $58 = $10,652 net client gain",
    segments: [["Client keeps", "$10,652", 85], ["TS fees", "$1,690", 14], ["Other deductions", "$158", 1]],
    note: "Only succeeded refunds and captured processor fees are deducted.",
  } : key === "roi" ? {
    title: "ROI calculation and cohort", subtitle: "Client benefit relative to approved TotalScope fees",
    facts: [["Net client gain", "$10,652"], ["Approved fees", "$1,690"], ["Calculated ROI", "630%"], ["Qualifying files", "4"]],
    formula: "$10,652 net client gain ÷ $1,690 approved fees × 100 = 630% ROI",
    segments: [["Under 300%", "1 file", 25], ["300–600%", "1 file", 25], ["Above 600%", "2 files", 50]],
    note: "Files with unavailable fees or a zero denominator do not receive an ROI value.",
  } : key.includes("collect") ? {
    title: "Collection reconciliation", subtitle: "Succeeded payment events matched to invoices",
    facts: [["Collected", "$1,690"], ["Open", "$300"], ["Past due", "$100"], ["Collection rate", "81%"]],
    formula: "$1,690 collected ÷ $2,090 issued and due = 81% collection rate",
    segments: [["Card", "$1,050", 62], ["ACH", "$540", 32], ["Check", "$100", 6]],
    note: "Failed payments remain separate financial events and are not counted as collected.",
  } : key.includes("refund") ? {
    title: "Refund event analysis", subtitle: "Succeeded refunds linked to original payments",
    facts: [["Refunded", "$100"], ["Events", "2"], ["Full refunds", "0"], ["Partial refunds", "2"]],
    formula: "$75 service adjustment + $25 duplicate-line correction = $100 refunded",
    segments: [["Service adjustment", "$75", 75], ["Duplicate correction", "$25", 25]],
    note: "Each refund retains its reason, approval, original payment, and invoice lineage.",
  } : {
    title: "Processor-fee reconciliation", subtitle: "Captured transaction costs by payment rail",
    facts: [["Processor fees", "$58"], ["Card fees", "$46"], ["ACH fees", "$12"], ["Effective rate", "3.4%"]],
    formula: "$46 card fees + $12 ACH fees = $58 processor fees",
    segments: [["Card", "$46", 79], ["ACH", "$12", 21]],
    note: "Fees are matched to succeeded payments and never inferred when the processor amount is missing.",
  };
  return <section className="financial-evidence">
    <div className="financial-evidence-title"><div><h4>{model.title}</h4><p>{model.subtitle}</p></div><span>MEASURED · DEMO DATA</span></div>
    <div className="financial-facts">{model.facts.map(([caption, value]) => <span key={caption}><small>{caption}</small><b>{value}</b></span>)}</div>
    <div className="financial-formula"><small>CALCULATION</small><b>{model.formula}</b></div>
    <div className="financial-breakdown"><h4>Supporting composition</h4>{model.segments.map(([caption, value, percent]) => <div key={caption}><span><b>{caption}</b><small>{value}</small></span><i><em style={{ width: `${percent}%` }} /></i><strong>{percent}%</strong></div>)}</div>
    <p className="financial-note">{model.note}</p>
  </section>;
}

function SupportingRecordModal({ row, item, screen, onClose }: { row: DetailRow; item: string; screen: VisionScreen; onClose: () => void }) {
  const detail = supportingRecordDetail(row, item, screen);
  return <div className="record-detail-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <section className="record-detail" role="dialog" aria-modal="true" aria-labelledby="record-detail-title">
      <header><div><small>DEMO DATA · SUPPORTING EVIDENCE</small><h3 id="record-detail-title">{detail.title}</h3><p>{detail.kind}</p></div><button onClick={onClose} aria-label="Close supporting record">×</button></header>
      <div className="record-detail-summary"><b>{detail.description}</b><p>This example explains how the selected line item contributes to <strong>{metricParts(item).label}</strong>.</p></div>
      <div className="record-detail-stats">{detail.stats.map(([label, value]) => <span key={label}><small>{label}</small><b>{value}</b></span>)}</div>
      <div className="record-detail-grid">
        <article><h4>Supporting evidence</h4>{detail.evidence.map((evidence) => <p key={evidence}><i>✓</i>{evidence}</p>)}</article>
        <article><h4>Governance and ownership</h4><dl><div><dt>Accountable owner</dt><dd>{detail.owner}</dd></div><div><dt>Evidence source</dt><dd>{detail.source}</dd></div><div><dt>Presentation status</dt><dd>{screen.status}</dd></div><div><dt>Data boundary</dt><dd>Synthetic Demo Data</dd></div></dl></article>
      </div>
      <footer><div><small>APPROPRIATE NEXT ACTION</small><b>{detail.action}</b></div><button onClick={onClose}>Back to supporting examples</button></footer>
    </section>
  </div>;
}

function RecommendationEvidence({ label }: { label: string }) {
  const key = label.toLowerCase();
  const recommendation = key.includes("high priority") ? {
    priority: "High", confidence: "91%", impact: "4-day cycle-time improvement", owner: "Taylor · Operations", deadline: "Today · 11:00 AM",
    reason: "Seven aging files exceed their service-stage target while two qualified handlers have available capacity.",
    steps: ["Confirm current handler capacity", "Reassign four highest-risk files", "Notify clients and update ownership notes", "Review movement after 48 hours"],
    evidence: ["7 files beyond stage target", "2 handlers below 75% capacity", "Median aging cohort: 47 days", "$184K captured RCV represented"],
  } : key.includes("growth attention") ? {
    priority: "Medium-high", confidence: "87%", impact: "$48K submission opportunity", owner: "Client Success", deadline: "Within 3 business days",
    reason: "Harbor Roofing submissions are 31% below the trailing 60-day range, driven by three branches rather than a company-wide decline.",
    steps: ["Validate branch operating status", "Share the submission trend with Harbor", "Review recent storm opportunities", "Agree on a 30-day recovery checkpoint"],
    evidence: ["3 declining branches", "15 fewer files vs trailing range", "Charleston branch remains healthy", "Last executive review: 74 days ago"],
  } : {
    priority: "High", confidence: "100% measured", impact: "$4,620 revenue at risk", owner: "Breson · Finance", deadline: "Before weekly revenue close",
    reason: "Three confirmed payment failures remain unresolved across expired-card, insufficient-funds, and bank-decline reasons.",
    steps: ["Contact each authorized billing owner", "Send secure payment-update links", "Retry only the approved transaction", "Reconcile successful events to invoices"],
    evidence: ["3 failed payments", "$4,620 gross amount", "Oldest failure: 8 days", "No duplicate collection attempts"],
  };
  return <section className="recommendation-evidence">
    <div className="recommendation-facts"><span><small>Priority</small><b>{recommendation.priority}</b></span><span><small>Confidence</small><b>{recommendation.confidence}</b></span><span><small>Estimated impact</small><b>{recommendation.impact}</b></span><span><small>Accountable owner</small><b>{recommendation.owner}</b></span><span><small>Target timing</small><b>{recommendation.deadline}</b></span></div>
    <article className="recommendation-reason"><small>WHY TSI GENERATED THIS</small><p>{recommendation.reason}</p></article>
    <div className="recommendation-detail-grid"><article><h4>Supporting evidence</h4>{recommendation.evidence.map((evidence) => <p key={evidence}><i>✓</i>{evidence}</p>)}</article><article><h4>Recommended action plan</h4>{recommendation.steps.map((step, index) => <p key={step}><i>{index + 1}</i>{step}</p>)}</article></div>
  </section>;
}

function OperationalFileSummary({ label }: { label: string }) {
  const values = label === "Stalled files" ? [["7", "Files stalled"], ["9.4d", "Median since note"], ["3", "Carrier delays"], ["2", "Client dependencies"]] :
    label === "Aging files" ? [["12", "Files aging"], ["47d", "Median age"], ["$184K", "RCV represented"], ["5", "Over 60 days"]] :
    label === "Completed files" ? [["18", "Completed"], ["22d", "Median cycle"], ["$91K", "Settlement gain"], ["96%", "Financial coverage"]] :
    label === "New files" ? [["6", "New today"], ["4", "Assigned"], ["2", "Awaiting triage"], ["31m", "Median intake time"]] :
    [["32", "Active files"], ["8", "Claim handlers"], ["27d", "Median age"], ["91%", "Updated this week"]];
  return <section className="file-metric-summary"><h4>{label} operating profile</h4><div>{values.map(([value, caption]) => <span key={caption}><b>{value}</b><small>{caption}</small></span>)}</div></section>;
}

function FileStatsModal({ file, onClose }: { file: DemoFile; onClose: () => void }) {
  return <div className="file-stats-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <section className="file-stats" role="dialog" aria-modal="true" aria-labelledby="file-stats-title">
      <header><div><small>DEMO DATA · FILE INTELLIGENCE</small><h3 id="file-stats-title">{file.id}</h3><p>{file.client} · {file.property}</p></div><button onClick={onClose} aria-label="Close file statistics">×</button></header>
      <div className="file-status-strip"><span><small>Status</small><b>{file.status}</b></span><span><small>Days open</small><b>{file.daysOpen}</b></span><span><small>Last note</small><b>{file.lastNote}</b></span><span><small>Financial data</small><b>{file.financial}</b></span></div>
      {file.stallReason && <div className="file-stall-reason"><span>WHY THIS FILE IS STALLED</span><b>{file.stallReason}</b><p>TSI derived this reason from the activity timeline, current status, ownership, and unresolved dependency.</p></div>}
      <div className="file-stats-grid">
        <article><h4>Assignment and claim</h4><dl><div><dt>Carrier</dt><dd>{file.carrier}</dd></div><div><dt>Service</dt><dd>{file.service}</dd></div><div><dt>Claim handler</dt><dd>{file.handler}</dd></div><div><dt>Estimator</dt><dd>{file.estimator}</dd></div><div><dt>Opened</dt><dd>{file.opened}</dd></div></dl></article>
        <article><h4>Financial facts</h4><dl><div><dt>Initial RCV</dt><dd>{file.initialRcv}</dd></div><div><dt>Final RCV</dt><dd>{file.finalRcv}</dd></div><div><dt>Availability</dt><dd>{file.financial}</dd></div></dl><p>Missing values remain unavailable and are never treated as zero.</p></article>
        <article className="file-activity"><h4>Activity timeline</h4>{file.timeline.map(([date, event], index) => <div key={`${date}-${event}`}><i className={index === file.timeline.length - 1 ? "current" : ""} /><span><small>{date}</small><b>{event}</b></span></div>)}</article>
      </div>
      <footer><div><small>RECOMMENDED NEXT ACTION</small><b>{file.nextAction}</b></div><button onClick={onClose}>Back to file list</button></footer>
    </section>
  </div>;
}

function StormEvidence({ storm }: { storm: string }) {
  const isHail = /kansas|hail/i.test(storm);
  const isFlood = /wilmington|flood/i.test(storm);
  const metric = isHail ? ["1.1 in", "1.6 in", "2.1 in", "1.4 in"] : isFlood ? ["0.8 in", "2.3 in", "4.8 in", "3.2 in"] : ["46 mph", "61 mph", "74 mph", "52 mph"];
  const demand = isHail ? [18, 42, 58, 47, 29] : isFlood ? [6, 14, 20, 18, 11] : [11, 28, 36, 31, 17];
  const times = ["2 PM", "4 PM", "6 PM", "8 PM"];
  const movement = isHail ? "ENE at 24 mph · Johnson County toward Jackson County" : isFlood ? "Coastal band moving NNE at 11 mph · Cape Fear basin" : "E at 31 mph · Tulsa County toward Wagoner County";
  return <section className="storm-evidence">
    <div className="storm-evidence-title"><div><h4>Modeled storm evidence</h4><p>Illustrative event analysis—not a live weather feed.</p></div><span>{isHail ? "HAIL" : isFlood ? "FLOOD" : "WIND"}</span></div>
    <div className="storm-evidence-grid">
      <article className="storm-intensity"><header><b>Intensity timeline</b><small>{isHail ? "Estimated hail size" : isFlood ? "Modeled rainfall accumulation" : "Estimated peak gust"}</small></header><div>{metric.map((value, index) => <span key={times[index]}><i style={{ height: `${40 + index * 15 - (index === 3 ? 25 : 0)}%` }} /><b>{value}</b><small>{times[index]}</small></span>)}</div></article>
      <article className="storm-movement"><header><b>Movement and path</b><small>Modeled event direction</small></header><div className="movement-track"><i /><i /><i /><span>→</span></div><p>{movement}</p></article>
      <article className="storm-density"><header><b>Affected-property density</b><small>Modeled roofing opportunities by radius</small></header><dl><div><dt>0–25 miles</dt><dd>1,840</dd></div><div><dt>26–50 miles</dt><dd>3,260</dd></div><div><dt>51–100 miles</dt><dd>4,910</dd></div></dl></article>
      <article className="storm-demand"><header><b>Expected inspection demand</b><small>Illustrative next five business days</small></header><div>{demand.map((value, index) => <span key={index}><i style={{ height: `${value * 1.5}%` }} /><small>{["Mon", "Tue", "Wed", "Thu", "Fri"][index]}</small><b>{value}</b></span>)}</div></article>
      <article className="storm-staffing"><header><b>Staffing implication</b><small>Derived from demand and current capacity</small></header><strong>{isFlood ? "+1 water-loss specialist" : isHail ? "+2 estimator shifts" : "+1 claim-handler pod"}</strong><p>Peak demand expected within {isFlood ? "72" : "48"} hours.</p></article>
      <article className="storm-source"><header><b>Conceptual data sources</b><small>Planned integration stack</small></header><a href="https://www.weather.gov/" target="_blank" rel="noreferrer">NOAA / National Weather Service ↗</a><a href="https://www.spc.noaa.gov/" target="_blank" rel="noreferrer">Storm Prediction Center ↗</a><a href="https://mrms.nssl.noaa.gov/" target="_blank" rel="noreferrer">NOAA MRMS radar products ↗</a><p>Demo values are fabricated and not retrieved from these services.</p></article>
    </div>
  </section>;
}

function ContractorRadiusModal({ storm, onClose }: { storm: string; onClose: () => void }) {
  const [filter, setFilter] = useState<"all" | "client" | "prospect">("all");
  const stormCompanies = companiesForStorm(storm);
  const companies = stormCompanies.filter((company) => filter === "all" || (filter === "client" ? company.client : !company.client));
  return <div className="contractor-radius-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <section className="contractor-radius" role="dialog" aria-modal="true" aria-labelledby="contractor-radius-title">
      <header><div><small>DEMO DATA · ILLUSTRATIVE 100-MILE RADIUS</small><h3 id="contractor-radius-title">{storm} contractor opportunity</h3><p>Sample roofing companies near the modeled storm footprint. Names and contact details are fictional.</p></div><button onClick={onClose} aria-label="Close roofing company directory">×</button></header>
      <div className="contractor-radius-summary"><div><b>{stormCompanies.length}</b><span>Companies identified</span></div><div><b>{stormCompanies.filter((company) => company.client).length}</b><span>Current TotalScope clients</span></div><div><b>{stormCompanies.filter((company) => !company.client).length}</b><span>Prospective relationships</span></div><div><b>{Math.max(...stormCompanies.map((company) => company.distance))} mi</b><span>Farthest sample company</span></div></div>
      <nav aria-label="Filter roofing companies"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All companies</button><button className={filter === "client" ? "active" : ""} onClick={() => setFilter("client")}>Current clients</button><button className={filter === "prospect" ? "active" : ""} onClick={() => setFilter("prospect")}>Prospects</button></nav>
      <div className="contractor-directory"><table><thead><tr><th>Roofing company</th><th>Distance</th><th>Relationship</th><th>Primary contact</th><th>{filter === "client" ? "TotalScope profile" : filter === "prospect" ? "Company website" : "Company link"}</th></tr></thead><tbody>{companies.map((company) => {
        const destination = company.client ? `https://totalscope.com/contractors/demo/${company.slug}` : `https://${company.slug}.example`;
        const linkLabel = company.client ? "View TS profile ↗" : "Visit website ↗";
        return <tr key={company.slug}><td><b>{company.name}</b><span>{company.city}</span></td><td>{company.distance} miles</td><td><em className={company.client ? "client" : "prospect"}>{company.client ? "Current client" : "Not a client"}</em></td><td><b>{company.contact}</b><a href={`tel:${company.phone.replace(/[^\d+]/g, "")}`}>{company.phone}</a><a href={`mailto:${company.email}`}>{company.email}</a></td><td><a className="profile-link" href={destination} target="_blank" rel="noreferrer" aria-label={`${company.client ? "Open illustrative TotalScope profile" : "Open illustrative company website"} for ${company.name}`}>{linkLabel}</a><small>{company.client ? "Illustrative TS profile" : `${company.slug}.example`}</small></td></tr>;
      })}</tbody></table></div>
      <footer><p>Demo Data — This directory does not represent real businesses, real contact information, live storm intelligence, verified TotalScope profiles, or real company websites.</p><button onClick={onClose}>Back to storm details</button></footer>
    </section>
  </div>;
}
