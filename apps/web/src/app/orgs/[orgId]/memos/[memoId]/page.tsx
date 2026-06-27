/**
 * メモ詳細ページ。本文・添付画像を表示し、AIチャット(Chat)を載せる。
 *
 * なぜここか: ルート専用部品(_components/chat.tsx)と同居させるコロケーション(§12)。
 * 背景: 取得は getMemo(per-user, no-store)。BEの404は notFound() に変換する(§14)。画像は
 *   署名付きURLになりうるため next/image を使わず素の <img> で出す(§10)。
 */
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api";
import { imageUrl } from "@/lib/images";
import { getMemo } from "@/lib/data/memos";
import type { Memo } from "@/lib/types";
import { Chat } from "./_components/chat";

export default async function MemoDetailPage({
  params,
}: {
  params: Promise<{ orgId: string; memoId: string }>;
}) {
  const { orgId, memoId } = await params;

  let memo: Memo;
  try {
    memo = await getMemo(orgId, memoId);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  return (
    <main className="page">
      <h1 className="page-title">{memo.title}</h1>
      <p className="page-sub">
        {memo.authorName} ・ {new Date(memo.createdAt).toLocaleString("ja-JP")}
      </p>

      <div className="memo-body">{memo.body}</div>

      {memo.imagePaths.length > 0 && (
        <div className="memo-images">
          {memo.imagePaths.map((p) => (
            // 本番の画像は BE が返す署名付きURL(任意ドメイン+期限付きクエリ)。
            // next/image の remotePatterns/最適化プロキシとは相性が悪いため、
            // 素の <img> で表示する (ARCHITECTURE.md §10)。
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p} src={imageUrl(p)} alt="添付画像" />
          ))}
        </div>
      )}

      <Chat orgId={orgId} memoId={memo.id} />
    </main>
  );
}
