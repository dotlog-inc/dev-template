# dev-template

Next.js + FastAPI + PostgreSQL + Terraform をひとつに束ねた個人用モノレポテンプレート。
開発ワークフローは `mise` 経由で実行する（コンテナの起動・停止のみ `docker compose` を直接使う）。

## スタック

| Layer    | Tool                                   |
| -------- | -------------------------------------- |
| Frontend | Next.js 15 (App Router) + TypeScript   |
| Backend  | FastAPI + SQLModel + Alembic           |
| DB       | PostgreSQL 16                          |
| IaC      | Terraform 1.16 (最小雛形)               |
| Dev      | Docker Compose                         |
| Runtime  | mise (Node 22 / pnpm 9 / Python 3.14 / uv) |

## ディレクトリ

```
.
├── apps/
│   ├── web/    # Next.js
│   └── api/    # FastAPI
├── infra/
│   └── terraform/
├── docker-compose.yml
├── mise.toml   # モノレポのルート（各サブプロジェクトにも mise.toml がある）
└── .env.example
```

## セットアップ

```bash
# 1. mise をインストール (未導入なら)
#    https://mise.jdx.dev/getting-started.html
brew install mise   # macOS の場合

# 2. mise の設定ファイルを信頼する（サブプロジェクトの mise.toml も個別に信頼が要る）
mise trust
for d in apps/web apps/api infra; do (cd "$d" && mise trust); done

# 3. ランタイムを揃える
#    NOTE: ランタイム（node / python / terraform）は各サブプロジェクトの mise.toml にあるため、
#          ルートの `mise install` だけでは入らない。各ディレクトリでも実行する。
mise install
for d in apps/web apps/api infra; do (cd "$d" && mise install); done

# 4. 環境変数（compose 用）
cp .env.example .env

# 5. 依存関係のインストール
#    web: pnpm install + .env.local 作成
#    api: uv sync + .env 作成
#    infra: terraform init
mise run setup
```

## 起動

### A. Docker Compose (web / api / db を一括)

```bash
docker compose up -d        # 起動
docker compose logs -f      # ログ追従
docker compose stop         # 停止 (ボリューム保持)
docker compose down -v      # 停止 (ボリュームも削除)
```

### B. ホストで直接 (DB だけ Docker)

```bash
docker compose up -d db
mise run dev:up             # web / api を並列起動
```

`apps/api/.env` は `mise run setup` が `apps/api/.env.example` から作る（接続先は `localhost`）。

### エンドポイント

A / B どちらでも同じポートで立ち上がる。

- Web:        http://localhost:3000
- API docs:   http://localhost:8080/docs
- API health: http://localhost:8080/health

## DB のロール

DB は 2 つのロールを使う。ロール名は `POSTGRES_DB` から導く。

| ロール | 権限 | 使う場所 |
| --- | --- | --- |
| `<POSTGRES_DB>_app` | DML のみ（DDL は実行できない） | api の実行時（`DATABASE_URL`） |
| `<POSTGRES_DB>_migrator` | テーブル所有者。DDL を実行する | alembic（`MIGRATION_DATABASE_URL`） |
| `postgres` | superuser | 初期化とバックアップのみ |

ロールの作成（`infra/sql/local/create-roles.sh`）とスキーマ権限の付与
（`infra/sql/bootstrap-grants.sql`）は、compose の `initdb.d` が**ボリュームを新規に作ったときだけ**
実行する。テーブルごとの DML 権限は `0000` マイグレーションの `ALTER DEFAULT PRIVILEGES` が自動で付ける。

compose の api には `MIGRATION_DATABASE_URL` を渡していない。ランタイムのプロセスが所有者権限を
持つと分離がプロセス内で消えるため、マイグレーションはホストから実行する。

## 初回マイグレーション

```bash
mise run //apps/api:db:migrate
```

`items` テーブルが作成され、Web 画面から item を追加できるようになる。
A（Compose）の場合もマイグレーションはホストから実行する（`localhost:5432` の db に対して流れる）。

## 既存環境からの移行 (DB ロールの分離)

ロールは DB の初期化時にしか作られないため、**既存のボリュームには反映されない。**
以前の単一ロール構成（`POSTGRES_USER=app` / DB 名 `app`）から移る場合:

```bash
# 1. .env を .env.example に揃える（POSTGRES_PORT など環境固有の値は入れ直す）
#    不足しているキーは mise run env:check が名指しする
cp .env.example .env

# 2. ボリュームを作り直す（開発データは消える）
docker compose down -v
docker compose up -d db

# 3. マイグレーションを流す
mise run //apps/api:db:migrate
```

`role "<db>_migrator" does not exist` が出る場合は、`.env` が古いか、`.env` の指すポートに
別の PostgreSQL が居る（`lsof -i :5432` で確認できる）。

## タスク一覧

`mise tasks --all` で全タスクを確認できる。主なもの:

```bash
# 横断 (ルート)
mise run setup                                  # 全サブプロジェクトのセットアップ
mise run check                                  # 全サブプロジェクトの品質チェック (alias: qa)
mise run dev:up                                 # web / api を並列起動

# apps/web
mise run //apps/web:dev                         # Next.js 開発サーバー
mise run //apps/web:build                       # プロダクションビルド
mise run //apps/web:check                       # lint + typecheck + format:check
mise run //apps/web:format                      # Prettier で整形

# apps/api
mise run //apps/api:dev                         # FastAPI 開発サーバー (ホットリロード)
mise run //apps/api:check                       # ruff + pyright + format:check + pytest
mise run //apps/api:test:db                     # DB が要るテスト（要 docker compose up -d db）
mise run //apps/api:format                      # ruff format
mise run //apps/api:db:migrate                  # alembic upgrade head
mise run //apps/api:db:migrate:generate -- "msg"  # 新規マイグレーションを自動生成
mise run //apps/api:db:migrate:rollback         # 1 つ戻す

# infra
mise run //infra:check                          # terraform fmt -check + validate
mise run //infra:plan                           # terraform plan
```

サブディレクトリの中では `//apps/api:` などの接頭辞を省いて `mise run dev` のように実行できる。

## クラウドへデプロイするには

`infra/terraform/README.md` 参照。`providers.tf` を編集して使うクラウドの provider を有効化し、`main.tf` を実リソースに差し替える。
