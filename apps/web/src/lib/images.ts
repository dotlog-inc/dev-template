/**
 * メモ画像の表示URLを解決する。
 * モック: /api/mock-upload/{id} で配信
 * 本番:  BEが返す署名付き読み取りURL(またはCDN URL)をそのまま使う
 */
export function imageUrl(path: string): string {
  if (path.startsWith("mock/")) {
    return `/api/mock-upload/${path.slice("mock/".length)}`;
  }
  return path;
}
