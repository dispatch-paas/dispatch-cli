/**
 * Type definitions for deployment-related entities
 */

export interface DeploymentConfig {
  projectName: string;
  runtime: string;
  region?: string;
  handler?: string;
  architecture?: string;
}

export interface DeploymentRequest {
  projectId: string;
  projectName: string;
  runtime: string;
  openApiSpec: any;
  safetyFindings: any[];
  handler?: string;
  architecture?: string;
}


export interface DeploymentResponse {
  deploymentId: string;
  uploadUrl?: string;
  status: 'pending' | 'building' | 'iam-setup' | 'lambda-deploying' | 'lambda-verifying' | 'api-setup' | 'api-verifying' | 'finalizing' | 'deploying' | 'live' | 'blocked' | 'failed';
}

export interface DeploymentStatus {
  deploymentId: string;
  status: 'pending' | 'building' | 'iam-setup' | 'lambda-deploying' | 'lambda-verifying' | 'api-setup' | 'api-verifying' | 'finalizing' | 'deploying' | 'live' | 'blocked' | 'failed';
  url?: string;
  error?: string;
  findings?: any[];
  build_logs?: string;
}

export interface BuildArtifact {
  zipPath: string;
  size: number;
  hash: string;
}

export interface User {
  id: string;
  email: string;
  token: string;
}
