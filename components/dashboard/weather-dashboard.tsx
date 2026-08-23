"use client";

import { useMemo, useState } from "react";
import { SectionCard } from "@/components/ui/section-card";
import { useDemoData } from "./data-context";
import { WeatherOpportunityMap } from "./weather-opportunity-map";

export function WeatherDashboard() {
  const { claims, data } = useDemoData();
  const [historyDays, setHistoryDays] = useState(7);
  const selectedClaimIds = new Set(claims.map((claim) => claim.id));
  const matches = data.claimWeatherMatches.filter((match) => selectedClaimIds.has(match.claimId));
  const visibleEvents = useMemo(() => {
    const asOf = new Date("2026-07-29T23:59:59Z");
    const start = new Date(asOf);
    start.setUTCDate(start.getUTCDate() - historyDays);
    return data.weatherEvents.filter((event) => {
      if (event.eventStatus === "forecast") return true;
      const occurredAt = new Date(`${event.occurredAt}T00:00:00Z`);
      return occurredAt >= start && occurredAt <= asOf;
    });
  }, [data.weatherEvents, historyDays]);

  return (
    <div className="weather-layout">
      <WeatherOpportunityMap
        events={visibleEvents}
        matches={matches}
        historyDays={historyDays}
        onHistoryDaysChange={setHistoryDays}
      />

      <SectionCard eyebrow="SYNTHETIC EVENT CATALOG" title="Storm and weather opportunity">
        <div className="event-grid">
          {visibleEvents.map((event) => {
            const eventMatches = matches.filter((match) => match.weatherEventId === event.id);
            const icon = event.type === "hail" ? "●" : event.type === "wind" ? "≋" : event.type === "freeze" ? "✣" : "◉";
            return (
              <article key={event.id}>
                <div>
                  <span className={`event-icon ${event.type}`}>{icon}</span>
                  <span className={`severity ${event.severity}`}>{event.severity}</span>
                </div>
                <h3>{event.name}</h3>
                <p>
                  {event.eventStatus === "confirmed" ? "Confirmed / observed" : "Forecast / warning"}
                  {" · "}{event.type}{" · "}{event.occurredAt}{" · "}{event.states.join(", ")}
                </p>
                <strong>{eventMatches.length}</strong>
                <small>matched selected files</small>
                <footer>
                  {eventMatches.length
                    ? `${(eventMatches.reduce((sum, match) => sum + match.confidence, 0) / eventMatches.length * 100).toFixed(0)}% claim-event alignment`
                    : "No selected matches"}
                </footer>
              </article>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard eyebrow="MATCH METHODOLOGY" title="Opportunity, not causation">
        <div className="insight-card">
          <span>!</span>
          <p>
            Events are synthetic and not live weather data. Claim-to-weather matches use deterministic state,
            ZIP-code footprint, and loss-window alignment. A match indicates a review opportunity; it does not establish
            cause of loss.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
