import { getUid } from "./auth";
import { mockFetch } from "./mock/handlers";

export class ApiError extends Error {
  constructor(public status: number) {
    super(`API error: ${status}`);
  }
}

type ApiInit = RequestInit & { next?: { revalidate?: number; tags?: string[] } };

/**
 * BEへの唯一の入り口。
 * - ブラウザからBEを直接叩かない(必ずServer Component / Server Action / Route Handler経由)
 * - 認証はここで一元的に付与する
 * - BE_URL 未設定ならインメモリのモックBEにディスパッチ
 */
export async function api<T>(path: string, init: ApiInit = {}): Promise<T> {
  const uid = await getUid();
  if (!uid) throw new ApiError(401);

  if (!process.env.BE_URL) {
    return mockFetch(path, init, uid) as Promise<T>;
  }

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("X-User-Id", uid);

  // 本番(Cloud Run間)では GCP の ID トークンを付与する:
  //   import { GoogleAuth } from "google-auth-library";
  //   const client = await new GoogleAuth().getIdTokenClient(process.env.BE_URL!);
  //   const gcp = await client.getRequestHeaders();
  //   headers.set("Authorization", gcp.get("Authorization")!);

  const res = await fetch(`${process.env.BE_URL}${path}`, { ...init, headers });
  if (!res.ok) throw new ApiError(res.status);
  return res.json();
}
