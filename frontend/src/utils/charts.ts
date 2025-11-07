import type { ChartSpec, ChartSpecType } from "../types";

const CHART_TYPE_MAP: Record<string, ChartSpecType> = {
  bar: "bar",
  column: "bar",
  donut: "donut",
  doughnut: "donut",
  pie: "pie",
  line: "line",
  area: "area",
  scatter: "scatter",
  histogram: "histogram",
  hist: "histogram",
  heatmap: "heatmap",
  heat: "heatmap",
  box: "box",
  boxplot: "box",
  candlestick: "box",
};

const FALLBACK_TYPE: ChartSpecType = "bar";

export function normalizeChartType(value: string | null | undefined): ChartSpecType | undefined {
  if (!value) {
    return undefined;
  }
  return CHART_TYPE_MAP[value.toLowerCase()];
}

export function detectChartType(option: any, fallback?: string): ChartSpecType {
  const fromSeries = extractTypeFromSeries(option);
  if (fromSeries) {
    return fromSeries;
  }

  const fallbackType = normalizeChartType(fallback);
  if (fallbackType) {
    return fallbackType;
  }

  return FALLBACK_TYPE;
}

function extractTypeFromSeries(option: any): ChartSpecType | undefined {
  if (!option) {
    return undefined;
  }

  const { series } = option;

  if (Array.isArray(series)) {
    for (const entry of series) {
      const normalized = normalizeChartType(entry?.type);
      if (normalized) {
        return normalized;
      }
    }
  } else if (series) {
    const normalized = normalizeChartType(series.type);
    if (normalized) {
      return normalized;
    }
  }

  return normalizeChartType(option?.chartType ?? option?.seriesType);
}
