import { useRef } from "react";
import ReactECharts from "echarts-for-react";

type ChartPanelProps = {
  title: string;
  option?: Record<string, unknown> | null;
};

export default function ChartPanel({ title, option }: ChartPanelProps) {
  const chartRef = useRef<ReactECharts | null>(null);

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(
        JSON.stringify(option ?? { title }, null, 2)
      );
    } catch {
      // ignore clipboard failures
    }
  };

  const handleDownload = () => {
    const instance = chartRef.current?.getEchartsInstance?.();
    if (!instance) return;
    const url = instance.getDataURL({
      type: "png",
      pixelRatio: 2,
      backgroundColor: "transparent",
    });
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${title.replace(/\s+/g, "_")}.png`;
    anchor.click();
  };

  return (
    <div className="glass p-5 min-h-[340px]">
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="text-lg font-semibold truncate" title={title}>
          {title}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="text-xs px-2 py-1 rounded-lg bg-white/10 border border-white/15"
          >
            Copy
          </button>
          <button
            onClick={handleDownload}
            className="text-xs px-2 py-1 rounded-lg bg-white/10 border border-white/15"
          >
            Download
          </button>
        </div>
      </div>

      {option ? (
        <ReactECharts
          ref={chartRef}
          option={{ ...option, backgroundColor: "transparent" }}
          style={{ height: 260 }}
          notMerge
          lazyUpdate
        />
      ) : (
        <div className="h-[260px] flex items-center justify-center text-sm text-gray-400">
          No visualization data available for this chart.
        </div>
      )}
    </div>
  );
}
