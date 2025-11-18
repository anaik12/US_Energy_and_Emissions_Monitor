import React, { useEffect, useMemo, useRef, useState } from "react";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";
import * as d3 from "d3";

const COLOR_PALETTE = ["#60a5fa", "#34d399", "#f59e0b", "#c084fc"];

export default function SankeyChart({ data, themeMode }) {
  const wrapperRef = useRef(null);
  const ref = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const tooltipFormatter = useMemo(
    () => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }),
    []
  );
  const sankeyData = useMemo(() => {
    if (!data || !data.nodes || !data.links) return null;
    return {
      nodes: data.nodes.map((n) => ({ ...n })),
      links: data.links.map((l) => ({ ...l }))
    };
  }, [data]);

  useEffect(() => {
    const container = ref.current;
    if (!container || !sankeyData) return;
    setTooltip(null);

    const width = container.clientWidth || 560;
    const height = 320;

    d3.select(container).selectAll("*").remove();

    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const sankeyGenerator = sankey()
      .nodeId((d) => d.name)
      .nodeWidth(12)
      .nodePadding(18)
      .extent([
        [20, 10],
        [width - 20, height - 10]
      ]);

    const { nodes, links } = sankeyGenerator(sankeyData);
    const linkPath = sankeyLinkHorizontal();

    const colorScale = d3
      .scaleOrdinal()
      .domain([0, 1, 2, 3, 4])
      .range(COLOR_PALETTE);

    svg
      .append("g")
      .selectAll("path")
      .data(links)
      .join("path")
      .attr("d", linkPath)
      .attr("fill", "none")
      .attr("stroke", (d) => colorScale(d.source.depth ?? 0))
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", (d) => Math.max(1, d.width))
      .attr("class", "sankey-link")
      .on("mousemove", (event, link) => {
        const bounds = wrapperRef.current?.getBoundingClientRect();
        const tooltipWidth = 200;
        const tooltipHeight = 70;
        const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
        const left = bounds
          ? clamp(event.clientX - bounds.left + 12, 0, bounds.width - tooltipWidth)
          : event.clientX;
        const top = bounds
          ? clamp(event.clientY - bounds.top - tooltipHeight / 2, 0, bounds.height - tooltipHeight)
          : event.clientY;

        setTooltip({
          source: link.source.name,
          target: link.target.name,
          value: link.value,
          x: left,
          y: top
        });
      })
      .on("mouseleave", () => setTooltip(null));

    const nodeGroup = svg.append("g").selectAll("g").data(nodes).join("g");

    nodeGroup
      .append("rect")
      .attr("x", (d) => d.x0)
      .attr("y", (d) => d.y0)
      .attr("height", (d) => Math.max(2, d.y1 - d.y0))
      .attr("width", (d) => d.x1 - d.x0)
      .attr("fill", (d) => colorScale(d.depth ?? 0))
      .attr("fill-opacity", 0.9)
      .attr("stroke", "var(--accent-strong)")
      .attr("stroke-width", 1.2)
      .attr("rx", 6);

    nodeGroup
      .append("text")
      .attr("x", (d) => (d.x0 < width / 2 ? d.x1 + 8 : d.x0 - 8))
      .attr("y", (d) => (d.y0 + d.y1) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", (d) => (d.x0 < width / 2 ? "start" : "end"))
      .attr("font-size", 12)
      .attr("fill", "var(--text-main)")
      .text((d) => `${d.name} (${tooltipFormatter.format(Math.round(d.value || 0))} TWh)`);
  }, [sankeyData, tooltipFormatter, themeMode]);

  if (!sankeyData) {
    return <div className="chart-hint">No flow data.</div>;
  }

  return (
    <div className="sankey-wrapper" ref={wrapperRef}>
      <div ref={ref} className="sankey-canvas" />
      <div className="chart-hint">Fuel → sector → end-use energy flows (illustrative shares).</div>
      {tooltip ? (
        <div className="chart-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <div className="chart-tooltip__title">
            {tooltip.source} → {tooltip.target}
          </div>
          <div className="chart-tooltip__value">
            {tooltipFormatter.format(Math.round(tooltip.value))} TWh
          </div>
        </div>
      ) : null}
    </div>
  );
}
