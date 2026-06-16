# dev-template

Next.js + FastAPI + PostgreSQL + Terraform をひとつに束ねた個人用モノレポテンプレート。
すべての開発ワークフローは `mise` 経由で実行する。

## スタック

| Layer    | Tool                              |
| -------- | --------------------------------- |
| Frontend | Next.js 16 (App Router) + TypeScript |
| Backend  | FastAPI + SQLAlchemy + Alembic    |
| DB       | PostgreSQL 16                     |
| IaC      | Terraform 1.9 (最小雛形)           |
| Dev      | Docker Compose                    |
| Runtime  | mise (Node 22 / Python 3.12 / uv) |

## ディレクトリ

```
.
├── apps/
│   ├── web/    # Next.js
│   └── api/    # FastAPI
├── infra/
│   └── terraform/
├── docker-compose.yml
├── .mise.toml
└── .env.example
```

## セットアップ

```bash
# 1. mise をインストール (未導入なら)
#    https://mise.jdx.dev/getting-started.html
brew install mise   # macOS の場合

# 2. ランタイムを揃える
mise install

# 3. 環境変数
cp .env.example .env

# 4. 起動 (web / api / db を一括で立ち上げる)
mise run dev
```

立ち上がったら:

- Web:        http://localhost:3000  (デモ組織のメモ一覧へリダイレクト)
- API docs:   http://localhost:8000/docs
- API health: http://localhost:8000/health

## Web (apps/web) について

`apps/web` は「組織メモ + AI」の参照実装。`BE_URL` を設定しなければ**内蔵モックBE
(`src/lib/mock`) で完結して動く**ので、API や DB を立てなくても画面を触れる。
設計思想は [apps/web/ARCHITECTURE.md](apps/web/ARCHITECTURE.md) を参照
(KISS / BE一本道 / Server Component + Server Action / モックBE)。

実BE (FastAPI など) に繋ぐときは `.env` に `BE_URL=https://...` を設定する。
モックBE (`src/lib/mock/handlers.ts`) がそのまま実BEのAPI仕様書になっている。

## 初回マイグレーション (API を使う場合)

`apps/api` (FastAPI) は単体で動く別レイヤー。利用するなら別ターミナルで:

```bash
mise run api:migrate
```

`items` テーブルが作成される。

## よく使うタスク

```bash
mise run dev              # docker compose up
mise run down             # 停止 (ボリュームも削除)
mise run stop             # 停止 (ボリューム保持)
mise run logs             # ログ追従

mise run install          # web / api の依存をホスト側にインストール
mise run web:dev          # Next.js を単独起動 (Docker を使わない)
mise run api:dev          # FastAPI を単独起動

mise run api:migrate      # Alembic upgrade head
mise run api:revision -- -m "msg"   # 新規マイグレーション

mise run lint             # 全体 lint
mise run format           # 全体 format

mise run tf:init / tf:plan / tf:apply
```

## アプリ単体で動かす場合

Docker を使わずホスト側で動かしたいとき:

```bash
# DB だけ Docker で立ち上げる
docker compose up -d db

# API
cd apps/api
cp .env.example .env   # DATABASE_URL を localhost に書き換え済み
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload

# Web (別ターミナル)
cd apps/web
pnpm install
pnpm dev
```

## クラウドへデプロイするには

`infra/terraform/README.md` 参照。`providers.tf` を編集して使うクラウドの provider を有効化し、`main.tf` を実リソースに差し替える。
