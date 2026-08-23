const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", DC: "District of Columbia",
};

const joinNames = (values: string[]) => values.length < 2 ? values.join("") : values.length === 2 ? values.join(" & ") : `${values.slice(0, -1).join(", ")} & ${values.at(-1)}`;

export function formatAffectedGeography(areas: string[]) {
  const parsed = areas.map((area) => /^(.*?),\s*([A-Z]{2})$/.exec(area.trim()));
  if (!areas.length || parsed.some((value) => !value || !STATE_NAMES[value[2]])) return areas;
  const grouped = new Map<string, string[]>();
  parsed.forEach((match) => {
    const [, county, state] = match!;
    grouped.set(state, [...(grouped.get(state) ?? []), county.replace(/\s+County$/i, "")]);
  });
  return [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([state, counties]) =>
    `${joinNames([...new Set(counties)].sort())} ${counties.length === 1 ? "County" : "Counties"}, ${STATE_NAMES[state]}`,
  );
}
