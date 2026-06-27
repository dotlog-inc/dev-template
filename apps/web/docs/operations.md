# モック BE・エラーハンドリング・本番移行

**TL;DR**: モック BE は実 BE と同じ URL・認可で書き、`BE_URL` 未設定時に自動ディスパッチ。エラーは握りつぶさず throw、404 は `notFound()`、422 は Server Action が `{ error }` を return。本番移行は `.env` 設定 + 認証実装 + 署名 URL 実装の6ステップ。

## モック BE の設計意図

`lib/mock/` はネットワークを介さないインプロセスのモック BE。`BE_URL` 未設定時に `api.ts` が自動でこちらにディスパッチする。設計上のこだわり3点:

- **実 BE と同じ URL 設計・同じ認可**: ハンドラのパス・メソッド・403/404/422 の返し方が、そのまま実 BE の API 仕様書になる。BE チームには `handlers.ts` を仕様として渡せる
- **切替は `BE_URL` だけ**: アプリケーションコードに `if (mock)` 分岐は存在しない (分岐は `api.ts`・`auth.ts` の入口2箇所に隔離。次フェーズで `/api/chat` を足す場合もそこに閉じる)
- **インメモリで揮発**: 永続化しない。モックに永続化を実装し始めるとモックが第2の BE になってしまう

**注意: 「実 BE と同じ」を強制する仕組みは現状ない。** `handlers.ts` はページネーション計算・`limit` 上限・422 検証・author スコープ・403/404 といった実ロジックを持つが、別言語で書かれる実 BE がこれと同一挙動を再実装する保証 (契約テスト等) は存在しない。乖離は静かに起きうる。実 BE 実装時は `handlers.ts` を仕様として読み合わせ、可能なら両者を同じケースで叩く契約テストを用意するのが望ましい。

## エラーハンドリング

BE の非 2xx は `api.ts` が `ApiError(status)` として throw する。受け側の方針:

- **404**: ページなら `notFound()` に変換 (メモ詳細が好例)
- **検証エラー (422 等)**: Server Action が `{ error: string }` を return し、フォームが表示
- **その他**: 握りつぶさず throw。Next.js の error boundary に任せる (必要になったら `error.tsx` を追加)

「とりあえず try-catch して console.error」は書かない。処理できないエラーは上に投げるのが正しい。

## 本番 (GCP) 移行チェックリスト

1. `.env` に `BE_URL` を設定 (モックが切れる)
2. BE (Cloud Run) を認証必須にし、Next.js のサービスアカウントへ `roles/run.invoker` 付与
3. `npm i google-auth-library` し、`lib/api.ts` の `beHeaders()` 内の ID トークン付与コメントを有効化 (`api()` に効く。次フェーズの `/api/chat` も `beHeaders()` 共有のため自動で効く)
4. Firebase Auth (Identity Platform) を設定し、`lib/auth.ts` でセッション Cookie を検証して **ID トークンを取り出す** 実装に差し替え (`getIdToken()`)。`lib/api.ts` の `beHeaders()` がこのトークンを `Authorization: Bearer` として付与する。BE 側では公開鍵で署名・有効期限・aud/iss を検証して uid を確定 (詳細: auth.md)。**現状の本番パスは cookie があってもトークンを取り出せないスタブなので、ここを実装するまで `BE_URL` を立てると全 API が 401 になる。** ログイン画面・セッション Cookie 発行・ログアウトの新規実装が必要 (ここだけは「FE 変更不要」ではない、相応の FE 作業)
5. BE に `/uploads/signed-url` (GCS 署名 URL 発行) を実装。FE 変更不要
6. 動作確認後、`app/api/mock-upload/` と `lib/mock/` を削除してもよい (残しても無害)

> 次フェーズ (AI チャット) で BE に `/orgs/:id/memos/:id/chat` (Vertex AI ストリーム) を実装し `app/api/chat/route.ts` を足す。ステップ3で `beHeaders()` を共有しているため認証付与は自動。
