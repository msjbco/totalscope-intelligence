import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

async function loadTypeScriptModule(path) {
  const source = readFileSync(path, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

async function loadAggregationModule() {
  const classificationSource = readFileSync("lib/weather/classification.ts", "utf8");
  const classificationOutput = ts.transpileModule(classificationSource, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
  const classificationUrl = `data:text/javascript;base64,${Buffer.from(classificationOutput).toString("base64")}`;
  const geoSource = readFileSync("lib/weather/geo.ts", "utf8");
  const geoOutput = ts.transpileModule(geoSource, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
  const geoUrl = `data:text/javascript;base64,${Buffer.from(geoOutput).toString("base64")}`;
  const intelligenceSource = readFileSync("lib/weather/intelligence.ts", "utf8");
  const intelligenceOutput = ts.transpileModule(intelligenceSource, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
  const intelligenceUrl = `data:text/javascript;base64,${Buffer.from(intelligenceOutput).toString("base64")}`;
  const source = readFileSync("lib/weather/opportunity-aggregation.ts", "utf8")
    .replace('"@/lib/weather/classification"', `"${classificationUrl}"`)
    .replace('"@/lib/weather/geo"', `"${geoUrl}"`)
    .replace('"@/lib/weather/intelligence"', `"${intelligenceUrl}"`);
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

async function loadZctaModule() {
  const geoSource = readFileSync("lib/weather/geo.ts", "utf8");
  const geoOutput = ts.transpileModule(geoSource, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
  const geoUrl = `data:text/javascript;base64,${Buffer.from(geoOutput).toString("base64")}`;
  const exposureSource = readFileSync("lib/weather/exposure.ts", "utf8").replace('"@/lib/weather/geo"', `"${geoUrl}"`);
  const exposureOutput = ts.transpileModule(exposureSource, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exposureUrl = `data:text/javascript;base64,${Buffer.from(exposureOutput).toString("base64")}`;
  const source = readFileSync("lib/weather/zcta-intersection.ts", "utf8").replace('"@/lib/weather/exposure"', `"${exposureUrl}"`);
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

const geo = await loadTypeScriptModule("lib/weather/geo.ts");
const classification = await loadTypeScriptModule("lib/weather/classification.ts");
const contractorNormalization = await loadTypeScriptModule("lib/weather/contractor-normalization.ts");
const aggregation = await loadAggregationModule();
const weatherConfig = await loadTypeScriptModule("lib/weather/config.ts");
const mapData = await loadTypeScriptModule("lib/weather/map-data.ts");
const intelligence = await loadTypeScriptModule("lib/weather/intelligence.ts");
const clientReconciliation = await loadTypeScriptModule("lib/weather/client-reconciliation.ts");
const zcta = await loadZctaModule();
const affectedGeography = await loadTypeScriptModule("lib/weather/affected-geography.ts");
const forecastSignals = await loadTypeScriptModule("lib/weather/forecast-signals.ts");

function alert(overrides = {}) {
  return {
    kind: "alert", provider: "nws", sourceId: "urn:test", sourceUrl: "https://api.weather.gov/alerts/test",
    sourceTimestamp: "2026-08-10T12:00:00Z", retrievedAt: "2026-08-10T12:01:00Z", event: "Severe Thunderstorm Warning",
    status: "Actual", messageType: "Alert", severity: "Severe", certainty: "Observed", urgency: "Immediate",
    headline: null, description: null, instruction: null, areaDescription: "Test County", issuedAt: "2026-08-10T12:00:00Z",
    effectiveAt: "2026-08-10T12:00:00Z", onsetAt: null, expiresAt: "2026-08-10T13:00:00Z", endsAt: null,
    geometry: { type: "Point", coordinates: [-96.797, 32.777] }, ...overrides,
  };
}

test("haversine and geometry distances are deterministic kilometers", () => {
  const distance = geo.haversineDistanceKm([-96.797, 32.777], [-97.33, 32.755]);
  assert.ok(distance > 49 && distance < 51);
  assert.equal(geo.distanceToGeometryKm([-96.797, 32.777], { type: "Point", coordinates: [-96.797, 32.777] }), 0);
});

test("contractor radius measures the nearest event boundary instead of its centroid", () => {
  const geometry = { type: "Polygon", coordinates: [[[-97.5, 32], [-96.5, 32], [-96.5, 33], [-97.5, 33], [-97.5, 32]]] };
  const distance = geo.distanceToGeometryKm([-96.2, 32.5], geometry);
  assert.ok(distance > 27 && distance < 30);
});

test("SVG weather map projects official WGS84 geometry without WebGL", () => {
  const [x, y] = mapData.projectUsCoordinate([-96.797, 32.777]);
  assert.ok(x > 470 && x < 490);
  assert.ok(y > 365 && y < 375);
  const path = mapData.geometrySvgPath({ type: "Polygon", coordinates: [[[-97, 32], [-96, 32], [-96, 33], [-97, 32]]] });
  assert.match(path, /^M/);
  assert.match(path, / Z$/);
  assert.equal(mapData.geometrySvgPath({ type: "Point", coordinates: [-97, 32] }), null);
});

test("TotalScope opportunity is distinct from meteorological severity", () => {
  const flood = alert({ event: "Flash Flood Warning", severity: "Extreme", urgency: "Immediate", certainty: "Observed" });
  const hail = alert({ event: "Severe Thunderstorm Warning", severity: "Severe", description: "Golf ball size hail up to 1.75 inches is expected." });
  assert.equal(intelligence.assessWeatherSeverity(flood).label, "Extreme");
  assert.equal(intelligence.normalizeWeatherEvent(hail), "Hail");
  assert.ok(intelligence.assessTotalScopeOpportunity(hail).score > intelligence.assessTotalScopeOpportunity(flood).score);
  assert.equal(intelligence.assessTotalScopeOpportunity(hail).evidence.hailSizeInches, 1.75);
});

test("weather opportunity v1 preserves headroom and explains every scored input", () => {
  const ordinary = alert({ description: "Hail and damaging winds up to 60 mph are expected." });
  const exceptional = alert({ description: "Destructive winds up to 110 mph and hail up to 4 inches.", headline: "Tornado Emergency" });
  const ordinaryScore = intelligence.assessWeatherOpportunity(ordinary);
  const exceptionalScore = intelligence.assessWeatherOpportunity(exceptional);
  assert.equal(ordinaryScore.modelVersion, "weather_opportunity_v1");
  assert.ok(ordinaryScore.score >= 70 && ordinaryScore.score < 90);
  assert.ok(exceptionalScore.score > ordinaryScore.score);
  assert.ok(exceptionalScore.breakdown.every((component) => component.key && component.label && component.points > 0));
  assert.equal(intelligence.assessWeatherSeverity(ordinary).score, 80, "meteorological severity remains independent");
});

test("hail, wind, and tornado scoring retain extraordinary-event headroom", () => {
  const hail = intelligence.assessWeatherOpportunity(alert({ description: "Hail up to 1 inch." }));
  const wind = intelligence.assessWeatherOpportunity(alert({ event: "High Wind Warning", description: "Damaging winds up to 75 mph." }));
  const tornado = intelligence.assessWeatherOpportunity(alert({ event: "Tornado Warning", headline: "Tornado Emergency", description: "A confirmed tornado is ongoing." }));
  assert.ok(hail.score < 100);
  assert.ok(wind.score < 100);
  assert.ok(tornado.score < 100);
  assert.ok(tornado.score > wind.score);
});

test("future composite opportunity contract keeps unavailable business inputs null", () => {
  const contracts = readFileSync("lib/weather/contracts.ts", "utf8");
  assert.match(contracts, /FutureTotalScopeOpportunityInputs/);
  assert.match(contracts, /clientExposure: null/);
  assert.match(contracts, /prospectMarketOpportunity: null/);
});

test("affected NWS areas format by state only when parsing is deterministic", () => {
  assert.deepEqual(affectedGeography.formatAffectedGeography(["Shelby, IN", "Delaware, IN", "Henry, IN"]), ["Delaware, Henry & Shelby Counties, Indiana"]);
  assert.deepEqual(affectedGeography.formatAffectedGeography(["Darke, OH", "Randolph, IN"]), ["Randolph County, Indiana", "Darke County, Ohio"]);
  assert.deepEqual(affectedGeography.formatAffectedGeography(["Northern Coastal Waters"]), ["Northern Coastal Waters"]);
});

test("MultiPolygon ZCTA intersection and deterministic ordering remain supported", () => {
  const square = (west, south, east, north) => [[[west, south], [east, south], [east, north], [west, north], [west, south]]];
  const event = { type: "MultiPolygon", coordinates: [[...square(-80.5, 34.5, -79.5, 35.5)], [...square(-82.5, 36.5, -81.5, 37.5)]] };
  const result = zcta.intersectOpportunityZctas([event], [
    { zcta: "28202", geometry: { type: "Polygon", coordinates: square(-80.4, 34.8, -80.1, 35.1) }, sourceVersion: "test" },
    { zcta: "24201", geometry: { type: "Polygon", coordinates: square(-82.4, 36.8, -82.1, 37.1) }, sourceVersion: "test" },
  ]);
  assert.deepEqual(result.zctas, ["24201", "28202"]);
});

function forecastPeriod(name, startHour, shortForecast, detailedForecast = shortForecast, windSpeed = "10 mph") {
  return { name, startTime: `2026-08-${String(10 + Math.floor(startHour / 24)).padStart(2, "0")}T${String(startHour % 24).padStart(2, "0")}:00:00Z`, endTime: `2026-08-${String(10 + Math.floor((startHour + 6) / 24)).padStart(2, "0")}T${String((startHour + 6) % 24).padStart(2, "0")}:00:00Z`, temperature: 80, temperatureUnit: "F", windSpeed, windDirection: "SW", shortForecast, detailedForecast, precipitationProbabilityPercent: 30 };
}

function forecast(periods) {
  return { kind: "forecast", provider: "nws", sourceId: "forecast-test", sourceUrl: "https://api.weather.gov/test", sourceTimestamp: "2026-08-10T00:00:00Z", retrievedAt: "2026-08-10T00:01:00Z", location: { id: "dfw", name: "Dallas-Fort Worth", latitude: 32.7, longitude: -96.8 }, periods };
}

test("forecast horizons include only adverse source-supported signals in 24/48/72/168 hours", () => {
  const input = forecast([forecastPeriod("Today", 6, "Sunny"), forecastPeriod("Tonight", 18, "Damaging winds", "Damaging winds up to 55 mph", "45 to 55 mph"), forecastPeriod("Tomorrow", 36, "Severe Thunderstorms"), forecastPeriod("Day 3", 60, "Heavy Rain"), forecastPeriod("Day 5", 108, "Ice Storm")]);
  assert.deepEqual([24, 48, 72, 168].map((hours) => forecastSignals.deriveForecastSignals([input], "2026-08-10T00:00:00Z", hours).length), [1, 2, 3, 4]);
});

test("benign forecasts and unsupported generic thunderstorms are suppressed", () => {
  const input = forecast([forecastPeriod("Today", 6, "Sunny"), forecastPeriod("Tonight", 12, "Clear"), forecastPeriod("Tomorrow", 18, "Chance Thunderstorms")]);
  assert.deepEqual(forecastSignals.deriveForecastSignals([input], "2026-08-10T00:00:00Z", 24), []);
});

test("forecast-derived signals never become issued alert opportunities", () => {
  const signals = forecastSignals.deriveForecastSignals([forecast([forecastPeriod("Tonight", 12, "Severe Thunderstorms")])], "2026-08-10T00:00:00Z", 24);
  assert.equal(signals[0].modelVersion, "forecast_signal_v1");
  assert.equal("sourceAlerts" in signals[0], false);
  assert.equal("weatherOpportunity" in signals[0], false);
});

test("map supports independent horizon-set fit and selected-opportunity fit", () => {
  const first = aggregation.aggregateWeatherOpportunities([alert({ sourceId: "one" })], "2026-08-10T12:00:00Z", 24)[0];
  const second = aggregation.aggregateWeatherOpportunities([alert({ sourceId: "two", geometry: { type: "Point", coordinates: [-80.8, 35.2] } })], "2026-08-10T12:00:00Z", 24)[0];
  const setView = mapData.fitOpportunitySetViewBox([first, second]);
  const selectedView = mapData.fitOpportunityViewBox(first);
  assert.ok(setView.width > selectedView.width);
});

test("dashboard exposes composable KPI, active-alert, and adverse forecast interactions", () => {
  const dashboard = readFileSync("components/dashboard/live-weather-dashboard.tsx", "utf8");
  assert.match(dashboard, /opportunityBand/);
  assert.match(dashboard, /aria-pressed/);
  assert.match(dashboard, /activeAlertCatalogRef/);
  assert.match(dashboard, /Upcoming Weather to Watch/);
  assert.match(dashboard, /Ordinary sunny, clear, and otherwise benign periods are intentionally suppressed/);
  assert.doesNotMatch(dashboard, /Forecast signals across configured markets/);
});

test("monitored forecast locations are interactive and never labeled as clients", () => {
  const map = readFileSync("components/dashboard/weather-intelligence-map.tsx", "utf8");
  assert.match(map, /MONITORED FORECAST LOCATION/);
  assert.match(map, /Open monitored forecast location/);
  assert.match(map, /No significant weather to watch/);
  assert.doesNotMatch(map, />TotalScope client</);
  assert.doesNotMatch(map, />Prospective contractor</);
});

test("normalized wind categories require supported official language and retain values", () => {
  const wind = alert({ event: "High Wind Warning", description: "Damaging winds with gusts up to 75 mph." });
  const ordinaryStorm = alert({ event: "Severe Thunderstorm Warning", description: "A strong storm is moving east." });
  assert.equal(intelligence.normalizeWeatherEvent(wind), "Damaging / Extreme Wind");
  assert.equal(intelligence.assessTotalScopeOpportunity(wind).evidence.maximumWindMph, 75);
  assert.equal(intelligence.normalizeWeatherEvent(ordinaryStorm), "Severe Convective");
});

test("normalized event taxonomy supports every approved user-facing category", () => {
  const cases = [
    ["Hail Warning", "Hail"], ["High Wind Warning", "Damaging / Extreme Wind"],
    ["Severe Thunderstorm Warning", "Severe Convective"], ["Tornado Warning", "Tornado"],
    ["Hurricane Warning", "Tropical / Hurricane"], ["Flood Warning", "Flooding"],
    ["Ice Storm Warning", "Winter / Ice"], ["Dense Fog Advisory", "Other"],
  ];
  for (const [event, expected] of cases) assert.equal(intelligence.normalizeWeatherEvent(alert({ event, description: null })), expected);
});

test("exact NWS product remains preserved beside normalized category", () => {
  const original = "Severe Thunderstorm Warning";
  const result = aggregation.aggregateWeatherOpportunities([alert({ event: original, description: "Damaging winds to 65 mph." })], "2026-08-10T12:00:00Z", 24)[0];
  assert.equal(result.sourceAlerts[0].event, original);
  assert.equal(result.normalizedEventType, "Damaging / Extreme Wind");
});

test("ZCTA intersection is deterministic across states and explicit without geometry", () => {
  const square = (west, south, east, north) => ({ type: "Polygon", coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]] });
  const result = zcta.intersectOpportunityZctas([square(-80.5, 34.5, -79.5, 35.5)], [
    { zcta: "28202", geometry: square(-80.7, 35.0, -80.4, 35.3), sourceVersion: "test" },
    { zcta: "29730", geometry: square(-80.1, 34.8, -79.8, 35.1), sourceVersion: "test" },
    { zcta: "99999", geometry: square(-100, 40, -99, 41), sourceVersion: "test" },
  ]);
  assert.deepEqual(result.zctas, ["28202", "29730"]);
  assert.equal(zcta.intersectOpportunityZctas([], []).status, "unavailable");
});

test("map fit calculation focuses geometry and reset remains national", () => {
  const opportunity = aggregation.aggregateWeatherOpportunities([alert()], "2026-08-10T12:00:00Z", 24)[0];
  const focused = mapData.fitOpportunityViewBox(opportunity);
  assert.ok(focused.width < mapData.NATIONAL_WEATHER_VIEWBOX.width);
  assert.deepEqual(mapData.fitOpportunityViewBox({ ...opportunity, sourceAlerts: opportunity.sourceAlerts.map((item) => ({ ...item, geometry: null })) }), mapData.NATIONAL_WEATHER_VIEWBOX);
});

test("client reconciliation preserves ambiguity and uses deterministic identifiers", () => {
  const base = { externalClientId: null, companyName: "Apex Roofing LLC", streetAddress: "10 Main St", city: "Raleigh", state: "NC", postalCode: "27601", phone: null, email: null, website: null, locationPrecision: "exact_geocoded_street" };
  assert.equal(clientReconciliation.assessClientMatch(base, { ...base, streetAddress: "20 Main St" }).status, "possible_existing_client");
  assert.equal(clientReconciliation.assessClientMatch(base, base).status, "confirmed_existing_client");
});

test("future exposure and prospect contracts retain precision and three-state matching", () => {
  const contracts = readFileSync("lib/weather/contracts.ts", "utf8");
  assert.match(contracts, /"direct" \| "near" \| "outside" \| "unknown"/);
  assert.match(contracts, /"rooftop" \| "parcel" \| "interpolated_address" \| "street" \| "zip" \| "city" \| "unknown"/);
  assert.match(contracts, /"not_existing_client"[\s\S]*"possible_existing_client"[\s\S]*"confirmed_existing_client"/);
});

test("material official alerts receive deterministic classifications", () => {
  const result = classification.classifyAlert(alert());
  assert.equal(result.level, "active");
  assert.ok(result.rationale.some((item) => item.includes("Immediate")));
  assert.equal(classification.classifyAlert(alert({ event: "Air Quality Alert" })), null);
});

test("overlapping related alerts aggregate and preserve source provenance", () => {
  const alerts = [
    alert({ sourceId: "alert-a", geometry: { type: "Polygon", coordinates: [[[-97.1, 32.5], [-96.6, 32.5], [-96.6, 33], [-97.1, 33], [-97.1, 32.5]]] } }),
    alert({ sourceId: "alert-b", effectiveAt: "2026-08-10T12:30:00Z", expiresAt: "2026-08-10T14:00:00Z", geometry: { type: "Polygon", coordinates: [[[-96.8, 32.7], [-96.3, 32.7], [-96.3, 33.2], [-96.8, 33.2], [-96.8, 32.7]]] } }),
  ];
  const result = aggregation.aggregateWeatherOpportunities(alerts, "2026-08-10T12:00:00Z", 24);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].sourceAlertIds, ["alert-a", "alert-b"]);
  assert.equal(result[0].level, "active");
});

test("unrelated geography and time-separated events remain separate", () => {
  const geographic = aggregation.aggregateWeatherOpportunities([
    alert({ sourceId: "texas" }),
    alert({ sourceId: "carolinas", geometry: { type: "Point", coordinates: [-80.84, 35.23] }, areaDescription: "Mecklenburg County" }),
  ], "2026-08-10T12:00:00Z", 24);
  assert.equal(geographic.length, 2);
  const temporal = aggregation.aggregateWeatherOpportunities([
    alert({ sourceId: "morning", expiresAt: "2026-08-10T13:00:00Z" }),
    alert({ sourceId: "evening", effectiveAt: "2026-08-10T18:00:00Z", expiresAt: "2026-08-10T20:00:00Z" }),
  ], "2026-08-10T12:00:00Z", 24);
  assert.equal(temporal.length, 2);
});

test("opportunity priority and ordering are deterministic", () => {
  const inputs = [
    alert({ sourceId: "elevated", severity: "Moderate", certainty: "Likely", urgency: "Expected", geometry: { type: "Point", coordinates: [-80.84, 35.23] } }),
    alert({ sourceId: "active", geometry: { type: "Point", coordinates: [-96.8, 32.8] } }),
  ];
  const forward = aggregation.aggregateWeatherOpportunities(inputs, "2026-08-10T12:00:00Z", 24);
  const reverse = aggregation.aggregateWeatherOpportunities([...inputs].reverse(), "2026-08-10T12:00:00Z", 24);
  assert.deepEqual(forward.map((item) => [item.id, item.level]), reverse.map((item) => [item.id, item.level]));
  assert.equal(forward[0].level, "active");
});

test("aggregation handles empty and large alert volumes", () => {
  assert.deepEqual(aggregation.aggregateWeatherOpportunities([], "2026-08-10T12:00:00Z", 24), []);
  const alerts = Array.from({ length: 250 }, (_, index) => alert({ sourceId: `bulk-${String(index).padStart(3, "0")}` }));
  const result = aggregation.aggregateWeatherOpportunities(alerts, "2026-08-10T12:00:00Z", 24);
  assert.equal(result.length, 1);
  assert.equal(result[0].sourceAlertIds.length, 250);
});

test("monitored-location configuration accepts valid JSON and rejects malformed entries", () => {
  const valid = JSON.stringify([{ id: "dfw", name: "Dallas-Fort Worth", latitude: 32.7767, longitude: -96.797, state: "TX" }]);
  assert.equal(weatherConfig.parseMonitoredLocations(valid).length, 1);
  assert.deepEqual(weatherConfig.parseMonitoredLocations(undefined), []);
  assert.throws(() => weatherConfig.parseMonitoredLocations("[{id:dfw}]"), /valid JSON/);
  assert.throws(() => weatherConfig.parseMonitoredLocations(JSON.stringify([{ id: "bad", name: "Bad", latitude: 120, longitude: 0 }])), /invalid coordinates/);
});

test("map input preserves official geometry and never fabricates missing geometry", () => {
  const withGeometry = aggregation.aggregateWeatherOpportunities([alert({ sourceId: "mapped" })], "2026-08-10T12:00:00Z", 24)[0];
  const withoutGeometry = aggregation.aggregateWeatherOpportunities([alert({ sourceId: "unmapped", geometry: null, areaDescription: "Provider text only" })], "2026-08-10T12:00:00Z", 24)[0];
  const features = mapData.buildOpportunityMapFeatures([withGeometry, withoutGeometry]);
  assert.equal(features.features.length, 1);
  assert.equal(features.features[0].properties.opportunityId, withGeometry.id);
  assert.equal(mapData.opportunityBounds(withoutGeometry), null);
});

test("contractor normalization preserves missing contact data rather than inventing it", () => {
  const result = contractorNormalization.normalizeContractorBusiness({
    provider: "licensed-test-provider", providerBusinessId: "business-1", name: "Example Roofing",
    address: { city: "Dallas", state: "TX", postalCode: "75201" },
  }, "2026-08-10T12:00:00Z");
  assert.equal(result.phone, null);
  assert.equal(result.email, null);
  assert.equal(result.contactName, null);
  assert.equal(result.completeness, "partial");
  assert.throws(() => contractorNormalization.normalizeContractorBusiness({ provider: "x", providerBusinessId: "", name: "x" }, "2026-08-10T12:00:00Z"));
});

test("client exposure persistence uses an admin-only RPC and composite ownership", () => {
  const migration = readFileSync("supabase/migrations/202607290001_weather_data_foundation.sql", "utf8");
  const repository = readFileSync("lib/weather/branch-repository.ts", "utf8");
  assert.match(migration, /get_weather_internal_branch_locations/);
  assert.match(migration, /if not private\.is_staging_admin\(\)/);
  assert.match(migration, /foreign key \(branch_id, client_id\) references public\.branches\(id, client_id\)/);
  assert.match(repository, /rpc\/get_weather_internal_client_locations_v2/);
});

test("live weather code contains no fixture or demo fallback", () => {
  for (const path of ["lib/weather/service.ts", "lib/weather/providers/nws-weather-provider.ts", "components/dashboard/live-weather-dashboard.tsx", "components/dashboard/weather-intelligence-map.tsx"]) {
    const source = readFileSync(path, "utf8");
    assert.doesNotMatch(source, /demoData|demoCompaniesForStates|tests\/fixtures|mock contractor/i, path);
  }
});

test("interactive map stays provider-neutral and receives only canonical application data", () => {
  const map = readFileSync("components/dashboard/weather-intelligence-map.tsx", "utf8");
  assert.match(map, /weather-svg-map/);
  assert.match(map, /weather-opportunity-geography/);
  assert.match(map, /weather-operational-points/);
  assert.match(map, /buildOperationalPointFeatures/);
  assert.doesNotMatch(map, /api\.weather\.gov|service[_-]?role|access[_-]?token|mapbox/i);
  assert.match(map, /Reset to U\.S\./);
  assert.match(map, /onWheel/);
  assert.match(map, /onPointerMove/);
  assert.match(map, /fitOpportunityViewBox/);
});

test("dashboard aggregates alerts before presenting source provenance", () => {
  const dashboard = readFileSync("components/dashboard/live-weather-dashboard.tsx", "utf8");
  assert.match(dashboard, /aggregateWeatherOpportunities/);
  assert.match(dashboard, /Source alerts and official provenance/);
  assert.match(dashboard, /Contractor discovery provider not yet configured/);
  assert.doesNotMatch(dashboard, /snapshot\.opportunities\.map/);
});

test("weather route requires internal role in live mode", () => {
  const layout = readFileSync("app/weather/layout.tsx", "utf8");
  assert.match(layout, /requireRole\("staging_admin"\)/);
  assert.doesNotMatch(layout, /requireLiveUser/);
});
