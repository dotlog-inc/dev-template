"use server";

import { redirect } from "next/navigation";
import { api, ApiError } from "@/lib/api";

export type CreateMemoResult = { error: string } | undefined;

/** 画像アップロード用の署名URLをBEから取得する(ブラウザはBEを直接叩かない) */
export async function getUploadUrl(contentType: string) {
  return api<{ uploadUrl: string; objectPath: string }>("/uploads/signed-url", {
    method: "POST",
    body: JSON.stringify({ contentType }),
  });
}

export async function createMemo(
  orgId: string,
  input: { title: string; body: string; imagePaths: string[] }
): Promise<CreateMemoResult> {
  if (!input.title.trim()) {
    return { error: "タイトルを入力してください。" };
  }
  try {
    await api(`/orgs/${orgId}/memos`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch (e) {
    if (e instanceof ApiError) return { error: "メモを保存できませんでした。" };
    throw e;
  }
  // 一覧は no-store なので、戻れば最新が表示される
  redirect(`/orgs/${orgId}/memos`);
}
