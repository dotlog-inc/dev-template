/**
 * ルートレイアウト。全ページ共通の <html>/<body> とメタデータだけを持つ最小の枠。
 *
 * なぜここか: 組織ヘッダや UserProvider はここに置かない。それらは組織コンテキスト(orgId)に
 *   依存するので組織配下の layout(orgs/[orgId]/layout.tsx)が持つ。ルートは組織に属さないページ
 *   (トップ等)も通るため、共通の最小要素だけに留める。
 * 背景: 状態を持つ配布(UserProvider)は必要な範囲の最も外側に置く方針(ARCHITECTURE.md §7,§12)。
 */
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "組織メモ",
  description: "組織で共有するメモと、メモについて聞けるAI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
