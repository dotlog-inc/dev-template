---
paths:
  - "apps/api/**"
---

# Backend Rules (path-aware)

`apps/api/**` を編集するときに効く規範。**クリーンアーキテクチャ**をベースに、FastAPI + SQLModel + Alembic + Firebase Auth / Python 3.14 で構成する。

## The Iron Law — The Dependency Rule

```
ソースコードの依存は、常に外側から内側（domain）へ向かう。内側は外側を一切知らない。
```

同心円で内側ほど安定・抽象、外側ほど具象・可変。**依存の矢印は必ず内向き**。内側（domain / application）が外側（DB・Web・Firebase）を import した時点で違反。

```
   ┌─────────────────────────────────────────────┐
   │ Frameworks & Drivers  … infrastructure /     │  外側・具象
   │   presentation の framework 実体              │
   │  ┌────────────────────────────────────────┐  │
   │  │ Interface Adapters … presentation       │  │
   │  │   (router=controller, schema, di)       │  │
   │  │  ┌───────────────────────────────────┐  │  │
   │  │  │ Use Cases … application            │  │  │
   │  │  │   (usecase, dto)                   │  │  │
   │  │  │  ┌─────────────────────────────┐  │  │  │
   │  │  │  │ Entities … domain           │  │  │  │  内側・抽象
   │  │  │  │  (models, ports, exceptions)│  │  │  │
   │  │  │  └─────────────────────────────┘  │  │  │
   │  │  └───────────────────────────────────┘  │  │
   │  └────────────────────────────────────────┘  │
   └─────────────────────────────────────────────┘
```

| 円（Clean Arch） | ディレクトリ | 責務 | 依存してよい先 |
|---|---|---|---|
| Entities | `src/domain/` | エンタープライズ業務ルール。model / repository・port の `Protocol` / 例外。**純粋** | なし（標準ライブラリのみ） |
| Use Cases | `src/application/` | アプリ固有の業務ルール。usecase・境界を渡す dto | domain のみ |
| Interface Adapters | `src/presentation/` | 外部表現 ↔ usecase の変換。router(controller)・schema・di・auth・例外ハンドラ | application / domain（+ 結線のため infrastructure の具象を注入） |
| Frameworks & Drivers | `src/infrastructure/` | 最外殻の詳細。SQLModel ORM・mapper・Firebase 実装 | domain（の `Protocol` を実装） |

## 依存性逆転（Dependency Inversion）

内側が外側を呼ぶ必要がある箇所（永続化・認証）は、**内側にインターフェイスを置き、外側がそれを実装**することで依存を逆転させ、矢印を内向きに保つ。

- domain に抽象を `Protocol` で定義（例: `MemoRepository`, `AuthService`）。
- infrastructure が具象を実装（例: `SqlMemoRepository`, `FirebaseAuthService`）。
- usecase は具象を知らず `Protocol` 型だけを受け取る。具象の注入は最外殻の `presentation/di` が行う（Composition Root）。

## 境界を越えるデータ（DTO / Schema / Entity）

円の境界は**単純なデータ構造**で越える。内側の都合を外に、外側の都合を内に漏らさない。

- **schema**（`presentation/schema`）— API 契約（Pydantic request/response）。最外殻の形。
- **dto**（`application/dto`）— usecase の入力。Interface Adapters → Use Cases の境界を渡す。
- **model**（`domain/models`）— Entity。内部表現。
- **ORM**（`infrastructure/.../models/*_orm.py`）— 永続化の詳細。**mapper で Entity と往復**し、円の外に閉じ込める。

3層（schema / dto / model）を1つに統合しない。router では Entity → response schema を明示変換する（既存の `_to_response` / `_to_list_item` に倣う）。

## Red Flags（見つけたら止まる）

- `src/domain/**` または `src/application/**` に `import fastapi` / `sqlmodel` / `firebase_admin` / `psycopg` がある（= 依存が外向き。**Dependency Rule 違反**）
- router が `Session` や repository を直接生成・呼び出している（usecase を経由していない）
- usecase / domain が `HTTPException` を投げている（→ domain 例外を投げる）
- ORM モデル（`*_orm.py`）が usecase やレスポンスに漏れている（→ mapper で Entity に変換）
- router が Entity や ORM をそのまま `return` している（→ `_to_response` で schema に変換）
- domain / application が具象クラス（`SqlMemoRepository` 等）を import している（→ `Protocol` に依存する）
- 適用済みマイグレーションを編集して挙動を変えようとしている（→ [migrations.md](migrations.md)）

## Rationalization Prevention

| 言い訳 | 反論 |
|---|---|
| 「単純な GET だから router から直接 DB でいい」 | 円を貫くコストはほぼ無い。1つ例外を作ると Dependency Rule が一気に崩れる |
| 「usecase から HTTPException 投げれば楽」 | Use Cases が Web（最外殻）を知ると再利用・テストが壊れる。domain 例外 → `exception_handlers` で変換 |
| 「Entity をそのまま返せばいい」 | 内部表現と API 契約は別物。境界は単純なデータ構造で越える |
| 「usecase で具象 repository を new すれば早い」 | 依存性逆転が崩れ内→外の依存が生まれる。`Protocol` 注入を Composition Root（`di`）に集約する |

## Rules

### レイヤ境界

- **domain（Entities）** — `models/`（データ）, `repositories/`・`ports/`（`Protocol` で抽象定義）, `exceptions.py`。framework 非依存を厳守。
- **application（Use Cases）** — `usecase/`（`__init__(repo: Protocol)` → `execute(...)`）と `dto/`。domain 抽象にのみ依存し、具象を import しない。
- **infrastructure（Frameworks & Drivers）** — `database/models/*_orm.py`（SQLModel）, `database/mappers/`（ORM ↔ Entity）, `database/repositories/`（`Protocol` の実装）, `auth/`（Firebase）。
- **presentation（Interface Adapters + 最外殻の結線）** — `router/`（controller）, `schema/`, `di/`（Composition Root）, `auth.py`（`CurrentUser`）, `exception_handlers.py`。

### Repository / Port パターン（依存性逆転の実体）

- 抽象は domain 側に `Protocol` で置く。
- 実装は infrastructure に置く。
- 結線は `presentation/di/usecase.py` で行い、`get_xxx_usecase(session)` factory と `XxxUseCaseDep = Annotated[..., Depends(...)]` を対で追加する。router は `Dep` 型だけを受け取る。

### 例外方針

- usecase / domain は `HTTPException` を投げず、`domain/exceptions.py` の `AppError` 系（`NotFoundError` / `ConflictError` / `UnauthorizedError`）を投げる。
- HTTP への変換は最外殻の `presentation/exception_handlers.py` に一元化する。新しい業務例外は `AppError` を継承し、対応するハンドラを登録する。
- **所有権違反は `NotFoundError`**（存在を漏らさない）。他ユーザーのリソースは 403 ではなく 404 相当で返す（`get_memo` の実装に倣う）。

### 認証

- 認証が必要な endpoint は `current_user: CurrentUser` を引数に取る（`presentation/auth.py`）。トークン検証は `AuthService` port 越しに行い、router で `firebase_admin` を直接触らない。

### トランザクション境界

- セッションはリクエスト単位で `get_session`（`presentation/di/database.py`）が発行し、DI で usecase に渡る。repository は `flush()` までを担い、**commit / rollback はリクエスト境界（`get_session`）で一括**して行う方針とする。
- ⚠️ **現状の gap**: `get_session` は `with Session(engine)` を抜けても commit しないため、`flush()` だけの書き込みは永続化されない。書き込み系を実装・テストするときは、この境界で commit（成功時）/ rollback（例外時）する実装を先に入れること。

### ツール / 検証

- 品質ゲート: `mise run //apps/api:check`（= `lint` + `typecheck` + `test`）。完了主張の前に必ず通す。
- lint/format は ruff（`select = ["ALL"]`、`line-length = 120`、docstring 等は `pyproject.toml` で ignore 済み）。型は pyright `strict`。
- Python は 3.14（`mise.toml` 固定）。`X | None` など新しめの構文を使ってよい。

### テスト

- `tests/` 配下に pytest で置く。Use Cases は `Protocol` をモックした repository で framework 抜きに単体テストできる（クリーンアーキテクチャの利点）。
- **error-path coverage**: 各 endpoint で success に加え 4xx シナリオ（404・409・401・422 等）を検証する。空応答から権限を推論しない。

## References

- レイヤ実例: [apps/api/src/](../../apps/api/src/)（`domain` → `application` → `infrastructure` → `presentation`）
- 依存性逆転の実体: [domain/repositories/](../../apps/api/src/domain/repositories/)（Protocol）↔ [infrastructure/database/repositories/](../../apps/api/src/infrastructure/database/repositories/)（実装）
- 例外変換: [exception_handlers.py](../../apps/api/src/presentation/exception_handlers.py)
- Composition Root: [di/usecase.py](../../apps/api/src/presentation/di/usecase.py)
- マイグレーション運用: [migrations.md](migrations.md)
