import Link from "next/link";
import { api } from "@/lib/api";
import type { MemoPage } from "@/lib/types";

export default async function MemosPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { orgId } = await params;
  const page = Math.max(1, Number((await searchParams).page ?? 1) || 1);

  // ユーザー固有データなので共有キャッシュには乗せない
  const { items, totalPages, total } = await api<MemoPage>(
    `/orgs/${orgId}/memos?author=me&page=${page}&limit=10`,
    { cache: "no-store" }
  );

  return (
    <main className="page">
      <h1 className="page-title">自分のメモ</h1>
      <p className="page-sub">{total} 件</p>

      {items.length === 0 ? (
        <p className="empty">
          メモはまだありません。<Link href={`/orgs/${orgId}/memos/new`}>最初のメモを書く</Link>
        </p>
      ) : (
        <ul className="memo-list">
          {items.map((memo) => (
            <li key={memo.id}>
              <Link className="memo-card" href={`/orgs/${orgId}/memos/${memo.id}`}>
                <p className="memo-card__title">{memo.title}</p>
                <div className="memo-card__meta">
                  <span>{new Date(memo.createdAt).toLocaleDateString("ja-JP")}</span>
                  {memo.imagePaths.length > 0 && <span>画像 {memo.imagePaths.length} 枚</span>}
                </div>
                <p className="memo-card__excerpt">{memo.body}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Pager page={page} totalPages={totalPages} />
    </main>
  );
}

/**
 * ページネーションは <Link> と searchParams だけで完結する。
 * クライアント状態ゼロ — ページ番号の持ち主はURL。
 */
function Pager({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="pager" aria-label="ページ送り">
      {page > 1 ? <Link href={`?page=${page - 1}`}>前のページ</Link> : <span />}
      <span className="pager__count">{page} / {totalPages}</span>
      {page < totalPages ? <Link href={`?page=${page + 1}`}>次のページ</Link> : <span />}
    </nav>
  );
}
