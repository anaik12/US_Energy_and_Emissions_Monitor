import React, { useMemo, useState } from "react";

const DEFAULT_ENDPOINT = "/api/ask";

export default function AiQueryBar({ context, endpoint = DEFAULT_ENDPOINT, onActions }) {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 1
      }),
    []
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    const prompt = query.trim();
    if (!prompt) return;
    setStatus("loading");
    setError(null);
    setResponse("");

    const summary = formatContextSummary(context, formatter);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query: prompt, contextSummary: summary })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with ${res.status}`);
      }

      const data = await res.json();
      setResponse(data.answer || "No response returned.");
      if (onActions) {
        const actions = detectActions(prompt);
        if (actions.length) onActions(actions);
      }
      setStatus("done");
    } catch (err) {
      const fallback = buildInsight(prompt, summary);
      if (fallback) {
        setResponse(`${fallback} (local insight)`);
        setStatus("fallback");
        if (onActions) {
          const actions = detectActions(prompt);
          if (actions.length) onActions(actions);
        }
      } else {
        setError(err.message || "Unable to generate a response.");
        setStatus("error");
      }
    }
  };

  return (
    <div className="panel ai-query">
      <form className="ai-query__form" onSubmit={handleSubmit}>
        <div className="ai-query__meta">
          <span className="ai-query__label">Ask AI</span>
          <span className="ai-query__hint">Local insight</span>
        </div>
        <div className="ai-query__controls">
          <input
            type="text"
            placeholder="Ask about trends, top states, shares…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit">Ask</button>
        </div>
      </form>
      {status === "loading" ? (
        <div className="ai-query__response ai-query__response--pending">
          <p>Thinking… crunching the latest filters and data slice.</p>
        </div>
      ) : null}
      {error ? (
        <div className="ai-query__response ai-query__response--error">
          <p>{error}</p>
        </div>
      ) : null}
      {response && !error ? (
        <div className="ai-query__response">
          <p>{response}</p>
        </div>
      ) : null}
    </div>
  );
}

function formatContextSummary(context, formatter) {
  if (!context) return "";
  const parts = [];
  const formatValue = (val) => `${formatter.format(val || 0)} TWh`;

  parts.push(`Total consumption: ${formatValue(context.totalConsumption)}.`);
  if (context.latestYear && context.latestNationalTotal != null) {
    parts.push(
      `Latest MER year ${context.latestYear} total: ${formatValue(context.latestNationalTotal)}.`
    );
  }
  if (context.yoy != null) {
    parts.push(`YoY change: ${formatter.format(context.yoy)}%.`);
  }
  if (context.topState) {
    parts.push(
      `Top state: ${context.topState.state} at ${formatValue(context.topState.consumption)}.`
    );
  }
  if (context.topFiveShare != null) {
    parts.push(`Top five share: ${(context.topFiveShare * 100).toFixed(1)}%.`);
  }
  if (context.topStates?.length) {
    const list = context.topStates.map((s) => `${s.state} (${formatValue(s.consumption)})`).join(", ");
    parts.push(`Top states detail: ${list}.`);
  }
  parts.push(
    "Dashboard controls: choropleth/state stacked bar can switch between total, petroleum (PATCB), and natural gas (NNTCB) with custom year ranges; fuel mix donut can jump to any MER year. Assume these visual states can be updated as requested."
  );
  return parts.join(" ");
}

function buildInsight(prompt, summary) {
  if (!summary) {
    return "Not enough data to answer yet.";
  }

  const normalized = prompt.toLowerCase();
  return `Based on the dashboard data: ${summary}`;
}

function detectActions(prompt) {
  const actions = [];
  const normalized = prompt.toLowerCase();
  const mentionsMap = normalized.includes("map") || normalized.includes("choropleth");
  const mentionsDistribution = normalized.includes("distribution") || normalized.includes("stacked");
  const mentionsDonut = normalized.includes("donut") || normalized.includes("doughnut") || normalized.includes("ring chart");
  const mentionsFuelMix = normalized.includes("fuel mix") || normalized.includes("mix chart") || mentionsDonut;
  const mentionsPetroleum = normalized.includes("petroleum") || normalized.includes("oil");
  const mentionsGas = normalized.includes("natural gas") || normalized.includes("gas");
  const mentionsNuclear = normalized.includes("nuclear");
  const mentionsTotal = normalized.includes("total") || normalized.includes("all fuels");

  if (normalized.includes("dark mode") || normalized.includes("dark theme")) {
    actions.push({ type: "setTheme", value: "dark" });
  } else if (normalized.includes("light mode") || normalized.includes("light theme")) {
    actions.push({ type: "setTheme", value: "light" });
  }

  if (normalized.includes("all years")) {
    actions.push({ type: "setYear", value: null });
    actions.push({ type: "setDistributionYear", value: null });
    actions.push({ type: "setMapRange", value: { start: null, end: null } });
  }

  const yearMatch = normalized.match(/(19|20)\d{2}/);
  if (yearMatch) {
    const yearValue = Number(yearMatch[0]);
    actions.push({ type: "setYear", value: yearValue });
    actions.push({ type: "setDistributionYear", value: yearValue });
    actions.push({ type: "setMapRange", value: { start: yearValue, end: yearValue } });
  }

  if (mentionsMap) {
    if (mentionsPetroleum) {
      actions.push({ type: "setMapMetric", value: "petroleum" });
    } else if (mentionsGas) {
      actions.push({ type: "setMapMetric", value: "gas" });
    } else if (mentionsNuclear) {
      actions.push({ type: "setMapMetric", value: "nuclear" });
    } else if (mentionsTotal) {
      actions.push({ type: "setMapMetric", value: "total" });
    }
  } else if ((mentionsPetroleum || mentionsGas || mentionsNuclear) && !mentionsFuelMix && mentionsDistribution) {
    // When a fuel-specific distribution is requested, mirror it on the map for clarity.
    const metricValue = mentionsPetroleum ? "petroleum" : mentionsGas ? "gas" : "nuclear";
    actions.push({ type: "setMapMetric", value: metricValue });
  }

  if (mentionsDistribution) {
    if (mentionsPetroleum && !mentionsFuelMix) {
      actions.push({ type: "setDistributionMetric", value: "petroleum" });
    } else if (mentionsGas && !mentionsFuelMix) {
      actions.push({ type: "setDistributionMetric", value: "gas" });
    } else if (mentionsTotal) {
      actions.push({ type: "setDistributionMetric", value: "total" });
    }
  }

  if (mentionsFuelMix) {
    const yearHint = normalized.match(/(19|20)\d{2}/);
    if (yearHint) {
      actions.push({ type: "setFuelMixYear", value: Number(yearHint[0]) });
    } else if (normalized.includes("latest") || normalized.includes("current")) {
      actions.push({ type: "setFuelMixYear", value: null });
    }
  }

  return actions;
}
