# TotalScope Intelligence Product Vision Demo

Status: local presentation candidate  
Direct URL: `http://localhost:3000/product-vision`  
Primary entry: authenticated application top bar → **Product Vision Demo**

> Product Vision Demo — Illustrative data and conceptual functionality. Pricing, adoption, and revenue figures are examples only and have not been approved.

## Presenter controls

- Select **Product Vision Demo** from `/operations` to preserve the underlying application.
- Use **Next** and **Previous**, or the left/right arrow keys.
- Use the six-item section index on meeting-room displays.
- Press Escape or select **Exit demo** to return to the underlying page.
- The footer shows the current screen and total, such as `4 of 25`.
- The direct route exits to `/operations`.

## Screen guide

| # | Section | Screen and purpose | Status | Sample data / visual | Planned screenshot |
|---:|---|---|---|---|---|
| 1 | Why TSI exists | Welcome: frame the three-stage business opportunity | Vision Preview | Internal operations, client value, industry products | `01-welcome.png` |
| 2 | Why TSI exists | Current problem: show fragmented information | Vision Preview | TotalScope, notes, Monday, Stripe, assignments | `02-current-problem.png` |
| 3 | Why TSI exists | Intelligence Pipeline: explain platform evolution | Live Foundation + Future Vision | Raw sources through Ask TSI; C3 layers highlighted | `03-intelligence-pipeline.png` |
| 4 | Internal TotalScope | Taylor’s Monday: identify operational fires | Live C3 Feature | 6 new, 3 active, 1 stalled, 2 aging | `04-taylor-monday.png` |
| 5 | Internal TotalScope | Breson’s financial view: explain created and collected value | Live C3 Foundation | $12,500 gain, $1,690 charges, refunds and fees | `05-breson-financial.png` |
| 6 | Internal TotalScope | Client health: explain contributing dimensions without a hidden score | Vision Preview | Submission, friction, value, branches, limitations | `06-client-health.png` |
| 7 | Internal TotalScope | Handler performance: compare responsibly | Live C3 Foundation + Vision Preview | Cycle time, gain, carrier patterns, minimum cohort 10 | `07-handler-performance.png` |
| 8 | Internal TotalScope | Data Health: establish confidence | Live C3 Feature | 67 reconciled records, 83% coverage, 97% KPI availability | `08-data-health.png` |
| 9 | Internal TotalScope | Client drill-down: connect relationship outcomes to files | Live C3 Foundation | Summit Roofing Group, branches, gain, charges | `09-client-drilldown.png` |
| 10 | Internal TotalScope | File traceability: show evidence behind a result | Live C3 Foundation | TSI-1001, carrier amounts, fee, lineage | `10-file-traceability.png` |
| 11 | Client experience | Client executive overview: communicate TotalScope value | Vision Preview | 38 submissions, $428,600 gains, 1,243% illustrative ROI | `11-client-overview.png` |
| 12 | Client experience | Active work: provide useful progress transparency | Vision Preview | Estimating, carrier response, action required, aging | `12-active-work.png` |
| 13 | Client experience | Completed outcomes: show file-level benefit | Vision Preview | Three illustrative completed files and increases | `13-completed-outcomes.png` |
| 14 | Client experience | Trends and benchmarks: separate owned and anonymized data | Vision Preview | Volume, turnaround, branches, carrier response | `14-client-benchmarks.png` |
| 15 | Client experience | Executive report: preview a monthly leadership brief | Vision Preview | Summary, value, attention, observations, actions | `15-executive-report.png` |
| 16 | Client subscriptions | Subscription plans: show recurring product tiers | Illustrative Business Model | Essential, Professional, Enterprise | `16-subscription-plans.png` |
| 17 | Client subscriptions | Revenue example: demonstrate model scale | Illustrative Business Model | $26,910 MRR and $322,920 ARR examples | `17-recurring-revenue.png` |
| 18 | Client subscriptions | Strategic value: show benefits beyond subscription fees | Vision Preview | Retention, differentiation, acquisition, trust | `18-strategic-value.png` |
| 19 | Industry intelligence | State of the Roofing Industry: preview flagship report | Vision Preview | 2027 report cover and potential subject areas | `19-industry-report.png` |
| 20 | Industry intelligence | External pricing: frame possible licensing | Illustrative Business Model | $995 digital through $25,000 benchmark examples | `20-external-pricing.png` |
| 21 | Industry intelligence | Additional products: expand the product portfolio | Vision Preview | Regional, carrier, storm, supplier, PE products | `21-intelligence-products.png` |
| 22 | Future of TSI | Automated observations: surface what changed | Future Capability | Three explicitly illustrative observations | `22-observations.png` |
| 23 | Future of TSI | Recommendations: translate evidence into qualified choices | Future Capability | Routing, client contact, payment review examples | `23-recommendations.png` |
| 24 | Future of TSI | Ask TSI: preview governed conversational exploration | Future Capability | Five sample leadership questions | `24-ask-tsi.png` |
| 25 | Future of TSI | Closing vision: reinforce the platform progression | Product Vision | Internal → client → subscription → industry intelligence | `25-closing-vision.png` |

## Live versus conceptual boundaries

- Screens 4 and 8 visually represent working C3 functionality.
- Screens 5, 9, and 10 represent foundations implemented in C3 using synthetic validation data.
- Screen 7 combines implemented cohort protections with a future comparative experience.
- Client portal, subscription, industry-product, observation, recommendation, report, and Ask TSI screens are conceptual.
- The demo never queries Supabase, invokes importers, mutates canonical facts, or accesses service-role credentials.
- The presentation dataset lives exclusively in `config/product-vision/screens.ts`.
- Live C3 route components remain separate and unchanged except for the top-bar launcher.

## Manual screenshot checklist

Create `docs/evidence/screenshots/product-vision/`, use a consistent 1440×900 viewport, and capture:

1. Start the application with explicit local demo configuration.
2. Open `/operations` and capture the top-bar **Product Vision Demo** launcher.
3. Open the overlay and verify the disclosure, status badge, screen counter, and controls.
4. Capture all 25 filenames listed in the table.
5. Confirm screens 11–15 visibly say **Now viewing: Client Portal — Summit Roofing Group**.
6. Confirm screens 16, 17, and 20 say **Illustrative Business Model**.
7. Confirm screens 22–24 say **Future Capability**.
8. Capture one screen at a mobile viewport to demonstrate responsive stacking.
9. Test left/right arrows and Escape before the final capture.
10. Confirm the underlying `/operations` page remains present after closing the overlay.

## Local run steps

```powershell
$env:TOTALSCOPE_DATA_MODE = "demo"
$env:TOTALSCOPE_AUTH_ENABLED = "false"
npm run dev
```

Then open:

```text
http://localhost:3000/operations
```

or directly:

```text
http://localhost:3000/product-vision
```

## Known limitations

- All business, adoption, pricing, and client-portal values are illustrative.
- No actual client subscription, billing, portal, industry report, observation, recommendation, or Ask TSI functionality is implemented.
- No animation beyond ordinary CSS interaction is required for the Wednesday presentation.
- Automated screenshots remain optional because the isolated browser environment cannot reach the Windows localhost listener.
