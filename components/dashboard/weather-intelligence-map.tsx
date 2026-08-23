"use client";

import { useEffect, useRef, useState } from "react";
import type { AggregatedWeatherOpportunity, ClientExposure, WeatherForecast, WeatherLocation } from "@/lib/weather/contracts";
import type { ForecastSignal } from "@/lib/weather/forecast-signals";
import { buildOperationalPointFeatures, buildOpportunityMapFeatures, fitOpportunitySetViewBox, fitOpportunityViewBox, geometrySvgPath, NATIONAL_WEATHER_VIEWBOX, projectUsCoordinate, type WeatherMapFeatureCollection, type WeatherMapViewBox } from "@/lib/weather/map-data";

const LEVEL_COLORS = { active: "#d4473f", high: "#d4473f", elevated: "#e5b94f", monitor: "#4e9ed8" } as const;

export function WeatherIntelligenceMap({ opportunities, selectedId, monitoredLocations, forecasts, forecastSignals, clientExposures, scopeKey, onSelect }: {
  opportunities: AggregatedWeatherOpportunity[];
  selectedId: string | null;
  monitoredLocations: WeatherLocation[];
  forecasts: WeatherForecast[];
  forecastSignals: ForecastSignal[];
  clientExposures: ClientExposure[];
  scopeKey: string;
  onSelect: (id: string) => void;
}) {
  const [states, setStates] = useState<WeatherMapFeatureCollection | null>(null);
  const [mapState, setMapState] = useState<"loading" | "ready" | "error">("loading");
  const [viewBox, setViewBox] = useState<WeatherMapViewBox>(NATIONAL_WEATHER_VIEWBOX);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const lastPinchDistance = useRef<number | null>(null);
  const opportunitiesRef = useRef(opportunities);
  opportunitiesRef.current = opportunities;
  const opportunityFeatures = buildOpportunityMapFeatures(opportunities);
  const operationalPoints = buildOperationalPointFeatures(monitoredLocations, clientExposures);

  useEffect(() => {
    let active = true;
    void fetch("/us-states-wgs84.geojson", { cache: "force-cache" })
      .then((response) => {
        if (!response.ok) throw new Error(`State geography request failed (${response.status}).`);
        return response.json() as Promise<WeatherMapFeatureCollection>;
      })
      .then((value) => { if (active) { setStates(value); setMapState("ready"); } })
      .catch(() => { if (active) setMapState("error"); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setViewBox(fitOpportunitySetViewBox(opportunitiesRef.current));
  }, [scopeKey]);

  useEffect(() => {
    const selected = opportunitiesRef.current.find((opportunity) => opportunity.id === selectedId);
    if (selected) setViewBox(fitOpportunityViewBox(selected));
  }, [selectedId]);

  const selectedLocation = monitoredLocations.find((location) => location.id === selectedLocationId) ?? null;
  const selectedLocationForecast = forecasts.find((forecast) => forecast.location.id === selectedLocationId) ?? null;
  const selectedLocationSignal = forecastSignals.find((signal) => signal.locationId === selectedLocationId) ?? null;

  function zoom(factor: number, clientX?: number, clientY?: number, bounds?: DOMRect) {
    setViewBox((current) => {
      const nextWidth = Math.max(180, Math.min(1000, current.width * factor));
      const nextHeight = Math.max(100.8, Math.min(560, current.height * factor));
      const ratioX = bounds && clientX != null ? (clientX - bounds.left) / bounds.width : 0.5;
      const ratioY = bounds && clientY != null ? (clientY - bounds.top) / bounds.height : 0.5;
      return {
        x: Math.max(0, Math.min(1000 - nextWidth, current.x + (current.width - nextWidth) * ratioX)),
        y: Math.max(0, Math.min(560 - nextHeight, current.y + (current.height - nextHeight) * ratioY)),
        width: nextWidth,
        height: nextHeight,
      };
    });
  }

  function onPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const active = [...pointers.current.values()];
    if (active.length === 2) {
      const distance = Math.hypot(active[0].x - active[1].x, active[0].y - active[1].y);
      if (lastPinchDistance.current) zoom(lastPinchDistance.current / distance);
      lastPinchDistance.current = distance;
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    setViewBox((current) => ({ ...current,
      x: Math.max(0, Math.min(1000 - current.width, current.x - (event.clientX - previous.x) * current.width / bounds.width)),
      y: Math.max(0, Math.min(560 - current.height, current.y - (event.clientY - previous.y) * current.height / bounds.height)),
    }));
  }

  function releasePointer(event: React.PointerEvent<SVGSVGElement>) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) lastPinchDistance.current = null;
  }

  return <div className="weather-map-shell">
    <svg className="weather-map weather-svg-map" viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`} role="img" aria-label="Interactive United States map showing official NWS opportunity geography, monitored locations, and governed TotalScope client locations when available"
      onWheel={(event) => { event.preventDefault(); zoom(event.deltaY > 0 ? 1.18 : 0.84, event.clientX, event.clientY, event.currentTarget.getBoundingClientRect()); }}
      onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY }); }}
      onPointerMove={onPointerMove} onPointerUp={releasePointer} onPointerCancel={releasePointer}>
      <rect width="1000" height="560" className="weather-map-background" />
      <g className="weather-state-geography" aria-hidden="true">{states?.features.map((feature, index) => {
        const path = feature.geometry && geometrySvgPath(feature.geometry);
        return path ? <path key={String(feature.id ?? index)} d={path} /> : null;
      })}</g>
      <g className="weather-opportunity-geography">{opportunityFeatures.features.map((feature, index) => {
        const id = String(feature.properties?.opportunityId ?? "");
        const level = String(feature.properties?.level ?? "monitor") as keyof typeof LEVEL_COLORS;
        const selected = id === selectedId;
        const label = `Select ${String(feature.properties?.title ?? "weather opportunity")}`;
        if (feature.geometry.type === "Point") {
          const [cx, cy] = projectUsCoordinate(feature.geometry.coordinates);
          return <circle key={`${id}-${index}`} cx={cx} cy={cy} r={selected ? 14 : 9} fill={LEVEL_COLORS[level]} className={selected ? "selected" : selectedId ? "dimmed" : ""} role="button" tabIndex={0} aria-label={label} onClick={() => onSelect(id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(id); }} />;
        }
        const path = geometrySvgPath(feature.geometry);
        return path ? <path key={`${id}-${index}`} d={path} fill={LEVEL_COLORS[level]} stroke={LEVEL_COLORS[level]} className={selected ? "selected" : selectedId ? "dimmed" : ""} role="button" tabIndex={0} aria-label={label} onClick={() => onSelect(id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(id); }} /> : null;
      })}</g>
      <g className="weather-operational-points">{operationalPoints.features.map((feature, index) => {
        if (feature.geometry.type !== "Point") return null;
        const [cx, cy] = projectUsCoordinate(feature.geometry.coordinates);
        const monitored = feature.properties?.kind === "monitored";
        const location = monitoredLocations.find((item) => item.name === feature.properties?.label);
        return <circle key={`${String(feature.properties?.kind)}-${index}`} cx={cx} cy={cy} r={monitored ? 7 : 6} className={String(feature.properties?.kind)} role={monitored ? "button" : undefined} tabIndex={monitored ? 0 : undefined} aria-label={monitored ? `Open monitored forecast location ${String(feature.properties?.label)}` : undefined} onClick={monitored ? () => setSelectedLocationId(location?.id ?? null) : undefined} onKeyDown={monitored ? (event) => { if (event.key === "Enter" || event.key === " ") setSelectedLocationId(location?.id ?? null); } : undefined}><title>{monitored ? `${String(feature.properties?.label)} · monitored forecast location` : String(feature.properties?.label ?? "Operational location")}</title></circle>;
      })}</g>
    </svg>
    <div className="weather-map-controls" aria-label="Map controls"><button type="button" onClick={() => zoom(.8)} aria-label="Zoom in">+</button><button type="button" onClick={() => zoom(1.25)} aria-label="Zoom out">−</button><button type="button" onClick={() => setViewBox(NATIONAL_WEATHER_VIEWBOX)}>Reset to U.S.</button></div>
    {mapState === "loading" && <div className="weather-map-state">Loading operational map…</div>}
    {mapState === "error" && <div className="weather-map-state error"><strong>Map geography unavailable</strong><span>Opportunity intelligence remains available in the prioritized list.</span></div>}
    <div className="weather-map-legend" aria-label="Map legend">
      <span><i style={{ background: LEVEL_COLORS.active }} />High Weather Opportunity</span>
      <span><i style={{ background: LEVEL_COLORS.elevated }} />Moderate Weather Opportunity</span>
      <span><i style={{ background: LEVEL_COLORS.monitor }} />Low Weather Opportunity</span>
      <span><i className="monitored" />Monitored Forecast Location</span>
    </div>
    {selectedLocation && <aside className="weather-monitored-popover" aria-live="polite"><button type="button" aria-label="Close monitored location" onClick={() => setSelectedLocationId(null)}>×</button><small>MONITORED FORECAST LOCATION</small><strong>{selectedLocation.name}</strong><span>Last forecast update: {selectedLocationForecast ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(selectedLocationForecast.retrievedAt)) : "Unavailable"}</span><p>{selectedLocationSignal ? `${selectedLocationSignal.eventType}: ${selectedLocationSignal.rationale}` : "No significant weather to watch."}</p></aside>}
  </div>;
}
