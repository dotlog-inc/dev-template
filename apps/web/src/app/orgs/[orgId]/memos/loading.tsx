/**
 * メモ一覧の読み込み中表示(Next.jsの loading.tsx 規約)。
 *
 * なぜ存在するか: Server Component がデータを await する間の表示を、自前のローディング状態管理
 *   (useState/useEffect)無しでフレームワークに任せるため。ファイルを置くだけで Suspense 境界になる。
 * 背景: 「ローディングは loading.tsx、エラーは throw → error boundary」に寄せる方針(§6-1,§14)。
 */
export default function Loading() {
  return (
    <main className="page">
      <p className="empty">読み込み中…</p>
    </main>
  );
}
