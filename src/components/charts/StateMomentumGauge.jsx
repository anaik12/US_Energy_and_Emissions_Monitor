import React from "react";

export default function StateMomentumGauge({ data }) {
  if (!data || !data.length) {
    return <div className="chart-hint">Top state trajectories will appear here.</div>;
  }

  const formatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  const deltaFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0, signDisplay: "always" });
  const pctFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, signDisplay: "always" });

  return (
    <div className="momentum-grid">
      {data.map((item) => (
        <div key={item.state} className="momentum-card">
          <div className="momentum-card__header">
            <div>
              <span className="momentum-card__state">{item.state}</span>
              <span className="momentum-card__years">
                {item.prevYear} → {item.latestYear}
              </span>
            </div>
            <div className="momentum-card__value">{formatter.format(item.value)} TWh</div>
          </div>
          <div className={`momentum-card__delta momentum-card__delta--${item.trend}`}>
            {deltaFormatter.format(item.delta)} TWh{" "}
            {item.deltaPct != null ? `(${pctFormatter.format(item.deltaPct)}%)` : ""}
          </div>
          <div className="momentum-card__bar">
            <span style={{ width: `${Math.min(1, Math.max(0, item.fill)) * 100}%` }} />
          </div>
          <div className="momentum-card__footer">
            Prev: {formatter.format(item.prevValue)} TWh
          </div>
        </div>
      ))}
    </div>
  );
}
