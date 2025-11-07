import { memo } from "react";

export default memo(function NarrationPanel({
  bullets,
  summary,
  busy,
}: { bullets: string[]; summary: string; busy: boolean }) {
  return (
    <div className="chrome-card p-5">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">AI Narration</div>
        {busy && <div className="text-xs text-gray-400">Thinking…</div>}
      </div>

      {bullets?.length ? (
        <ul className="mt-3 list-disc list-inside text-sm text-gray-300 space-y-1">
          {bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      ) : null}

      <p className="mt-3 text-gray-200 text-sm leading-relaxed">
        {summary || (busy ? "Generating summary…" : "No narrative yet. Add a chart to start.")}
      </p>
    </div>
  );
});
