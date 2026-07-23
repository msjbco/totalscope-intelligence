# Financial and Revenue Model

## Monetary representation

Store money as integer minor units plus ISO 4217 `currency_code`. Never use floating-point storage. Each financial field carries an availability status:

`captured | partially_captured | not_captured | invalid | not_applicable`

Null plus status communicates absence. Zero is valid only when the source explicitly reports zero.

## File financials

`file_financial` reserves:

- `initial_carrier_rcv_minor`
- `final_rcv_minor`
- derived `additional_rcv_minor`
- nullable `acv_minor`
- nullable `deductible_minor`
- nullable `recoverable_depreciation_minor`
- nullable `nonrecoverable_depreciation_minor`
- nullable `prior_carrier_payments_minor`
- nullable `final_settlement_minor`
- nullable `contractor_contract_amount_minor`
- field-level availability and provenance

`additional_rcv = final_rcv - initial_carrier_rcv` only when both operands are valid and comparable. Persisted derived values record definition version and inputs; otherwise calculate in the metric layer.

## Invoices and charges

An invoice belongs to one file and client organization. Charge lines use:

- `estimate_fee`
- `claim_handling_fee`
- `eagleview_report`
- `walls_report`
- `additional_charge`
- `other`

EagleView is generally $40 and Walls is often $75–$93, but these are not defaults or validation constraints. The source amount is authoritative.

Invoice totals:

- `invoice_amount_minor`: sum of nonvoided charges;
- `amount_collected_minor`: sum of settled allocations less allocated refunds;
- `open_balance_minor`: invoice amount minus collected amount and approved adjustments.

## Distinct reporting lenses

| Lens | Date | Meaning |
|---|---|---|
| Operational production | qualifying completion date | Work completed by the operation |
| Invoiced / expected revenue | invoice date | Amount billed or expected |
| Cash received | settled payment date | Gross cash collected |
| Net collections | payment date | Allocated cash less refunds, disputes, and processor fees under the selected definition |
| Completion-to-cash bridge | completion cohort plus later payment periods | Conversion of completed work into cash |

Do not label any one of these simply “revenue” without its date basis and inclusion rules.

## Quarter example

File `TS-1042` completes March 20, 2026:

- completion quarter: `2026 Q1`;
- invoice issued April 2: invoice quarter `2026 Q2`;
- due May 2: due quarter `2026 Q2`;
- partial payment June 20: collection quarter `2026 Q2`;
- remaining payment July 8: collection quarter `2026 Q3`.

Q1 operational production includes the file once. Q2 cash includes only the June allocation. Q3 cash includes only the July allocation. A completion-to-cash cohort report attributes both allocations back to the Q1 completion cohort while retaining their actual collection quarters.

## Critical indexes and controls

- Invoice: unique `(tenant_id, invoice_number)`; indexes `(tenant_id, invoice_date)`, due date, file, status.
- Charges: `(invoice_id, charge_type)`.
- Allocations: `(invoice_id, settled_at)`, `(payment_id)`.
- Financial fields: availability status and source-record indexes.
- Currency conversion is outside V1; cross-currency aggregation is prohibited until an exchange-rate policy exists.
