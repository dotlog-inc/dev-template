import { cache } from "react";
import { api } from "./api";
import type { User } from "./types";

/**
 * リクエスト内で何度呼んでもBEへの問い合わせは1回(React.cache)。
 * ユーザー固有データなのでリクエストをまたぐキャッシュには乗せない。
 */
export const getCurrentUser = cache(async (): Promise<User> => {
  return api<User>("/me", { cache: "no-store" });
});
