import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import inquirer from 'inquirer';
import { verifyAuthentication } from '../services/auth';
import { listProjects, deleteProject, Project } from '../services/project';

interface DeleteOptions {
  project: string;
}

export async function runDelete(options: DeleteOptions): Promise<number> {
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

    // Try to load project configuration (optional for delete)
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
    console.log('→ Selecting project to delete...');
    console.log();

    const projects: Project[] = await listProjects();
    
    if (projects.length === 0) {
      console.error('❌ No projects found. Deploy a project first.');
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
        message: 'Select a project to delete:',
        choices: choices,
        pageSize: Math.min(10, projects.length)
      }
    ]);

    console.log();
    console.log(`Project: ${selectedProject.name}`);

    // Confirm deletion
    const { confirmDelete } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmDelete',
        message: `Are you sure you want to delete the project "${selectedProject.name}"? This will remove all deployments and cannot be undone.`,
        default: false
      }
    ]);

    if (!confirmDelete) {
      console.log('❌ Deletion cancelled.');
      return 0;
    }

    console.log('→ Deleting project...');
    console.log();

    // Delete the project
    await deleteProject(selectedProject.id);

    console.log('✅ Project deleted successfully');
    console.log();

    return 0;

  } catch (error: any) {
    console.error('❌ Deletion failed\n');
    console.error('Error details:');
    console.error(error.message);
    console.error();
    return 1;
  }
}