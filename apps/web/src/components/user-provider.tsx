"use client";

import { createContext, useContext } from "react";
import type { User } from "@/lib/types";

/**
 * ユーザー情報の配布用 Context。サーバーが確定させた値の「読み取り専用」配布に徹する。
 *
 * なぜ存在するか: ユーザー情報は唯一の横断的データなので、Redux等のストアを入れず Context 1個で
 *   流す。クライアントからこの値を更新するのは禁止 — 更新は必ず Server Action 経由で、新しい値は
 *   サーバーから降ってくる(ARCHITECTURE.md §7)。
 * なぜここか: 2箇所以上(layout で提供・chat 等で参照)から使う共有部品なので components/ に置く(§12)。
 */
const UserContext = createContext<User | null>(null);

export function UserProvider({ user, children }: { user: User; children: React.ReactNode }) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useUser(): User {
  const user = useContext(UserContext);
  if (!user) throw new Error("useUser は UserProvider の内側で使ってください");
  return user;
}
