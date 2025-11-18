import React, { useEffect, useMemo, useState } from "react";
import * as d3 from "d3";
import { getFuelColor } from "./chartColors.js";

const RADIUS = 110;
const THICKNESS = 28;

export default function FuelMixDonutChart({ data }) {
  const [hoverSlice, setHoverSlice] = useState(null);

  const dataset = useMemo(() => {
    if (!data || !data.length) return [];
    return data.map((item) => ({
      ...item,
      magnitude: typeof item.value === "number" ? item.value : item.share ?? 0
    }));
  }, [data]);

  const arcs = useMemo(() => {
    if (!dataset.length) return [];
    const pie = d3
      .pie()
      .sort(null)
      .value((d) => d.magnitude);
    const arcGen = d3
      .arc()
      .innerRadius(RADIUS - THICKNESS)
      .outerRadius(RADIUS);
    return pie(dataset).map((slice) => ({
      path: arcGen(slice),
      label: slice.data.name,
      color: getFuelColor(slice.data.name),
      share: slice.data.share,
      value: slice.data.value
    }));
  }, [dataset]);

  const total = useMemo(() => {
    if (!dataset.length) return 0;
    return dataset.reduce((sum, d) => sum + d.magnitude, 0);
  }, [dataset]);

  const formatter = useMemo(() => {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0
    });
  }, []);

  useEffect(() => {
    // Reset hover state whenever the underlying dataset changes (e.g., new year).
    setHoverSlice(null);
  }, [dataset]);

  if (!dataset.length) {
    return <div className="chart-hint">No fuel mix data.</div>;
  }

  return (
    <div className="donut-chart">
      <svg width={RADIUS * 2} height={RADIUS * 2} viewBox={`0 0 ${RADIUS * 2} ${RADIUS * 2}`}>
        <g transform={`translate(${RADIUS}, ${RADIUS})`}>
          {arcs.map((arc) => (
            <path
              key={arc.label}
              d={arc.path}
              fill={arc.color}
              stroke="var(--bg-panel)"
              strokeWidth={1}
              onMouseEnter={() => handleEnter(arc)}
              onMouseMove={() => handleEnter(arc)}
              onMouseLeave={handleLeave}
            />
          ))}
        </g>
      </svg>
      <div className="donut-chart__center">
        {hoverSlice ? (
          <>
            <span className="donut-chart__label">{hoverSlice.label}</span>
            <strong className="donut-chart__value">{formatter.format(Math.round(hoverSlice.value))} TWh</strong>
            <span className="donut-chart__note">
              {hoverSlice.share != null && !Number.isNaN(hoverSlice.share)
                ? `${(hoverSlice.share * 100).toFixed(1)}% of mix`
                : "Share unavailable"}
            </span>
          </>
        ) : (
          <>
            <span className="donut-chart__label">Latest total</span>
            <strong className="donut-chart__value">{formatter.format(Math.round(total))} TWh</strong>
            <span className="donut-chart__note">Fuel mix share</span>
          </>
        )}
      </div>
      <div className="chart-legend chart-legend--inline">
        {dataset.map((item) => (
          <span
            key={item.name}
            className="chart-legend__item"
            onMouseEnter={() =>
              handleEnter({
                label: item.name,
                share: item.share,
                value: item.value,
                color: getFuelColor(item.name)
              })
            }
            onMouseLeave={handleLeave}
          >
            <span className="chart-legend__swatch" style={{ backgroundColor: getFuelColor(item.name) }} />
            {item.name}
          </span>
        ))}
      </div>
    </div>
  );

  function handleEnter(slice) {
    setHoverSlice({
      label: slice.label,
      share: slice.share ?? (slice.value && total ? slice.value / total : 0),
      value: slice.value,
      color: slice.color
    });
  }

  function handleLeave() {
    setHoverSlice(null);
  }
}
