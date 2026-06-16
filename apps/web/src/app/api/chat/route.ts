import { getUid } from "@/lib/auth";
import { mockChatStream } from "@/lib/mock/chat";
import { db } from "@/lib/mock/db";

/**
 * アプリ内で唯一のRoute Handler。
 * ストリーミング(AI回答)のためだけに存在し、認証を付けてBEへ素通しする。
 */
export async function POST(req: Request) {
  const uid = await getUid();
  if (!uid) return new Response("Unauthorized", { status: 401 });

  const { orgId, memoId, messages } = await req.json();

  // モックモード: メモを読んで擬似AIストリームを返す
  if (!process.env.BE_URL) {
    const memo = db.memos.find((m) => m.id === memoId && m.orgId === orgId);
    if (!memo) return new Response("Not found", { status: 404 });
    return new Response(mockChatStream(memo, messages), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // 本番: BE(Vertex AI)のストリームをそのまま中継する
  // 認証ヘッダの付与方法は lib/api.ts と同じ(GCP IDトークン + X-User-Id)
  const res = await fetch(`${process.env.BE_URL}/orgs/${orgId}/memos/${memoId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": uid },
    body: JSON.stringify({ messages }),
  });
  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "text/plain; charset=utf-8",
    },
  });
}
