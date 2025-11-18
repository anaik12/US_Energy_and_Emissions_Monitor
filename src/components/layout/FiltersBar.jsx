
import React from "react";

export default function FiltersBar({ filters, setFilters, mode }) {
  const onStartYearChange = (e) => {
    const v = e.target.value ? Number(e.target.value) : null;
    setFilters((prev) => ({ ...prev, startYear: v }));
  };

  const onEndYearChange = (e) => {
    const v = e.target.value ? Number(e.target.value) : null;
    setFilters((prev) => ({ ...prev, endYear: v }));
  };

  const onYearChangeSingle = (e) =>
    setFilters((prev) => ({ ...prev, year: e.target.value ? Number(e.target.value) : null }));
  if (mode === "national") {
    return (
      <div className="panel" style={{ marginBottom: 16, padding: "8px 12px" }}>
        <div className="filters-bar">
          <span className="filters-label">Year range</span>
          <input
            type="number"
            placeholder="Start"
            value={filters.startYear ?? ""}
            onChange={onStartYearChange}
            style={{ width: 80 }}
          />
          <input
            type="number"
            placeholder="End"
            value={filters.endYear ?? ""}
            onChange={onEndYearChange}
            style={{ width: 80 }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="panel" style={{ marginBottom: 16, padding: "8px 12px" }}>
      <div className="filters-bar">
        <span className="filters-label">Filters</span>

        <select value={filters.year ?? ""} onChange={onYearChangeSingle}>
          <option value="">All Years</option>
          <option value="2000">2000+</option>
          <option value="2010">2010+</option>
          <option value="2020">2020+</option>
        </select>

        <span className="filters-label">State view: Top 5</span>
      </div>
    </div>
  );
}
