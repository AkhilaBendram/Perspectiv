import { Link, useNavigate } from "react-router-dom";
import { useAppStore } from "../store";
import ChartPanel from "../components/ChartPanel";
import ChartBuilder from "../components/ChartBuilder";

export default function DashBoard() {
  const nav = useNavigate();
  const analyze = useAppStore((s) => s.analyze);
  const charts = useAppStore((s) => s.charts); // newest first
  const error = useAppStore((s) => s.error);
  const addSuggestion = useAppStore((s) => s.addSuggestion);
  const suggestions = analyze?.suggestions ?? [];

  if (!analyze) {
    nav("/upload");
    return null;
  }

  return (
    <div className="min-h-screen w-full px-5 sm:px-8 py-10">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-4xl font-extrabold">Perspectiv Dashboard</h1>
            <p className="text-sm text-gray-400">
              {analyze.file_name} · {analyze.rows.toLocaleString()} rows · {analyze.columns} columns
            </p>
          </div>
          <Link to="/insights" className="text-sm underline underline-offset-4 text-gray-300">
            View AI Insights
          </Link>
        </div>

        <div className="grid xl:grid-cols-4 gap-6 mt-8">
          <div className="xl:col-span-3">
            {charts.length === 0 ? (
              <div className="glass p-12 text-center text-gray-400">
                No charts yet. Use the builder on the right or pin suggestions below.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {charts.map((c) => (
                  <ChartPanel key={c.id} title={c.title} option={c.option} />
                ))}
              </div>
            )}

            {suggestions.length > 0 && (
              <div className="mt-8 space-y-3">
                <h2 className="text-lg font-semibold text-metal">Suggested Visuals</h2>
                <div className="grid md:grid-cols-2 gap-6">
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
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <ChartBuilder />
            <div className="glass p-5">
              <div className="text-lg font-semibold mb-3">Dataset summary</div>
              <div className="text-sm text-gray-300">
                {analyze.summary || "No summary available."}
              </div>
              <div className="text-xs text-gray-400 mt-3">
                ROWS: {analyze.rows.toLocaleString()} &nbsp; COLUMNS: {analyze.columns}
              </div>
            </div>
            {error && <div className="glass p-4 text-rose-300 text-xs">{error}</div>}
          </aside>
        </div>
      </div>
    </div>
  );
}
