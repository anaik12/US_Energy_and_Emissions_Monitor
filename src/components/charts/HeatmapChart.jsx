import React, { useMemo, useRef, useState } from "react";
import * as d3 from "d3";

export default function HeatmapChart({ data, years, maxValue }) {
  const safeMax = maxValue || 1;
  const colorScale = useMemo(
    () => d3.scaleSequential().domain([0, safeMax]).interpolator(d3.interpolateYlGnBu),
    [safeMax]
  );
  const formatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 0
      }),
    []
  );
  const [tooltip, setTooltip] = useState(null);
  const wrapperRef = useRef(null);

  if (!data || !data.length || !years || !years.length) {
    return <div className="chart-hint">No heatmap data.</div>;
  }

  const axisStyle = { gridTemplateColumns: `120px repeat(${years.length}, minmax(0, 1fr))` };

  return (
    <div className="heatmap" ref={wrapperRef}>
      <div className="heatmap__axis" style={axisStyle}>
        <span />
        {years.map((year) => (
          <span key={year} className="heatmap__axis-label">
            {year}
          </span>
        ))}
      </div>
      <div className="heatmap__body">
        {data.map((row) => (
          <div key={row.state} className="heatmap__row" style={axisStyle}>
            <div className="heatmap__label">{row.state}</div>
            {row.values.map((entry) => {
              const value = entry.value;
              const hasValue = value != null;
              const background = hasValue ? colorScale(value) : "var(--panel-glow)";
              return (
                <div
                  key={`${row.state}-${entry.year}`}
                  className="heatmap__swatch"
                  style={{ background }}
                  title={
                    hasValue
                      ? `${row.state} in ${entry.year}: ${value.toLocaleString("en-US", {
                          maximumFractionDigits: 0
                        })} TWh`
                      : `No data for ${row.state} in ${entry.year}`
                  }
                  onMouseEnter={(event) => handleHover(event, row.state, entry.year, value)}
                  onMouseMove={(event) => handleHover(event, row.state, entry.year, value)}
                  onMouseLeave={handleLeave}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="heatmap__legend">
        <span>Lower</span>
        <span
          className="heatmap__legend-bar"
          style={{ background: "linear-gradient(90deg, #f0f9e8, #08589e)" }}
        />
        <span>Higher</span>
      </div>
      {tooltip ? (
        <div className="heatmap-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <div className="heatmap-tooltip__label">
            {tooltip.state} · {tooltip.year}
          </div>
          <div className="heatmap-tooltip__value">{tooltip.value ? `${formatter.format(tooltip.value)} TWh` : "No data"}</div>
        </div>
      ) : null}
    </div>
  );

  function handleHover(event, state, year, value) {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left + 12;
    const y = event.clientY - rect.top + 12;
    setTooltip({ state, year, value, x, y });
  }

  function handleLeave() {
    setTooltip(null);
  }
}
