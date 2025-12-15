import {
  DeploymentConfig,
  DeploymentRequest,
  DeploymentResponse,
  DeploymentStatus,
  User,
} from '../types/deployment';
import { getValidToken } from './auth';
import { debugLog } from '../utils/debug';

// Configuration
const CONTROL_PLANE_URL = (process.env.DISPATCH_API_URL || 'http://localhost:3000').replace(/\/$/, '');


export async function authFetch(path: string, options: RequestInit = {}) {
  const token = await getValidToken();
  
  if (!token) {
    throw new Error('Not authenticated. Please run: dispatch login');
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers || {}
  } as any;
  
  const response = await fetch(`${CONTROL_PLANE_URL}${path}`, {
    ...options,
    headers
  });
  
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as any;
    const errorMsg = body.error || body.message || `HTTP ${response.status}: ${response.statusText}`;
    
    // Include more details if available
    if (body.details) {
      throw new Error(`${errorMsg}\nDetails: ${JSON.stringify(body.details)}`);
    }
    
    throw new Error(errorMsg);
  }
  
  try {
    return await response.json();
  } catch (e) {
    return {};
  }
}

/**
 * Create a new deployment
 * 
 * For cloud builds: POST /deploy without s3_key, control plane enqueues build job
 */
export async function createDeployment(
  request: DeploymentRequest
): Promise<DeploymentResponse> {
  console.log('Creating deployment in control plane...');

  const payload = {
      project_id: request.projectId,
      project_name: request.projectName,
      metadata: { 
          runtime: request.runtime,
          handler: request.handler,
          architecture: request.architecture,
          openApiSpec: request.openApiSpec,
          safetyFindings: request.safetyFindings
      }
  };
  debugLog('Sending deploy payload:', JSON.stringify(payload, null, 2));

  const result = await authFetch('/deploy', {
    method: 'POST',
    body: JSON.stringify(payload)
  }) as any;
  
  return {
    deploymentId: result.id,
    uploadUrl: result.upload_url || '', 
    status: result.status,
  };
}

export async function pollDeploymentStatus(
  deploymentId: string
): Promise<DeploymentStatus> {
  const res = await authFetch(`/deploy/${deploymentId}`) as any;
  debugLog('Polling response:', JSON.stringify(res, null, 2));
  return {
      deploymentId: res.id,
      status: res.status,
      url: res.url
  };
}



/**
 * Poll deployment until completion
 * Cloud builds take longer (building + deploying), so increase timeout
 */
export async function waitForDeployment(
  deploymentId: string,
  maxAttempts: number = 120, // 4 minutes (for build + deploy)
  intervalMs: number = 2000
): Promise<DeploymentStatus> {
    process.stdout.write('Deploying...');
    for (let i = 0; i < maxAttempts; i++) {
        const status = await pollDeploymentStatus(deploymentId);
        debugLog(`Poll attempt ${i + 1}: status="${status.status}", url="${status.url}"`);
        if (status.status === 'live' || status.status === 'failed') {
            process.stdout.write('\n');
            return status;
        }
        process.stdout.write('.');
        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    process.stdout.write('\n');
    return { deploymentId, status: 'failed' };
}
