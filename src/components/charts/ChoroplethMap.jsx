import React, { useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { feature, mesh } from "topojson-client";
import usStates from "../../data/us-states-10m.json";

const STATE_ABBR_TO_NAME = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  PR: "Puerto Rico",
  GU: "Guam",
  VI: "Virgin Islands",
  AS: "American Samoa",
  MP: "Northern Mariana Islands"
};

const STATE_NAME_TO_ABBR = Object.fromEntries(
  Object.entries(STATE_ABBR_TO_NAME).map(([abbr, name]) => [name, abbr])
);

const topoStates = feature(usStates, usStates.objects.states);
const borders = mesh(usStates, usStates.objects.states, (a, b) => a !== b);

const WIDTH = 640;
const HEIGHT = 380;

export default function ChoroplethMap({ data, hint }) {
  const [hoverInfo, setHoverInfo] = useState(null);
  const wrapperRef = useRef(null);

  const valueMap = useMemo(() => {
    const m = new Map();
    data?.forEach((d) => m.set(d.state, d.consumption));
    return m;
  }, [data]);

  const [minValue, maxValue] = useMemo(() => {
    if (!data || !data.length) return [0, 0];
    const extent = d3.extent(data, (d) => d.consumption);
    return extent[0] === undefined || extent[1] === undefined ? [0, 0] : extent;
  }, [data]);

  const totalValue = useMemo(
    () => (data && data.length ? data.reduce((sum, d) => sum + d.consumption, 0) : 0),
    [data]
  );

  const projection = useMemo(() => {
    return d3.geoAlbersUsa().fitSize([WIDTH, HEIGHT], topoStates);
  }, []);

  const pathGenerator = useMemo(() => d3.geoPath(projection), [projection]);

  const colorScale = useMemo(() => {
    if (!data || !data.length || minValue === maxValue) {
      return () => "var(--panel-glow)";
    }
    return d3
      .scaleSequential()
      .domain([minValue, maxValue])
      .interpolator(d3.interpolateRgb("#bfdbfe", "#1d4ed8"));
  }, [data, minValue, maxValue]);

  const formatter = useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }), []);
  const preciseFormatter = useMemo(
    () => new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }),
    []
  );
  const percentFormatter = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 }),
    []
  );

  if (!data || !data.length) {
    return <div className="map-hint">No data available for the selected filters.</div>;
  }

  const legendMin = formatter.format(Math.round(minValue));
  const legendMax = formatter.format(Math.round(maxValue));

  return (
    <div className="choropleth-wrapper" ref={wrapperRef}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="US energy consumption choropleth">
        <defs>
          <linearGradient id="map-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#bfdbfe" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>
        <g>
          {topoStates.features.map((feature) => renderStatePath(feature))}
          <path d={pathGenerator(borders)} fill="none" stroke="var(--border-subtle)" strokeWidth={0.6} />
        </g>
      </svg>
      <div className="map-legend">
        <span>{legendMin} TWh</span>
        <div className="map-legend__swatch">
          <div className="map-legend__gradient" />
        </div>
        <span>{legendMax} TWh</span>
      </div>
      <div className="map-hint">
        {hint || "Hover for state totals · D3 + TopoJSON choropleth"}
      </div>
      {hoverInfo ? (
        <div className="map-tooltip" style={{ left: hoverInfo.x, top: hoverInfo.y }}>
          <div className="map-tooltip__title">
            {hoverInfo.name} {hoverInfo.abbr ? `(${hoverInfo.abbr})` : ""}
          </div>
          <div className="map-tooltip__value">
            {hoverInfo.value !== null && hoverInfo.value !== undefined
              ? `${preciseFormatter.format(hoverInfo.value)} TWh`
              : "No reported data"}
          </div>
          {hoverInfo.share !== null && hoverInfo.share !== undefined ? (
            <div className="map-tooltip__share">
              {percentFormatter.format(hoverInfo.share)} of national total
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  function renderStatePath(feature) {
    const abbr = STATE_NAME_TO_ABBR[feature.properties?.name] ?? null;
    const value = abbr ? valueMap.get(abbr) : undefined;
    const hasValue = typeof value === "number" && Number.isFinite(value);
    const fill = hasValue ? colorScale(value) : "var(--progress-track)";
    const displayName = abbr
      ? STATE_ABBR_TO_NAME[abbr] ?? feature.properties?.name ?? abbr
      : feature.properties?.name ?? "Unknown";

    const handleMove = (event) => {
      const tooltipWidth = 200;
      const tooltipHeight = 90;
      const bounds = wrapperRef.current?.getBoundingClientRect();
      const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
      const baseX = bounds ? event.clientX - bounds.left : event.clientX;
      const baseY = bounds ? event.clientY - bounds.top : event.clientY;
      const containerWidth = bounds?.width ?? tooltipWidth;
      const containerHeight = bounds?.height ?? tooltipHeight;
      const nextX = clamp(baseX + 16, 0, containerWidth - tooltipWidth);
      const nextY = clamp(baseY - 24, 0, containerHeight - tooltipHeight);

      setHoverInfo({
        abbr,
        name: displayName,
        value: hasValue ? value : null,
        share: hasValue && totalValue > 0 ? value / totalValue : null,
        x: nextX,
        y: nextY
      });
    };

    const handleLeave = () => setHoverInfo(null);

    return (
      <path
        key={feature.id}
        d={pathGenerator(feature)}
        fill={fill}
        stroke="var(--border-subtle)"
        strokeWidth={0.6}
        onMouseEnter={handleMove}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        title={`${displayName}: ${
          hasValue ? `${preciseFormatter.format(value)} TWh` : "No reported data"
        }`}
      />
    );
  }
}
