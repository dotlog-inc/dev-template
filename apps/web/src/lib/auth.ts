/**
 * ユーザー認証 — 「操作している人間は誰か(uid)」を確定する層。
 *
 * なぜ存在するか: uid解決をここ1箇所に閉じ込めるため。api() と /api/chat の入口がこれを呼び、
 *   解決済みuidを X-User-Id でBEへ委譲する。トークン検証ロジックがアプリ各所に散らない。
 * なぜここか: サービス間認証(GCP, api.ts側)とは性質が違うので別ファイルに分離(ARCHITECTURE.md §4)。
 * 背景: モック(BE_URL未設定)では検証を省きデモuidを返す。本番のFirebase実装は §16-4。
 *   モック/実の分岐は api.ts・auth.ts・/api/chat の3入口だけに隔離されている(§13)。
 */
import { cookies } from "next/headers";

/**
 * セッションCookieから認証済みユーザーIDを得る。
 * モックモード(BE_URL未設定)では常にデモユーザーとしてログイン済み扱い。
 *
 * 本番への切り替え:
 *   Firebase Admin SDK でセッションCookieを検証して uid を返す。
 *   const decoded = await getAuth().verifySessionCookie(session, true);
 *   return decoded.uid;
 */
export async function getUid(): Promise<string | null> {
  if (!process.env.BE_URL) return "user_admin";
  const session = (await cookies()).get("session")?.value;
  if (!session) return null;
  // 本番では Firebase Admin SDK で session を検証して uid を返す (docstring / ARCHITECTURE §16-4)。
  return null;
}
