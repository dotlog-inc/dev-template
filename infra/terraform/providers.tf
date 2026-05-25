terraform {
  required_providers {
    # クラウドを採用するときに有効化する例:
    #
    # aws = {
    #   source  = "hashicorp/aws"
    #   version = "~> 5.0"
    # }
    # google = {
    #   source  = "hashicorp/google"
    #   version = "~> 6.0"
    # }
  }
}

# 例:
# provider "aws" {
#   region = var.region
# }
