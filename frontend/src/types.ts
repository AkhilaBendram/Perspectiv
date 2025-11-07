// Shared frontend types that mirror the payloads returned by the backend.

export type Primitive = string | number | boolean | null;

export type Role = "time" | "dimension" | "measure";

export type ColumnMeta = {
  name: string;
  dtype?: string;
  role?: Role;
  distinct?: number;
  id_like?: boolean;
  high_card?: boolean;
};

export type ChartSpecType =
  | "bar"
  | "stacked"
  | "line"
  | "area"
  | "scatter"
  | "histogram"
  | "pie"
  | "donut"
  | "heatmap"
  | "box";

export type ChartType = Exclude<ChartSpecType, "stacked">;

export type Agg = "sum" | "mean" | "count" | "none";

export type ChartSpec = {
  x: string | null;
  y: string | null;
  agg: Agg | null;
  chart: ChartType;
};

export type Suggestion = {
  id: string;
  title: string;
  spec: ChartSpec;
  option: Record<string, unknown>;
};

export type ChartFilter =
  | "all"
  | "bar"
  | "line"
  | "area"
  | "scatter"
  | "hist"
  | "pie"
  | "donut"
  | "heatmap"
  | "box"
  | "trends"
  | "distributions";

export type SuggestionPill = {
  label: string;
  filter: ChartFilter;
  count?: number;
};

export type AnalyzeResponse = {
  file_name: string;
  rows: number;
  columns: number;
  summary: string;
  ai_summary?: string | null;
  columns_meta: ColumnMeta[];
  x_options: string[];
  y_options: string[];
  suggestions: Suggestion[];
  token?: string;
};

export type ChatMessage = {
  from: "user" | "bot";
  text: string;
};

export type AskAiResponse = {
  reply: string;
  suggestions?: Array<{
    title: string;
    chart: ChartSpecType;
    x?: string;
    y?: string;
    agg?: Agg;
    rationale?: string;
  }>;
  usedCharts?: string[];
};
