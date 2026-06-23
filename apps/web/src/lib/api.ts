/**
 * BEクライアント — アプリからBEへ出る唯一の口(ストリーミングを除く)。
 *
 * なぜ存在するか: BEアクセスをこの1ファイルに通すことで、認証ヘッダの付与・モック/実BEの切替・
 *   エラーのthrow方針(ApiError)が1箇所に集まる。各画面は「どのパスを叩くか」だけを書けばよく、
 *   認証ヘッダの付け忘れという事故クラスが構造的に消える。
 * なぜここか: 機能に依存しない基盤なので lib/ 直下。データ取得関数(lib/data/*)はこの api() を
 *   1段ラップするだけの薄い存在に保ち、ロジックは持たせない(持ち主はBE)。
 * 背景: 「ブラウザ→Next.js→api.ts→BE」の一本道(ARCHITECTURE.md §3)。唯一の例外がストリーミング
 *   中継の /api/chat で、そちらとは認証付与だけを beHeaders() で共有する。
 */
import { getUid } from "./auth";
import { mockFetch } from "./mock/handlers";

export class ApiError extends Error {
  constructor(public status: number) {
    super(`API error: ${status}`);
  }
}

type ApiInit = RequestInit & { next?: { revalidate?: number; tags?: string[] } };

/**
 * BEへ送る認証ヘッダ(サービス間認証 + ユーザーID委譲)を組み立てる唯一の場所。
 * JSON取得の api() と、ストリーミング中継の /api/chat の両方がこれを使う。
 * 認証ヘッダ付与を1箇所に保つことで「片方だけ付け忘れる」事故を防ぐ(§3,§4)。
 */
export async function beHeaders(uid: string, init?: HeadersInit): Promise<Headers> {
  const headers = new Headers(init);
  headers.set("Content-Type", "application/json");
  headers.set("X-User-Id", uid);

  // 本番(Cloud Run間)では GCP の ID トークンを付与する:
  //   import { GoogleAuth } from "google-auth-library";
  //   const client = await new GoogleAuth().getIdTokenClient(process.env.BE_URL!);
  //   const gcp = await client.getRequestHeaders();
  //   headers.set("Authorization", gcp.get("Authorization")!);

  return headers;
}

/**
 * BEへの唯一の入り口(ストリーミングを除く — §9)。
 * - ブラウザからBEを直接叩かない(必ずServer Component / Server Action / Route Handler経由)
 * - 認証は beHeaders() で一元的に付与する
 * - BE_URL 未設定ならインメモリのモックBEにディスパッチ
 */
export async function api<T>(path: string, init: ApiInit = {}): Promise<T> {
  const uid = await getUid();
  if (!uid) throw new ApiError(401);

  if (!process.env.BE_URL) {
    return mockFetch(path, init, uid) as Promise<T>;
  }

  const headers = await beHeaders(uid, init.headers);
  const res = await fetch(`${process.env.BE_URL}${path}`, { ...init, headers });
  if (!res.ok) throw new ApiError(res.status);
  return res.json();
}
