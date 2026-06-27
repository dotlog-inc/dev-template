import { beHeaders } from "@/lib/api";
import { getUid } from "@/lib/auth";
import { mockChatStream } from "@/lib/mock/chat";
import { db, roleOf } from "@/lib/mock/db";

/**
 * アプリ内で唯一のRoute Handler。
 * ストリーミング(AI回答)のためだけに存在し、認証を付けてBEへ素通しする。
 *
 * 認可契約 (実BEもこれと同じ挙動を実装すること):
 *   - 組織に属していない uid → 403
 *   - その組織に該当メモが無い → 404
 * orgId/memoId はクライアント由来なので、ページのロード時チェックとは別に
 * このエンドポイント自身が必ず検証する(§5: 認可の最終判断はBE)。
 */
export async function POST(req: Request) {
  const uid = await getUid();
  if (!uid) return new Response("Unauthorized", { status: 401 });

  const { orgId, memoId, messages } = await req.json();

  // モックモード: 認可を検証してからメモを読み、擬似AIストリームを返す。
  // (実BEと同じ403/404を返すことで handlers.ts と並ぶ「BE仕様」になる — §13)
  if (!process.env.BE_URL) {
    if (!roleOf(orgId, uid)) return new Response("Forbidden", { status: 403 });
    const memo = db.memos.find((m) => m.id === memoId && m.orgId === orgId);
    if (!memo) return new Response("Not found", { status: 404 });
    return new Response(mockChatStream(memo, messages), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // 本番: BE(Vertex AI)のストリームをそのまま中継する。認可はBEが行う。
  // 認証ヘッダは api() と同じ beHeaders() で組み立てる(付与漏れを構造的に防ぐ)。
  const res = await fetch(`${process.env.BE_URL}/orgs/${orgId}/memos/${memoId}/chat`, {
    method: "POST",
    headers: await beHeaders(uid),
    body: JSON.stringify({ messages }),
  });
  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "text/plain; charset=utf-8",
    },
  });
}
