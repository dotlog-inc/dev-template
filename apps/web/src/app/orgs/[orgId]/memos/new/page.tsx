/**
 * メモ作成ページ。入力フォーム(MemoForm)を置くだけの薄い枠。
 *
 * なぜここか: フォームはファイル読み取り+GCS直PUTで "use client" が要る末端部品なので、この
 *   ルート専用の _components/ に切り出し、ページ本体は Server Component のまま保つ(§8,§12)。
 */
import { MemoForm } from "./_components/memo-form";

export default async function NewMemoPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  return (
    <main className="page">
      <h1 className="page-title">新しいメモ</h1>
      <p className="page-sub">画像はGCSへ直接アップロードされ、メモにはパスだけが保存されます。</p>
      <MemoForm orgId={orgId} />
    </main>
  );
}
