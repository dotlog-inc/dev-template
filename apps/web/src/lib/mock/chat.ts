import type { ChatMessage, Memo } from "../types";

/**
 * モックのAI回答ストリーム生成。
 *
 * なぜ存在するか: 本番でBE(Vertex AI/Gemini)が返すストリームの代役。これがあることで、
 *   AIチャットUIを本番BE無しで開発・確認できる。
 * なぜここか: モック専用なので lib/mock/。本番では使われない。
 * 背景: FE側の読み取り・逐次描画コード(chat.tsx)はモックと本番で完全に同一になるよう、
 *   ここは「同じ形のストリーム」を返すことだけに責任を持つ(ARCHITECTURE.md §11)。
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
