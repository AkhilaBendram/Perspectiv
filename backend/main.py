from __future__ import annotations
import io, os, json
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from analyzer import analyze_schema_and_roles
from viz_recommender import recommend as recommend_charts

# ==================== App & CORS ====================
load_dotenv()
API_VERSION = "v1"
APP_NAME = "Perspectiv Backend (compat)"

app = FastAPI(title=APP_NAME, version=API_VERSION)

_cors = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
CORS_ORIGINS = [o.strip() for o in _cors.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Optional Groq
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
_groq = None
if GROQ_API_KEY:
    try:
        from groq import Groq  # type: ignore
        _groq = Groq(api_key=GROQ_API_KEY)
    except Exception:
        _groq = None

# ==================== In-memory store ====================
class DataStore:
    df: Optional[pd.DataFrame] = None
    schema: Optional[Dict[str, Any]] = None
    file_name: Optional[str] = None

STORE = DataStore()

# ==================== Models ====================
class CustomSpec(BaseModel):
    x: Optional[str] = None
    y: Optional[str] = None
    agg: Optional[str] = None
    chart: str  # bar|line|area|pie|donut|hist|box|scatter

class NarrateReq(BaseModel):
    dataset_stats: Dict[str, Any] = Field(default_factory=dict)
    charts_meta: List[Dict[str, Any]] = Field(default_factory=list)

# ==================== Helpers ====================
def _read_csv_upload(upload: UploadFile) -> pd.DataFrame:
    try:
        raw = upload.file.read()
    except Exception as e:
        raise HTTPException(400, f"Failed to read file: {e}")
    finally:
        try: upload.file.close()
        except Exception: pass
    if not raw:
        raise HTTPException(400, "Empty upload.")

    for enc in ("utf-8", "latin-1"):
        try:
            buf = io.StringIO(raw.decode(enc, errors="ignore"))
            df = pd.read_csv(buf)
            if df is not None:
                return df
        except Exception:
            continue
    raise HTTPException(400, "Could not parse CSV. Ensure it’s a valid text CSV file.")

def _ensure_ready() -> None:
    if STORE.df is None or STORE.schema is None:
        raise HTTPException(400, "No dataset loaded yet. Upload a CSV via /analyze first.")

# ---- ECharts builders (same) ----
def _bar_option(title: str, cats: List[str], vals: List[float]) -> Dict[str, Any]:
    return {
        "title": {"text": title},
        "tooltip": {"trigger": "axis"},
        "xAxis": {"type": "category", "data": cats},
        "yAxis": {"type": "value"},
        "series": [{"type": "bar", "data": vals}],
        "grid": {"left": 50, "right": 20, "bottom": 40, "top": 50},
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

def _area_option(title: str, xs: List[str], ys: List[float]) -> Dict[str, Any]:
    return {
        "title": {"text": title},
        "tooltip": {"trigger": "axis"},
        "xAxis": {"type": "category", "data": xs},
        "yAxis": {"type": "value"},
        "series": [{"type": "line","data": ys,"smooth": True,"areaStyle": {},"symbol": "none"}],
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
        "series": [{"type": "boxplot", "data": [[lo, q1, q2, q3, hi]]}],
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

# ==================== Compat shaping ====================
def _compat_from_suggestions(suggestions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Convert our suggestion objects to the 'charts' shape some of your pages expect:
      { id, title, type, x, y, agg, option }
    """
    charts = []
    for s in suggestions:
        spec = s.get("spec", {})
        charts.append({
            "id": s.get("id") or f"c_{len(charts)+1}",
            "title": s.get("title") or "Chart",
            "type": spec.get("chart") or "bar",
            "x": spec.get("x"),
            "y": spec.get("y"),
            "agg": spec.get("agg"),
            "option": s.get("option"),
        })
    return charts

def _add_compat_aliases(resp: Dict[str, Any]) -> Dict[str, Any]:
    """
    Add camelCase + legacy keys so older components don't break.
    """
    out = dict(resp)

    # camelCase mirrors
    out["fileName"]   = resp.get("file_name")
    out["columnsMeta"] = resp.get("columns_meta")
    out["xOptions"]   = resp.get("x_options")
    out["yOptions"]   = resp.get("y_options")

    # legacy aliases used by your old pages
    out["file"]       = resp.get("file_name")
    out["aiSummary"]  = resp.get("ai_summary") or None
    out["insights"]   = resp.get("insights") or []   # leave empty; UI optional
    out["charts"]     = _compat_from_suggestions(resp.get("suggestions", []))

    # pack a mini profile used by some layouts
    out["profile"] = {
        "rows": resp.get("rows"),
        "columns": resp.get("columns_meta", []),
        "headline": resp.get("summary"),
        "quickTake": ([resp.get("summary")] if resp.get("summary") else []),
    }
    return out

# ==================== Routes ====================
@app.get("/health")
def health():
    return {"ok": True, "api_version": API_VERSION}

@app.get("/version")
def version():
    return {"name": APP_NAME, "version": API_VERSION}

@app.post("/analyze")
def analyze(file: UploadFile = File(...)):
    """
    Upload CSV → robust roles + suggestions + **compat aliases** for your current UI.
    """
    df = _read_csv_upload(file)
    schema = analyze_schema_and_roles(df)

    # EXTRA PRUNE for x_options: time + safe dims only
    columns_by_name = {m["name"]: m for m in schema["columns_meta"]}
    time_cols = [c for c in schema["x_options"] if columns_by_name.get(c, {}).get("role") == "time"]
    dim_cols  = [
        c for c in schema["x_options"]
        if columns_by_name.get(c, {}).get("role") in ("time","dimension")
        and not columns_by_name.get(c, {}).get("id_like", False)
        and not columns_by_name.get(c, {}).get("high_card", False)
        and c not in time_cols
    ]
    schema["x_options"] = time_cols + dim_cols

    suggestions = recommend_charts(schema["df"], schema["columns_meta"], schema["x_options"], schema["y_options"])

    STORE.df = schema["df"]
    STORE.schema = schema
    STORE.file_name = file.filename

    base_resp = {
        "file_name": STORE.file_name,
        "rows": int(schema["profile"]["rows"]),
        "columns": int(len(schema["df"].columns)),
        "columns_meta": schema["columns_meta"],
        "x_options": schema["x_options"],
        "y_options": schema["y_options"],
        "suggestions": suggestions,
        "summary": f"Detected {len(schema['df'].columns)} columns over {schema['profile']['rows']} rows.",
        "ai_summary": None,   # optional; filled by /narrate
    }
    return _add_compat_aliases(base_resp)

@app.post("/analyze/custom")
def analyze_custom(spec: CustomSpec):
    """
    Build a custom chart from the in-memory dataset with role guardrails.
    Returns { title, option } (UI already uses this) + keeps behavior strict.
    """
    _ensure_ready()
    df = STORE.df; schema = STORE.schema
    assert df is not None and schema is not None

    columns_meta = {m["name"]: m for m in schema["columns_meta"]}
    def _role(col: Optional[str]) -> Optional[str]:
        if not col: return None
        m = columns_meta.get(col); return m["role"] if m else None

    x, y, agg, chart = spec.x, spec.y, (spec.agg or "").lower() or None, spec.chart

    # Category charts
    if chart in ("bar", "pie", "donut"):
        if not x:
            raise HTTPException(400, "X is required for category charts.")
        x_role = _role(x)
        if x_role not in ("time", "dimension"):
            raise HTTPException(400, f"X must be time/dimension. Got: {x} ({x_role})")
        if y:
            if _role(y) != "measure":
                raise HTTPException(400, f"Y must be a measure for {chart}.")
            if agg is None: agg = "sum"
        else:
            agg = "count"

        if agg == "count":
            grp = df.groupby(x, dropna=False).size().reset_index(name="count")
            grp[x] = grp[x].astype(str)
            top = grp.sort_values("count", ascending=False).head(24)
            cats = top[x].tolist(); vals = top["count"].astype(float).tolist()
            title = f"{x} distribution"
            if chart == "bar":
                option = _bar_option(title, cats, vals)
            else:
                option = _pie_option(title, [{"name": c, "value": v} for c, v in zip(cats, vals)], donut=(chart=="donut"))
            return {"title": title, "option": option}

        if agg not in ("sum","mean","median","min","max"):
            raise HTTPException(400, f"Unsupported agg: {agg}")
        grp = getattr(df.groupby(x, dropna=False)[y], agg)().reset_index(name="value")
        grp[x] = grp[x].astype(str)
        top = grp.sort_values("value", ascending=False).head(24)
        cats = top[x].tolist(); vals = top["value"].astype(float).round(2).tolist()
        title = f"{y} {agg} by {x}"
        if chart == "bar":
            option = _bar_option(title, cats, vals)
        else:
            option = _pie_option(title, [{"name": c, "value": v} for c, v in zip(cats, vals)], donut=(chart=="donut"))
        return {"title": title, "option": option}

    # Trend charts
    if chart in ("line", "area"):
        if not x or _role(x) != "time":
            raise HTTPException(400, "X must be a time column for line/area.")
        if not y or _role(y) != "measure":
            raise HTTPException(400, "Y must be a measure for line/area.")
        agg = agg or "sum"
        ser = df.set_index(x)[y].sort_index()
        idx = ser.index
        span_days = int((idx.max() - idx.min()).days or 1) if len(idx) else 1
        freq = "MS" if span_days > 60 else "W-MON" if span_days > 14 else "D"
        if   agg == "sum":    ts = ser.resample(freq).sum().fillna(0.0)
        elif agg == "mean":   ts = ser.resample(freq).mean().fillna(0.0)
        elif agg == "median": ts = ser.resample(freq).median().fillna(0.0)
        elif agg == "min":    ts = ser.resample(freq).min().fillna(0.0)
        elif agg == "max":    ts = ser.resample(freq).max().fillna(0.0)
        else: raise HTTPException(400, f"Unsupported agg for {chart}: {agg}")
        xs = [str(i)[:10] for i in ts.index]; ys = ts.round(2).tolist()
        title = f"{y} {agg} over {x}"
        option = _area_option(title, xs, ys) if chart == "area" else _line_option(title, xs, ys)
        return {"title": title, "option": option}

    # Distributions
    if chart == "hist":
        if not y or _role(y) != "measure":
            raise HTTPException(400, "Y must be a measure for histogram.")
        vals = df[y].dropna().astype(float).tolist()
        title = f"{y} distribution"
        return {"title": title, "option": _hist_option(title, vals, bins=20)}

    if chart == "box":
        if not y or _role(y) != "measure":
            raise HTTPException(400, "Y must be a measure for box plot.")
        vals = df[y].dropna().astype(float).tolist()
        title = f"{y} spread"
        return {"title": title, "option": _box_option(title, vals)}

    # Scatter
    if chart == "scatter":
        if not x or not y:
            raise HTTPException(400, "Scatter requires X and Y.")
        if _role(x) != "measure" or _role(y) != "measure":
            raise HTTPException(400, "Scatter requires both X and Y to be measures.")
        xs = df[x].astype(float).tolist()
        ys = df[y].astype(float).tolist()
        title = f"{y} vs {x}"
        return {"title": title, "option": _scatter_option(title, xs, ys, x, y)}

    raise HTTPException(400, f"Unsupported chart: {chart}")

@app.post("/narrate")
def narrate(req: NarrateReq):
    if _groq:
        try:
            prompt = (
                "You are an analytics narrator. Write 4-6 tight bullets using ONLY the facts provided. No hallucinations.\n\n"
                f"DATASET_STATS:\n{json.dumps(req.dataset_stats, indent=2)}\n\n"
                f"CHARTS_META:\n{json.dumps(req.charts_meta, indent=2)}\n\n"
                "Output plain bullets."
            )
            comp = _groq.chat.completions.create(
                model="llama-3.1-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=300,
            )
            text = comp.choices[0].message.content.strip()
            bullets = [b.strip("-• ").strip() for b in text.split("\n") if b.strip()]
            return {"bullets": bullets[:6], "summary": " ".join(bullets[:3])}
        except Exception:
            pass

    ds = req.dataset_stats or {}; charts = req.charts_meta or []
    rows = ds.get("rows") or ds.get("row_count"); ncols = ds.get("ncols") or ds.get("columns")
    hi = []
    if rows and ncols: hi.append(f"Dataset contains **{rows:,} rows** across **{ncols} columns**.")
    if ds.get("top_dimension"): d = ds["top_dimension"]; hi.append(f"Top category by volume: **{d.get('name')}** (≈ {d.get('share')}%).")
    if charts: hi.append(f"Generated **{len(charts)}** charts; best chart: **{charts[0].get('title','(untitled)')}**.")
    summary = " ".join(h.replace("**","") for h in hi) or "Automatic summary not available."
    return {"bullets": hi[:6], "summary": summary}

@app.get("/debug/schema")
def debug_schema():
    if STORE.schema is None:
        raise HTTPException(400, "No dataset")
    s = STORE.schema
    return {
        "file": STORE.file_name,
        "x_options": s["x_options"],
        "y_options": s["y_options"],
        "id_like_dims": [m["name"] for m in s["columns_meta"] if m["role"]=="dimension" and m["id_like"]],
        "high_card_dims": [m["name"] for m in s["columns_meta"] if m["role"]=="dimension" and m["high_card"]],
        "measures": [m["name"] for m in s["columns_meta"] if m["role"]=="measure"],
        "time": [m["name"] for m in s["columns_meta"] if m["role"]=="time"],
    }
