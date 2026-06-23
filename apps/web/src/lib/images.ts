/**
 * メモ画像の「保存パス → 表示URL」を解決する。
 *
 * なぜ存在するか: メモのレコードには objectPath という文字列しか保存しない(§10)。表示時にURLへ
 *   変換する処理をここ1箇所に集約することで、モックと本番でFE側の呼び出しを変えずに済む。
 * なぜここか: 機能横断のURL解決ユーティリティなので lib/ 直下。
 * 背景: 画像はServer Action経由でBEに中継せず、署名URLでブラウザ↔GCSを直結する(§10)。
 *   モックは /api/mock-upload、本番はBEが返す署名付き読み取りURLをそのまま使う。
 */
export function imageUrl(path: string): string {
  if (path.startsWith("mock/")) {
    return `/api/mock-upload/${path.slice("mock/".length)}`;
  }
  return path;
}
