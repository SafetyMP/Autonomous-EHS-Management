# Terraform remote state (scaffold)

This repo ships **application** Terraform under [`infra/terraform/`](../infra/terraform/) (VPC + EKS starter). **Remote state** is org-specific: you choose the AWS account, S3 bucket, DynamoDB lock table, and KMS policy.

## References

- Example backend block: [`infra/terraform/backend.example.tf`](../infra/terraform/backend.example.tf)
- Variable placeholders: [`infra/terraform/terraform.tfvars.example`](../infra/terraform/terraform.tfvars.example)
- GitHub rulesets, environments, and promotion flow: [`REPO_SETUP.md`](../REPO_SETUP.md)

## Checklist

1. **Create** dedicated S3 bucket (versioning on, SSE-KMS or SSE-S3 per policy).
2. **Create** DynamoDB table with `LockID` string key for native Terraform locking.
3. **IAM** — least privilege for CI humans and automation roles (`s3:GetObject`, `s3:PutObject` on prefix, `dynamodb:GetItem`, `PutItem`, `DeleteItem` on lock table).
4. **backend.tf** — uncomment and set `bucket`, `key`, `region`, `dynamodb_table` (or variables as in `backend.example.tf`).
5. **Never** commit root `terraform.tfvars` with bucket names if your org classifies them sensitive—use CI env or HCP Terraform.

## Staff / GitOps note

Align OIDC subjects for **`terraform plan/apply`** with the same trust model as EKS promotion (`REPO_SETUP.md` §3)—separate state role from cluster role when possible.
