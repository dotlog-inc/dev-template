/**
 * メンバー管理ページ(admin専用)。メンバー一覧と権限変更ボタンを出す。
 *
 * なぜここか: admin機能一式(page + actions)をこのルートに同居(§12)。
 * 背景: 冒頭の admin 判定は画面の出し分け(UX)にすぎず、すり抜けても害はない。権限変更の最終的な
 *   可否はBEが403で判断する — FEとBEで役割が違う二段構えの認可(§5)。
 */
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/data/users";
import { getMembers } from "@/lib/data/members";
import { updateRole } from "./actions";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  // 画面の出し分け(UX)。最終防衛線はBE側の403。
  const me = await getCurrentUser();
  if (me.orgs.find((o) => o.id === orgId)?.role !== "admin") notFound();

  const members = await getMembers(orgId);

  return (
    <main className="page">
      <h1 className="page-title">メンバー管理</h1>
      <p className="page-sub">権限の変更は即座に反映されます。</p>
      <table className="member-table">
        <thead>
          <tr>
            <th>名前</th>
            <th>メール</th>
            <th>権限</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => {
            const nextRole = m.role === "admin" ? "member" : "admin";
            return (
              <tr key={m.userId}>
                <td>{m.name}</td>
                <td>{m.email}</td>
                <td>
                  <span className={`role-badge ${m.role === "admin" ? "role-badge--admin" : ""}`}>
                    {m.role}
                  </span>
                </td>
                <td>
                  {m.userId !== me.id && (
                    <form action={updateRole.bind(null, orgId, m.userId, nextRole)}>
                      <button className="btn btn--ghost" type="submit">
                        {nextRole === "admin" ? "adminにする" : "memberにする"}
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
