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
