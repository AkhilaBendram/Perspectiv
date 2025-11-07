import React, { useMemo, useState } from "react";
import { useAppStore } from "../store";
import type { Agg, ChartType, ChartSpec, Role } from "../types";

const CHARTS: ChartType[] = ["bar", "line", "area", "pie", "donut", "histogram", "box", "heatmap", "scatter"];
const AGGS: Agg[] = ["count", "sum", "mean", "none"];

type Labeled = { value: string; label: string; role?: Role };

export default function ChartBuilder() {
  const { analyze, buildCustom, busy, setError } = useAppStore();
  const [x, setX] = useState<string>("");
  const [y, setY] = useState<string>("");
  const [agg, setAgg] = useState<Agg>("count");
  const [chart, setChart] = useState<ChartType>("bar");

  const xOptions: Labeled[] = useMemo(() => {
    if (!analyze) return [];
    const byName: Record<string, Role | undefined> = {};
    (analyze.columns_meta ?? []).forEach((c) => c?.name && (byName[c.name] = c.role as Role | undefined));
    return (analyze.x_options ?? []).map((name) => ({
      value: name,
      label: byName[name] === "time" ? `${name} (time)` : byName[name] === "dimension" ? `${name} (dim)` : name,
      role: byName[name],
    }));
  }, [analyze]);

  const yOptions: Labeled[] = useMemo(() => {
    if (!analyze) return [];
    return (analyze.y_options ?? []).map((name) => ({
      value: name,
      label: `${name} (measure)`,
      role: "measure",
    }));
  }, [analyze]);

  if (!analyze) return null;

  function pickDefaultAgg(currentChart: ChartType, yVal: string): Agg {
    if (!yVal) return "count";
    if (currentChart === "line" || currentChart === "area") return "mean";
    return agg;
  }

  function validateCombo(currentChart: ChartType, xVal: string, yVal: string): string | null {
    if (currentChart === "scatter" && (!xVal || !yVal)) return "Scatter requires both an X and a Y (Y must be a measure).";
    if ((currentChart === "line" || currentChart === "area") && !xVal) return "Line/Area charts need an X axis (time or dimension).";
    if ((currentChart === "pie" || currentChart === "donut") && !xVal) return "Pie/Donut require an X (dimension or time).";
    if ((currentChart === "histogram" || currentChart === "box") && !yVal) return "Histogram/Box plots need a Y measure.";
    return null;
  }

  async function onBuild() {
    setError(null);
    const err = validateCombo(chart, x, y);
    if (err) return setError(err);
    const payload: ChartSpec = { x: x || null, y: y || null, agg: pickDefaultAgg(chart, y), chart };
    try {
      await buildCustom(payload); // store prepends to charts[]
      if (!y) setAgg("count");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || "Failed to build chart");
    }
  }

  return (
    <div className="glass p-5">
      <div className="text-lg font-semibold mb-3">Build Your Own</div>
      <div className="grid grid-cols-2 gap-3">
        <select className="bg-black/40 border border-white/15 rounded-xl px-3 py-2" value={x} onChange={(e) => setX(e.target.value)}>
          <option value="">No time/dimension</option>
          {xOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className="bg-black/40 border border-white/15 rounded-xl px-3 py-2" value={y} onChange={(e) => setY(e.target.value)}>
          <option value="">None (count rows)</option>
          {yOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className="bg-black/40 border border-white/15 rounded-xl px-3 py-2" value={agg} onChange={(e) => setAgg(e.target.value as Agg)}>
          {AGGS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="bg-black/40 border border-white/15 rounded-xl px-3 py-2" value={chart} onChange={(e) => setChart(e.target.value as ChartType)}>
          {CHARTS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <button onClick={onBuild} disabled={busy} className="mt-4 w-full rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 py-2 transition disabled:opacity-50">
        {busy ? "Building…" : "Build chart"}
      </button>
      <p className="text-xs text-gray-400 mt-3">
        Tip: X prioritizes <em>time</em> then <em>dimensions</em>. Y is a <em>measure</em>. If Y is empty, we’ll count rows.
      </p>
    </div>
  );
}
