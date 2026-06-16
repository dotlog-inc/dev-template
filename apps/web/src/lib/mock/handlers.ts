import { ApiError } from "../api";
import type { Memo, MemoPage, Role, User } from "../types";
import { db, membersOf, nextId, roleOf } from "./db";

/**
 * モックBE。実BEと同じURL設計・同じ認可ルールで応答する。
 * lib/api.ts から X-User-Id 相当の uid を受け取り、認可の最終判断もここで行う
 * (実BEに置き換えたとき挙動が変わらないように)。
 */
export async function mockFetch(
  path: string,
  init: RequestInit,
  uid: string
): Promise<unknown> {
  const method = (init.method ?? "GET").toUpperCase();
  const url = new URL(path, "http://mock");
  const seg = url.pathname.split("/").filter(Boolean);
  const body = typeof init.body === "string" ? JSON.parse(init.body) : undefined;

  // GET /me
  if (method === "GET" && url.pathname === "/me") {
    const user = db.users.find((u) => u.id === uid);
    if (!user) throw new ApiError(401);
    return user satisfies User;
  }

  // POST /uploads/signed-url
  if (method === "POST" && url.pathname === "/uploads/signed-url") {
    const id = nextId("img");
    return {
      uploadUrl: `/api/mock-upload/${id}`,
      objectPath: `mock/${id}`,
    };
  }

  // /orgs/:orgId/...
  if (seg[0] === "orgs" && seg[1]) {
    const orgId = seg[1];
    const role = roleOf(orgId, uid);
    if (!role) throw new ApiError(403); // 組織に属していない

    // GET /orgs/:id/memos?author=me&page=&limit=
    if (method === "GET" && seg[2] === "memos" && !seg[3]) {
      const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
      const limit = Math.min(50, Number(url.searchParams.get("limit") ?? 10));
      let items = db.memos.filter((m) => m.orgId === orgId);
      if (url.searchParams.get("author") === "me") {
        items = items.filter((m) => m.authorId === uid);
      }
      items = items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const total = items.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      return {
        items: items.slice((page - 1) * limit, page * limit),
        page,
        totalPages,
        total,
      } satisfies MemoPage;
    }

    // POST /orgs/:id/memos
    if (method === "POST" && seg[2] === "memos" && !seg[3]) {
      const user = db.users.find((u) => u.id === uid)!;
      const memo: Memo = {
        id: nextId("memo"),
        orgId,
        authorId: uid,
        authorName: user.name,
        title: String(body?.title ?? ""),
        body: String(body?.body ?? ""),
        imagePaths: Array.isArray(body?.imagePaths) ? body.imagePaths.map(String) : [],
        createdAt: new Date().toISOString(),
      };
      if (!memo.title) throw new ApiError(422);
      db.memos.push(memo);
      return memo;
    }

    // GET /orgs/:id/memos/:memoId
    if (method === "GET" && seg[2] === "memos" && seg[3]) {
      const memo = db.memos.find((m) => m.id === seg[3] && m.orgId === orgId);
      if (!memo) throw new ApiError(404);
      return memo;
    }

    // GET /orgs/:id/members  (adminのみ)
    if (method === "GET" && seg[2] === "members" && !seg[3]) {
      if (role !== "admin") throw new ApiError(403);
      return membersOf(orgId);
    }

    // PATCH /orgs/:id/members/:userId  (adminのみ)
    if (method === "PATCH" && seg[2] === "members" && seg[3]) {
      if (role !== "admin") throw new ApiError(403);
      const target = seg[3];
      const m = db.members.get(orgId);
      if (!m?.has(target)) throw new ApiError(404);
      const newRole = body?.role as Role;
      if (newRole !== "admin" && newRole !== "member") throw new ApiError(422);
      m.set(target, newRole);
      const u = db.users.find((u) => u.id === target);
      const org = u?.orgs.find((o) => o.id === orgId);
      if (org) org.role = newRole;
      return { ok: true };
    }
  }

  throw new ApiError(404);
}
