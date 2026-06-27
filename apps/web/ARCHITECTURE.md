# アーキテクチャ解説

このドキュメントは apps/web の設計の根本方針を示す。具体的なルール (認証フロー・データフロー・ディレクトリ規約・運用手順) は [`docs/`](./docs/) 配下に分割した。コードを書く前にここで原則を掴み、書くときは該当する `docs/<topic>.md` を開く。

## 1. 設計思想 — KISS × Next.js

このアーキテクチャの根本方針は一つだけ。**Next.js (App Router) が標準で持つ仕組みをそのまま使い、自前の抽象レイヤーを足さない。**

| かつて必要だったもの | Next.js での代替 |
|---|---|
| データ取得 (useEffect + ローディング管理) | Server Component 内で直接 `await` |
| 自前の API エンドポイント層 (BFF) | Server Actions / Next.js サーバー自体 |
| サーバー状態キャッシュ (SWR, TanStack Query) | `revalidatePath` / `revalidateTag` |
| グローバル状態管理 (Redux, Zustand) | サーバーのデータ + URL (searchParams) |
| フォームライブラリ | `<form action>` + `useActionState` |
| ページネーションライブラリ | `<Link href="?page=N">` |

状態管理・データ取得・フォームの3カテゴリでライブラリが一つも入っていないのは省略ではなく設計。**「必要になったと証明されるまで入れない」**が全部品に共通のルール。早すぎる抽象はコストで、必要になってから導入する方が、使われない抽象を抱え続けるより安い。

## 2. 全体構成

```
            ┌──────────────────────┐
            │       ブラウザ        │  "use client" は末端コンポーネントのみ
            └──────┬───────▲───────┘
        ページ要求 /│       │HTML/RSC      ┌─ 画像PUT (署名URL) ─→ GCS
        Action呼出 ▼│       │              │
            ┌──────┴───────┴───────┐       │
            │  Next.js (App Router) │ ──────┘
            │  ・Server Component   │
            │  ・Server Action      │   GCP IDトークン + ユーザーIDトークン (Bearer)
            │  ・/api/chat ※次フェーズ│ ───────────────┐
            └──────────────────────┘                   ▼
                                              ┌────────────────┐
                                              │  バックエンドAPI │── Vertex AI ※次フェーズ
                                              │  (Cloud Run)    │── DB
                                              └────────────────┘
```

登場人物は4つ: ブラウザ・Next.js サーバー・バックエンド API (BE)・GCS。AI チャット (`/api/chat` 中継 + Vertex AI) は本フェーズではドロップし、別途詳細設計する。

## 3. 大原則: BE 一本道

**ブラウザは BE を直接叩かない。** BE へのアクセスは必ず Next.js サーバー側 (Server Component / Server Action / Route Handler) を経由する。JSON 取得は全て `src/lib/api.ts` の `api<T>()` を通る。

この一本化で得られるもの:

- **認証の一元化**: 認証ヘッダの付与が `api.ts` の1箇所に集まり、ヘッダの付け忘れという事故クラスが構造的に消える
- **トークンの非露出**: セッションは httpOnly Cookie に置き、サーバー側でのみ読む。ブラウザの JS からトークンに触れない
- **BE の隠蔽**: BE は Next.js からしか呼ばれないため、認証必須の Cloud Run として公開ネットワークから隠せる。CORS 設定も不要
- **BFF 議論の消滅**: 「BFF を別途立てるか」という設計論点が消える。Next.js サーバーがそのまま BFF

唯一の見かけ上の例外は画像アップロードで、ブラウザが GCS へ直接 PUT する。これは BE を叩いているのではなく、**BE が発行した署名 URL という「許可証」を行使している**だけなので原則とは矛盾しない (詳細: [docs/data.md](./docs/data.md))。

> 将来ストリーミング中継 (`/api/chat`, 次フェーズ) を足すときも、これは `.json()` できないため `api()` を経由できないが、**認証ヘッダの組み立てだけは `api.ts` の `beHeaders()` を共有する**設計にし、「BE への出口が増えても認証ヘッダの付与ロジックは1箇所」を保つ。本フェーズの出口は `api()` の1経路のみ。

## 4. やらないこと

このアーキテクチャの価値の半分は「やらない」と決めたことにある。導入したくなったら、まずこの表の「代わりにこうする」を検討すること。

| やらないこと | 代わりにこうする |
|---|---|
| Redux / Zustand / Jotai | サーバーデータ + URL + useState ([data.md](./docs/data.md)) |
| SWR / TanStack Query | Server Component + revalidate。クライアント fetch が本当に必要になった画面でのみ局所的に検討 |
| 自分のフロント用の API Routes | Server Component / Server Action ([structure.md](./docs/structure.md)) |
| クライアントからの BE 直叩き | lib/api.ts 経由 (§3) |
| ユーザー固有データの共有キャッシュ | no-store + React.cache ([data.md](./docs/data.md)) |
| 1箇所でしか使わないもの (repository を除く) の共通化 | コロケーション。2箇所目で昇格 ([structure.md](./docs/structure.md)) |
| ロジックを抱える service 層 / fat repository | `lib/data/<resource>.ts` は薄い BE ラッパのみ ([data.md](./docs/data.md)) |

## 詳細ルール ([docs/](./docs/))

| ファイル | 内容 |
|---|---|
| [docs/auth.md](./docs/auth.md) | 認証 (サービス間 / ユーザー) と認可 (FE/BE 二段) の具体ルールとフロー図 |
| [docs/data.md](./docs/data.md) | repository / Server Action / キャッシュ / 状態の置き場 / 画像アップロード |
| [docs/structure.md](./docs/structure.md) | ディレクトリ規約 / クライアント境界 / Route Handler の扱い |
| [docs/operations.md](./docs/operations.md) | モック BE の設計意図 / エラーハンドリング / 本番 (GCP) 移行チェックリスト |
