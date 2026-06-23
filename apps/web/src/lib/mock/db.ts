import type { Member, Memo, Role, User } from "../types";

/**
 * インメモリのモックBE用データストア。
 *
 * なぜ存在するか: BE_URL 未設定時に handlers.ts / route が参照する「揮発するDB代役」。
 *   ネットワークもDBも立てずにフロントを完成形まで作れるようにするためにある。
 *   dev中のHMRで消えないよう globalThis に1インスタンスだけ保持する。
 * なぜここか: モックBE一式は lib/mock/ に隔離し、本番移行時に丸ごと削除できるようにする(§16-8)。
 * 背景: 永続化しない(プロセス再起動でリセット)。永続化を足すとモックが第2のBEに化けるため、
 *   あえてやらない(ARCHITECTURE.md §13)。
 */
type MockFile = { data: Uint8Array; contentType: string };

type MockDb = {
  users: User[];
  members: Map<string, Map<string, Role>>; // orgId -> (userId -> role)
  memos: Memo[];
  files: Map<string, MockFile>;
  seq: number;
};

function seed(): MockDb {
  const orgId = "org_demo";
  const users: User[] = [
    {
      id: "user_admin",
      name: "山田 太郎",
      email: "yamada@example.com",
      orgs: [{ id: orgId, name: "デモ株式会社", role: "admin" }],
    },
    {
      id: "user_member",
      name: "佐藤 花子",
      email: "sato@example.com",
      orgs: [{ id: orgId, name: "デモ株式会社", role: "member" }],
    },
  ];

  const members = new Map<string, Map<string, Role>>([
    [orgId, new Map<string, Role>([["user_admin", "admin"], ["user_member", "member"]])],
  ]);

  const topics = [
    "週次定例の論点整理", "新機能の仕様メモ", "顧客ヒアリング所感", "障害対応の振り返り",
    "採用面接メモ", "競合調査ノート", "API設計の検討", "リリース手順の確認",
    "営業同行メモ", "チーム合宿のアイデア", "コスト削減の検討", "ドキュメント整備計画",
  ];
  const memos: Memo[] = [];
  for (let i = 27; i >= 1; i--) {
    memos.push({
      id: `memo_${i}`,
      orgId,
      authorId: "user_admin",
      authorName: "山田 太郎",
      title: `${topics[i % topics.length]} #${i}`,
      body:
        `これは ${i} 番目のメモです。打ち合わせで出た論点を3つに整理しました。\n\n` +
        `1. スケジュールは現状維持でよいか\n2. 担当の割り振りを見直すか\n3. 次回までに検証すべき項目\n\n` +
        `結論としては、まず3の検証を優先し、結果を踏まえて1と2を判断する方針としました。`,
      imagePaths: [],
      createdAt: new Date(Date.now() - i * 36e5 * 7).toISOString(),
    });
  }

  return { users, members, memos, files: new Map(), seq: 100 };
}

const g = globalThis as typeof globalThis & { __mockDb?: MockDb };
export const db: MockDb = g.__mockDb ?? (g.__mockDb = seed());

export function nextId(prefix: string): string {
  db.seq += 1;
  return `${prefix}_${db.seq}`;
}

export function roleOf(orgId: string, userId: string): Role | null {
  return db.members.get(orgId)?.get(userId) ?? null;
}

export function membersOf(orgId: string): Member[] {
  const m = db.members.get(orgId);
  if (!m) return [];
  return [...m.entries()].map(([userId, role]) => {
    const u = db.users.find((u) => u.id === userId);
    return { userId, name: u?.name ?? userId, email: u?.email ?? "", role };
  });
}
