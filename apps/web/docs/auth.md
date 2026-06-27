# 認証・認可

**TL;DR**: 認証は (1) サービス間 = GCP IDトークン、(2) ユーザー = Firebase ID トークンを Bearer で BE に渡し、BE が公開鍵で検証する。両者は独立に効く多層防御。認可は role を共通関数 (`isAdmin` / `can`) に集約し、FE は UX、BE は防衛として両方持つ。

## 認証 — 二層構造

性質の異なる2層を別ファイル・別仕組みで扱う。混ぜると複雑化する。

### サービス間認証 (Next.js → BE)

「このリクエストは正規の Next.js サーバーから来たか」を保証。GCP の標準機能で完結する。

- BE (Cloud Run) を「認証が必要」に設定
- Next.js のサービスアカウントに `roles/run.invoker` を付与
- `google-auth-library` の `getIdTokenClient()` が ID トークンの取得・更新を自動で行う (`lib/api.ts`)

鍵ファイル管理は不要 (Cloud Run はアタッチされたサービスアカウントを自動で使う)。

### ユーザー認証 (人間 → アプリ)

Firebase Auth (Identity Platform) でログインし、セッション Cookie (httpOnly) を発行。`lib/auth.ts` が Cookie を検証して ID トークンを取り出す。

### ユーザー認証は BE が持つ

**BE はユーザートークンを自分で検証する。** Next.js はセッション Cookie から取り出した Firebase ID トークンを `Authorization: Bearer ...` として BE に転送し、BE 側で署名・有効期限・aud/iss を検証して uid を確定する。`X-User-Id` のような信頼前提のヘッダは使わない。

**フロー**:

```markdown
ブラウザ ──Cookie──→ Next.js ──Bearer + GCP ID──→ BE
│ │
▼ ▼
Cookie→IDトークン取出し 公開鍵で署名検証
│
▼
uid 確定 → DB から role 引き
```

**実装の要点**:

- Next.js は `lib/auth.ts` がセッション Cookie からユーザーの ID トークンを取り出し、`lib/api.ts` の `beHeaders()` が `Authorization: Bearer` として付与 (サービス間 ID トークンと両方乗る)
- BE は受け取った ID トークンを Identity Platform の公開鍵で検証し、uid を確定。そのうえで自分の DB から role/組織を引いて認可する
- モック BE (`lib/mock/`) は検証をスキップしてヘッダから uid を読むだけで構わない。ただし**契約 (401/403 を返す条件) は実 BE と一致させる**

### Why

- **多層防御**: 呼び出し元が Next.js だけに留まらない前提を最初から置く。モバイル・外部連携・cron が増えても、BE 側にユーザー認証があれば「ヘッダ詐称でなりすまし」が成立しない
- **トレードオフ**: 検証ロジックが Next.js (Cookie → トークン取出し) と BE (署名検証) の2箇所に分かれるが、呼び出し元が増えた後の修正範囲・監査対応に比べれば安い
- **KISS の例外**: 「無くて済むもの」には KISS を適用するが、**境界の認証は無くて済むものではない**

## 認可 — 二段構え

権限チェックは2箇所にあり、役割が違う。

| 場所                  | 役割                       | 例                                                         |
| --------------------- | -------------------------- | ---------------------------------------------------------- |
| FE (Server Component) | **UX**: 見せない・出さない | `role !== "admin"` なら `notFound()`、admin リンクの非表示 |
| BE (モック BE も同様) | **防衛**: 拒否する         | role を DB から引き、権限がなければ 403                    |

role 判定は各所に直書きせず、**1箇所の共通関数に集約**する (例: `lib/auth/can.ts` の `isAdmin(user)` / `can(user, "members.manage")`)。FE・BE 双方がこの関数を呼ぶ。capability 名 (`members.manage` 等) は確定事項ではなく、要件が増えたら追加する。

FE 側のチェックはすり抜けられても何も起きない (画面の出し分けにすぎない)。**認可の最終判断は常に BE**。モック BE (`lib/mock/handlers.ts`) も実 BE と同じ 403 を返し、契約はモック段階から有効。

> 次フェーズ補足: `handlers.ts` を通らない別経路 (ストリーミングの `/api/chat` 等) を足す場合は、認可チェックを**ルート自身に書く**。`orgId` / `memoId` がクライアント由来でページのロード時チェックが防壁にならないため。
