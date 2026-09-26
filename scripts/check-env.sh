#!/usr/bin/env bash
# 手元の .env が .env.example の更新に追従しているかを検査する
#
# .env は gitignore 済みで、`mise run setup` は「無いときだけ」コピーする。
# そのため .env.example にキーが増えても既存の .env は古いまま残り、
# 症状は「DB へ繋がらない」「API の URL が古い」のように .env から遠い場所で出る。
#
# **値は比較しない。** 値は環境ごとに違うのが正しい（POSTGRES_PORT のずらしなど）。
# 検査できるのはキーの欠落だけで、値の陳腐化は検出できない。
#
# 使い方: scripts/check-env.sh [--warn-only]
#   --warn-only: 不足があっても 0 で終わる（`mise run setup` から呼ぶとき）
# 終了コード: 不足があれば 1（--warn-only 指定時は常に 0）

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

WARN_ONLY=0
[ "${1:-}" = "--warn-only" ] && WARN_ONLY=1

# 「例」と「実体」の対。web だけ .env.local なのは Next.js の規約に合わせているため
PAIRS=(
  ".env.example:.env"
  "apps/api/.env.example:apps/api/.env"
  "apps/web/.env.example:apps/web/.env.local"
)

MISSING_FILES=0
MISSING_KEYS=0

# 代入行のキーだけを拾う。行頭に固定しているのは、意図してコメントアウトしてある
# キーを「不足」と言わないため
keys_of() {
  grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$1" | cut -d= -f1 | sort -u
}

for pair in "${PAIRS[@]}"; do
  example="${pair%%:*}"
  actual="${pair##*:}"

  [ -f "$example" ] || continue

  if [ ! -f "$actual" ]; then
    echo "  ⚠ $actual がありません"
    MISSING_FILES=1
    continue
  fi

  missing=$(comm -23 <(keys_of "$example") <(keys_of "$actual"))
  extra=$(comm -13 <(keys_of "$example") <(keys_of "$actual"))

  if [ -n "$missing" ]; then
    echo "  ⚠ $actual — $example にあるキーが不足している"
    for key in $missing; do
      echo "      $key=$(grep -E "^$key=" "$example" | head -1 | cut -d= -f2-)"
    done
    MISSING_KEYS=1
  fi

  # 不足ではないので落とさない。ただし「example から消えたキーが残っている」は
  # 古い .env の徴候で、不足と同時に出ると原因の裏取りになる
  if [ -n "$extra" ]; then
    echo "  · $actual — $example に無いキー: $(echo "$extra" | tr '\n' ' ')"
  fi

  [ -z "$missing" ] && echo "  ✓ $actual"
done

if [ "$MISSING_FILES" -eq 0 ] && [ "$MISSING_KEYS" -eq 0 ]; then
  echo "✓ .env は .env.example に追従しています"
  exit 0
fi

echo
[ "$MISSING_FILES" -eq 1 ] && echo "無いファイルは \`mise run setup\` が .env.example から作ります。"
if [ "$MISSING_KEYS" -eq 1 ]; then
  echo "不足しているキーは手で足してください（値は .env.example の既定でよければそのまま）。"
  echo "POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB を変えたときは、既存のボリュームへは"
  echo "反映されないため \`docker compose down -v && docker compose up -d db\` も必要です。"
fi

[ "$WARN_ONLY" -eq 1 ] && exit 0
exit 1
