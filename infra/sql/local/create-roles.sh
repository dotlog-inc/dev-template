#!/bin/sh
# ローカル・CI の PostgreSQL にアプリ用ロールと所有者ロールを作る。
#
# ロール名は DB 名から導く: <POSTGRES_DB>_app（DML のみ）と <POSTGRES_DB>_migrator（所有者・DDL）。
# 同じクラスタに複数プロジェクトを載せてもロール名が衝突しないようにするため。
# 権限付与は infra/sql/bootstrap-grants.sql（superuser）と Alembic 0000（所有者）が行う。
#
# 呼ばれる場所は 2 つ。いずれもこのファイル 1 本を実行する。
#   - docker-compose の initdb.d（01-）: ボリュームを新規に作ったとき
#   - CI（.github/workflows/ci.yml の api job）
# **CI 用に SQL を書き写さない。** 書き写すとロール構成が静かにずれ、
# 「ローカルでは緑なのに CI だけ落ちる」（あるいはその逆）が起きる。
#
# 要求する環境変数: POSTGRES_USER（superuser）, POSTGRES_DB, APP_PASSWORD, MIGRATOR_PASSWORD
set -eu

# パスワードは psql の変数展開（%L）でクォートさせる。SQL へ直接埋め込むと ' を含む
# パスワードで initdb.d が途中失敗し、ロールが無いまま PostgreSQL が起動して
# healthcheck も通ってしまう（pg_isready は superuser で見ているため気づけない）。
# ロール名は識別子なので %I を使う。ヒアドキュメントを <<'EOSQL' にしてシェル展開を止めるのが肝。
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=app_role="${POSTGRES_DB}_app" \
  --set=migrator_role="${POSTGRES_DB}_migrator" \
  --set=app_password="$APP_PASSWORD" \
  --set=migrator_password="$MIGRATOR_PASSWORD" <<'EOSQL'
-- CREATE ROLE に IF NOT EXISTS は無い。再実行される場所（CI）から呼ばれるため、
-- 無いときだけ作る形にする。
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'migrator_role', :'migrator_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'migrator_role')
\gexec

SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'app_role', :'app_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'app_role')
\gexec
EOSQL
