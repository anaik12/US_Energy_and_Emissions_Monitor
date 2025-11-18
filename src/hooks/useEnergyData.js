
import { useEffect, useMemo, useState } from "react";
import { ENERGY_DATA_SEDS, NATIONAL_ENERGY_DATA } from "../data/energyData.js";
import {
  DEFAULT_PETROLEUM_SHARE,
  PETROLEUM_SHARE_BY_STATE
} from "../data/petroleumShares.js";
import { csvParse } from "d3-dsv";

const FUEL_MIX = [
  { name: "Petroleum & liquids", share: 0.36 },
  { name: "Natural gas", share: 0.32 },
  { name: "Coal", share: 0.11 },
  { name: "Nuclear", share: 0.08 },
  { name: "Renewables", share: 0.13 }
];

const FUEL_TO_SECTOR = {
  "Petroleum & liquids": [
    { name: "Transportation", share: 0.65 },
    { name: "Industrial", share: 0.25 },
    { name: "Commercial", share: 0.1 }
  ],
  "Natural gas": [
    { name: "Electric power", share: 0.45 },
    { name: "Industrial", share: 0.3 },
    { name: "Residential", share: 0.15 },
    { name: "Commercial", share: 0.1 }
  ],
  Coal: [
    { name: "Electric power", share: 0.88 },
    { name: "Industrial", share: 0.12 }
  ],
  Nuclear: [{ name: "Electric power", share: 1 }],
  Renewables: [
    { name: "Electric power", share: 0.55 },
    { name: "Industrial", share: 0.15 },
    { name: "Commercial", share: 0.1 },
    { name: "Residential", share: 0.2 }
  ]
};

const SECTOR_TO_USE = {
  Transportation: [
    { name: "Passenger travel", share: 0.7 },
    { name: "Freight & logistics", share: 0.3 }
  ],
  Industrial: [
    { name: "Manufacturing", share: 0.6 },
    { name: "Resource extraction", share: 0.4 }
  ],
  Commercial: [
    { name: "Services", share: 0.7 },
    { name: "Buildings", share: 0.3 }
  ],
  Residential: [
    { name: "Heating & cooling", share: 0.6 },
    { name: "Appliances", share: 0.4 }
  ],
  "Electric power": [
    { name: "Grid supply", share: 0.8 },
    { name: "Distributed", share: 0.2 }
  ]
};

const FUEL_TRENDS = {
  "Petroleum & liquids": -0.001,
  "Natural gas": 0.0008,
  Coal: -0.0009,
  Nuclear: -0.0002,
  Renewables: 0.0013
};

export function useEnergyData() {
  const [filters, setFilters] = useState({
    year: null
  });
  const [fullSedsData, setFullSedsData] = useState([]);
  const [fullSedsLoading, setFullSedsLoading] = useState(true);
  const [fullSedsError, setFullSedsError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadFullDataset() {
      try {
        const url = new URL("../data/Complete_SEDS.csv", import.meta.url);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to load Complete_SEDS.csv (${response.status})`);
        }
        const text = await response.text();
        if (cancelled) return;
        const parsed = csvParse(text, (row) => ({
          year: row.Year ? Number(row.Year) : null,
          state: row.State || row.StateCode || null,
          stateName: row.StateName || null,
          msn: row.MSN || null,
          description: row.Description || null,
          unit: row.Unit || row.Units || null,
          value: row.Data ? Number(row.Data) : null
        })).filter((row) => row.year && row.state && row.value != null);
        if (cancelled) return;
        setFullSedsData(parsed);
        setFullSedsLoading(false);
      } catch (err) {
        if (cancelled) return;
        setFullSedsError(err);
        setFullSedsLoading(false);
      }
    }

    loadFullDataset();
    return () => {
      cancelled = true;
    };
  }, []);

  const stateUniverse = useMemo(
    () => ENERGY_DATA_SEDS.filter((d) => d.state !== "US"),
    []
  );

  const sedsFiltered = useMemo(() => {
    return stateUniverse.filter((d) => {
      if (filters.year && d.year < filters.year) return false;
      return true;
    });
  }, [stateUniverse, filters]);

  const stateLevel = sedsFiltered;

  const nationalSeries = useMemo(() => NATIONAL_ENERGY_DATA, []);

  const nationalFiltered = useMemo(() => {
    if (!filters.year) return nationalSeries;
    return nationalSeries.filter((entry) => entry.year >= filters.year);
  }, [nationalSeries, filters]);

  const stateSeries = useMemo(() => {
    const map = new Map();
    stateLevel.forEach((d) => {
      if (!map.has(d.state)) {
        map.set(d.state, { state: d.state, consumption: 0 });
      }
      map.get(d.state).consumption += d.consumption;
    });
    return Array.from(map.values()).sort((a, b) => b.consumption - a.consumption);
  }, [stateLevel]);

  const kpiSummary = useMemo(() => {
    if (!stateSeries.length || !nationalSeries.length) return null;

    const totalConsumption = stateSeries.reduce((s, d) => s + d.consumption, 0);
    const topState = stateSeries[0] ?? null;
    const topFiveTotal = stateSeries.slice(0, 5).reduce((sum, d) => sum + d.consumption, 0);
    const topFiveShare = totalConsumption ? topFiveTotal / totalConsumption : 0;
    const states = stateSeries.length;

    const years = nationalSeries.map((d) => d.year).sort((a, b) => a - b);
    const latest = nationalSeries.find((d) => d.year === years[years.length - 1]);
    const prev = nationalSeries.find((d) => d.year === years[years.length - 2]);
    let consumptionDeltaPct = null;
    if (latest && prev) {
      consumptionDeltaPct = ((latest.consumption - prev.consumption) / prev.consumption) * 100;
    }

    return {
      totalConsumption,
      stateCount: states,
      consumptionDeltaPct,
      highestState: topState,
      topFiveShare
    };
  }, [stateSeries, nationalSeries]);

  const nationalTrend = nationalFiltered;

  const nationalFuelTrend = useMemo(() => {
    if (!nationalFiltered.length) return [];

    return nationalFiltered.map((entry) => {
      const centerYear = 2000;
      const shares = FUEL_MIX.map((fuel) => {
        const slope = FUEL_TRENDS[fuel.name] ?? 0;
        const rawShare = Math.max(0.02, fuel.share + slope * (entry.year - centerYear));
        return { name: fuel.name, rawShare };
      });
      const totalShares = shares.reduce((sum, f) => sum + f.rawShare, 0);
      const normalizedShares = shares.map((f) => ({
        name: f.name,
        share: f.rawShare / totalShares
      }));

      return normalizedShares.reduce(
        (acc, f) => {
          acc[f.name] = entry.consumption * f.share;
          return acc;
        },
        { year: entry.year }
      );
    });
  }, [nationalFiltered]);

  const mapData = stateSeries;

  const petroleumMapData = useMemo(() => {
    if (!stateSeries.length) return [];
    return stateSeries.map((state) => {
      const share = PETROLEUM_SHARE_BY_STATE[state.state] ?? DEFAULT_PETROLEUM_SHARE;
      return {
        state: state.state,
        consumption: state.consumption * share,
        share
      };
    });
  }, [stateSeries]);

  const heatmapYears = useMemo(() => {
    const unique = Array.from(new Set(stateLevel.map((d) => d.year))).sort((a, b) => a - b);
    return unique.slice(-10);
  }, [stateLevel]);

  const heatmapData = useMemo(() => {
    if (!heatmapYears.length) return [];
    const totalsByState = new Map();
    stateLevel.forEach((d) => {
      totalsByState.set(d.state, (totalsByState.get(d.state) || 0) + d.consumption);
    });
    const topStates = Array.from(totalsByState.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([state]) => state);

    const valuesMap = new Map();
    stateLevel.forEach((d) => {
      valuesMap.set(`${d.state}|${d.year}`, d.consumption);
    });

    return topStates.map((state) => ({
      state,
      values: heatmapYears.map((year) => ({
        year,
        value: valuesMap.get(`${state}|${year}`) ?? null
      }))
    }));
  }, [stateLevel, heatmapYears]);

  const heatmapMaxValue = useMemo(() => {
    if (!heatmapData.length) return 0;
    return Math.max(
      ...heatmapData.flatMap((row) => row.values.map((entry) => entry.value || 0))
    );
  }, [heatmapData]);

  const sankeyData = useMemo(() => {
    if (!stateSeries.length) return null;

    const total = stateSeries.reduce((sum, d) => sum + d.consumption, 0);
    if (!total) return null;

    const nodesMap = new Map();
    const addNode = (name) => {
      if (!nodesMap.has(name)) {
        nodesMap.set(name, { name });
      }
    };

    FUEL_MIX.forEach((fuel) => addNode(fuel.name));
    Object.values(FUEL_TO_SECTOR).forEach((targets) =>
      targets.forEach((t) => addNode(t.name))
    );
    Object.values(SECTOR_TO_USE).forEach((targets) =>
      targets.forEach((t) => addNode(t.name))
    );

    const links = [];
    const sectorTotals = new Map();

    FUEL_MIX.forEach((fuel) => {
      const fuelValue = total * fuel.share;
      addNode(fuel.name);
      const sectorTargets = FUEL_TO_SECTOR[fuel.name] || [];
      sectorTargets.forEach((sector) => {
        const sectorValue = fuelValue * sector.share;
        links.push({
          source: fuel.name,
          target: sector.name,
          value: sectorValue
        });
        sectorTotals.set(
          sector.name,
          (sectorTotals.get(sector.name) || 0) + sectorValue
        );
      });
    });

    Object.entries(SECTOR_TO_USE).forEach(([sector, targets]) => {
      const sectorTotal = sectorTotals.get(sector);
      if (!sectorTotal) return;
      targets.forEach((end) => {
        links.push({
          source: sector,
          target: end.name,
          value: sectorTotal * end.share
        });
      });
    });

    return {
      nodes: Array.from(nodesMap.values()),
      links,
      total
    };
  }, [stateSeries]);

  const stateTotalsByYear = useMemo(() => {
    const yearMap = new Map();
    stateUniverse.forEach((entry) => {
      if (!yearMap.has(entry.year)) {
        yearMap.set(entry.year, new Map());
      }
      const stateMap = yearMap.get(entry.year);
      stateMap.set(
        entry.state,
        (stateMap.get(entry.state) || 0) + entry.consumption
      );
    });
    return yearMap;
  }, [stateUniverse]);

  const topStateShare = useMemo(() => {
    if (!nationalSeries.length || !stateTotalsByYear.size) return [];

    const yearsPool = [...nationalSeries]
      .filter((entry) => entry.consumption)
      .sort((a, b) => b.consumption - a.consumption)
      .slice(0, 5);

    return yearsPool
      .map((entry) => {
        const year = entry.year;
        const statesMap = stateTotalsByYear.get(year);
        if (!statesMap || !statesMap.size) return null;
        const states = Array.from(statesMap.entries()).map(([state, value]) => ({
          state,
          value
        }));
        states.sort((a, b) => b.value - a.value);

        const total = states.reduce((sum, s) => sum + s.value, 0);
        if (!total) return null;

        const segments = states.slice(0, 5).map((state) => ({
          ...state,
          share: state.value / total
        }));

        return {
          year,
          total,
          segments
        };
      })
      .filter(Boolean);
  }, [nationalSeries, stateTotalsByYear]);

  const stateMomentum = useMemo(() => {
    const years = Array.from(stateTotalsByYear.keys()).sort((a, b) => a - b);
    if (years.length < 2) return [];
    const latestYear = years[years.length - 1];
    const prevYear = years[years.length - 2];
    const latestMap = stateTotalsByYear.get(latestYear);
    const prevMap = stateTotalsByYear.get(prevYear) || new Map();
    if (!latestMap) return [];

    const topStates = Array.from(latestMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const maxValue = topStates[0]?.[1] || 1;

    return topStates.map(([state, value]) => {
      const prevValue = prevMap.get(state) || 0;
      const delta = value - prevValue;
      const deltaPct = prevValue ? (delta / prevValue) * 100 : null;
      return {
        state,
        value,
        prevValue,
        delta,
        deltaPct,
        latestYear,
        prevYear,
        fill: value / maxValue,
        trend: delta > 0 ? "up" : delta < 0 ? "down" : "flat"
      };
    });
  }, [stateTotalsByYear]);

  const fuelMixBreakdown = useMemo(() => {
    if (!nationalSeries.length) return [];
    const latest = nationalSeries[nationalSeries.length - 1];
    const latestConsumption = latest?.consumption ?? 0;
    return FUEL_MIX.map((fuel) => ({
      name: fuel.name,
      share: fuel.share,
      value: latestConsumption * fuel.share
    }));
  }, [nationalSeries]);

  const compactSummaryForAI = useMemo(
    () => ({
      filters,
      kpi: {
        totalConsumption: kpiSummary?.totalConsumption ?? 0,
        stateCount: kpiSummary?.stateCount ?? 0,
        consumptionDeltaPct: kpiSummary?.consumptionDeltaPct ?? 0
      },
      topStates: stateSeries.slice(0, 5),
      trend: nationalTrend.slice(-10)
    }),
    [filters, kpiSummary, stateSeries, nationalTrend]
  );

  return {
    loading: false,
    error: null,
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
    stateMomentum,
    petroleumMapData,
    fullSedsData,
    fullSedsLoading,
    fullSedsError
  };
}
