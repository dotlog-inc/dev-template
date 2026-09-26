terraform {
  # 1.11 未満に戻さない。secret 等の write-only 引数（`*_wo`）は 1.11 から
  required_version = ">= 1.11"

  backend "local" {
    path = "terraform.tfstate"
  }
}
