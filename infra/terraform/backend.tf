terraform {
  required_version = ">= 1.9"

  backend "local" {
    path = "terraform.tfstate"
  }
}
