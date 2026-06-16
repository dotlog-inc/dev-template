# アーキテクチャ解説

このドキュメントは、本プロジェクトの設計判断とその理由を解説する。コードを読む前にこれを読めば「なぜこう書かれているか」が分かり、コードを書くときにこれを参照すれば「どこに何を書くべきか」が決まる状態を目指している。

## 1. 設計思想 — KISS × Next.js

このアーキテクチャの根本方針は一つだけ。**Next.js (App Router) が標準で持つ仕組みをそのまま使い、自前の抽象レイヤーを足さない。**

App Router 時代の Next.js は、かつてフロントエンドで別途必要だった部品の多くをフレームワーク自体が吸収している。具体的には次の対応関係になる。

| かつて必要だったもの | Next.js での代替 |
|---|---|
| データ取得 (useEffect + ローディング管理) | Server Component 内で直接 `await` |
| 自前のAPIエンドポイント層 (BFF) | Server Actions / Next.jsサーバー自体 |
| サーバー状態キャッシュ (SWR, TanStack Query) | `revalidatePath` / `revalidateTag` |
| グローバル状態管理 (Redux, Zustand) | サーバーのデータ + URL (searchParams) |
| フォームライブラリ | `<form action>` + `useActionState` |
| ページネーションライブラリ | `<Link href="?page=N">` |

このプロジェクトに状態管理ライブラリ・データ取得ライブラリ・フォームライブラリが一つも入っていないのは、省略ではなく設計である。**「必要になったと証明されるまで入れない」**が全部品に対する共通ルール。早すぎる抽象はコストであり、必要になってから導入する方が、使われない抽象を抱え続けるより安い。

## 2. 全体構成

```
            ┌──────────────────────┐
            │       ブラウザ        │  "use client" は末端2ファイルのみ
            └──────┬───────▲───────┘
        ページ要求 /│       │HTML/RSC      ┌─ 画像PUT (署名URL) ─→ GCS
        Action呼出 ▼│       │              │
            ┌──────┴───────┴───────┐       │
            │  Next.js (App Router) │ ──────┘
            │  ・Server Component   │
            │  ・Server Action      │   GCP IDトークン + X-User-Id
            │  ・/api/chat (中継)   │ ─────────────────┐
            └──────────────────────┘                   ▼
                                              ┌────────────────┐
                                              │  バックエンドAPI │── Vertex AI
                                              │  (Cloud Run)    │── DB
                                              └────────────────┘
```

登場人物は4つ。ブラウザ、Next.jsサーバー、バックエンドAPI (以下BE)、GCS。Vertex AI (Gemini) はBEの背後にいて、フロントエンドからは見えない。

## 3. 大原則: BE一本道

**ブラウザはBEを直接叩かない。** BEへのアクセスは必ず Next.js のサーバー側 (Server Component / Server Action / Route Handler) を経由し、その全てが `src/lib/api.ts` の `api<T>()` 関数を通る。

```
ブラウザ → Next.jsサーバー → lib/api.ts → BE     ← これしかない
ブラウザ → BE                                    ← 存在しない
```

この一本化で得られるもの:

- **認証の一元化**: 認証ヘッダの付与が `api.ts` の1箇所に集まる。ヘッダの付け忘れという事故クラスが構造的に消える。
- **トークンの非露出**: セッションは httpOnly Cookie に置き、サーバー側でのみ読む。ブラウザのJSからトークンに触れない。
- **BEの隠蔽**: BEはNext.jsサーバーからしか呼ばれないため、認証必須のCloud Runとして公開ネットワークから隠せる。CORS設定も不要になる。
- **BFF議論の消滅**: 「BFFを別途立てるか」という設計論点が消える。Next.jsサーバーがそのままBFF。

唯一の見かけ上の例外は画像アップロードで、ブラウザがGCSへ直接PUTする (§8)。これはBEを叩いているのではなく、**BEが発行した署名URLという「許可証」を行使している**だけなので、原則とは矛盾しない。

## 4. 認証 — 二層構造

認証は性質の異なる2つを明確に分離している。混ぜると複雑化するため、別のファイル・別の仕組みで扱う。

### 4-1. サービス間認証 (Next.jsサーバー → BE)

「このリクエストは正規のNext.jsサーバーから来たか」を保証する層。GCPの標準機能で完結する。

- BE (Cloud Run) を「認証が必要」に設定
- Next.js のサービスアカウントに `roles/run.invoker` を付与
- `google-auth-library` の `getIdTokenClient()` がIDトークンの取得・更新を自動で行う (`lib/api.ts` のコメント部分)

鍵ファイルの管理は不要。Cloud Run上ではアタッチされたサービスアカウントが自動で使われる。

### 4-2. ユーザー認証 (人間 → アプリ)

「操作している人間は誰か」を確定する層。Firebase Auth (Identity Platform) でログインし、セッションCookie (httpOnly) を発行。`lib/auth.ts` の `getUid()` がCookieを検証して uid を返す。

### 4-3. ユーザーIDの委譲

ここが設計上の要点。**BEは個々のユーザートークンを検証しない。** Next.jsが検証済みの uid を `X-User-Id` ヘッダで渡し、BEはそれを信頼する。

これが安全なのは §4-1 が前提にあるから。BEへ到達できるのは正規のNext.jsサーバーだけなので、`X-User-Id` を偽装できる第三者は存在しない。結果として、トークン検証のロジックがNext.js側の1箇所に集約され、BEは「uidを受け取って自分のDBで権限を引く」だけのシンプルな存在になる。

## 5. 認可 — 二段構え

権限チェックは2箇所にあるが、役割が違う。

| 場所 | 役割 | 例 |
|---|---|---|
| FE (Server Component) | **UX**: 見せない・出さない | `role !== "admin"` なら `notFound()`、adminリンクの非表示 |
| BE (モックBEも同様) | **防衛**: 拒否する | role を自分のDBで引き、権限がなければ 403 |

FE側のチェックは画面の出し分けにすぎず、すり抜けられても何も起きない。**認可の最終判断は常にBE。** モックBE (`lib/mock/handlers.ts`) も実BEと同じ403を返すように書いてあり、この契約はモック段階から有効である。

## 6. データ取得・更新・キャッシュ

### 6-1. 取得は Server Component で

ページが必要とするデータは、そのページの Server Component が直接 `await api<T>()` する。ローディング状態の管理は `loading.tsx`、エラーは throw → `notFound()` / error boundary に任せる。useEffect でのデータ取得はこのコードベースに存在しない。

### 6-2. 更新は Server Action で

すべての書き込みは `actions.ts` の Server Action が行う。パターンは固定:

```
検証 → api() でBEに書き込み → revalidatePath / redirect
```

更新後の画面反映は revalidate に任せる。**クライアント側でキャッシュを同期するコードは書かない** — 同期すべきクライアントキャッシュがそもそも存在しないため。

### 6-3. キャッシュは「ユーザー固有」と「全員共通」を絶対に混ぜない

| 種類 | 例 | 扱い |
|---|---|---|
| ユーザー固有 | /me、自分のメモ一覧 | `cache: "no-store"`。リクエストをまたぐキャッシュ禁止 |
| 全員共通 | 組織のプラン定義、マスタ | `next: { revalidate, tags }` で共有キャッシュ可 |

ユーザー固有データを共有キャッシュに乗せると**他人のデータが見える事故**になる。これが本アーキテクチャで最も重大な禁止事項。ファイルを `lib/session.ts` (per-user) と分けてあるのはこの境界を物理的に見えるようにするため。

リクエスト内の重複は `React.cache()` で潰す。`getCurrentUser()` をレイアウトとページの両方が呼んでも、BEへの問い合わせは1リクエストにつき1回。リクエストが終われば消えるので、鮮度やログアウト時の掃除を考える必要がない — 「保持しないから同期問題が存在しない」。

なお Next.js 16 では `"use cache"` (Cache Components) が新しいキャッシュの中心概念になっている。キャッシュは完全オプトインで「書いた所だけキャッシュされる」ため、本方針 (デフォルト非キャッシュ + 共通データだけ明示キャッシュ) とそのまま整合する。共通データのキャッシュを増やす際は `"use cache"` ベースへの移行を推奨。

## 7. 状態の置き場 — 判断フローチャート

「この状態はどこに置くか」は次の順で判定する。

```
その状態、サーバーが知る必要ある？
 ├─ ある ──→ Server Action でBEへ。画面は revalidate で更新
 └─ ない
     ├─ リロード・URL共有で残したい？ (検索条件、ページ番号、タブ)
     │   └─ YES → URL (searchParams)。<Link> か router.push で変更
     └─ その画面限りの一時的な状態？ (モーダル開閉、入力中、チャット履歴)
         └─ YES → useState
```

これに当てはまらないものがほぼ無いため、グローバルストアの出番がない。唯一の横断的データであるユーザー情報は、**サーバーが確定させた値の読み取り専用配布**として `UserProvider` (Context 1個) で流す。クライアントからこのContextの値を更新することは禁止 — 更新は必ず Server Action 経由で、新しい値はサーバーから降ってくる。

具体例: メモ一覧のページ番号はURL (`?page=2`)。ページャーは `<Link>` だけで実装され、クライアント状態はゼロ。AIチャットの会話履歴は永続化しないため `useState` (永続化したくなった時点でBE保存 + Server Component初期表示に変える)。

## 8. クライアント境界 — "use client" の規律

デフォルトは全部 Server Component。`"use client"` を付けてよいのは**対話 (クリック・入力・ブラウザAPI) が必要な末端コンポーネントだけ**。このプロジェクトでは2ファイルのみ:

| ファイル | クライアントが必要な理由 |
|---|---|
| `memo-form.tsx` | File API でファイルを読み、GCSへ直接PUTする |
| `chat.tsx` | レスポンスストリームを `getReader()` で逐次読みして描画する |

データの流れは一方向に固定する: **データは親 (Server) から props で下に流す、操作は Server Action として上に投げる。** クライアントコンポーネントが自分で fetch してデータを取りに行くことはしない。

この規律の効能は、サーバーで完結する部分のJSがブラウザに送られないこと、そして「インタラクティブな箇所はどこか」がファイル一覧から一目で分かることにある。

## 9. Route Handler は例外であり、最後の手段

Route Handler (`app/api/`) は「ブラウザとNext.jsサーバーの間にHTTPエンドポイントが必要な場合」にだけ作る。Server Component / Server Action で表現できるものに Route Handler を作ってはいけない (自分のフロントのために自分のAPIを作るのは二度手間)。

正当な理由は現状2つだけ:

- **ストリーミング**: `/api/chat`。AI回答を逐次表示するには、ブラウザが直接読めるストリームのエンドポイントが要る。中身は認証を付けてBEのストリームを素通しするだけの薄い中継。
- **モックのGCS代役**: `/api/mock-upload`。署名URLの宛先としてHTTPのPUT/GETを受ける必要がある。本番では使われない。

将来ポーリングや無限スクロールが必要になったら、その時に初めて3本目を生やす。

## 10. 画像アップロード — 署名URL方式

画像をServer Action経由でBEに中継しない。理由は、Server Actionのボディサイズ制限と、Next.jsサーバーを大きなバイナリが二度通る無駄。代わりにGCPの定石である署名URLを使う。

```
① ブラウザ ─(Server Action)→ BE: 署名URLをください
② BE → ブラウザ: uploadUrl と objectPath
③ ブラウザ ─PUT→ GCS (直接。ただしBEが許可した場所・期限のみ)
④ ブラウザ ─(Server Action)→ BE: objectPath を添えてメモ作成
```

メモのレコードに保存されるのは `objectPath` という文字列だけ。表示時は `lib/images.ts` がパスを表示URLに解決する (モック: `/api/mock-upload/...`、本番: BEが返す署名付き読み取りURL)。FE側のコードはモックと本番で変わらない。

## 11. AIチャット

AI呼び出し (Vertex AI / Gemini) は**BEの責務**。メモ本文・添付画像をコンテキストとして組み立てるのはデータの持ち主であるBEが行うべきで、FEはプロンプト構築に関与しない。

FE側の関与は2点のみ: `/api/chat` が認証を付けてBEのストリームを中継すること、`chat.tsx` がストリームを逐次描画すること。モックモードでは `lib/mock/chat.ts` が擬似ストリームを返すが、**FE側の読み取りコードは本番と完全に同一**。モックで開発したUIがそのまま本番で動く。

## 12. ディレクトリ構成とコロケーション

```
src/
  app/
    orgs/[orgId]/            組織コンテキスト (現在の組織はURLが持つ)
      layout.tsx             組織ヘッダ + UserProvider
      memos/
        page.tsx             一覧 + ページネーション
        actions.ts           ★この機能のServer Action (ルートの隣に置く)
        new/
          page.tsx
          _components/       ★このルート専用のコンポーネント
        [memoId]/
          page.tsx
          _components/chat.tsx
      admin/members/         admin専用画面 (actions.ts も同居)
    api/chat/route.ts        唯一のRoute Handler
    api/mock-upload/         モック専用 (本番では未使用)
  components/                2箇所以上から使われる共有コンポーネント
  lib/
    api.ts                   BEクライアント (唯一のBE出口)
    auth.ts                  セッション検証 (uid解決)
    session.ts               getCurrentUser (per-userデータ)
    images.ts                画像URL解決
    types.ts                 BE契約の型 (将来はOpenAPIから自動生成)
    mock/                    モックBE (= 実BEのAPI仕様書)
```

原則は**コロケーション**: あるページに関係するもの (Server Action、専用コンポーネント) はそのルートの近くに置く。`_components/` の `_` プレフィックスはルーティング対象外を意味するNext.jsの規約。

**昇格ルール**: コンポーネントや関数は、**2箇所以上で使われた時点で初めて** `components/` や `lib/` に移動する。1箇所でしか使われないものを最初から共通ディレクトリに置かない。これが早すぎる共通化を防ぐ唯一にして十分なルール。

`features/` ディレクトリや repository層・service層といったレイヤードアーキテクチャは意図的に作っていない。現状の規模で必要な抽象は `lib/api.ts` 1枚で足りており、それ以上の層は「通過するだけのファイル」を生む。

## 13. モックBEの設計意図

`lib/mock/` はネットワークを介さないインプロセスのモックBEで、`BE_URL` 未設定時に `api.ts` が自動でこちらにディスパッチする。設計上のこだわりは次の3点。

- **実BEと同じURL設計・同じ認可**: ハンドラのパス・メソッド・403/404/422の返し方が、そのまま実BEのAPI仕様書になる。BEチームには `handlers.ts` を仕様として渡せる。
- **切替はBE_URLだけ**: アプリケーションコードに `if (mock)` 分岐は存在しない (分岐は `api.ts`・`auth.ts`・`/api/chat` の入口3箇所に隔離)。
- **インメモリで揮発**: 永続化しない。モックに永続化を実装し始めるとモックが第2のBEになってしまう。

## 14. エラーハンドリング

BEの非2xxは `api.ts` が `ApiError(status)` として throw する。受け側の方針:

- **404**: ページなら `notFound()` に変換 (メモ詳細が好例)
- **検証エラー (422等)**: Server Action が `{ error: string }` を return し、フォームが表示
- **その他**: 握りつぶさず throw。Next.js の error boundary に任せる (必要になったら `error.tsx` を追加)

「とりあえず try-catch して console.error」は書かない。処理できないエラーは上に投げるのが正しい。

## 15. やらないことリスト

このアーキテクチャの価値の半分は「やらない」と決めたことにある。導入したくなったら、まずこの表の「代わりにこうする」を検討すること。

| やらないこと | 代わりにこうする |
|---|---|
| Redux / Zustand / Jotai | サーバーデータ + URL + useState (§7) |
| SWR / TanStack Query | Server Component + revalidate。クライアントfetchが本当に必要になった画面でのみ局所的に検討 |
| 自分のフロント用のAPI Routes | Server Component / Server Action |
| クライアントからのBE直叩き | lib/api.ts 経由 (§3) |
| ユーザー固有データの共有キャッシュ | no-store + React.cache (§6-3) |
| 1箇所でしか使わないものの共通化 | コロケーション。2箇所目が現れたら昇格 (§12) |
| repository / service 層 | lib/api.ts + 型。BEがロジックの持ち主 |
| クライアントでのプロンプト構築 | AI関連はBEの責務 (§11) |

## 16. 本番 (GCP) 移行チェックリスト

1. `.env` に `BE_URL` を設定 (モックが切れる)
2. BE (Cloud Run) を認証必須にし、Next.jsのサービスアカウントへ `roles/run.invoker` 付与
3. `npm i google-auth-library` し、`lib/api.ts` のIDトークン付与コメントを有効化
4. Firebase Auth (Identity Platform) を設定し、`lib/auth.ts` の `getUid()` を `verifySessionCookie` 実装に差し替え。ログイン画面とセッションCookie発行を追加
5. BEに `/uploads/signed-url` (GCS署名URL発行) を実装。FE変更不要
6. BEに `/orgs/:id/memos/:id/chat` (Vertex AIストリーム) を実装。FE変更不要
7. `/api/chat` の中継部に `lib/api.ts` と同じGCP IDトークン付与を追加
8. 動作確認後、`app/api/mock-upload/` と `lib/mock/` を削除してもよい (残しても無害)
