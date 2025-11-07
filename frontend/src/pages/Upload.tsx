import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store";
import StarBG from "../components/StarBG";

export default function Upload() {
  const nav = useNavigate();
  const { setAnalyzeFromFile, busy, error, setError } = useAppStore();
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function onAnalyze() {
    if (!file) return;
    try {
      await setAnalyzeFromFile(file);
      nav("/insights");
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    }
  }

  return (
    <StarBG>
      <div className="min-h-screen w-full flex items-center justify-center px-4">
        <div className="glass max-w-2xl w-full p-8">
          <h1 className="text-center text-4xl font-extrabold mb-2">Upload your data</h1>
          <p className="text-center text-gray-300/85 mb-8">
            Drop a CSV and Perspectiv will profile types, suggest visuals, and summarize.
          </p>

          <div className="glass p-10 flex flex-col items-center">
            <p className="text-sm text-gray-400 mb-4">
              Drag &amp; drop a <code>.csv</code> here
            </p>

            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <button
              onClick={() => inputRef.current?.click()}
              className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15"
            >
              Choose file
            </button>

            {file && <div className="mt-4 text-xs text-gray-400">{file.name}</div>}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={onAnalyze}
              disabled={!file || busy}
              className="px-5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 disabled:opacity-50"
            >
              {busy ? "Analyzing…" : "Analyze"}
            </button>
            {error && <div className="text-rose-300 text-xs">{error}</div>}
          </div>

          <p className="mt-4 text-xs text-gray-500">
            Tip: dates like <code>2025-11-01</code> parse best.
          </p>
        </div>
      </div>
    </StarBG>
  );
}
