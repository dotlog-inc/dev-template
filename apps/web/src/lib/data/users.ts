import { cache } from "react";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

/**
 * per-user データ取得 — ログイン中ユーザー自身の情報(/me)。
 *
 * なぜここか: BE取得関数は使用箇所が1つでも lib/data/<機能>.ts に置く規約(§12)。エンドポイントと
 *   キャッシュ方針を機能単位で1箇所に集め、Server Componentは「何を取るか」だけ書けばよくする。
 *   users.ts を独立させてあるのは「ユーザー固有データ」の境界を物理的に見せるため — ここを共有
 *   キャッシュに乗せると他人のデータが見える事故になる(本アーキで最重大の禁止事項・§6-3)。
 * 背景(下の実装): per-userなので no-store。さらに React.cache でリクエスト内の重複を1回に畳むので、
 *   layout と page が両方 getCurrentUser() を呼んでもBEへの問い合わせは1リクエスト1回(§6-3)。
 */
export const getCurrentUser = cache(async (): Promise<User> => {
  return api<User>("/me", { cache: "no-store" });
});
