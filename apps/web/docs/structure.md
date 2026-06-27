# ディレクトリ規約・クライアント境界・Route Handler

**TL;DR**: デフォルトは Server Component、`"use client"` は対話が必要な末端のみ。Route Handler はストリーミング等の例外のみ。コロケーション原則で「2箇所目が現れたら昇格」、ただし BE 出口の repository だけは最初から `lib/data/<resource>.ts` に置く。Server Action wrapper は `page.tsx` に inline、専用ファイルは作らない。

## ディレクトリ構成

```Text
src/
  app/
    orgs/[orgId]/            組織コンテキスト (現在の組織は URL が持つ)
      layout.tsx             組織ヘッダ + UserProvider
      memos/
        page.tsx             一覧 + 新規作成フォーム + Server Action wrapper を inline
        new/
          page.tsx
          _components/       ★このルート専用のコンポーネント
        [memoId]/
          page.tsx
          # _components/chat.tsx  (次フェーズ: AI チャット)
      admin/members/         admin 専用画面
    # api/chat/route.ts      (次フェーズ: AI チャットのストリーム中継)
    api/mock-upload/         モック専用 (本番では未使用)
  components/                2箇所以上から使われる共有コンポーネント
  lib/
    api.ts                   BE クライアント (唯一の BE 出口)
    auth.ts                  セッション検証 (uid 解決)
    images.ts                画像 URL 解決
    types.ts                 BE 契約の型 (将来は OpenAPI から自動生成)
    data/                    repository (リソース単位・薄い BE ラッパ・read+write 両方)
      users.ts               users.getCurrent (per-user データ・React.cache)
      memos.ts               memos.list / memos.get / memos.create / memos.remove ...
      members.ts             members.list / members.add ...
    mock/                    モック BE (= 実 BE の API 仕様書)
```

## コロケーション原則と昇格ルール

- **コロケーション**: あるページに関係する専用コンポーネントはそのルートの近くに置く。`_components/` の `_` プレフィックスはルーティング対象外を意味する Next.js の規約
- **昇格ルール**: コンポーネントや関数は、**2箇所以上で使われた時点で初めて** `components/` や `lib/` に移動する。1箇所でしか使われないものを最初から共通ディレクトリに置かない。これが早すぎる共通化を防ぐ唯一にして十分なルール
- **例外: BE 出口 (repository) は最初から `lib/data/<resource>.ts` に置く**。Server Action は `"use server"` を付けた時点で app 全体から呼べる RPC エンドポイントなので、書き込みも「ページ専用」にはならない (詳細: data.md)
- **Server Action の置き場**: `page.tsx` に inline で `'use server'` を書く。route segment 配下に Server Action 専用ファイル (`actions.ts` / `mutations.ts`) は作らない。「同じ wrapper を複数ページから繰り返し書く」状態が明確に出てから、その時点で初めて共通の置き場を考える

`features/` ディレクトリやレイヤードアーキテクチャは作らない。`lib/data/<resource>.ts` はあくまで **薄い BE ラッパ (エンドポイント + キャッシュ方針 + 型)**。ビジネスロジックは持たせない (ロジックの持ち主は BE)。`api()` を1段ラップする以上の抽象は積まない。

## クライアント境界 — "use client" の規律

デフォルトは全部 Server Component。`"use client"` を付けてよいのは**対話 (クリック・入力・ブラウザ API) が必要な末端コンポーネントだけ**。本フェーズでは1ファイルのみ (AI チャット追加後でも2ファイル):

| ファイル                | クライアントが必要な理由                                    |
| ----------------------- | ----------------------------------------------------------- |
| `memo-form.tsx`         | File API でファイルを読み、GCS へ直接 PUT する              |
| `chat.tsx` (次フェーズ) | レスポンスストリームを `getReader()` で逐次読みして描画する |

データの流れは一方向に固定する: **データは親 (Server) から props で下に流す、操作は Server Action として上に投げる。** クライアントコンポーネントが自分で fetch してデータを取りに行くことはしない。

効能: サーバーで完結する部分の JS がブラウザに送られない。「インタラクティブな箇所はどこか」がファイル一覧から一目で分かる。

## Route Handler は例外であり、最後の手段

Route Handler (`app/api/`) は「ブラウザと Next.js サーバーの間に HTTP エンドポイントが必要な場合」にだけ作る。Server Component / Server Action で表現できるものに Route Handler を作ってはいけない (自分のフロントのために自分の API を作るのは二度手間)。

正当な理由は本フェーズでは1つだけ:

- **モックの GCS 代役**: `/api/mock-upload`。署名 URL の宛先として HTTP の PUT/GET を受ける必要がある。本番では使われない

次フェーズで足る見込みの2本目が**ストリーミング** (`/api/chat`)。AI 回答を逐次表示するには、ブラウザが直接読めるストリームのエンドポイントが要る。中身は認証を付けて BE のストリームを素通しするだけの薄い中継。これは AI チャットの詳細設計時に追加する。さらにポーリングや無限スクロールが必要になったら、その時に初めて次を生やす。
