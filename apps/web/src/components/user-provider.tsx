"use client";

import { createContext, useContext } from "react";
import type { User } from "@/lib/types";

/**
 * サーバーが確定させたユーザー情報の「読み取り専用」配布。
 * ここから更新は行わない(更新はServer Action → revalidateで反映する)。
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
