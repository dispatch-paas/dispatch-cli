import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import inquirer from 'inquirer';
import { verifyAuthentication } from '../services/auth';
import { listProjects, Project } from '../services/project';
import { authFetch } from '../services/controlPlane';

interface LogsOptions {
  project: string;
}

export async function runLogs(options: LogsOptions): Promise<number> {
  try {
    console.log('→ Verifying authentication...');
    console.log();
    
    // Verify authentication
    const userInfo = await verifyAuthentication();
    if (!userInfo) {
      console.error('❌ Not authenticated. Please run "dispatch login" first.');
      return 1;
    }
    console.log(`✓ Authenticated as ${userInfo.user.email}`);
    console.log(`  Tier: ${userInfo.user.tier}`);
    console.log();

    // Try to load project configuration (optional)
    const projectRoot = path.resolve(options.project);
    const configPath = path.join(projectRoot, 'dispatch.yaml');
    
    let config: any = null;
    if (fs.existsSync(configPath)) {
      try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        config = yaml.load(configContent) as any;
        console.log('→ Current directory project detected');
        console.log(`Current project: ${config.projectName}`);
        console.log();
      } catch (error) {
        console.log('→ Found dispatch.yaml but could not parse it');
        console.log();
      }
    } else {
      console.log('→ No dispatch.yaml found in current directory');
      console.log();
    }

    // Get user's projects
    console.log('→ Selecting project...');
    console.log();

    const projects: Project[] = await listProjects();
    
    if (projects.length === 0) {
      console.error('[ERROR] No projects found. Deploy a project first.');
      return 1;
    }

    // Check if current folder has a project that matches
    const currentProjectName = config?.projectName;

    // Create choices with current project highlighted
    const choices = projects.map(p => {
      const isCurrentProject = currentProjectName && p.name === currentProjectName;
      return {
        name: isCurrentProject ? `${p.name} (current project)` : p.name,
        value: p,
        short: p.name
      };
    });

    // Always show selection, even if there's only one project
    const { project: selectedProject } = await inquirer.prompt([
      {
        type: 'list',
        name: 'project',
        message: 'Select a project to view logs:',
        choices: choices,
        pageSize: Math.min(10, projects.length)
      }
    ]);

    console.log();
    console.log(`Project: ${selectedProject.name}`);

    // Get deployments for this project
    console.log('→ Fetching deployments...');

    const deployments = await authFetch(`/deployments/${selectedProject.id}`) as any;
    
    if (!deployments || !deployments.deployments || deployments.deployments.length === 0) {
      console.error('[ERROR] No deployments found for this project.');
      return 1;
    }

    // Show recent deployments
    const recentDeployments = deployments.deployments
      .slice(0, 10)
      .map((d: any) => ({
        name: `${d.id.slice(0, 8)} - ${d.status} (${new Date(d.created_at).toLocaleString()})`,
        value: d,
        short: d.id.slice(0, 8)
      }));

    const { deployment } = await inquirer.prompt([
      {
        type: 'list',
        name: 'deployment',
        message: 'Select a deployment to view logs:',
        choices: recentDeployments,
        pageSize: Math.min(10, recentDeployments.length)
      }
    ]);

    console.log();
    console.log(`Deployment: ${deployment.id}`);
    console.log(`Status: ${deployment.status}`);
    console.log(`Created: ${new Date(deployment.created_at).toLocaleString()}`);
    console.log();

    // Show build logs
    if (deployment.build_logs) {
      console.log('[BUILD LOGS]:');
      console.log('─'.repeat(80));
      console.log(deployment.build_logs);
      console.log('─'.repeat(80));
    } else {
      console.log('ℹ️  No build logs available for this deployment.');
      console.log('   Build logs are only available for deployments made with the updated worker.');
    }

    return 0;

  } catch (error: any) {
    console.error('❌ Failed to fetch logs\n');
    console.error('Error details:');
    console.error(error.message);
    console.error();
    return 1;
  }
}