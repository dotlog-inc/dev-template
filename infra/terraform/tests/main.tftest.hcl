# `terraform test` の雛形。**実クラウドを呼ばない**（plan だけを見る）。
#
# 置いてある理由は 2 つ。`mise run //infra:check` が空実行で緑になるのを避けること、
# クラウドへ差し替えたときに書き足す場所を先に示しておくこと。
run "name_prefix_joins_project_and_environment" {
  command = plan

  variables {
    project_name = "example"
    environment  = "stg"
  }

  assert {
    condition     = null_resource.placeholder.triggers.name == "example-stg"
    error_message = "name_prefix が project_name-environment になっていない"
  }
}
