import { notFound } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { imageUrl } from "@/lib/images";
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
    memo = await api<Memo>(`/orgs/${orgId}/memos/${memoId}`, { cache: "no-store" });
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
