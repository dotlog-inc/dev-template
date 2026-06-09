# Issue #5 実装計画書 — メモアプリ API（認証連携 + メモ CRUD）

- 対象 Issue: [dotlog-inc/dev-template#5](https://github.com/dotlog-inc/dev-template/issues/5)
- 対象範囲: **API（`apps/api`）のみ**。フロントエンド（画面）・Identity Platform 上の登録/ログイン/ログアウト/パスワード再発行フロー自体は別 Issue / 別責務。
- 方針: ishizue 準拠のクリーンアーキテクチャ（domain / application / infrastructure / presentation）へ再編し、Firebase Identity Platform 認証つきのメモ CRUD を実装する。

---

## 1. ゴールとスコープ

### 1.1 API の責務
- Identity Platform 発行 ID トークンの検証（`Authorization: Bearer <token>`）
- App 側 User の明示登録（`POST /users`）/ 同期・取得（`GET /users/me`）
- 自分のメモのみ操作できる、認証・認可つきの Memo CRUD
- ドメイン例外を共通 `ErrorResponse` 形式で返す例外ハンドリング

### 1.2 スコープ外（API は実装しない）
- 画面実装（別 Issue）
- ログイン / ログアウト / パスワード再発行フロー本体（Identity Platform + フロント責務）
- 再発行メール送信ロジック

### 1.3 完了の定義（DoD）
- 後述「§12 完了条件マッピング」のチェックがすべて満たされ、`mise run api:check`（lint + typecheck + test）が通る。

---

## 2. 現状と差分

### 2.1 現状（`apps/api/src/`、フラット構成）
```
src/
├── config.py          # pydantic-settings（database_url / cors_origins）
├── db.py              # create_engine + get_session
├── models.py          # Item（SQLModel, table=True）+ ItemCreate / ItemPublic
├── main.py            # FastAPI app + CORS + health/items ルーター登録
└── routes/
    ├── health.py      # GET /health
    └── items.py       # Item CRUD サンプル（認証なし）
```
- 認証なし、`Item` サンプルのみ。テストは `tests/test_health.py` のみ。
- マイグレーションは `migrations/versions/0001_create_items.py`。

### 2.2 目標構成（ishizue 準拠レイヤード）
```
apps/api/src/
├── domain/
│   ├── models/            # ドメインモデル（dataclass）: User, Memo
│   ├── repositories/      # リポジトリ interface（Protocol）
│   ├── ports/             # 外部サービス interface（AuthService 等）
│   └── exceptions.py      # AppError 階層（NotFoundError / ConflictError 等）
├── application/
│   ├── dto/               # ユースケース入出力 DTO（dataclass）
│   └── usecase/           # *UseCase（execute() を持つ）
├── infrastructure/
│   ├── auth/              # Identity Platform 実装（firebase-admin）
│   └── database/
│       ├── models/        # SQLModel ORM モデル
│       ├── repositories/  # Sql*Repository（Protocol 実装）
│       └── mappers/       # to_domain / to_orm
├── presentation/
│   ├── router/            # リソースごとのルーター（health / users / memos）
│   ├── schema/            # Pydantic リクエスト/レスポンス
│   ├── di/                # Depends 用ファクトリ
│   ├── auth.py            # CurrentUser 依存（get_current_user）
│   └── exception_handlers.py
├── utils/
│   └── config.py          # pydantic-settings（現 config.py を移設・拡張）
└── main.py
```

### 2.3 主な差分（やること）
- レイヤー構成へ再編（ディレクトリ新設、各層に `__init__.py`）。
- `Item` サンプル一式の削除（`models.py` / `routes/items.py` / `0001_create_items` の扱いは §10 参照）。
- `firebase-admin` 依存追加、認証設定の追加（pyproject / config / .env.example）。
- `users` / `memos` テーブルの Alembic マイグレーション追加。

---

## 3. データモデル

### 3.1 ドメインモデル（`domain/models/`、ORM 非依存の dataclass）

**User**（`domain/models/user.py`）
| field | 型 | 制約 |
|---|---|---|
| `id` | `str` | PK（Identity Platform の uid） |
| `name` | `str` | 必須 / 最大50 / 空白のみ不可 |
| `email` | `str` | 必須 / 一意 / メール形式 |
| `created_at` | `datetime` | 必須 |
| `updated_at` | `datetime` | 必須 |
> パスワードは保持しない（Identity Platform 管理）。

**Memo**（`domain/models/memo.py`）
| field | 型 | 制約 |
|---|---|---|
| `id` | `int` | PK |
| `title` | `str` | 必須 / 最大50 / 空白のみ不可 |
| `body` | `str` | 任意 / 最大5000（空文字許容） |
| `user_id` | `str` | 必須 / User への FK |
| `created_at` | `datetime` | 必須 |
| `updated_at` | `datetime` | 必須 |

- User 1 : Memo 多。Memo は必ず 1 人の User に紐づく。
- ドメインの不変条件（タイトル必須・空白のみ不可など）は値の正規化/検証として持たせ、入口（Pydantic スキーマ）と二重で担保する。

### 3.2 ORM モデル（`infrastructure/database/models/`、SQLModel `table=True`）
- `UserOrm`（`__tablename__ = "users"`）/ `MemoOrm`（`__tablename__ = "memos"`）。
- `created_at` / `updated_at` は既存テンプレ踏襲で `DateTime(timezone=True)`、`server_default=func.now()`、`updated_at` は `onupdate=func.now()`。
- `MemoOrm.user_id` は `users.id` への FK（`ondelete` は初期方針では設定せず、アプリ側で制御）。
- `memos.user_id` にインデックス（一覧取得の絞り込み用）。

### 3.3 Mapper（`infrastructure/database/mappers/`）
- `user_mapper.to_domain(orm) -> User` / `to_orm(domain) -> UserOrm`
- `memo_mapper.to_domain(orm) -> Memo` / `to_orm(domain) -> MemoOrm`
- ドメイン層が SQLModel に依存しないための境界。

---

## 4. ドメイン層

### 4.1 例外階層（`domain/exceptions.py`）
- `AppError`（基底）
  - `NotFoundError` … 不存在・権限なし（認可違反も 404 に集約）
  - `ConflictError` … 重複登録（409）
  - `ValidationError`（必要なら）… ドメイン不変条件違反
  - `UnauthorizedError` … トークン検証失敗（401）
- HTTP ステータスへのマッピングは presentation 層に集約（§7.3）。ドメイン層は HTTP を知らない。

### 4.2 リポジトリ interface（`domain/repositories/`、`typing.Protocol`）
- `UserRepository`
  - `get(user_id: str) -> User | None`
  - `get_by_email(email: str) -> User | None`
  - `add(user: User) -> User`
- `MemoRepository`
  - `list_by_user(user_id: str) -> list[Memo]`（`updated_at` 降順）
  - `get(memo_id: int) -> Memo | None`
  - `add(memo: Memo) -> Memo`
  - `update(memo: Memo) -> Memo`
  - `delete(memo: Memo) -> None`

### 4.3 ports（`domain/ports/`）
- `AuthService`（Protocol）
  - `verify_token(token: str) -> AuthIdentity`（uid / email を含む検証済み identity を返す。失敗時は `UnauthorizedError`）。

---

## 5. アプリケーション層（`application/usecase/`）

各 UseCase は `execute()` を持ち、リポジトリ／ポートを DI で受け取る。認可（`memo.user_id == current_user.id`）は **取得時にチェックし、不一致・不存在は一律 `NotFoundError`**。

| UseCase | 入力 | 主処理 | 例外 |
|---|---|---|---|
| `RegisterUserUseCase` | uid, email, name | 既存なら `ConflictError`、無ければ作成 | Conflict |
| `GetCurrentUserUseCase` | uid | User 取得 | NotFound |
| `ListMemosUseCase` | user_id | 自分のメモを `updated_at` 降順で取得 | — |
| `CreateMemoUseCase` | user_id, title, body | Memo 作成（user に紐づけ） | — |
| `GetMemoUseCase` | user_id, memo_id | 取得 + 所有者チェック | NotFound |
| `UpdateMemoUseCase` | user_id, memo_id, title?, body? | 所有者チェック後に更新、`updated_at` 更新 | NotFound |
| `DeleteMemoUseCase` | user_id, memo_id | 所有者チェック後に削除 | NotFound |

- DTO（`application/dto/`）はユースケース境界の入出力を dataclass で表現（presentation の Pydantic とドメインの間）。

---

## 6. 認証連携（Identity Platform / firebase-admin）

### 6.1 トークン検証（`infrastructure/auth/`）
- `firebase-admin` の `firebase_admin.auth.verify_id_token()` で Bearer トークンを検証。
- `FirebaseAuthService`（`AuthService` Protocol 実装）。アプリ起動時に `firebase_admin.initialize_app()`（資格情報は ADC / 環境変数）。
- ローカルは **Auth Emulator** 対応：`FIREBASE_AUTH_EMULATOR_HOST` が設定されていれば SDK が自動的にエミュレータへ接続。`GOOGLE_CLOUD_PROJECT` / `project_id` をエミュレータ用に設定。

### 6.2 CurrentUser 依存（`presentation/auth.py`）
- `get_current_user`:
  1. `Authorization` ヘッダから Bearer トークン抽出（無ければ 401）。
  2. `AuthService.verify_token()` で uid / email を取得（失敗は 401）。
  3. App 側 User を取得。未登録の場合の扱いは下記方針で決定。
- `CurrentUser = Annotated[User, Depends(get_current_user)]`。
- **未登録ユーザーの扱い（要決定 / §13 オープン事項）**: 初期方針は「`/users` 明示登録を必須とし、未登録での `/memos` アクセスは 404（または 401）」。`/users/me` は未登録時 404。

### 6.3 設定追加（`utils/config.py`）
- `firebase_project_id: str`（必須 or 既定）
- `firebase_auth_emulator_host: str | None`（ローカル用、任意）
- 既存の `database_url` / `cors_origins` は据え置き。

---

## 7. プレゼンテーション層

### 7.1 ルーター（`presentation/router/`）
- `health.py` … 既存 `GET /health`（認証不要）を移設。
- `users.py`
  - `POST /users` — 明示登録。検証済みトークンから `id`(uid)/`email`、ボディから `name`（必須/最大50/空白のみ不可）。重複は **409**。
  - `GET /users/me` — 現在ユーザー取得。
- `memos.py`（すべて認証必須・自分のメモのみ）
  - `GET /memos` — 自分のメモ一覧、`updated_at` 降順、0 件は空配列 `[]`。
  - `POST /memos` — 作成（**201**）、`user_id` は current_user。
  - `GET /memos/{memo_id}` — 詳細。
  - `PATCH /memos/{memo_id}` — 編集、成功時 `updated_at` 更新。
  - `DELETE /memos/{memo_id}` — 削除（**204**）。

### 7.2 スキーマ（`presentation/schema/`、Pydantic）
- リクエスト: `UserCreateRequest`（`name`）、`MemoCreateRequest`（`title`, `body`）、`MemoUpdateRequest`（`title?`, `body?`）。
- レスポンス: `UserResponse`、`MemoResponse`、`MemoListItemResponse`（一覧は本文の一部=`body` 抜粋でも可。初期は本文全体でも可、要件は「本文の一部」）。
- 制約（`title` 最大50 / 空白のみ不可、`body` 最大5000）を `Field` + バリデータで定義。違反時は FastAPI が **422**。

### 7.3 例外ハンドラ（`presentation/exception_handlers.py`）
- ドメイン例外 → HTTP の集中マッピング:
  - `NotFoundError` → 404
  - `ConflictError` → 409
  - `UnauthorizedError` → 401
  - `RequestValidationError`（FastAPI） → 422
- 共通 `ErrorResponse`（ishizue 準拠）を返す:
  ```json
  {
    "type": "about:blank",
    "title": "Not Found",
    "status": 404,
    "errors": [{ "field": "memo_id", "message": "..." }]
  }
  ```
  - `errors[]` はバリデーション詳細を格納（無い場合は空配列）。

### 7.4 DI（`presentation/di/`）
- `get_session`（DB セッション）/ 各 Repository ファクトリ / 各 UseCase ファクトリを `Depends()` で組み立て、`AuthService` を注入。
- セッションは `get_session` 依存で commit/rollback を管理（書き込み系ユースケース後に commit、例外時 rollback）。

---

## 8. DB / マイグレーション

- Alembic で `users` / `memos` テーブルを追加（新規リビジョン、`down_revision` を直前に連結）。
- `migrations/env.py` の `from src.models import *` は新 ORM モデルの import 元に合わせて修正（`from src.infrastructure.database.models import *` 等）し、`SQLModel.metadata` にテーブルが登録されるようにする。
- `users`: `id`(str PK), `name`, `email`(unique index), `created_at`, `updated_at`。
- `memos`: `id`(int PK, autoincrement), `title`, `body`(nullable / text), `user_id`(FK→users.id, index), `created_at`, `updated_at`。
- 既存 `0001_create_items` の扱いは §10。

---

## 9. ツール / 依存関係の変更

- `pyproject.toml` dependencies に `firebase-admin>=6` を追加（`uv add firebase-admin` → `uv.lock` 更新）。
- `.env.example`（ルート / `apps/api`）に Firebase 関連を追記:
  - `FIREBASE_PROJECT_ID=...`
  - `# ローカル: FIREBASE_AUTH_EMULATOR_HOST=localhost:9099`
- 既存の ruff(ALL) / pyright(strict) / pytest 構成は維持。`docker-compose.yml` に Auth Emulator を追加するかは任意（ローカル検証手段として検討、§13）。

---

## 10. `Item` サンプルの撤去方針

- `src/models.py`、`src/routes/items.py`、`src/main.py` の items 登録を削除。
- マイグレーション `0001_create_items`:
  - 方針 A（推奨・テンプレ初期化）: items を drop する新規リビジョンを追加（履歴を残す）。
  - 方針 B: テンプレートとしてリセット可能なので `0001` を `users`/`memos` 作成に置き換え（履歴を作り直す）。
  - → §13 で決定。初期実装方針としては **A（drop リビジョン追加）** を既定とする。

---

## 11. テスト戦略

### 11.1 ユニットテスト（usecase）
- 各 UseCase を、Repository Protocol の **インメモリ/モック実装** で検証。
  - 認可: 他ユーザーの memo_id → `NotFoundError`。
  - 一覧: `updated_at` 降順。
  - 編集: `updated_at` が更新される。
  - 登録: 重複 uid → `ConflictError`。

### 11.2 結合テスト（エンドポイント）
- `TestClient` + Auth Emulator（または `AuthService` をスタブに差し替える DI override）。
- ケース:
  - 未認証（トークン無し）→ 401。
  - 認証あり: メモ CRUD 一連が成功。
  - 他ユーザーの memo へ URL 直接アクセス → 404。
  - バリデーション不備（title 空 / 51文字 / body 5001文字）→ 422。
  - `POST /users` 重複 → 409。
- 既存 `test_health.py` は維持。

### 11.3 受け入れ
- `mise run api:check`（`api:lint` + `api:typecheck` + `api:test`）が通ること。

---

## 12. 完了条件マッピング（Issue TODO ↔ 本計画）

| Issue TODO | 対応セクション |
|---|---|
| ishizue 準拠レイヤード構成へ再編 | §2.2, §10 |
| ID トークン検証 + `get_current_user`（Emulator 対応） | §6 |
| User/Memo のドメイン・ORM・Mapper・リポジトリ | §3, §4 |
| Alembic で `users`/`memos` 追加 | §8 |
| `POST /users`（重複409）/ `GET /users/me` | §5, §7.1 |
| メモ CRUD（一覧 updated_at 降順 / 編集時 updated_at 更新） | §5, §7.1 |
| 認可（自分のみ・他/不存在は404） | §5, §7.3 |
| 共通 ErrorResponse + exception_handlers（401/422） | §7.3 |
| usecase ユニットテスト（Protocol モック） | §11.1 |
| 結合テスト（TestClient + Emulator、認可/未認証） | §11.2 |
| `mise run api:check` が通る | §11.3 |

> 要件定義「7. 完了条件」のうち、登録/ログイン/ログアウト/再発行のフロー本体・画面はフロント Issue 側で満たす。API は対応エンドポイント・認可・エラー形式を提供することで貢献する。

---

## 13. 実装ステップ（推奨順序）

1. **足場づくり**: ディレクトリ新設（domain/application/infrastructure/presentation/utils）+ `__init__.py`。`config.py` を `utils/config.py` へ移設。
2. **ドメイン層**: models（User/Memo）、exceptions、repositories（Protocol）、ports（AuthService）。
3. **infrastructure/database**: ORM モデル（users/memos）、mappers、Sql*Repository。
4. **Alembic**: `env.py` の import 修正 + `users`/`memos` リビジョン追加（+ items drop）。`mise run db:migrate` で確認。
5. **infrastructure/auth**: `firebase-admin` 追加、`FirebaseAuthService`、Emulator 対応。
6. **application/usecase**: 7 ユースケース + DTO。
7. **presentation**: schema、router（health/users/memos）、auth.py（CurrentUser）、di、exception_handlers、ErrorResponse。
8. **main.py**: ルーター登録差し替え、例外ハンドラ登録、Firebase 初期化。items 撤去。
9. **テスト**: usecase ユニット → エンドポイント結合（DI override / Emulator）。
10. **仕上げ**: `mise run api:check` 通過、`.env.example` / README 追記。

---

## 14. オープン事項（要決定）

1. **未登録ユーザーの `/memos` アクセス**: 「`/users` 登録必須 → 未登録は 404」か「初回アクセス時に自動同期作成」か。初期方針は **明示登録必須**。
2. **`Item` マイグレーション**: drop リビジョン追加（A）か `0001` 置き換え（B）か。初期方針は **A**。
3. **一覧の「本文の一部」**: API で抜粋を返すか、本文全体を返してフロントで省略するか。初期方針は **本文全体（または先頭 N 文字）を返す**＝フロント側省略許容。
4. **Auth Emulator の docker-compose 追加**: ローカル統合検証のため追加するか（任意）。
5. **`firebase-admin` 資格情報**: 本番は ADC、ローカルは Emulator で資格情報不要、を前提とする。
