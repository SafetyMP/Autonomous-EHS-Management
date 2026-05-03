output "cluster_name" {
  description = "Pass to `aws eks update-kubeconfig --name`."
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "Kubernetes API server endpoint (for debugging / private networking checks)."
  value       = module.eks.cluster_endpoint
}

output "cluster_certificate_authority_data" {
  description = "CA bundle for custom kubeconfig clients."
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

output "configure_kubectl" {
  description = "One-liner to merge kubeconfig on your machine."
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}

output "vpc_id" {
  value = module.vpc.vpc_id
}

output "private_subnets" {
  description = "Use for internal LBs or additional node groups."
  value       = module.vpc.private_subnets
}
