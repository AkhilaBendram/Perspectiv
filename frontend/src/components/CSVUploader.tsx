import type { ChangeEvent } from "react";
import { useAppStore } from "../store";
import { useNavigate } from "react-router-dom";

export default function CSVUploader() {
  const setAnalyzeFromFile = useAppStore((s) => s.setAnalyzeFromFile);
  const busy = useAppStore((s) => s.busy);
  const error = useAppStore((s) => s.error);
  const setError = useAppStore((s) => s.setError);
  const nav = useNavigate();

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      await setAnalyzeFromFile(file);
      nav("/insights");
    } catch (error) {
      console.error(error);
      setError(
        error instanceof Error
          ? error.message
          : "Upload failed. Please check your backend and try again."
      );
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <label className="btn-metal cursor-pointer">
        <input
          type="file"
          accept=".csv"
          className="hidden"
          onChange={pick}
          disabled={busy}
        />
        {busy ? "Analyzing..." : "Upload CSV"}
      </label>
      {error ? <p className="text-red-400 text-sm">{error}</p> : null}
    </div>
  );
}
