"use server";

/**
 * メンバー権限変更の Server Action(admin機能・ルート同居)。
 *
 * なぜ存在するか: 書き込みは Server Action 経由の固定方針(§6-2)。検証 → api() → revalidate。
 * 背景: ここでのFEチェックは省略可能 — 認可の最終判断はBE(403)が持つ(§5)。成功後は
 *   revalidatePath で一覧を更新する(クライアント側のキャッシュ同期は書かない)。
 */

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";
import type { Role } from "@/lib/types";

export async function updateRole(orgId: string, userId: string, role: Role) {
  // FE側のチェックは省略可能 — 認可の最終判断はBE(403)が行う
  await api(`/orgs/${orgId}/members/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
  revalidatePath(`/orgs/${orgId}/admin/members`);
}
