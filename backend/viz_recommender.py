# viz_recommender.py
# Chart suggestion engine -> ECharts options
from __future__ import annotations
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np

# ---------------- ECharts option builders ----------------
def _bar_option(title: str, cats: List[str], vals: List[float]) -> Dict[str, Any]:
    return {
        "title": {"text": title},
        "tooltip": {"trigger": "axis"},
        "xAxis": {"type": "category", "data": cats},
        "yAxis": {"type": "value"},
        "series": [{"type": "bar", "data": vals, "smooth": False}],
        "grid": {"left": 50, "right": 20, "bottom": 40, "top": 50},
    }

def _pie_option(title: str, pairs: List[Dict[str, Any]], donut=True) -> Dict[str, Any]:
    return {
        "title": {"text": title},
        "tooltip": {"trigger": "item"},
        "series": [{
            "type": "pie",
            "radius": ["50%","75%"] if donut else "65%",
            "avoidLabelOverlap": True,
            "data": pairs,
        }]
    }

def _line_option(title: str, xs: List[str], ys: List[float]) -> Dict[str, Any]:
    return {
        "title": {"text": title},
        "tooltip": {"trigger": "axis"},
        "xAxis": {"type": "category", "data": xs},
        "yAxis": {"type": "value"},
        "series": [{"type": "line", "data": ys, "smooth": True, "symbol": "none"}],
        "grid": {"left": 50, "right": 20, "bottom": 40, "top": 50},
    }

def _hist_option(title: str, values: List[float], bins: int = 20) -> Dict[str, Any]:
    counts, edges = np.histogram(values, bins=bins)
    cats = [f"{edges[i]:.2f}-{edges[i+1]:.2f}" for i in range(len(edges)-1)]
    return _bar_option(title, cats, counts.tolist())

def _box_option(title: str, values: List[float]) -> Dict[str, Any]:
    q1 = float(np.nanpercentile(values, 25))
    q2 = float(np.nanpercentile(values, 50))
    q3 = float(np.nanpercentile(values, 75))
    lo = float(np.nanpercentile(values, 5))
    hi = float(np.nanpercentile(values, 95))
    return {
        "title": {"text": title},
        "tooltip": {"trigger": "item"},
        "xAxis": {"type": "category", "data": [title]},
        "yAxis": {"type": "value"},
        "series": [{
            "type": "boxplot",
            "data": [[lo, q1, q2, q3, hi]]
        }],
        "grid": {"left": 50, "right": 20, "bottom": 40, "top": 50},
    }

def _scatter_option(title: str, xs: List[float], ys: List[float], x_label: str, y_label: str) -> Dict[str, Any]:
    return {
        "title": {"text": title},
        "tooltip": {"trigger": "item"},
        "xAxis": {"type": "value", "name": x_label},
        "yAxis": {"type": "value", "name": y_label},
        "series": [{"type": "scatter", "data": list(map(list, zip(xs, ys)))}],
        "grid": {"left": 50, "right": 20, "bottom": 40, "top": 50},
    }

# ---------------- Helpers ----------------
def _is_chartable_dim(meta):
    return (meta["role"] == "dimension") and (not meta["id_like"]) and (not meta["high_card"])

def _top_k(df: pd.DataFrame, by: str, k: int = 12) -> pd.DataFrame:
    return df.sort_values(by, ascending=False).head(k)

# ---------------- Main API ----------------
def recommend(df: pd.DataFrame,
              columns_meta: List[Dict[str, Any]],
              x_options: List[str],
              y_options: List[str]) -> List[Dict[str, Any]]:
    """
    Returns a list of {id, title, spec, option} suggestions.
    Rules:
      - Category charts use "chartable" dimensions only (no IDs, no high-card).
      - Trend charts only if at least one time column exists.
      - Scatter only if at least two measures exist.
      - Hist/Box for the top-2 measures.
    """
    suggestions: List[Dict[str, Any]] = []
    metas_by_name = {m["name"]: m for m in columns_meta}

    dims = [d for d in x_options if d in metas_by_name and metas_by_name[d]["role"] == "dimension"]
    dims_chartable = [d for d in dims if _is_chartable_dim(metas_by_name[d])]
    times = [t for t in x_options if t in metas_by_name and metas_by_name[t]["role"] == "time"]
    measures = [m for m in y_options if pd.api.types.is_numeric_dtype(df[m])]

    # 1) Category bar/donut by highest measure (Revenue/Quantity first if present)
    preferred_measures = [m for m in measures if any(k in m.lower() for k in ["revenue","sales","amount","total","qty","quantity","units"])]
    use_measure = preferred_measures[0] if preferred_measures else (measures[0] if measures else None)

    if use_measure and dims_chartable:
        for d in dims_chartable[:3]:  # up to 3 dimensions
            grp = df.groupby(d, dropna=False)[use_measure].sum().reset_index()
            grp[d] = grp[d].astype(str)
            top = _top_k(grp, use_measure, 12)
            # bar
            title = f"{use_measure} by {d}"
            suggestions.append({
                "id": f"bar_{d}_{use_measure}",
                "title": title,
                "spec": {"x": d, "y": use_measure, "agg": "sum", "chart": "bar"},
                "option": _bar_option(title, top[d].tolist(), top[use_measure].round(2).tolist())
            })
            # donut
            title2 = f"{d} share of {use_measure}"
            suggestions.append({
                "id": f"donut_{d}_{use_measure}",
                "title": title2,
                "spec": {"x": d, "y": use_measure, "agg": "sum", "chart": "donut"},
                "option": _pie_option(
                    title2,
                    [{"name": r[d], "value": float(r[use_measure])} for _, r in top.iterrows()],
                    donut=True
                )
            })

    # 2) Trends (first time column with best measure)
    if times and use_measure:
        t = times[0]
        # resample by month if dense
        ser = df.set_index(t)[use_measure]
        ser = ser.sort_index()
        if ser.index.inferred_type in ("datetime64", "datetime64tz"):
            # choose frequency based on span
            span_days = (ser.index.max() - ser.index.min()).days or 1
            freq = "MS" if span_days > 60 else "W-MON" if span_days > 14 else "D"
            ts = ser.resample(freq).sum().fillna(0.0)
            xs = [str(i)[:10] for i in ts.index]
            ys = ts.round(2).tolist()
        else:
            # fallback: group by date-like string
            grp = df.groupby(t, dropna=False)[use_measure].sum().reset_index()
            grp[t] = grp[t].astype(str)
            xs = grp[t].tolist()
            ys = grp[use_measure].round(2).tolist()

        title = f"{use_measure} over {t}"
        suggestions.append({
            "id": f"line_{t}_{use_measure}",
            "title": title,
            "spec": {"x": t, "y": use_measure, "agg": "sum", "chart": "line"},
            "option": _line_option(title, xs, ys)
        })

    # 3) Distribution: histogram + box for top 1–2 measures
    for m in measures[:2]:
        vals = df[m].dropna().astype(float).tolist()
        if len(vals) >= 5:
            suggestions.append({
                "id": f"hist_{m}",
                "title": f"{m} distribution",
                "spec": {"x": None, "y": m, "agg": None, "chart": "hist"},
                "option": _hist_option(f"{m} distribution", vals, bins=20)
            })
            suggestions.append({
                "id": f"box_{m}",
                "title": f"{m} spread",
                "spec": {"x": None, "y": m, "agg": None, "chart": "box"},
                "option": _box_option(f"{m} spread", vals)
            })

    # 4) Scatter (if at least two measures)
    if len(measures) >= 2:
        x_m, y_m = measures[0], measures[1]
        xs = df[x_m].astype(float).tolist()
        ys = df[y_m].astype(float).tolist()
        title = f"{y_m} vs {x_m}"
        suggestions.append({
            "id": f"scatter_{x_m}_{y_m}",
            "title": title,
            "spec": {"x": x_m, "y": y_m, "agg": None, "chart": "scatter"},
            "option": _scatter_option(title, xs, ys, x_m, y_m)
        })

    return suggestions
