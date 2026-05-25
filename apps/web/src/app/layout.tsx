import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "dev-template",
  description: "Next.js + FastAPI + Postgres + Terraform monorepo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
