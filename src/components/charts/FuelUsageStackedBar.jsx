import React, { useMemo, useRef, useState } from "react";

const STATE_COLORS = ["#60a5fa", "#34d399", "#f97316", "#a855f7", "#38bdf8", "#94a3b8"];

export default function FuelUsageStackedBar({ data }) {
  const [tooltip, setTooltip] = useState(null);
  const wrapperRef = useRef(null);

  const rows = useMemo(() => {
    if (!data || !data.length) return [];
    return data;
  }, [data]);

  const stateOrder = useMemo(() => {
    const order = [];
    rows.forEach((row) => {
      row.segments.forEach((segment) => {
        if (!order.includes(segment.state)) {
          order.push(segment.state);
        }
      });
    });
    return order;
  }, [rows]);

  const colorForState = (state) => {
    const idx = stateOrder.indexOf(state);
    return STATE_COLORS[idx % STATE_COLORS.length] || "var(--accent-soft)";
  };

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 0
      }),
    []
  );

  if (!rows.length) {
    return <div className="chart-hint">Not enough state data.</div>;
  }

  return (
    <div className="fuel-usage" ref={wrapperRef}>
      {rows.map((row) => (
        <div key={row.year} className="fuel-usage__row">
          <div className="fuel-usage__label">
            <div className="fuel-usage__label-pill">
              {row.year} · {formatter.format(row.total)} TWh
            </div>
          </div>
          <div className="fuel-usage__track">
            {row.segments.map((segment) => (
              <div
                key={`${row.year}-${segment.state}`}
                className="fuel-usage__segment"
                style={{
                  width: `${segment.share * 100}%`,
                  background: colorForState(segment.state)
                }}
                onMouseEnter={(event) => handleHover(event, row.year, segment)}
                onMouseMove={(event) => handleHover(event, row.year, segment)}
                onMouseLeave={handleLeave}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="fuel-usage__legend">
        {stateOrder.map((state) => (
          <span key={state} className="fuel-usage__legend-item">
            <span className="fuel-usage__legend-swatch" style={{ background: colorForState(state) }} />
            {state}
          </span>
        ))}
      </div>

      {tooltip ? (
        <div className="fuel-usage-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <div className="fuel-usage-tooltip__label">
            {tooltip.year} · {tooltip.state}
          </div>
          <div className="fuel-usage-tooltip__value">{formatter.format(tooltip.value)} TWh</div>
          <div className="fuel-usage-tooltip__share">{(tooltip.share * 100).toFixed(1)}% of year</div>
        </div>
      ) : null}
    </div>
  );

  function handleHover(event, year, segment) {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setTooltip({
      year,
      state: segment.state,
      value: segment.value,
      share: segment.share,
      x: event.clientX - rect.left + 12,
      y: event.clientY - rect.top - 12
    });
  }

  function handleLeave() {
    setTooltip(null);
  }
}
