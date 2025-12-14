/**
 * Type definitions for deployment-related entities
 */

export interface DeploymentConfig {
  projectName: string;
  runtime: string;
  region?: string;
}

export interface DeploymentRequest {
  projectName: string;
  runtime: string;
  openApiSpec: any;
  safetyFindings: any[];
}

export interface DeploymentResponse {
  deploymentId: string;
  uploadUrl?: string;
  status: 'pending' | 'building' | 'deploying' | 'live' | 'blocked' | 'failed';
}

export interface DeploymentStatus {
  deploymentId: string;
  status: 'pending' | 'building' | 'deploying' | 'live' | 'blocked' | 'failed';
  url?: string;
  error?: string;
  findings?: any[];
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
