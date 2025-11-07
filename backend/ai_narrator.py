import os
from typing import List, Dict, Any

def narrate_from_stats(columns: List[Dict[str, Any]], sample: List[Dict[str, Any]], focus=None):
    dims = [c for c in columns if c["role"]=="dimension"]
    times = [c for c in columns if c["role"]=="time"]
    nums = [c for c in columns if c["role"]=="measure"]
    bullets = []
    if dims: bullets.append(f"{len(dims)} categorical columns (e.g., {dims[0]['name']}).")
    if nums: bullets.append(f"{len(nums)} numeric measures (first: {nums[0]['name']}).")
    if times: bullets.append(f"Time present ({times[0]['name']}); trend charts available.")
    if not bullets: bullets.append("Dataset looks sparse; try a different slice.")
    summary = " ".join(bullets)
    # You can plug GROQ here later; keep same return shape.
    return summary, bullets
