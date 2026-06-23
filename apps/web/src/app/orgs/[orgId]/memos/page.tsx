/**
 * 自分のメモ一覧ページ。ページ番号はURL(?page=N)で持つ。
 *
 * なぜここか: ページとその専用部品(下の Pager)はルートの近くに置くコロケーション(§12)。
 * 背景: 一覧データは per-user なので no-store(§6-3)。ページネーションはクライアント状態ゼロで
 *   <Link> と searchParams だけで完結させる(§7,§15)。Pager はまだ1箇所でしか使わないので、
 *   昇格(components/ への移動)せずこのファイルに同居させている(§12 昇格ルール)。
 */
import Link from "next/link";
import { getMyMemos } from "@/lib/data/memos";

export default async function MemosPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { orgId } = await params;
  // ページ番号の持ち主はURL (§7)。searchParams から正の整数へ正規化する。
  const page = Math.max(1, Number((await searchParams).page ?? 1) || 1);

  const { items, totalPages, total } = await getMyMemos(orgId, page);

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
      <span className="pager__count">
        {page} / {totalPages}
      </span>
      {page < totalPages ? <Link href={`?page=${page + 1}`}>次のページ</Link> : <span />}
    </nav>
  );
}
