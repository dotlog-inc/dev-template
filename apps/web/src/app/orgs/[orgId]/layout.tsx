import Link from "next/link";
import { notFound } from "next/navigation";
import { UserProvider } from "@/components/user-provider";
import { getCurrentUser } from "@/lib/session";

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
