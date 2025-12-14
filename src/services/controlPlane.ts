import {
  DeploymentConfig,
  DeploymentRequest,
  DeploymentResponse,
  DeploymentStatus,
  User,
} from '../types/deployment';
import { getValidToken } from './auth';

// Configuration
const CONTROL_PLANE_URL = process.env.DISPATCH_API_URL || 'http://localhost:3000';

async function authFetch(path: string, options: RequestInit = {}) {
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
    throw new Error(body.error || `Request failed with status ${response.status}`);
  }
  
  try {
    return await response.json();
  } catch (e) {
    return {};
  }
}

async function createProject(name: string): Promise<{id: string}> {
    return authFetch('/projects', {
        method: 'POST',
        body: JSON.stringify({ name })
    }) as any;
}

/**
 * Create a new deployment
 * 
 * REAL: POST /deploy to control plane with auth token
 */
export async function createDeployment(
  request: DeploymentRequest,
  s3Key?: string
): Promise<DeploymentResponse> {
  console.log('Creating deployment in control plane...');
  
  let projectId: string;
  try {
      const project = await createProject(request.projectName);
      projectId = project.id;
  } catch (err: any) {
      console.error('Failed to create/retrieve project:', err.message);
      throw err;
  }

  const result = await authFetch('/deploy', {
    method: 'POST',
    body: JSON.stringify({
      project_id: projectId,
      s3_key: s3Key,
      metadata: { 
          runtime: request.runtime,
      }
    })
  }) as any;
  
  return {
    deploymentId: result.id,
    uploadUrl: '', 
    status: result.status,
  };
}

export async function pollDeploymentStatus(
  deploymentId: string
): Promise<DeploymentStatus> {
  const res = await authFetch(`/deploy/${deploymentId}`) as any;
  return {
      deploymentId: res.id,
      status: res.status,
      url: res.url
  };
}



/**
 * Poll deployment until completion
 */
export async function waitForDeployment(
  deploymentId: string,
  maxAttempts: number = 60, // 2 mins
  intervalMs: number = 2000
): Promise<DeploymentStatus> {
    process.stdout.write('Deploying...');
    for (let i = 0; i < maxAttempts; i++) {
        const status = await pollDeploymentStatus(deploymentId);
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
