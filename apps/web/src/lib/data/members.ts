import { api } from "@/lib/api";
import type { Member } from "@/lib/types";

/**
 * 組織メンバー一覧のBE取得関数。
 *
 * なぜここか: §12 の規約で取得関数は使用箇所が1つでも lib/data/<機能>.ts に集約する。
 * 背景: 表示可否はFEでも出し分けるが(admin判定)、最終的な認可はBEが403で行う(§5)。
 *   閲覧文脈は per-user なので共有キャッシュに乗せない(no-store・§6-3)。
 */
export async function getMembers(orgId: string): Promise<Member[]> {
  return api<Member[]>(`/orgs/${orgId}/members`, { cache: "no-store" });
}
