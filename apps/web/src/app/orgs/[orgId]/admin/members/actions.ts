"use server";

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
