import React, { useMemo } from "react";

export default function KpiRow({ kpi }) {
  if (!kpi) return <div>No data for selected filters.</div>;

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 1
      }),
    []
  );

  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 1
      }),
    []
  );

  const yoy = kpi.consumptionDeltaPct;
  const yoyArrow = yoy == null ? "" : yoy > 0 ? "▲" : yoy < 0 ? "▼" : "→";
  const yoyColor =
    yoy == null ? "#9ca3af" : yoy > 0 ? "#4ade80" : yoy < 0 ? "#f97373" : "#9ca3af";

  const topFiveSharePct = kpi.topFiveShare == null ? null : kpi.topFiveShare * 100;

  const formatValue = (value) =>
    value == null ? "n/a" : `${numberFormatter.format(value)} TWh`;

  return (
    <div className="kpi-row kpi-row--compact">
      <div className="kpi-card">
        <div className="kpi-label">Total Consumption</div>
        <div className="kpi-value">{formatValue(kpi.totalConsumption)}</div>
        <div className="kpi-delta">Combined SEDS + MER</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-label">YoY Change (%)</div>
        <div className="kpi-value" style={{ color: yoyColor }}>
          {yoy == null ? "n/a" : `${yoyArrow} ${percentFormatter.format(yoy)}%`}
        </div>
        <div className="kpi-delta">vs previous year</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-label">Highest Consuming State</div>
        <div className="kpi-value">{kpi.highestState?.state || "n/a"}</div>
        <div className="kpi-delta">
          {kpi.highestState ? `${numberFormatter.format(kpi.highestState.consumption)} TWh` : "—"}
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-label">Top 5 States Share</div>
        <div className="kpi-value">
          {topFiveSharePct == null ? "n/a" : `${percentFormatter.format(topFiveSharePct)}%`}
        </div>
        <div className="kpi-delta">of national total</div>
      </div>

      <div className="kpi-card kpi-card--source">
        <div className="kpi-label">Source</div>
        <div className="kpi-value kpi-value--inline">
          <span className="kpi-source-pill">SEDS</span>
          <span className="kpi-source-pill">MER</span>
        </div>
      </div>
    </div>
  );
}
