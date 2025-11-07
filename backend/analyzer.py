# analyzer.py
# Robust schema detection for Perspectiv:
# - Coerce numbers/dates
# - Roles: time | dimension | measure
# - Flags: id_like, high_card
# - Builder outputs: x_options (time→good dims), y_options (measures)

from __future__ import annotations
from typing import Dict, List, Any, Tuple
import re
import numpy as np
import pandas as pd

# ---- Name hints -------------------------------------------------------------
NUM_NAME_HINTS = (
    "revenue", "amount", "price", "cost", "margin", "sales",
    "qty", "quantity", "units", "items", "count", "total",
    "discount", "tax", "fee", "rate"
)
ID_NAME_HINTS = ("id", "uuid", "guid", "invoice", "order", "receipt")
TIME_NAME_HINTS = ("date", "time", "timestamp", "datetime", "dt")

# ---- Guardrails -------------------------------------------------------------
MAX_CATS_FOR_SUGGESTIONS = 30   # tighter: dims above this are "high_card"
MIN_NUMERIC_COVERAGE = 0.85
MIN_TIME_COVERAGE    = 0.85

# ---- Helpers ----------------------------------------------------------------
def _strip_to_numeric_strings(s: pd.Series) -> pd.Series:
    return (
        s.astype(str)
         .str.replace(r"[\$,]", "", regex=True)
         .str.replace("%", "", regex=True)
         .str.strip()
         .replace({"": np.nan})
    )

def _coerce_numeric_inplace(df: pd.DataFrame, col: str) -> bool:
    tmp = _strip_to_numeric_strings(df[col])
    coerced = pd.to_numeric(tmp, errors="coerce")
    coverage = float(coerced.notna().mean())
    if coverage >= MIN_NUMERIC_COVERAGE:
        df[col] = coerced
        return True
    return False

def _maybe_parse_datetime_inplace(df: pd.DataFrame, col: str) -> bool:
    dt = pd.to_datetime(df[col], errors="coerce", infer_datetime_format=True)
    coverage = float(dt.notna().mean())
    if coverage >= MIN_TIME_COVERAGE:
        df[col] = dt
        return True
    return False

def _is_id_like(name: str, nunique: int, nrows: int) -> bool:
    nl = name.lower().strip()
    id_patterns = [
        r"\b(id|uuid|guid)\b", r"_id\b", r"\bid_", r"\border[_\- ]?id\b",
        r"\border\b", r"\binvoice\b", r"\breceipt\b",
        r"^ord[\-_]", r"\bserial\b", r"\bnumber\b",
    ]
    if any(re.search(p, nl) for p in id_patterns):
        return True
    return nunique >= 0.95 * max(1, nrows)

def _name_hints_measure(name: str) -> bool:
    nl = name.lower()
    return any(k in nl for k in NUM_NAME_HINTS)

def _name_hints_time(name: str) -> bool:
    nl = name.lower()
    return any(k in nl for k in TIME_NAME_HINTS)

# ---- Public API -------------------------------------------------------------
def analyze_schema_and_roles(df_in: pd.DataFrame) -> Dict[str, Any]:
    df = df_in.copy()
    nrows = len(df)

    # 1) Coerce numeric/date
    for c in df.columns:
        became_numeric = _coerce_numeric_inplace(df, c)
        if not became_numeric:
            if _name_hints_time(str(c)):
                _maybe_parse_datetime_inplace(df, c)
            else:
                _maybe_parse_datetime_inplace(df, c)

    # 2) Roles + flags
    columns_meta: List[Dict[str, Any]] = []
    measures: List[str] = []
    dims: List[str] = []
    times: List[str] = []

    for c in df.columns:
        s = df[c]
        nunique = int(s.nunique(dropna=True))
        dtype = str(s.dtype)
        is_time = pd.api.types.is_datetime64_any_dtype(s)
        is_numeric = pd.api.types.is_numeric_dtype(s)
        id_like = _is_id_like(str(c), nunique, nrows)
        high_card = nunique > MAX_CATS_FOR_SUGGESTIONS

        if is_time:
            role = "time"; times.append(c)
        elif is_numeric:
            if id_like:
                role = "dimension"; dims.append(c)
            else:
                if nunique <= 20 and not _name_hints_measure(c):
                    role = "dimension"; dims.append(c)
                else:
                    role = "measure"; measures.append(c)
        else:
            role = "dimension"; dims.append(c)

        columns_meta.append({
            "name": c,
            "role": role,
            "dtype": dtype,
            "distinct": nunique,
            "id_like": bool(id_like),
            "high_card": bool(high_card),
        })

    # 3) Rescue obvious measures by name
    for c in list(df.columns):
        if c not in measures and _name_hints_measure(c) and pd.api.types.is_numeric_dtype(df[c]):
            if c in dims: dims.remove(c)
            if c not in measures: measures.append(c)
            for m in columns_meta:
                if m["name"] == c:
                    m["role"] = "measure"

    # 4) Order measures by usefulness
    def _measure_priority(n: str) -> Tuple[int, str]:
        nl = n.lower()
        if "revenue" in nl or "sales" in nl or "amount" in nl or "total" in nl: return (0, n)
        if "qty" in nl or "quantity" in nl or "units" in nl or "count" in nl:   return (1, n)
        if "price" in nl or "cost" in nl or "rate" in nl or "fee" in nl:        return (2, n)
        if "discount" in nl or "tax" in nl or "margin" in nl:                   return (3, n)
        return (9, n)
    measures = sorted(measures, key=_measure_priority)

    # 5) Builder options (hard-pruned dims)
    final_dim_cols: List[str] = []
    for d in dims:
        meta = next((m for m in columns_meta if m["name"] == d), None)
        if not meta: continue
        if meta.get("id_like") or meta.get("high_card"):  # prune
            continue
        final_dim_cols.append(d)

    x_options = list(times) + final_dim_cols
    y_options = measures

    profile = {
        "rows": nrows,
        "ncols": len(df.columns),
        "n_measures": len(measures),
        "n_dims": len(dims),
        "n_time": len(times),
        "good_dims": final_dim_cols,
        "id_like_dims": [m["name"] for m in columns_meta if m["role"]=="dimension" and m["id_like"]],
        "high_card_dims": [m["name"] for m in columns_meta if m["role"]=="dimension" and m["high_card"]],
    }

    return {
        "df": df,
        "columns_meta": columns_meta,
        "x_options": x_options,
        "y_options": y_options,
        "profile": profile,
    }
