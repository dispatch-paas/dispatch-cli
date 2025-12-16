import { authFetch } from './controlPlane';

export interface Project {
  id: string;
  name: string;
  created_at: string;
}

export async function listProjects(): Promise<Project[]> {
  try {
    const response = await authFetch('/projects') as any;
    return response.projects || [];
  } catch (error: any) {
    console.error('Debug: listProjects error:', error.message);
    throw new Error(`Failed to list projects: ${error.message}`);
  }
}

export async function createProject(name: string): Promise<Project> {
  const response = await authFetch('/projects', {
    method: 'POST',
    body: JSON.stringify({ name })
  }) as any;
  return response;
}

export async function deleteProject(projectId: string): Promise<void> {
  await authFetch(`/projects/${projectId}`, {
    method: 'DELETE'
  });
}
