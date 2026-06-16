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
