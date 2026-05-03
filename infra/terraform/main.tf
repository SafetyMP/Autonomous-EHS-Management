# -----------------------------------------------------------------------------
# AWS EKS starter — immutable cluster + dedicated VPC
# -----------------------------------------------------------------------------
# Goal: `terraform init && terraform plan` from this directory after AWS creds exist.
# What this creates:
#   - VPC with public + private subnets, NAT for private egress (Neon/Upstash/OpenAI).
#   - EKS control plane + one managed node group for generic Linux workloads.
#
# What this does NOT create (on purpose):
#   - Container image registry (use GHCR — see .github/workflows/docker-publish.yml).
#   - Kubernetes manifests (use deploy/k8s + kubectl / cd-promote-production workflow).
#   - RDS (app uses Neon / external Postgres via DATABASE_URL).
#
# Next steps after apply:
#   aws eks update-kubeconfig --region var.aws_region --name var.cluster_name
#   kubectl apply -k ../../deploy/k8s
# -----------------------------------------------------------------------------

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, 3)
}

# VPC: isolates EHS network from other AWS accounts / default VPC.
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.21.0"

  name = "${var.cluster_name}-vpc"
  cidr = var.vpc_cidr

  azs             = local.azs
  private_subnets = var.private_subnet_cidrs
  public_subnets  = var.public_subnet_cidrs

  enable_nat_gateway   = true
  single_nat_gateway   = var.single_nat_gateway
  enable_dns_hostnames = true
  enable_dns_support   = true

  public_subnet_tags = {
    "kubernetes.io/role/elb" = 1
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1
  }

  tags = {
    "kubernetes.io/cluster/${var.cluster_name}" = "owned"
  }
}

# EKS: managed Kubernetes — upgrades API server separately from node AMIs.
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.31.0"

  cluster_name    = var.cluster_name
  cluster_version = var.cluster_version

  cluster_endpoint_public_access       = true
  cluster_endpoint_private_access      = true
  cluster_endpoint_public_access_cidrs = ["0.0.0.0/0"]

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    default = {
      name           = "default"
      instance_types = var.node_instance_types
      min_size       = var.node_group_min_size
      max_size       = var.node_group_max_size
      desired_size   = var.node_group_desired_size
      capacity_type  = "ON_DEMAND"
    }
  }

  # Lets the IAM principal that ran `terraform apply` administer the cluster (bootstrap).
  # For production RBAC, switch to explicit `access_entries` / IAM roles for break-glass only.
  enable_cluster_creator_admin_permissions = true

  tags = {
    app = "ehs"
  }
}
