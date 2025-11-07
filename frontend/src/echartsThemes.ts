import * as echarts from "echarts/core";

const palette = [
  "#7dd3fc", "#a78bfa", "#34d399", "#f472b6",
  "#f59e0b", "#60a5fa", "#22d3ee", "#f87171"
];

export const PERSPECTIV_THEME_NAME = "perspectiv-dark";

export function registerPerspectivTheme() {
  const theme = {
    color: palette,
    backgroundColor: "transparent",
    textStyle: { color: "#e5e7eb" },
    title: { textStyle: { color: "#e5e7eb", fontWeight: 700 } },
    tooltip: {
      backgroundColor: "rgba(20,20,25,0.95)",
      borderColor: "rgba(255,255,255,0.08)",
      textStyle: { color: "#e5e7eb" },
      extraCssText: "backdrop-filter: blur(6px); border-radius: 10px; padding:8px 10px;"
    },
    grid: { left: 40, right: 24, top: 36, bottom: 40 },
    axisPointer: { lineStyle: { color: "#94a3b8" } },
    categoryAxis: {
      axisLine: { lineStyle: { color: "#6b7280" } },
      axisLabel: { color: "#cbd5e1" },
      splitLine: { show: false }
    },
    valueAxis: {
      axisLine: { lineStyle: { color: "#6b7280" } },
      axisLabel: { color: "#cbd5e1" },
      splitLine: { lineStyle: { color: "rgba(148,163,184,0.18)" } }
    }
  };
  // @ts-ignore
  echarts.registerTheme(PERSPECTIV_THEME_NAME, theme);
}
