import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useEnergyData } from "./hooks/useEnergyData.js";
import HeaderBar from "./components/layout/HeaderBar.jsx";
import FiltersBar from "./components/layout/FiltersBar.jsx";
import DashboardGrid from "./components/layout/DashboardGrid.jsx";
import KpiRow from "./components/charts/KpiRow.jsx";
import TrendLineChart from "./components/charts/TrendLineChart.jsx";
import ChoroplethMap from "./components/charts/ChoroplethMap.jsx";
import FuelMixDonutChart from "./components/charts/FuelMixDonutChart.jsx";
import SankeyChart from "./components/charts/SankeyChart.jsx";
import StateMomentumGauge from "./components/charts/StateMomentumGauge.jsx";
import HeatmapChart from "./components/charts/HeatmapChart.jsx";
import FuelUsageStackedBar from "./components/charts/FuelUsageStackedBar.jsx";
import AiQueryBar from "./components/ai/AiQueryBar.jsx";
import { fetchAndNormalize } from "./utils/queryApi.js";

const MSN_LOOKUP = {
  petroleum: "PATCB",
  gas: "NNTCB",
  nuclear: "NUETB"
};

export default function App() {
  const [themeMode, setThemeMode] = useState("dark");
  const [mapMetric, setMapMetric] = useState("total");
  const [mapRange, setMapRange] = useState({ start: 2015, end: 2020 });
  const [mapDataRemote, setMapDataRemote] = useState(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [distributionMetric, setDistributionMetric] = useState("total");
  const [distributionYear, setDistributionYear] = useState(2020);
  const [distributionDataRemote, setDistributionDataRemote] = useState(null);
  const [distributionLoading, setDistributionLoading] = useState(false);
  const [distributionError, setDistributionError] = useState(null);
  const [fuelMixYear, setFuelMixYear] = useState(null);
  const currentMapMsn = MSN_LOOKUP[mapMetric] || mapMetric;

  const {
    loading,
    error,
    kpiSummary,
    nationalTrend,
    nationalFuelTrend,
    stateSeries,
    sankeyData,
    mapData,
    filters,
    setFilters,
    compactSummaryForAI,
    fuelMixBreakdown,
    heatmapData,
    heatmapYears,
    heatmapMaxValue,
    topStateShare,
    stateMomentum
  } = useEnergyData();

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
  }, [themeMode]);

  useEffect(() => {
    async function loadMapSeries() {
      if (mapMetric === "total") {
        setMapDataRemote(null);
        setMapLoading(false);
        setMapError(null);
        return;
      }

      try {
        setMapLoading(true);
        setMapError(null);
        const msn = MSN_LOOKUP[mapMetric] || mapMetric;
        const result = await fetchAndNormalize({
          msn,
          yearStart: mapRange.start || undefined,
          yearEnd: mapRange.end || undefined,
          groupBy: "state"
        });
        setMapDataRemote(result.series.map((item) => ({ state: item.key, consumption: item.value })));
        setMapLoading(false);
      } catch (err) {
        setMapLoading(false);
        setMapError(err);
      }
    }

    loadMapSeries();
  }, [mapMetric, mapRange]);

  useEffect(() => {
    let cancelled = false;
    async function loadDistributionSeries() {
      if (distributionMetric === "total") {
        setDistributionDataRemote(null);
        setDistributionLoading(false);
        setDistributionError(null);
        return;
      }
      try {
        setDistributionLoading(true);
        setDistributionError(null);
        const msn = MSN_LOOKUP[distributionMetric] || distributionMetric;
        const result = await fetchAndNormalize({
          msn,
          yearStart: distributionYear || undefined,
          yearEnd: distributionYear || undefined,
          groupBy: "state"
        });
        if (cancelled) return;
        setDistributionDataRemote(result.series.map((item) => ({ state: item.key, value: item.value })));
        setDistributionLoading(false);
      } catch (err) {
        if (cancelled) return;
        setDistributionLoading(false);
        setDistributionError(err);
      }
    }

    loadDistributionSeries();
    return () => {
      cancelled = true;
    };
  }, [distributionMetric, distributionYear]);

  const handleToggleTheme = () => {
    setThemeMode((prev) => (prev === "dark" ? "light" : "dark"));
  };

  if (error) {
    return <div style={{ color: "tomato" }}>Error loading data: {error.message}</div>;
  }

  const aiContext = useMemo(() => {
    if (!kpiSummary) return null;
    const latestTrendPoint = nationalTrend?.length ? nationalTrend[nationalTrend.length - 1] : null;
    return {
      totalConsumption: kpiSummary.totalConsumption,
      yoy: kpiSummary.consumptionDeltaPct,
      topState: kpiSummary.highestState,
      topStates: stateSeries.slice(0, 5),
      topFiveShare: kpiSummary.topFiveShare,
      latestYear: latestTrendPoint?.year ?? null,
      latestNationalTotal: latestTrendPoint?.consumption ?? null
    };
  }, [kpiSummary, nationalTrend, stateSeries]);

  const aiEndpoint = import.meta.env.DEV ? "http://localhost:3001/api/ask" : "/api/ask";

  const remoteDistributionSeries = useMemo(() => {
    if (distributionMetric === "total") {
      return topStateShare;
    }
    if (!distributionDataRemote) return null;

    const sorted = [...distributionDataRemote].sort((a, b) => b.value - a.value);
    const selected = sorted.slice(0, Math.min(5, sorted.length));
    const total = sorted.reduce((sum, item) => sum + item.value, 0);
    if (!total) return [];

    const segments = selected.map((item) => ({
      state: item.state,
      value: item.value,
      share: item.value / total
    }));

    return [
      {
        year: distributionYear || "All years",
        total,
        segments
      }
    ];
  }, [distributionMetric, distributionDataRemote, distributionYear, topStateShare]);

  const fuelMixYearOptions = useMemo(
    () => nationalFuelTrend.map((entry) => entry.year),
    [nationalFuelTrend]
  );

  useEffect(() => {
    if (!fuelMixYearOptions.length) return;
    if (!fuelMixYear || !fuelMixYearOptions.includes(fuelMixYear)) {
      setFuelMixYear(fuelMixYearOptions[fuelMixYearOptions.length - 1]);
    }
  }, [fuelMixYearOptions, fuelMixYear]);

  const fuelMixDataForYear = useMemo(() => {
    if (!fuelMixYear) return fuelMixBreakdown;
    const target = nationalFuelTrend.find((entry) => entry.year === fuelMixYear);
    if (!target) return fuelMixBreakdown;
    const sum = Object.entries(target)
      .filter(([key]) => key !== "year")
      .reduce((acc, [, value]) => acc + (value ?? 0), 0);
    if (!sum) return fuelMixBreakdown;
    return Object.entries(target)
      .filter(([key]) => key !== "year")
      .map(([name, value]) => ({
        name,
        value,
        share: value && sum ? value / sum : 0
      }));
  }, [fuelMixYear, nationalFuelTrend, fuelMixBreakdown]);

  const handleAiActions = useCallback(
    (actions) => {
      actions.forEach((action) => {
        if (action.type === "setTheme" && (action.value === "dark" || action.value === "light")) {
          setThemeMode(action.value);
        } else if (action.type === "setYear") {
          setFilters((prev) => ({ ...prev, year: action.value ?? null }));
        } else if (action.type === "setMapMetric") {
          setMapMetric(action.value);
        } else if (action.type === "setMapRange" && action.value) {
          setMapRange((prev) => ({
            start: action.value.start ?? prev.start,
            end: action.value.end ?? prev.end
          }));
        } else if (action.type === "setDistributionMetric") {
          setDistributionMetric(action.value);
        } else if (action.type === "setDistributionYear") {
          setDistributionYear(action.value ?? null);
        } else if (action.type === "setFuelMixYear") {
          setFuelMixYear(action.value ?? null);
        }
      });
    },
    [setFilters]
  );

  return (
    <>
      <HeaderBar
        subtitle="Combined: SEDS state + MER national"
        themeMode={themeMode}
        onToggleTheme={handleToggleTheme}
      />
      <FiltersBar filters={filters} setFilters={setFilters} />
      <AiQueryBar context={aiContext} endpoint={aiEndpoint} onActions={handleAiActions} />

      <DashboardGrid>
        <div style={{ gridColumn: "1 / -1" }}>
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">Key Indicators</div>
              <span className="panel-badge">Combined</span>
            </div>
            <div className="panel-body">
              {loading ? <span>Loading…</span> : <KpiRow kpi={kpiSummary} />}
            </div>
          </div>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <div className="panel-group panel-group--three">
            <div className="panel panel--chart">
              <div className="panel-header">
                <div className="panel-title">National Trend</div>
                <span className="panel-badge">MER Table 1.1</span>
              </div>
              <div className="panel-body">
                <TrendLineChart data={nationalFuelTrend} themeMode={themeMode} />
              </div>
            </div>

            <div className="panel panel--map">
              <div className="panel-header">
                <div className="panel-title">Consumption by State</div>
                <span className="panel-badge">SEDS</span>
                <div className="map-toggle">
                  <button
                    type="button"
                    className={mapMetric === "total" ? "active" : ""}
                    onClick={() => setMapMetric("total")}
                  >
                    Total
                  </button>
                  <button
                    type="button"
                    className={mapMetric === "petroleum" ? "active" : ""}
                    onClick={() => setMapMetric("petroleum")}
                  >
                    Petroleum (PATCB)
                  </button>
                  <button
                    type="button"
                    className={mapMetric === "gas" ? "active" : ""}
                    onClick={() => setMapMetric("gas")}
                  >
                    Natural Gas (NNTCB)
                  </button>
                  <button
                    type="button"
                    className={mapMetric === "nuclear" ? "active" : ""}
                    onClick={() => setMapMetric("nuclear")}
                  >
                    Nuclear (NUETB)
                  </button>
                </div>
              </div>
              <div className="panel-body">
                {mapMetric === "total" ? (
                  <ChoroplethMap data={mapData} />
                ) : (
                  <>
                    <div className="map-range">
                      <span>Years</span>
                      <input
                        type="number"
                        value={mapRange.start ?? ""}
                        onChange={(e) =>
                          setMapRange((prev) => ({
                            ...prev,
                            start: e.target.value ? Number(e.target.value) : null
                          }))
                        }
                      />
                      <span>–</span>
                      <input
                        type="number"
                        value={mapRange.end ?? ""}
                        onChange={(e) =>
                          setMapRange((prev) => ({
                            ...prev,
                            end: e.target.value ? Number(e.target.value) : null
                          }))
                        }
                      />
                    </div>
                    {mapLoading ? (
                      <div className="map-hint">Loading MSN data…</div>
                    ) : mapError ? (
                      <div className="map-hint" style={{ color: "tomato" }}>{mapError.message}</div>
                    ) : (
                      <ChoroplethMap
                        data={mapDataRemote ?? []}
                        hint={`MSN ${currentMapMsn} ${
                          mapRange.start || mapRange.end
                            ? `(${mapRange.start || "all"} – ${mapRange.end || "all"})`
                            : ""
                        }`}
                      />
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">Fuel Mix</div>
                <span className="panel-badge">MER derived</span>
              </div>
              <div className="panel-body">
                <div className="distribution-controls" style={{ marginBottom: 6 }}>
                  <span>Year</span>
                  <select value={fuelMixYear ?? ""} onChange={(e) => setFuelMixYear(Number(e.target.value))}>
                    {fuelMixYearOptions.map((yearOption) => (
                      <option key={yearOption} value={yearOption}>
                        {yearOption}
                      </option>
                    ))}
                  </select>
                </div>
                <FuelMixDonutChart key={fuelMixYear || "latest"} data={fuelMixDataForYear} />
              </div>
            </div>

          </div>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <div className="panel-group panel-group--two">
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">Flows</div>
                <span className="panel-badge">Fuel → Sector → Use</span>
              </div>
              <div className="panel-body">
                <SankeyChart data={sankeyData} themeMode={themeMode} />
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">State Momentum Gauge</div>
                <span className="panel-badge">Top 5 · YoY</span>
              </div>
              <div className="panel-body">
                <StateMomentumGauge data={stateMomentum} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <div className="panel-group panel-group--two">
            <div className="panel panel--heatmap">
              <div className="panel-header">
                <div className="panel-title">High-Level Patterns</div>
                <span className="panel-badge">State heatmap</span>
              </div>
              <div className="panel-body">
                <HeatmapChart data={heatmapData} years={heatmapYears} maxValue={heatmapMaxValue} />
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">State Distribution</div>
                <span className="panel-badge">Fuel → Uses</span>
                <div className="map-toggle">
                  <button
                    type="button"
                    className={distributionMetric === "total" ? "active" : ""}
                    onClick={() => setDistributionMetric("total")}
                  >
                    Total
                  </button>
                  <button
                    type="button"
                    className={distributionMetric === "petroleum" ? "active" : ""}
                    onClick={() => setDistributionMetric("petroleum")}
                  >
                    Petroleum (PATCB)
                  </button>
                  <button
                    type="button"
                    className={distributionMetric === "gas" ? "active" : ""}
                    onClick={() => setDistributionMetric("gas")}
                  >
                    Natural Gas (NNTCB)
                  </button>
                </div>
              </div>
              <div className="panel-body">
                {distributionMetric !== "total" ? (
                  <div className="distribution-controls">
                    <span>Year</span>
                    <input
                      type="number"
                      value={distributionYear ?? ""}
                      onChange={(e) => setDistributionYear(e.target.value ? Number(e.target.value) : null)}
                    />
                    <button type="button" onClick={() => setDistributionYear(null)}>
                      All
                    </button>
                  </div>
                ) : null}
                {distributionMetric === "total" ? (
                  <FuelUsageStackedBar data={topStateShare} />
                ) : distributionLoading ? (
                  <div className="map-hint">Loading state distribution…</div>
                ) : distributionError ? (
                  <div className="map-hint" style={{ color: "tomato" }}>{distributionError.message}</div>
                ) : remoteDistributionSeries ? (
                  <FuelUsageStackedBar data={remoteDistributionSeries} />
                ) : (
                  <div className="map-hint">No data for that selection.</div>
                )}
              </div>
            </div>
          </div>
        </div>

      </DashboardGrid>
    </>
  );
}
