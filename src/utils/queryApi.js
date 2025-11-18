const API_BASE = import.meta.env?.DEV ? "http://localhost:3001" : "";

/**
 * Fetch aggregated SEDS data from the backend.
 *
 * @param {Object} params
 * @param {string} params.msn - SEDS MSN code (e.g., PATCB, NNTCB)
 * @param {string=} params.state - Optional state abbreviation filter
 * @param {number=} params.yearStart - Optional start year
 * @param {number=} params.yearEnd - Optional end year
 * @param {"state"|"year"=} params.groupBy - How to group the aggregates (default "state")
 * @returns {Promise<{results: Array<{key: string, value: number}>, count: number, grouping: string, msn: string, state: string|null, yearStart: number|null, yearEnd: number|null}>}
 */
export async function fetchSedsAggregate(params) {
  if (!params?.msn) {
    throw new Error("fetchSedsAggregate requires an 'msn' parameter.");
  }

  const response = await fetch(`${API_BASE}/api/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      groupBy: "state",
      ...params
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Query request failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Convenience helper that normalizes the backend response into chart-friendly data.
 */
export async function fetchAndNormalize(params) {
  const data = await fetchSedsAggregate(params);
  return {
    meta: {
      count: data.count,
      grouping: data.grouping,
      msn: data.msn,
      state: data.state,
      yearStart: data.yearStart,
      yearEnd: data.yearEnd
    },
    series: data.results.map((item) => ({
      key: item.key,
      value: item.value
    }))
  };
}
