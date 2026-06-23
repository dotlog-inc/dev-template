/**
 * 組織レイアウト。組織ヘッダ(ナビ)と UserProvider をこの階層で配る。
 *
 * なぜここか: ヘッダもユーザー情報の配布も「組織コンテキスト(orgId)の内側」でだけ必要なので、
 *   ルートではなくこの組織配下 layout が持つ。URLの orgId から組織を引き、所属外なら notFound()。
 * 背景: ユーザー情報はサーバーが確定した値の読み取り専用配布として UserProvider(Context1個)で流す
 *   (ARCHITECTURE.md §7)。adminリンクの出し分けはUXで、最終的な認可はBE側(§5)。
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { UserProvider } from "@/components/user-provider";
import { getCurrentUser } from "@/lib/data/users";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const user = await getCurrentUser();
  const org = user.orgs.find((o) => o.id === orgId);
  if (!org) notFound();

  return (
    <UserProvider user={user}>
      <header className="site-header">
        <div className="site-header__inner">
          <span className="site-header__org">{org.name}</span>
          <nav className="site-header__nav">
            <Link href={`/orgs/${org.id}/memos`}>自分のメモ</Link>
            <Link href={`/orgs/${org.id}/memos/new`}>新しいメモ</Link>
            {org.role === "admin" && (
              <Link href={`/orgs/${org.id}/admin/members`}>メンバー管理</Link>
            )}
          </nav>
          <span className="site-header__user">{user.name}</span>
        </div>
      </header>
      {children}
    </UserProvider>
  );
}
