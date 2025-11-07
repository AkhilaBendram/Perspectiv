import { useAppStore } from "../store";
import type { Suggestion } from "../types";
import ChartPanel from "./ChartPanel";

export default function SuggestedVisuals({ items }: { items: Suggestion[] }) {
  const addSuggestion = useAppStore((s) => s.addSuggestion);
  if (!items?.length) return null;

  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
      {items.map((s) => (
        <div key={s.id} className="space-y-3">
          <ChartPanel title={s.title} option={s.option} />
          <button
            onClick={() => addSuggestion(s)}
            className="w-full px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-sm"
          >
            Pin to dashboard (adds to top)
          </button>
        </div>
      ))}
    </div>
  );
}
