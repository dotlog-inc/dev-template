locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

# プレースホルダ: クラウドリソースに置き換える
resource "null_resource" "placeholder" {
  triggers = {
    name = local.name_prefix
  }
}
