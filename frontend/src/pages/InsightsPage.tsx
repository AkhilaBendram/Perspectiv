import { Link } from "react-router-dom";
import StarBG from "../components/StarBG";
import { useAppStore } from "../store";
import ChartPanel from "../components/ChartPanel";

export default function InsightsPage() {
  const analyze = useAppStore((s) => s.analyze);
  const addSuggestion = useAppStore((s) => s.addSuggestion);

  if (!analyze) {
    return (
      <StarBG>
        <div className="min-h-screen flex items-center justify-center text-white px-6">
          <div className="glass p-6 text-center space-y-3">
            <p className="text-gray-300">No analysis yet.</p>
            <p className="text-sm text-gray-400">
              Upload a CSV to generate AI summaries, insights, and visual suggestions.
            </p>
            <Link to="/upload" className="px-4 py-2 rounded-xl bg-white/10 border border-white/15">
              Upload CSV
            </Link>
          </div>
        </div>
      </StarBG>
    );
  }

  const fileName = analyze.file_name || "dataset.csv";
  const summary = analyze.summary || "No summary available.";
  const ai = analyze.ai_summary || null;
  const suggestions = analyze.suggestions || [];
  const cols = analyze.columns_meta || [];

  return (
    <StarBG>
      <div className="min-h-screen text-white px-6 py-10 max-w-6xl mx-auto space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold text-metal">AI Insights</h1>
          <p className="text-sm text-gray-400">{fileName}</p>
        </header>

        <section className="glass p-5 space-y-3">
          <h2 className="font-semibold text-metal text-lg">Summary</h2>
          <p className="text-gray-200">{summary}</p>
          {ai ? <p className="text-gray-300">{ai}</p> : null}
        </section>

        <section className="glass p-5 space-y-3">
          <h2 className="font-semibold text-metal text-lg">Columns</h2>
          <div className="flex flex-wrap gap-2">
            {cols.map((c) => (
              <span
                key={c.name}
                className="px-2.5 py-1 rounded-xl border border-white/15 text-xs bg-white/5"
              >
                {c.name} · <em className="text-gray-400">{c.role}</em>
              </span>
            ))}
          </div>
        </section>

        {suggestions.length > 0 ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-metal text-lg">Suggested Visuals</h2>
              <Link to="/dashboard" className="text-sm underline underline-offset-4 text-gray-300">
                Open Dashboard →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {suggestions.map((s) => (
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
          </section>
        ) : null}

        <div className="text-center">
          <Link to="/dashboard" className="px-4 py-2 rounded-xl bg-white/10 border border-white/15">
            Open Dashboard →
          </Link>
        </div>
      </div>
    </StarBG>
  );
}
