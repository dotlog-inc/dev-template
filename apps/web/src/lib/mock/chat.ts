import type { ChatMessage, Memo } from "../types";

/**
 * モックのAI回答ストリーム。
 * 本番ではBE側がVertex AI(Gemini)を呼び、SSE等でストリームを返す想定。
 * FE側の実装(逐次読み取り・逐次描画)は本番と同じものを使う。
 */
export function mockChatStream(
  memo: Memo,
  messages: ChatMessage[]
): ReadableStream<Uint8Array> {
  const question = messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
  const excerpt = memo.body.replace(/\s+/g, " ").slice(0, 60);
  const answer =
    `(モックAI) ご質問「${question}」について、メモ「${memo.title}」を確認しました。\n\n` +
    `このメモの要点は「${excerpt}…」という内容です。` +
    `本番ではBE側でメモ本文と添付画像をコンテキストとしてVertex AIに渡し、その回答がここにストリーム表示されます。`;

  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      return new Promise((resolve) => {
        setTimeout(() => {
          if (i >= answer.length) {
            controller.close();
          } else {
            controller.enqueue(encoder.encode(answer.slice(i, i + 4)));
            i += 4;
          }
          resolve();
        }, 18);
      });
    },
  });
}
