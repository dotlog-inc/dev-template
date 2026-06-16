"use client";

import { useState } from "react";
import { useUser } from "@/components/user-provider";
import type { ChatMessage } from "@/lib/types";

/**
 * ストリーミングが必要なため、唯一 Route Handler(/api/chat) を使う場所。
 * 会話はこの画面限りなのでローカル state で十分
 * (永続化したくなったらBEに保存してServer Componentで初期表示する)。
 */
export function Chat({ orgId, memoId }: { orgId: string; memoId: string }) {
  const user = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || streaming) return;

    const history: ChatMessage[] = [...messages, { role: "user", content: question }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, memoId, messages: history }),
      });
      if (!res.ok || !res.body) throw new Error("chat failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          next[next.length - 1] = { ...last, content: last.content + chunk };
          return next;
        });
      }
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: "回答を取得できませんでした。もう一度お試しください。",
        };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <section className="chat">
      <h2 className="chat__title">このメモについてAIに聞く</h2>
      <div className="chat__log">
        {messages.map((m, i) => (
          <div key={i} className={`chat__msg chat__msg--${m.role === "user" ? "user" : "ai"}`}>
            <span className="chat__msg-name">{m.role === "user" ? user.name : "AI"}</span>
            {m.content || "…"}
          </div>
        ))}
      </div>
      <form className="chat__form" onSubmit={send}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="例: このメモの結論を一行で教えて"
          aria-label="AIへの質問"
        />
        <button className="btn" type="submit" disabled={streaming || !input.trim()}>
          送信
        </button>
      </form>
    </section>
  );
}
