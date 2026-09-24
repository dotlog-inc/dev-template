# infra/terraform

クラウド非依存の最小雛形。`terraform init && terraform plan` が通る状態のみを担保している。

## 使い方

```bash
mise run //infra:init
mise run //infra:plan
cd infra/terraform && terraform apply   # mise 経由では確認プロンプトに応答できないため直接実行する
```

## クラウドに差し替える手順

1. `providers.tf` の `required_providers` で利用するプロバイダを有効化
2. 同ファイルで `provider "..." { ... }` を有効化
3. `main.tf` の `null_resource.placeholder` を実リソースに置き換え
4. 必要に応じ `backend.tf` をリモートバックエンド (S3 / GCS など) へ変更
5. `variables.tf` に追加変数を宣言し、`*.tfvars` で値を渡す

## ファイル

- `backend.tf` — state バックエンド (現在: local)
- `providers.tf` — provider 宣言 (現在: なし)
- `variables.tf` — 入力変数
- `main.tf` — リソース定義 (現在: プレースホルダ)
- `outputs.tf` — 出力値
- `tests/` — `terraform test`（実クラウドを呼ばない。`mise run //infra:check` が実行する）
- `.terraform.lock.hcl` — provider の版の固定（**コミットする**）
