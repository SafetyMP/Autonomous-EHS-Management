# Terraform backend: uncomment and create the S3 bucket + DynamoDB lock table first.
# (State must not live only on a laptop — use remote backend for team merges.)
#
# terraform {
#   backend "s3" {
#     bucket         = "myorg-ehs-terraform-state"
#     key            = "eks/prod/terraform.tfstate"
#     region         = "us-east-1"
#     dynamodb_table = "myorg-ehs-terraform-locks"
#     encrypt        = true
#   }
# }

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.87"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
