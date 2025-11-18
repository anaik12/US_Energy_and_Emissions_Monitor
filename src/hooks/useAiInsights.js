import { useEffect, useState } from "react";

export function useAiInsights(summaryPayload) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!summaryPayload) return;
    setLoading(true);
    setError(null);

    const handle = setTimeout(() => {
      try {
        const { kpi, topStates, filters } = summaryPayload;

        const filterTextParts = [];
        if (filters.year) filterTextParts.push(`Year: ${filters.year}`);
        if (filters.sector) filterTextParts.push(`Sector: ${filters.sector}`);
        const filterText = filterTextParts.length ? filterTextParts.join(" · ") : "All years & sectors";

        const topStatesText = topStates && topStates.length
          ? topStates.map((s, i) => `${i + 1}. ${s.state} (${s.consumption.toFixed(1)} TWh)`).join("<br/>")
          : "Not enough data to rank states.";

        const delta = kpi.consumptionDeltaPct || 0;
        const direction = delta > 0 ? "an increase" : delta < 0 ? "a decrease" : "no material change";

        const html = `
          <strong>Overview</strong><br/>
          Filters applied: ${filterText}.<br/>
          Total consumption is <strong>${kpi.totalConsumption.toFixed(1)} TWh</strong> across <strong>${kpi.stateCount}</strong> states,
          with ${direction} in the latest year compared with the previous one (~${delta.toFixed(1)}%).<br/><br/>
          <strong>Top States by Consumption</strong><br/>
          ${topStatesText}<br/><br/>
          <strong>Story to tell</strong><br/>
          • Use the trend chart to show whether demand is generally rising or stabilizing.<br/>
          • Highlight the highest‑consuming states and invite discussion on drivers (population, climate, industry mix).<br/>
          • Connect the Sankey card to the emissions KPI to discuss efficiency and decarbonization opportunities.
        `;

        setInsights(html.trim());
        setLoading(false);
      } catch (e) {
        setError(e);
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(handle);
  }, [summaryPayload]);

  return { insights, loading, error };
}
