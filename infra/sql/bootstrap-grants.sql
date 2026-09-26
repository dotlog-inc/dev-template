-- superuser で 1 回だけ流すスキーマ権限。
--
-- public スキーマに対する操作は所有者権限を要求するため、所有者ロール（<db>_migrator）では
-- 実行できない。そのため Alembic に置けず、独立したファイルとして持つ。
-- ローカルでは docker-entrypoint-initdb.d から、本番では superuser の接続で psql -f で流す。
--
-- ロール名は DB 名から導く。psql の変数で渡すのは、識別子として %I でクォートさせるため。
--   psql -v ON_ERROR_STOP=1 -d <db> -f bootstrap-grants.sql
-- 変数を渡さずに実行した場合は current_database() から導出する。

\if :{?app_role}
\else
  SELECT current_database() || '_app' AS app_role \gset
\endif
\if :{?migrator_role}
\else
  SELECT current_database() || '_migrator' AS migrator_role \gset
\endif

-- PG15 以降は既定で PUBLIC から CREATE が外れているため通常は no-op。
-- 旧バージョンや既定を変えた環境で効かせるための保険として残す。
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

SELECT format('GRANT USAGE ON SCHEMA public TO %I', :'app_role') \gexec
SELECT format('GRANT CREATE, USAGE ON SCHEMA public TO %I', :'migrator_role') \gexec

-- マネージドな PostgreSQL（Cloud SQL など）は組み込み認証で作ったユーザーへ
-- 強い既定ロールを自動付与することがある。アプリ用ロールが public スキーマに
-- CREATE を持つと、所有者経由で RLS を回避できる余地が残るため剥がしておく。
-- 所有者ロールは DDL 実行者なので剥奪しない。
SELECT format('ALTER ROLE %I NOCREATEDB NOCREATEROLE', :'app_role') \gexec
SELECT format('ALTER ROLE %I NOCREATEDB NOCREATEROLE', :'migrator_role') \gexec
