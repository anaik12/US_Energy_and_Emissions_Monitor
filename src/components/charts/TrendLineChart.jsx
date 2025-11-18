import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { getFuelColor } from "./chartColors.js";

export default function TrendLineChart({ data, themeMode }) {
  const wrapperRef = useRef(null);
  const chartRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 1
      }),
    []
  );

  const fuelKeys = useMemo(() => {
    if (!data || !data.length) return [];
    return Object.keys(data[0]).filter((key) => key !== "year");
  }, [data]);

  useEffect(() => {
    const container = chartRef.current;
    const wrapper = wrapperRef.current;
    if (!container || !data || !data.length || !fuelKeys.length) return;

    const styles = getComputedStyle(document.documentElement);
    const gridColor = styles.getPropertyValue("--chart-grid").trim() || "#e5e7eb";
    const axisColor = styles.getPropertyValue("--chart-axis").trim() || "#64748b";

    const width = container.clientWidth || 300;
    const height = container.clientHeight || 220;

    d3.select(container).selectAll("*").remove();
    setTooltip(null);

    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const margin = { top: 10, right: 16, bottom: 24, left: 40 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleLinear()
      .domain(d3.extent(data, (d) => d.year))
      .range([0, innerW]);

    const yMax =
      d3.max(data, (d) => d3.max(fuelKeys, (key) => d[key] ?? 0)) || 0;

    const y = d3
      .scaleLinear()
      .domain([0, yMax * 1.05])
      .nice()
      .range([innerH, 0]);

    g.append("g")
      .attr("stroke", gridColor)
      .attr("stroke-opacity", 0.5)
      .call((g) =>
        g
          .selectAll("line")
          .data(y.ticks())
          .join("line")
          .attr("x1", 0)
          .attr("x2", innerW)
          .attr("y1", (d) => y(d))
          .attr("y2", (d) => y(d))
      );

    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .attr("color", axisColor)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("d")));

    g.append("g")
      .attr("color", axisColor)
      .call(d3.axisLeft(y).ticks(4));

    const lineGenerator = d3
      .line()
      .x((d) => x(d.year))
      .curve(d3.curveMonotoneX);

    const series = fuelKeys.map((key) => ({
      key,
      values: data.map((d) => ({ year: d.year, value: d[key] ?? 0 }))
    }));

    const lines = g.append("g");

    lines
      .selectAll("path")
      .data(series)
      .join("path")
      .attr("fill", "none")
      .attr("stroke", (d) => getFuelColor(d.key))
      .attr("stroke-width", 1.8)
      .attr("d", (d) => lineGenerator.y((val) => y(val.value))(d.values));

    const focusLine = g
      .append("line")
      .attr("class", "focus-line")
      .attr("y1", 0)
      .attr("y2", innerH)
      .attr("stroke", axisColor)
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3")
      .style("display", "none");

    const bisect = d3.bisector((d) => d.year).center;
    const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

    const overlay = g
      .append("rect")
      .attr("width", innerW)
      .attr("height", innerH)
      .attr("fill", "transparent")
      .style("cursor", "crosshair");

    overlay
      .on("mouseenter", () => {
        focusLine.style("display", null);
      })
      .on("mousemove", (event) => {
        const [mouseX] = d3.pointer(event);
        const yearValue = x.invert(mouseX);
        const idx = bisect(data, yearValue);
        const clampedIdx = clamp(idx, 0, data.length - 1);
        const point = data[clampedIdx];
        const px = x(point.year);

        focusLine.attr("transform", `translate(${px},0)`);

        const tooltipWidth = 210;
        const tooltipHeight = 120;
        const wrapperRect = wrapper?.getBoundingClientRect();
        const widthLimit = wrapperRect?.width ?? width;
        const heightLimit = wrapperRect?.height ?? height;
        const breakdown = fuelKeys.map((key) => ({
          key,
          value: point[key] ?? 0
        }));

        const total = breakdown.reduce((sum, item) => sum + item.value, 0);

        const left = clamp(margin.left + px + 12, 0, widthLimit - tooltipWidth);
        const top = clamp(
          margin.top + innerH / 2 - tooltipHeight / 2,
          0,
          heightLimit - tooltipHeight
        );

        setTooltip({
          year: point.year,
          breakdown,
          total,
          x: left,
          y: top
        });
      })
      .on("mouseleave", () => {
        focusLine.style("display", "none");
        setTooltip(null);
      });
  }, [data, themeMode, formatter, fuelKeys]);

  if (!data || !data.length) {
    return <div className="chart-hint">No trend data.</div>;
  }

  return (
    <div className="linechart-wrapper" ref={wrapperRef}>
      <div ref={chartRef} className="linechart-canvas" />
      <div className="chart-legend">
        {fuelKeys.map((key) => (
          <span key={key} className="chart-legend__item">
            <span
              className="chart-legend__swatch"
              style={{ backgroundColor: getFuelColor(key) }}
            />
            {key}
          </span>
        ))}
      </div>
      {tooltip ? (
        <div className="chart-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <div className="chart-tooltip__title">Year {tooltip.year}</div>
          <div className="chart-tooltip__value">{formatter.format(tooltip.total)} TWh total</div>
          <div className="chart-tooltip__breakdown">
            {tooltip.breakdown.map((item) => (
              <div key={item.key} className="chart-tooltip__row">
                <span>{item.key}</span>
                <strong>{formatter.format(item.value)} TWh</strong>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
