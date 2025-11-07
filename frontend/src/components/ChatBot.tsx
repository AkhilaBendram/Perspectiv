import { useState } from "react";
import { askAi } from "../api";
import { useAppStore } from "../store";
import type { ChatMessage } from "../types";

export default function ChatBot() {
  const session = useAppStore((state) => state.analyze);
  const token = session?.token;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const text = input.trim();
    if (!text || !token) return;

    setInput("");
    setBusy(true);

    const userMessage: ChatMessage = { from: "user", text };
    const history: ChatMessage[] = [...messages, userMessage];
    setMessages(history);

    try {
      const { reply } = await askAi({
        prompt: text,
        token,
        history,
      });
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: reply || "No answer." },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          text:
            error instanceof Error
              ? error.message
              : "The assistant could not respond.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="chrome-card p-4 h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-3">AI Assistant</h3>
      {!token ? (
        <p className="text-sm text-gray-400">
          Upload a dataset to start a conversation about your insights.
        </p>
      ) : null}

      <div className="flex-1 overflow-y-auto space-y-2 mb-3 bg-black/20 rounded-md p-2 border border-white/5">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`px-3 py-2 rounded-md max-w-[70%] ${
              msg.from === "user"
                ? "ml-auto bg-blue-600 text-white"
                : "mr-auto bg-neutral-800 text-gray-200"
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={
            token ? "Ask about your data..." : "Upload data to enable chat"
          }
          className="flex-1 px-3 py-2 rounded-md bg-neutral-800 text-white border border-white/10 disabled:opacity-50"
          disabled={!token || busy}
        />
        <button
          onClick={send}
          className="btn-metal min-w-[88px]"
          disabled={!token || busy}
        >
          {busy ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
