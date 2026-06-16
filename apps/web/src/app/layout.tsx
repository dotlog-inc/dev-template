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
