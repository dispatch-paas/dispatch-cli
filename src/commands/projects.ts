/**
 * Projects command - List and manage projects
 */
import chalk from 'chalk';
import { listProjects } from '../services/project';
import { verifyAuthentication } from '../services/auth';

interface ProjectsOptions {
  // Future options like --json, --verbose, etc.
}

export async function runProjects(action: string, options: ProjectsOptions = {}): Promise<number> {
  try {
    console.log(chalk.bold('📋 Dispatch Projects\n'));

    // Verify authentication
    const authResult = await verifyAuthentication();
    if (!authResult || !authResult.authenticated) {
      console.log(chalk.red('❌ Not logged in. Run: dispatch login'));
      return 1;
    }

    if (action === 'list') {
      console.log(chalk.gray('Loading your projects...\n'));
      
      const projects = await listProjects();
      
      if (projects.length === 0) {
        console.log(chalk.yellow('No projects found.'));
        console.log(chalk.gray('Create your first project by running: dispatch deploy --project <name>'));
        return 0;
      }

      console.log(chalk.bold(`Found ${projects.length} project${projects.length === 1 ? '' : 's'}:\n`));
      
      projects.forEach((project, index) => {
        console.log(chalk.green(`  ${index + 1}. ${project.name}`));
        console.log(chalk.gray(`     ID: ${project.id}`));
        console.log(chalk.gray(`     Created: ${new Date(project.created_at).toLocaleDateString()}\n`));
      });

      return 0;
    } else {
      console.log(chalk.red(`❌ Unknown action: ${action}`));
      console.log(chalk.gray('Available actions: list'));
      return 1;
    }

  } catch (error: any) {
    console.log(chalk.red(`❌ Error: ${error.message}`));
    return 1;
  }
}