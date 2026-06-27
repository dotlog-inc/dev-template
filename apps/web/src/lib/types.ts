/**
 * BE契約の型定義。FEとBEが交換するJSONの形をここ1箇所で表す。
 *
 * なぜ存在するか: api()・データ取得関数・Server Action・モックBE が同じ型を共有することで、
 *   FE全体が「BEが返す形」に対して型安全になる。BEのレスポンスが変わってもこのファイルを直すだけで、
 *   影響箇所がコンパイルエラーとして洗い出せる。
 * なぜここか: 特定機能に属さない横断的な契約なので lib/ 直下。
 * 背景: 将来はOpenAPIスキーマからの自動生成に置き換える想定の「手書き版」(ARCHITECTURE.md §12)。
 */
export type Role = "admin" | "member";

export type OrgSummary = {
  id: string;
  name: string;
  role: Role;
};

export type User = {
  id: string;
  name: string;
  email: string;
  orgs: OrgSummary[];
};

export type Memo = {
  id: string;
  orgId: string;
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  imagePaths: string[];
  createdAt: string;
};

export type MemoPage = {
  items: Memo[];
  page: number;
  totalPages: number;
  total: number;
};

export type Member = {
  userId: string;
  name: string;
  email: string;
  role: Role;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};
