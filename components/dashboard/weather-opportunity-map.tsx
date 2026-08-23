"use client";

import { useEffect, useMemo, useState } from "react";
import type { ClaimWeatherMatch, WeatherEvent } from "@/types/intelligence";
import { demoCompaniesForStates } from "@/lib/weather/demo-contractor-opportunities";

const EVENT_PLACEMENTS: Record<string, { x: number; y: number; shortLabel: string; labelLeft?: boolean }> = {
  // Native coordinates in the source SVG's 959 × 593 Albers projection.
  // Keeping markers in the SVG coordinate system prevents responsive
  // letterboxing from separating them from their geographic anchors.
  "wx-01": { x: 455, y: 410, shortLabel: "N TX Hail", labelLeft: true }, // Dallas–Fort Worth
  "wx-02": { x: 555, y: 470, shortLabel: "Gulf Wind" }, // Southern Louisiana
  "wx-03": { x: 366, y: 270, shortLabel: "Front Range Hail" }, // Denver
  "wx-04": { x: 886, y: 160, shortLabel: "NE Freeze", labelLeft: true }, // Boston
  "wx-05": { x: 704, y: 405, shortLabel: "SE Wind", labelLeft: true }, // Atlanta
};

function formatDisplayDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${month}/${day}/${year}`;
}

function relativeDateLabel(value: string, today: string | null) {
  if (!today) return null;
  const eventTime = Date.parse(`${value}T00:00:00Z`);
  const todayTime = Date.parse(`${today}T00:00:00Z`);
  const difference = Math.round((eventTime - todayTime) / 86_400_000);
  if (difference === 0) return "Today";
  if (difference > 0) return `${difference} ${difference === 1 ? "day" : "days"} from now`;
  const elapsed = Math.abs(difference);
  return `${elapsed} ${elapsed === 1 ? "day" : "days"} ago`;
}

export function WeatherOpportunityMap({
  events,
  matches,
  historyDays,
  onHistoryDaysChange,
}: {
  events: WeatherEvent[];
  matches: ClaimWeatherMatch[];
  historyDays: number;
  onHistoryDaysChange: (days: number) => void;
}) {
  const [selectedId, setSelectedId] = useState(events[0]?.id ?? "");
  const [openEventId, setOpenEventId] = useState<string | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const active = events.find((event) => event.id === selectedId) ?? events[0];
  const eventMetrics = useMemo(
    () =>
      Object.fromEntries(
        events.map((event) => {
          const eventMatches = matches.filter((match) => match.weatherEventId === event.id);
          return [
            event.id,
            {
              count: eventMatches.length,
              confidence:
                eventMatches.length === 0
                  ? null
                  : eventMatches.reduce((sum, match) => sum + match.confidence, 0) /
                    eventMatches.length,
            },
          ];
        }),
      ),
    [events, matches],
  );

  const openEvent = events.find((event) => event.id === openEventId) ?? null;

  useEffect(() => {
    const now = new Date();
    const localDate = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
    setToday(localDate);
  }, []);

  useEffect(() => {
    if (!openEventId) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenEventId(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [openEventId]);

  if (!active) return null;
  const activeMetrics = eventMetrics[active.id];
  const openMetrics = openEvent ? eventMetrics[openEvent.id] : null;

  return (
    <section className="weather-heat-card" aria-labelledby="weather-heat-title">
      <header>
        <div>
          <small>DEMO DATA · NOT A LIVE WEATHER FEED</small>
          <h2 id="weather-heat-title">Storm opportunity heat map</h2>
          <p>Hover or select an event to review its modeled footprint and matched file activity.</p>
        </div>
        <span>{events.length} synthetic events</span>
      </header>

      <div className="weather-history-control">
        <div>
          <label htmlFor="storm-history-days">Storm History</label>
          <strong>Past {historyDays} {historyDays === 1 ? "day" : "days"}</strong>
          <span>Confirmed events in the lookback window plus forecast/warning events.</span>
        </div>
        <input
          id="storm-history-days"
          type="range"
          min="1"
          max="90"
          step="1"
          value={historyDays}
          onChange={(event) => onHistoryDaysChange(Number(event.target.value))}
          aria-valuetext={`Past ${historyDays} ${historyDays === 1 ? "day" : "days"}`}
        />
        <output htmlFor="storm-history-days">{historyDays}d</output>
      </div>

      <div className="weather-heat-body">
        <div
          className="weather-heat-map"
          role="group"
          aria-label="Map of the United States with state boundaries and synthetic storm opportunity markers"
        >
          <svg className="weather-map-geography" viewBox="0 0 959 593" preserveAspectRatio="xMidYMid meet">
            <image href="/us-states-outline.svg" width="959" height="593" aria-hidden="true" />
            {events.map((event) => {
              const position = EVENT_PLACEMENTS[event.id] ?? { x: 480, y: 296, shortLabel: event.name };
              const metrics = eventMetrics[event.id];
              return (
                <foreignObject
                  key={event.id}
                  x={position.x - 13}
                  y={position.y - 13}
                  width="190"
                  height="105"
                  className="weather-map-pin-object"
                >
                  <button
                    type="button"
                    className={`weather-map-pin ${event.eventStatus} ${position.labelLeft ? "label-left" : ""} ${active.id === event.id ? "active" : ""}`}
                    onMouseEnter={() => setSelectedId(event.id)}
                    onFocus={() => setSelectedId(event.id)}
                    onClick={() => { setSelectedId(event.id); setOpenEventId(event.id); }}
                    aria-pressed={active.id === event.id}
                    aria-label={`${event.name}: ${event.eventStatus} ${event.severity} ${event.type}; ${metrics.count} matched selected files`}
                  >
                    <i />
                    <span>
                      <b>{position.shortLabel}</b>
                      <small>{event.eventStatus === "confirmed" ? "Confirmed" : "Forecast"} · {event.severity} {event.type}</small>
                    </span>
                  </button>
                </foreignObject>
              );
            })}
          </svg>

          <div className="weather-map-legend" aria-label="Weather heat map legend">
            <span><i className="confirmed" /> Confirmed / observed</span>
            <span><i className="forecast" /> Forecast / warning</span>
          </div>
        </div>

        <aside aria-live="polite">
          <small>SELECTED EVENT</small>
          <h3>{active.name}</h3>
          <p>{active.eventStatus === "confirmed" ? "Confirmed / observed" : "Forecast / warning"} · {active.severity} {active.type}</p>
          <dl>
            <div>
              <dt>Event date</dt>
              <dd>
                {formatDisplayDate(active.occurredAt)}
                {relativeDateLabel(active.occurredAt, today) && (
                  <small className="weather-relative-date">{relativeDateLabel(active.occurredAt, today)}</small>
                )}
              </dd>
            </div>
            <div><dt>Affected states</dt><dd>{active.states.join(", ")}</dd></div>
            <div><dt>Affected ZIP codes</dt><dd>{active.zipCodes.join(", ")}</dd></div>
            <div><dt>Matched selected files</dt><dd>{activeMetrics.count}</dd></div>
            <div>
              <dt>Claim-event alignment</dt>
              <dd>{activeMetrics.confidence === null ? "Unavailable" : `${(activeMetrics.confidence * 100).toFixed(0)}%`}</dd>
            </div>
          </dl>
          <div className="weather-map-boundary">
            A match is a review opportunity based on state, ZIP-code footprint, and loss window. It does not establish cause of loss.
          </div>
        </aside>
      </div>
      {openEvent && openMetrics && (
        <StormOpportunityDialog
          event={openEvent}
          count={openMetrics.count}
          confidence={openMetrics.confidence}
          onClose={() => setOpenEventId(null)}
        />
      )}
    </section>
  );
}

function StormOpportunityDialog({
  event,
  count,
  confidence,
  onClose,
}: {
  event: WeatherEvent;
  count: number;
  confidence: number | null;
  onClose: () => void;
}) {
  const companies = demoCompaniesForStates(event.states);
  return (
    <div className="weather-dialog-backdrop" onMouseDown={(mouseEvent) => {
      if (mouseEvent.currentTarget === mouseEvent.target) onClose();
    }}>
      <section className="weather-dialog" role="dialog" aria-modal="true" aria-labelledby="weather-dialog-title">
        <header>
          <div>
            <small>DEMO DATA · ILLUSTRATIVE STORM AND 50-KM CONTRACTOR VIEW</small>
            <h2 id="weather-dialog-title">{event.name}</h2>
            <p>{event.eventStatus === "confirmed" ? "Confirmed / observed" : "Forecast / warning"} · {event.severity} {event.type} · {formatDisplayDate(event.occurredAt)} · {event.states.join(", ")}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close storm details">×</button>
        </header>
        <div className="weather-dialog-metrics">
          <div><small>Matched claim files</small><strong>{count}</strong></div>
          <div><small>Claim-event alignment</small><strong>{confidence === null ? "Unavailable" : `${(confidence * 100).toFixed(0)}%`}</strong></div>
          <div><small>Affected ZIP codes</small><strong>{event.zipCodes.join(", ")}</strong></div>
          <div><small>Companies within 50 km</small><strong>{companies.length}</strong></div>
        </div>
        <section className="weather-dialog-evidence">
          <div><small>EVENT INTERPRETATION</small><b>Modeled opportunity—not verified property damage</b><p>Matched claim files share geographic and loss-date signals with this event. The alignment percentage measures the strength of that claim-to-event match; it is not forecast certainty or proof of causation.</p></div>
          <div><small>PLANNED DATA SOURCES</small><b>NWS alerts · NOAA MRMS · preliminary and confirmed reports</b><p>The values on this local page remain synthetic and are not retrieved from those services.</p></div>
        </section>
        <div className="weather-contractor-heading"><div><small>ROOFING COMPANY OPPORTUNITY</small><h3>Companies within 50 km</h3></div><span>{companies.filter((company) => company.isClient).length} clients · {companies.filter((company) => !company.isClient).length} prospects</span></div>
        <div className="weather-contractor-table"><table>
          <thead><tr><th>Roofing company</th><th>Distance</th><th>Relationship</th><th>Contact</th><th>Link</th></tr></thead>
          <tbody>{companies.map((company) => {
            const href = company.isClient
              ? `https://totalscope.com/contractors/demo/${company.slug}`
              : `https://${company.slug}.example`;
            return <tr key={company.slug}>
              <td><b>{company.name}</b><small>{company.city}</small></td>
              <td>{company.distanceKm} km</td>
              <td><em className={company.isClient ? "client" : "prospect"}>{company.isClient ? "Current client" : "Not a client"}</em></td>
              <td><b>{company.contact}</b><small>{company.phone} · {company.email}</small></td>
              <td><a href={href} target="_blank" rel="noreferrer">{company.isClient ? "View TS profile ↗" : "Visit website ↗"}</a></td>
            </tr>;
          })}</tbody>
        </table></div>
        <footer><p>All company names, contacts, links, distances, and storm values are fictional Demo Data.</p><button type="button" onClick={onClose}>Return to Weather map</button></footer>
      </section>
    </div>
  );
}
