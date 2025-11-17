// src/api.ts
// Frontend API + normalization so UI never depends on backend internals.

import type {
  Role,
  ColumnMeta,
  AnalyzeResponse,
  Suggestion,
  ChartSpec,
  ChatMessage,
  AskAiResponse,
} from "./types";

export const BASE = "https://perspectiv-production.up.railway.app";

async function http<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { ...(init?.headers || {}) } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} - ${text || url}`);
  }
  try {
    return (await res.json()) as T;
  } catch {
    throw new Error(`Invalid JSON from ${url}`);
  }
}

const MAX_CATS_FOR_SUGGESTIONS = 30;

function isIdLike(name: string, distinct: number, rows: number): boolean {
  const nl = (name || "").toLowerCase();
  const patterns = [
    /\b(id|uuid|guid)\b/,
    /_id\b/,
    /\bid_/,
    /\border[_\- ]?id\b/,
    /\b(order|invoice|receipt)\b/,
    /^ord[\-_]/,
    /\bserial\b/,
    /\bnumber\b/,
  ];
  if (patterns.some((re) => re.test(nl))) return true;
  return distinct >= 0.95 * Math.max(1, rows); // near-unique → not a good dim
}

function roleOf(meta: ColumnMeta): Role {
  if (meta.role === "time" || meta.role === "dimension" || meta.role === "measure") return meta.role;
  const dt = (meta.dtype || "").toLowerCase();
  if (dt.includes("date")) return "time";
  if (/(int|float|double|numeric|number|decimal)/.test(dt)) return "measure";
  return "dimension";
}

function pruneColumns(
  cols: ColumnMeta[] = [],
  rows: number
): { safeDims: string[]; timeCols: string[]; measures: string[] } {
  const timeCols: string[] = [];
  const measures: string[] = [];
  const dims: string[] = [];
  for (const c of cols) {
    const r = roleOf(c);
    const distinct = c.distinct ?? 0;
    if (r === "time") timeCols.push(c.name);
    else if (r === "measure") measures.push(c.name);
    else if (!isIdLike(c.name, distinct, rows) && distinct <= MAX_CATS_FOR_SUGGESTIONS) dims.push(c.name);
  }
  return { safeDims: dims, timeCols, measures };
}

function normalizeSuggestions(sugs: any[]): Suggestion[] {
  if (!Array.isArray(sugs)) return [];
  return sugs
    .map((s, i) => {
      const spec: ChartSpec =
        s.spec ??
        ({
          x: s.x ?? null,
          y: s.y ?? null,
          agg: s.agg ?? null,
          chart: s.type ?? "bar",
        } as ChartSpec);
      return {
        id: String(s.id ?? `s${i + 1}`),
        title: String(s.title ?? "Chart"),
        spec,
        option: s.option ?? {},
      };
    })
    .filter((s) => s.option && typeof s.option === "object");
}

export async function analyzeCsv(file: File): Promise<AnalyzeResponse> {
  const fd = new FormData();
  fd.append("file", file);

  const raw = await http<any>(`${BASE}/analyze`, { method: "POST", body: fd });

  const file_name = raw.file_name ?? raw.file ?? file.name ?? "dataset.csv";
  const rows: number =
    raw.rows ??
    raw.profile?.rows ??
    raw.profile?.row_count ??
    raw.profile?.nrows ??
    0;

  const columns_meta: ColumnMeta[] =
    raw.columns_meta ??
    raw.columnsMeta ??
    raw.profile?.columns ??
    [];

  const { safeDims, timeCols, measures } = pruneColumns(columns_meta, rows);

  const x_options = [...timeCols, ...safeDims].filter((c, i, a) => a.indexOf(c) === i);
  const y_options = measures;

  const suggestions = normalizeSuggestions(raw.suggestions ?? raw.charts ?? []);
  const columnsCount =
    raw.columns ??
    (Array.isArray(raw.columns) ? raw.columns.length : undefined) ??
    columns_meta.length;

  const summary =
    raw.summary ??
    raw.profile?.headline ??
    `Detected ${columnsCount} columns over ${rows} rows.`;

  const ai_summary = raw.ai_summary ?? raw.aiSummary ?? null;

  return {
    file_name,
    rows,
    columns: columnsCount,
    columns_meta,
    x_options,
    y_options,
    suggestions,
    summary,
    ai_summary,
  };
}

export async function analyzeCustom(payload: ChartSpec) {
  return http<{ title: string; option: any }>(`${BASE}/analyze/custom`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function narrate(payload: {
  dataset_stats: Record<string, unknown>;
  charts_meta: Array<{ title: string; highlights?: string[] }>;
}) {
  return http<{ bullets: string[]; summary: string }>(`${BASE}/narrate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// Back-compat shim for older Upload pages
export async function analyze(file: File) {
  return analyzeCsv(file);
}

export async function askAi(_: {
  prompt: string;
  token?: string;
  history?: ChatMessage[];
}): Promise<AskAiResponse> {
  return {
    reply: "The assistant is not configured for this environment.",
  };
}
