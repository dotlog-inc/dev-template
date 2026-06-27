# データフロー・状態・キャッシュ・画像

**TL;DR**: BE 出口は `lib/data/<resource>.ts` の薄い repository (read + write)。Server Action は repository を呼ぶ `page.tsx` 内 inline ラッパで、ルート文字列と revalidate を担う。ユーザー固有データは `no-store` + `React.cache()`、共通データのみ `next:{ tags }` で共有キャッシュ可。状態は「永続化 / URL / useState」の3択で判定。画像は署名 URL 方式でブラウザから GCS に直接 PUT。

## データ取得・更新・キャッシュ

|               | 置き場                                  | 役割                                                     |
| ------------- | --------------------------------------- | -------------------------------------------------------- |
| read          | `lib/data/<r>.ts` の `r.list` / `r.get` | api 1段ラップ + キャッシュ方針                           |
| write         | 同 `r.create` / `r.remove`              | api 1段ラップのみ。revalidate は呼び手                   |
| Server Action | `page.tsx` 内 inline `'use server'`     | FormData → 検証 → repository → revalidatePath / redirect |

| キャッシュ種別   | 例                                       | 扱い                                                  |
| ---------------- | ---------------------------------------- | ----------------------------------------------------- |
| ユーザー固有     | /me、自分のメモ一覧                      | `cache: "no-store"`。リクエストをまたぐキャッシュ禁止 |
| 全員共通         | 組織のプラン定義、マスタ                 | `next: { revalidate, tags }` で共有キャッシュ可       |
| リクエスト内重複 | layout と page が同じ `getCurrentUser()` | `React.cache()` で1回に潰す                           |

**フロー**:

```
page.tsx ──→ memos.list() ──→ api() ──→ BE
   ▲                                      │
   └── revalidatePath ◀── Server Action ◀─┘
              (inline, 3〜5行)
```

- **repository に置く**: エンドポイント・キャッシュ方針・契約の型
- **repository に置かない**: 検証・revalidate・redirect・FormData 変換・ビジネスロジック

### Why

- **read/write 同居**: Server Action は `"use server"` を付けた時点で app 全体から呼ばれる RPC。「ページ専用 mutation」は実態として成立しないため、書き込みも resource 単位に集約する方が自然
- **wrapper は3〜5行で済むため inline 固定**: ページに2〜3個並んでも圧迫されない。「同じ wrapper を3ページ以上で使う」明確な重複が出てから昇格を検討
- **per-user を共有キャッシュに乗せない**: 他人のデータが見える事故。これが本アーキで最も重大な禁止事項。`lib/data/users.ts` を分けてあるのは境界の物理化
- **リクエスト内は React.cache で十分**: リクエストが終われば消えるので、鮮度やログアウト時の掃除は不要 — 「保持しないから同期問題が存在しない」
- **クライアント側でキャッシュ同期しない**: 同期すべきクライアントキャッシュがそもそも存在しないため。更新後の画面反映は revalidate に任せる
- **Next.js 16 `"use cache"` (Cache Components)** は「デフォルト非キャッシュ + 共通のみ明示」と整合。共通データのキャッシュを増やすときはこちらを推奨
- **「薄い」を守る**: 検証・revalidate・FormData 変換を repository に持ち込んだ瞬間に fat repository 化が始まる。PR レビューで止める

**コード例 (取得)**:

```ts
// src/app/orgs/[orgId]/memos/page.tsx
import { memos } from "@/lib/data/memos"
export default async function Page({ params, searchParams }) {
  const { orgId } = await params
  const { page } = await searchParams
  const data = await memos.list(orgId, Number(page ?? 1))
  ...
}
```

ローディングは `loading.tsx`、エラーは throw → `notFound()` / error boundary。useEffect でのデータ取得はこのコードベースに存在しない。

## 状態の置き場 — 判断フローチャート

「この状態はどこに置くか」は次の順で判定する。

```markdown
その状態、永続化（DB保存）する必要ある？
├─ ある ──→ Server Action で BE へ。画面は revalidate で更新
└─ ない
├─ リロード・URL 共有で残したい？ (検索条件、ページ番号、タブ)
│ └─ YES → URL (searchParams)。<Link> か router.push で変更
└─ その画面限りの一時的な状態？ (モーダル開閉、入力中の値、フォーカス)
└─ YES → useState
```

これに当てはまらないものがほぼ無いため、グローバルストアの出番がない。唯一の横断的データであるユーザー情報は、**サーバーが確定させた値の読み取り専用配布**として `UserProvider` (Context 1個) で流す。クライアントからこの Context の値を更新することは禁止 — 更新は必ず Server Action 経由で、新しい値はサーバーから降ってくる。

具体例: メモ一覧のページ番号は URL (`?page=2`)。ページャーは `<Link>` だけで実装され、クライアント状態はゼロ。メモ作成フォームの入力中の値は送信までの一時状態なので `useState`。

## 画像アップロード — 署名 URL 方式

画像を Server Action 経由で BE に中継しない。理由は、Server Action のボディサイズ制限と、Next.js サーバーを大きなバイナリが二度通る無駄。代わりに GCP の定石である署名 URL を使う。

```markdown
① ブラウザ ─(Server Action)→ BE: 署名 URL をください
② BE → ブラウザ: uploadUrl と objectPath
③ ブラウザ ─PUT→ GCS (直接。ただし BE が許可した場所・期限のみ)
④ ブラウザ ─(Server Action)→ BE: objectPath を添えてメモ作成
```

メモのレコードに保存されるのは `objectPath` という文字列だけ。表示時は `lib/images.ts` がパスを表示 URL に解決する (モック: `/api/mock-upload/...`、本番: BE が返す署名付き読み取り URL)。FE 側のコードはモックと本番で変わらない。
