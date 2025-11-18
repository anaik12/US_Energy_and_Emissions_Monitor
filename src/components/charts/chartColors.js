export const FUEL_COLORS = {
  "Petroleum & liquids": "#f97316",
  "Natural gas": "#0ea5e9",
  Coal: "#475569",
  Nuclear: "#a855f7",
  Renewables: "#22c55e"
};

export const FALLBACK_FUEL_COLOR = "#94a3b8";

export function getFuelColor(name) {
  return FUEL_COLORS[name] || FALLBACK_FUEL_COLOR;
}
