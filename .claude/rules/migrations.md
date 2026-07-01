---
paths:
  - "apps/api/migrations/**"
---

# Migration Rules (path-aware)

`apps/api/migrations/**`（Alembic）を扱うときに効く規範。

## The Iron Law

```
スキーマ変更は ORM モデル → autogenerate → レビュー → 適用。手書き改変で挙動を変えない。
```

## Rules

- **生成**: ORM モデル（`src/infrastructure/database/models/*_orm.py`）を変更してから `mise run //apps/api:db:migrate:generate -- "message"` で差分を自動生成する。
- **必ずレビュー**: autogenerate はインデックス・型・制約・データ移行を取りこぼす。生成された `migrations/versions/*.py` の `upgrade()` / `downgrade()` を必ず目視し、意図通りか確認する。
- **適用済みは編集しない**: 一度適用（共有ブランチ・環境に取り込み済み）したマイグレーションは書き換えない。修正は新しいリビジョンを積む。ローカルで未共有のものだけ `db:migrate:rollback` でやり直す。
- **downgrade を空にしない**: `downgrade()` を実装し、ロールバック可能に保つ。
- **commit 境界**: マイグレーションは Alembic が独自にトランザクション管理する。アプリのリクエスト境界（→ [backend.md](backend.md) の「トランザクション境界」）とは別物として扱う。

## Commands

```bash
mise run //apps/api:db:migrate                       # upgrade head
mise run //apps/api:db:migrate:generate -- "message" # autogenerate
mise run //apps/api:db:migrate:rollback              # downgrade -1
```

## References

- Alembic 設定: [apps/api/alembic.ini](../../apps/api/alembic.ini) / [migrations/env.py](../../apps/api/migrations/env.py)
- ORM モデル: [apps/api/src/infrastructure/database/models/](../../apps/api/src/infrastructure/database/models/)
