from typing import Dict, Any, List
import pandas as pd
import numpy as np
from numpy.typing import NDArray

def _numeric_cols(columns): return [c["name"] for c in columns if c["role"]=="measure"]
def _dimension_cols(columns): return [c["name"] for c in columns if c["role"]=="dimension"]

def _hist(series: pd.Series, bins: int = None):
    s = pd.to_numeric(series, errors="coerce").dropna()
    if s.empty: return [], []
    if bins is None:
        n = s.size
        q75, q25 = np.percentile(s, [75,25])
        iqr = max(q75-q25, 1e-9)
        bw = 2*iqr*(n**(-1/3))
        bins = max(8, min(60, int((s.max()-s.min())/bw) if s.max()!=s.min() and bw>0 else int(np.sqrt(n))+1))
    vals, edges = np.histogram(s, bins=bins)
    return [int(v) for v in vals], [float(e) for e in edges[:-1]]

def _box(series: pd.Series):
    s = pd.to_numeric(series, errors="coerce").dropna()
    if s.empty: return [0,0,0,0,0]
    q1, q2, q3 = np.percentile(s, [25,50,75])
    iqr = q3-q1
    low = float(max(s.min(), q1-1.5*iqr))
    high = float(min(s.max(), q3+1.5*iqr))
    return [low, float(q1), float(q2), float(q3), high]

def _cramers_v(a: pd.Series, b: pd.Series) -> float:
    tbl = pd.crosstab(a, b)
    n = tbl.values.sum()
    if n == 0: return 0.0
    expected = np.outer(tbl.sum(1).values, tbl.sum(0).values) / n
    with np.errstate(divide='ignore', invalid='ignore'):
        chi2 = np.nansum((tbl.values-expected)**2 / np.where(expected==0,1,expected))
    r, k = tbl.shape
    if n <= 1 or r<=1 or k<=1: return 0.0
    phi2 = chi2 / n
    phi2corr = max(0, phi2 - (k-1)*(r-1)/(n-1))
    rcorr = r - (r-1)**2/(n-1)
    kcorr = k - (k-1)**2/(n-1)
    denom = min(kcorr-1, rcorr-1)
    return float(np.sqrt(phi2corr/denom)) if denom>0 else 0.0

def eda_profile(columns: List[Dict[str, Any]], sample_records: List[Dict[str, Any]]) -> Dict[str, Any]:
    df = pd.DataFrame(sample_records)
    overview = {"rows": int(len(df)), "cols": int(len(df.columns))}
    missing = {c: float(df[c].isna().mean()*100) for c in df.columns} if not df.empty else {}
    charts: List[Dict[str, Any]] = []

    # Missingness chart
    if missing:
        xs = list(missing.keys()); ys = [round(missing[k],2) for k in xs]
        charts.append({
            "id":"missingness",
            "title":"Missing values (%) by column",
            "option":{
                "tooltip":{"trigger":"axis"},
                "xAxis":{"type":"category","data":xs},
                "yAxis":{"type":"value"},
                "series":[{"type":"bar","data":ys}],
                "grid":{"left":36,"right":12,"top":24,"bottom":80}
            }
        })

    # Histograms + Box for up to 3 measures
    for m in _numeric_cols(columns)[:3]:
        vals, edges = _hist(df[m])
        if vals:
            charts.append({
                "id":f"hist_{m}",
                "title":f"Distribution of {m}",
                "option":{
                    "tooltip":{"trigger":"axis"},
                    "xAxis":{"type":"category","data":[str(round(e,4)) for e in edges]},
                    "yAxis":{"type":"value"},
                    "series":[{"type":"bar","data":vals}],
                    "grid":{"left":36,"right":12,"top":24,"bottom":36}
                }
            })
        charts.append({
            "id":f"box_{m}",
            "title":f"{m} (boxplot)",
            "option":{
                "tooltip":{"trigger":"item"},
                "xAxis":{"type":"category","data":[m]},
                "yAxis":{"type":"value"},
                "series":[{"type":"boxplot","data":[_box(df[m])]}],
                "grid":{"left":36,"right":12,"top":24,"bottom":36}
            }
        })

    # Numeric corr heatmap
    nums = _numeric_cols(columns)
    if nums:
        num_df = df[nums].apply(pd.to_numeric, errors="coerce")
        if not num_df.empty:
            corr = num_df.corr(method="pearson").fillna(0.0)
            labels = list(corr.columns)
            data = []
            for i,a in enumerate(labels):
                for j,b in enumerate(labels):
                    data.append([i,j, round(float(corr.loc[a,b]),4)])
            charts.append({
                "id":"corr_heatmap",
                "title":"Pearson correlation (numeric)",
                "option":{
                    "tooltip":{"position":"top"},
                    "xAxis":{"type":"category","data":labels,"axisLabel":{"rotate":45}},
                    "yAxis":{"type":"category","data":labels},
                    "visualMap":{"min":-1,"max":1,"calculable":True,"orient":"horizontal","left":"center","bottom":0},
                    "series":[{"type":"heatmap","data":data}]
                }
            })

    # Categorical association (Cramér’s V) among top dims
    dims = _dimension_cols(columns)[:8]
    associations = {}
    if len(dims) >= 2 and not df.empty:
        for i in range(len(dims)):
            for j in range(i+1, len(dims)):
                a, b = dims[i], dims[j]
                associations[f"{a}×{b}"] = _cramers_v(df[a], df[b])

    # Column-level stats
    col_stats = {}
    for c in df.columns:
        s = df[c]
        role = next((k["role"] for k in columns if k["name"]==c), "dimension")
        data = {"role": role, "dtype": str(s.dtype), "missing_pct": float(s.isna().mean()*100)}
        if role=="measure":
            ss = pd.to_numeric(s, errors="coerce")
            if ss.notna().any():
                data.update({
                    "mean": float(np.nanmean(ss)),
                    "std": float(np.nanstd(ss)),
                    "min": float(np.nanmin(ss)),
                    "q1": float(np.nanpercentile(ss.dropna(),25)),
                    "median": float(np.nanpercentile(ss.dropna(),50)),
                    "q3": float(np.nanpercentile(ss.dropna(),75)),
                    "max": float(np.nanmax(ss)),
                    "nunique": int(ss.nunique(dropna=True)),
                })
        elif role=="dimension":
            vc = s.value_counts(dropna=True).head(10)
            data.update({
                "top":[{"value": str(i), "count": int(v)} for i,v in vc.items()],
                "nunique": int(s.nunique(dropna=True))
            })
        col_stats[c] = data

    return {
        "overview": {**overview, "missing_pct": missing},
        "columns": col_stats,
        "associations": associations,
        "charts": charts
    }
