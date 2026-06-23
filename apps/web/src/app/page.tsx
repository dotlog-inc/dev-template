/**
 * トップページ。所属組織を見て最初の組織のメモ一覧へ送るだけの入口。
 *
 * なぜ存在するか: ルート "/" に来たユーザーを適切な組織コンテキストへ誘導するため。「現在の組織は
 *   URLが持つ」設計なので、ここで最初の orgs/<id>/memos を決めて redirect する。
 * 背景: 組織未所属のときだけ静的メッセージを出す。getCurrentUser は per-user 取得(§6-3)。
 */
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/data/users";

export default async function Home() {
  const user = await getCurrentUser();
  const org = user.orgs[0];
  if (!org) {
    return <main className="page"><p className="empty">所属している組織がありません。</p></main>;
  }
  redirect(`/orgs/${org.id}/memos`);
}
