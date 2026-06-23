/**
 * メモ機能のBE取得関数(取得のみ・薄いラッパ)。
 *
 * なぜここか: §12「BE取得関数は最初から lib/data/<機能>.ts」。エンドポイントの組み立てと
 *   キャッシュ方針だけを持ち、ビジネスロジックは持たない(ロジックの持ち主はBE)。
 * 背景: 自分のメモ一覧は per-user なので no-store(§6-3)。一覧のページ番号はURL由来(§7)。
 */
import { api } from "@/lib/api";
import type { Memo, MemoPage } from "@/lib/types";

/**
 * 自分のメモ一覧を取得する。
 * ユーザー固有データなので共有キャッシュには乗せない(cache: "no-store")。
 */
export async function getMyMemos(orgId: string, page: number): Promise<MemoPage> {
  return api<MemoPage>(`/orgs/${orgId}/memos?author=me&page=${page}&limit=10`, {
    cache: "no-store",
  });
}

/**
 * メモ1件を取得する。存在しなければ ApiError(404) を throw する
 * (404→notFound() への変換は呼び出し側ページの責務 — §14)。
 */
export async function getMemo(orgId: string, memoId: string): Promise<Memo> {
  return api<Memo>(`/orgs/${orgId}/memos/${memoId}`, { cache: "no-store" });
}
