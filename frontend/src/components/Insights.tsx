export default function Insights({
  columns,
  summary
}: {
  columns: string[];
  summary?: string;
}) {
  return (
    <div className="w-full">
      {summary ? <div className="chrome-card p-4 mb-6 text-center text-gray-200">{summary}</div> : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {columns.map((c, i) => (
          <div key={c + i} className="chrome-card p-4 text-gray-200">
            {c}
          </div>
        ))}
      </div>
    </div>
  );
}
