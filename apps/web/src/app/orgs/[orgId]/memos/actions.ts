"use server";

/**
 * メモ機能の書き込み(Server Action)。このルートの隣に置くコロケーション(§12)。
 *
 * なぜ存在するか: すべての書き込みは Server Action 経由という固定方針のため(§6-2)。パターンは
 *   「検証 → api()でBEへ → revalidate/redirect」。クライアントから直接BEは叩かない。
 * 背景: 画像は署名URL方式。getUploadUrl でBEから許可証(署名URL)を取り、実体のPUTはブラウザ→GCSで
 *   直接行い、ここには objectPath の文字列だけが返ってくる(§10)。
 */

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
