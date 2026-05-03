# Example: Terraform remote backend (S3 + DynamoDB locking)
#
# 1. Provision state bucket + DynamoDB lock table (separate root module or click-ops).
# 2. Copy this block into `backend.tf` (or merge) with real names.
# 3. Run `terraform init -migrate-state` only with counsel + SRE approval.
#
# terraform {
#   backend "s3" {
#     bucket         = var.terraform_state_bucket
#     key            = var.terraform_state_key
#     region         = var.aws_region
#     encrypt        = true
#     dynamodb_table = var.terraform_lock_table
#     # Optional: kms_key_id = var.terraform_state_kms_key_id
#   }
# }
#
# Example variables (also set in terraform.tfvars — never commit real .tfvars with secrets):
#
# variable "terraform_state_bucket" {
#   type        = string
#   description = "S3 bucket for Terraform state"
# }
#
# variable "terraform_state_key" {
#   type        = string
#   default     = "ehs/eks/terraform.tfstate"
# }
#
# variable "terraform_lock_table" {
#   type        = string
#   description = "DynamoDB table for state locking"
# }
#
# variable "aws_region" {
#   type    = string
#   default = "us-east-1"
# }
