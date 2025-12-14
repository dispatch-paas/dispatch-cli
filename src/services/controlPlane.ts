/**
 * Control plane API client
 * 
 * STUB IMPLEMENTATION
 * This simulates the Supabase-backed control plane API.
 * Replace with real HTTP client when ready.
 */

import {
  DeploymentRequest,
  DeploymentResponse,
  DeploymentStatus,
  User,
} from '../types/deployment';

/**
 * Create a new deployment
 * 
 * STUB: Returns mock deployment ID
 * REAL: POST /deploy to control plane with auth token
 */
export async function createDeployment(
  request: DeploymentRequest,
  user: User
): Promise<DeploymentResponse> {
  console.log('[STUB] Creating deployment via control plane...');
  console.log(`[STUB] Project: ${request.projectName}`);
  console.log(`[STUB] Runtime: ${request.runtime}`);
  console.log(`[STUB] Auth token: ${user.token.substring(0, 20)}...`);
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // STUB: Return mock deployment response
  const response: DeploymentResponse = {
    deploymentId: `deploy_${Date.now()}`,
    uploadUrl: 'https://s3.amazonaws.com/dispatch-artifacts/mock-presigned-url',
    status: 'pending',
  };
  
  console.log(`[STUB] Deployment created: ${response.deploymentId}`);
  
  return response;
}

/**
 * Poll deployment status
 * 
 * STUB: Simulates deployment progression (pending -> building -> live)
 * REAL: GET /deploy/:id from control plane
 */
export async function pollDeploymentStatus(
  deploymentId: string,
  user: User
): Promise<DeploymentStatus> {
  console.log(`[STUB] Polling deployment status: ${deploymentId}`);
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // STUB: Simulate progression through deployment stages
  // In a real implementation, this would be called multiple times
  // For stub, we'll just return 'live' status
  const status: DeploymentStatus = {
    deploymentId,
    status: 'live',
    url: 'https://abc123xyz.execute-api.eu-west-1.amazonaws.com',
  };
  
  console.log(`[STUB] Deployment status: ${status.status}`);
  
  return status;
}

/**
 * Poll deployment until completion
 * 
 * STUB: Simulates waiting for deployment to complete
 * REAL: Would poll GET /deploy/:id every few seconds
 */
export async function waitForDeployment(
  deploymentId: string,
  user: User,
  maxAttempts: number = 30,
  intervalMs: number = 2000
): Promise<DeploymentStatus> {
  console.log(`[STUB] Waiting for deployment to complete...`);
  
  // STUB: Simulate deployment stages
  const stages = ['pending', 'building', 'deploying'];
  
  for (let i = 0; i < stages.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`[STUB] Status: ${stages[i]}`);
  }
  
  // Final status check
  return pollDeploymentStatus(deploymentId, user);
}
