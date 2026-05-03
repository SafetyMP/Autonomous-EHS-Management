# All tunables for a small production-capable EKS footprint. FinOps note: NAT gateways and
# always-on node groups have baseline cost — tune `*_node_group_*` and `single_nat_gateway`.

variable "aws_region" {
  description = "AWS region for VPC + EKS (e.g. us-east-1)."
  type        = string
  default     = "us-east-1"
}

variable "cluster_name" {
  description = "EKS cluster name (becomes part of IAM and tag names)."
  type        = string
  default     = "ehs-prod"
}

variable "cluster_version" {
  description = "Kubernetes version for the control plane (match node AMIs supported by AWS)."
  type        = string
  default     = "1.31"
}

variable "vpc_cidr" {
  description = "RFC1918 CIDR for the dedicated VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "One public subnet per AZ (for NAT + load balancers)."
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "private_subnet_cidrs" {
  description = "Worker / private subnets for EKS nodes and pod ENIs."
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "single_nat_gateway" {
  description = "If true, one NAT GW for all AZs (cheaper dev/stage; less HA)."
  type        = bool
  default     = true
}

variable "node_instance_types" {
  description = "EC2 types for the default managed node group."
  type        = list(string)
  default     = ["m6i.large"]
}

variable "node_group_min_size" {
  description = "Minimum nodes. AWS MNG may require >=1 for steady scheduling; true scale-to-zero often needs Karpenter/Fargate patterns."
  type        = number
  default     = 1
}

variable "node_group_max_size" {
  type    = number
  default = 5
}

variable "node_group_desired_size" {
  type    = number
  default = 2
}
