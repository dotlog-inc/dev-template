"use client";

import { useState, useTransition } from "react";
import { createMemo, getUploadUrl } from "../../actions";

/**
 * "use client" が必要な数少ないコンポーネントの1つ。
 * 送信フロー:
 *   ① Server Action経由でBEから署名URLを取得
 *   ② ブラウザからGCS(モックでは /api/mock-upload)へ直接PUT
 *   ③ objectPath だけを Server Action に渡してメモ作成
 */
export function MemoForm({ orgId }: { orgId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const files = (data.getAll("images") as File[]).filter((f) => f.size > 0);

    startTransition(async () => {
      setError(null);
      try {
        const imagePaths: string[] = [];
        for (const file of files) {
          const { uploadUrl, objectPath } = await getUploadUrl(file.type);
          const res = await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });
          if (!res.ok) throw new Error("upload failed");
          imagePaths.push(objectPath);
        }
        const result = await createMemo(orgId, {
          title: String(data.get("title") ?? ""),
          body: String(data.get("body") ?? ""),
          imagePaths,
        });
        if (result?.error) setError(result.error);
        // 成功時は action 内の redirect で一覧へ遷移する
      } catch {
        setError("画像のアップロードに失敗しました。");
      }
    });
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <label>
        タイトル
        <input type="text" name="title" placeholder="例: 週次定例の論点整理" />
      </label>
      <label>
        本文
        <textarea name="body" placeholder="メモの内容" />
      </label>
      <label>
        画像(複数可)
        <input type="file" name="images" accept="image/*" multiple />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "保存中…" : "メモを保存"}
      </button>
    </form>
  );
}
