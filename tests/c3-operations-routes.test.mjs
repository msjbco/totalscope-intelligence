import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const routes = [
  "app/operations/page.tsx",
  "app/operations/clients/page.tsx",
  "app/operations/clients/[clientId]/page.tsx",
  "app/operations/files/page.tsx",
  "app/operations/files/[fileId]/page.tsx",
  "app/operations/handlers/page.tsx",
  "app/operations/handlers/[handlerId]/page.tsx",
  "app/operations/data-health/page.tsx",
];

test("all approved C3 workflow routes exist", () => {
  assert.ok(routes.every(existsSync));
});

test("route components consume repository or KPI results without business formulas", () => {
  for (const route of routes) {
    const source = readFileSync(route, "utf8");
    assert.doesNotMatch(source, /evaluateOperations|evaluateKpis|minimumComparativeCohortSize/);
    assert.doesNotMatch(source, /finalRcv.*-.*initialRcv|settlementGain.*-.*approvedCharges/i);
  }
});

test("Data Health is administrator-only in live mode", () => {
  const layout = readFileSync("app/operations/data-health/layout.tsx", "utf8");
  assert.match(layout, /TOTALSCOPE_DATA_MODE === "live"/);
  assert.match(layout, /requireRole\("staging_admin"\)/);
});

test("synthetic C3 pages disclose Demo Data and unavailable values", () => {
  const ui = readFileSync("components/operations/operations-ui.tsx", "utf8");
  const detail = readFileSync("app/operations/files/[fileId]/page.tsx", "utf8");
  assert.match(ui, />Demo Data</);
  assert.match(ui, /Unavailable/);
  assert.match(detail, /never converted to zero/);
});
