import { authFetch } from './controlPlane';

export interface Project {
  id: string;
  name: string;
  created_at: string;
}

export async function listProjects(): Promise<Project[]> {
  const response = await authFetch('/projects') as any;
  return response.projects || [];
}

export async function createProject(name: string): Promise<Project> {
  const response = await authFetch('/projects', {
    method: 'POST',
    body: JSON.stringify({ name })
  }) as any;
  return response;
}
