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
  // TODO: Firebase Admin SDK による検証に置き換える
  return null;
}
