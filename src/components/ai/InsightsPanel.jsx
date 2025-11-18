import React from "react";
import { useAiInsights } from "../../hooks/useAiInsights.js";

export default function InsightsPanel({ summaryPayload, loading }) {
  const { insights, loading: aiLoading, error } = useAiInsights(summaryPayload);

  if (loading) return <div className="insights-hint">Waiting for data…</div>;
  if (aiLoading) return <div className="insights-hint">Generating insights…</div>;
  if (error) return <div className="insights-error">AI error: {error.message}</div>;

  if (!insights) {
    return <div className="insights-hint">No insights yet.</div>;
  }

  return (
    <div
      className="insights-body"
      dangerouslySetInnerHTML={{ __html: insights }}
    />
  );
}
