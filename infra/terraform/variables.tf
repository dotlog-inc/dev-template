variable "project_name" {
  description = "プロジェクト名 (リソースの prefix/tag に使う想定)"
  type        = string
  default     = "dev-template"
}

variable "environment" {
  description = "環境名 (dev / stg / prod など)"
  type        = string
  default     = "dev"
}
