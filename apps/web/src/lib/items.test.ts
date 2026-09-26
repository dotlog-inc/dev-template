/**
 * `src/lib/items.ts` の振る舞い。
 *
 * **見た目は検査しない。** ここが見るのは「どこへ何を送るか」と「失敗をどう伝えるか」だけ。
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { API_BASE, createItem, fetchItems, toMessage } from "./items";

const mockFetch = (response: Partial<Response>) => {
  const fetchMock = vi.fn(() => Promise.resolve(response as Response));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchItems", () => {
  it("API の /items を取得して配列を返す", async () => {
    const items = [{ id: 1, name: "foo", created_at: "2026-01-01T00:00:00Z" }];
    const fetchMock = mockFetch({ ok: true, json: () => Promise.resolve(items) });

    await expect(fetchItems()).resolves.toEqual(items);
    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/items`, { cache: "no-store" });
  });

  it("応答が ok でなければ status を含めて投げる", async () => {
    mockFetch({ ok: false, status: 503 });

    await expect(fetchItems()).rejects.toThrow("GET /items failed: 503");
  });
});

describe("createItem", () => {
  it("name を JSON で POST する", async () => {
    const fetchMock = mockFetch({ ok: true });

    await createItem("foo");

    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "foo" }),
    });
  });

  it("応答が ok でなければ status を含めて投げる", async () => {
    mockFetch({ ok: false, status: 422 });

    await expect(createItem("foo")).rejects.toThrow("POST /items failed: 422");
  });
});

describe("toMessage", () => {
  it("Error はその message を返す", () => {
    expect(toMessage(new Error("boom"))).toBe("boom");
  });

  it("Error 以外も文字列にする（画面が空の error で固まらないようにするため）", () => {
    expect(toMessage("boom")).toBe("boom");
    expect(toMessage(undefined)).toBe("undefined");
  });
});
