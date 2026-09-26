/**
 * item の取得・追加（API の呼び出しだけを持つ）。
 *
 * **React の状態に触れない。** 画面（`src/app/page.tsx`）から切り離してあるのは、
 * 「押した操作が API へ何を送り、応答をどう解釈するか」を DOM 無しで検査できるようにするため。
 */

export type Item = {
  id: number;
  name: string;
  created_at: string;
};

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export async function fetchItems(): Promise<Item[]> {
  const res = await fetch(`${API_BASE}/items`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET /items failed: ${res.status}`);
  return (await res.json()) as Item[];
}

export async function createItem(name: string): Promise<void> {
  const res = await fetch(`${API_BASE}/items`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`POST /items failed: ${res.status}`);
}

/** 例外を画面に出す 1 行にする。Error 以外が投げられても落ちないようにするため */
export const toMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));
