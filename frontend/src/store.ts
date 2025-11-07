// src/store.ts
import { create } from "zustand";
import type { AnalyzeResponse, Suggestion, ChartSpec } from "./types";
import { analyzeCsv, analyzeCustom } from "./api";

export type ChartItem = {
  id: string;
  title: string;
  spec: ChartSpec;
  option: any;
};

type State = {
  fileName: string | null;
  analyze: AnalyzeResponse | null;
  charts: ChartItem[]; // newest first (prepend)
  busy: boolean;
  error: string | null;

  setAnalyzeFromFile: (file: File) => Promise<void>;
  addSuggestion: (s: Suggestion) => void;
  buildCustom: (spec: ChartSpec) => Promise<void>;
  setError: (e: string | null) => void;
  clear: () => void;
};

export const useAppStore = create<State>((set) => ({
  fileName: null,
  analyze: null,
  charts: [],
  busy: false,
  error: null,

  setAnalyzeFromFile: async (file: File) => {
    set({ busy: true, error: null });
    try {
      const a = await analyzeCsv(file);
      set({
        analyze: a,
        fileName: a.file_name,
        charts: [], // reset for new dataset
      });
    } catch (e: any) {
      set({ error: e?.message || String(e) });
    } finally {
      set({ busy: false });
    }
  },

  addSuggestion: (s: Suggestion) => {
    const item: ChartItem = {
      id: crypto.randomUUID(),
      title: s.title,
      spec: s.spec,
      option: s.option,
    };
    set((st) => ({ charts: [item, ...st.charts] })); // prepend
  },

  buildCustom: async (spec: ChartSpec) => {
    set({ busy: true, error: null });
    try {
      const res = await analyzeCustom(spec);
      const item: ChartItem = {
        id: crypto.randomUUID(),
        title: res.title,
        spec,
        option: res.option,
      };
      set((st) => ({ charts: [item, ...st.charts] })); // prepend
    } catch (e: any) {
      set({ error: e?.message || String(e) });
    } finally {
      set({ busy: false });
    }
  },

  setError: (e) => set({ error: e }),
  clear: () => set({ fileName: null, analyze: null, charts: [], error: null }),
}));
