/**
 * Run the deploy command
 */
import chalk from 'chalk';
import inquirer from 'inquirer';
import { loadOpenAPISpec } from '../utils/loader';
import { normalizeOpenAPISpec } from '../utils/normalizer';
import {
  evaluateOperations,
  isDeploymentSafe,
  getFindingSummary,
} from '../utils/safety';
import { loadConfig, validateConfig } from '../utils/config';
import { createDeployment, waitForDeployment } from '../services/controlPlane';
import { uploadSourceCode } from '../services/sourceUploader';
import { verifyAuthentication } from '../services/auth';
import { listProjects, createProject } from '../services/project';

interface DeployOptions {
  dryRun?: boolean;
  project?: string;
  source?: string;
  architecture?: string;
}

function printSafetyResults(findings: any[]): void {
  const blockingIssues = findings.filter((f: any) => f.severity === 'block');
  const warnings = findings.filter((f: any) => f.severity === 'warn');
  const passed = findings.filter((f: any) => f.severity === 'pass' || (!f.severity));

  console.log(chalk.bold('\n📋 Safety Check Results:\n'));
  
  if (blockingIssues.length > 0) {
    console.log(chalk.red(`❌ Failed: ${blockingIssues.length} blocking issue(s)`));
    for (const issue of blockingIssues) {
      console.log(chalk.red(`   • ${issue.method} ${issue.route}`));
      console.log(`     ${issue.message}`);
    }
  }
  
  if (warnings.length > 0) {
    console.log(chalk.yellow(`⚠️  Warnings: ${warnings.length} issue(s)`));
    for (const warn of warnings) {
      console.log(chalk.yellow(`   • ${warn.method} ${warn.route}`));
      console.log(`     ${warn.message}`);
    }
  }
  
  if (passed.length > 0) {
    console.log(chalk.green(`✓ Passed: ${passed.length} check(s)`));
  }
  
  if (blockingIssues.length > 0) {
    console.log(chalk.bold('\n💡 How to fix:'));
    console.log('  - Declare authentication in OpenAPI specification');
    console.log('  - OR explicitly mark routes as public (x-public + x-reason)');
  }
}

function printSuccess(url: string, safetySkipped: boolean): void {
  if (!safetySkipped) {
    console.log(chalk.green('✔ Safety checks completed'));
  }
  console.log(chalk.green('✔ Build completed'));
  console.log(chalk.green('✔ Upload completed'));
  console.log(chalk.green('✔ Deployment live\n'));
  console.log('API URL:');
  console.log(chalk.cyan(url));
}

export async function runDeploy(options: DeployOptions = {}): Promise<number> {
  // Use --source parameter, or fall back to --project, or default to current directory
  const projectRoot = options.source || options.project || '.';

  try {
    // Step 0: Verify authentication with control plane
    console.log(chalk.bold('\n→ Verifying authentication...\n'));
    const authResult = await verifyAuthentication();
    
    if (!authResult) {
      console.log(chalk.red('\n❌ Authentication required to deploy\n'));
      console.log(chalk.gray('Please login first:'));
      console.log(chalk.cyan('  dispatch login\n'));
      console.log(chalk.gray('Get your access code from: https://dispatch.dev/dashboard\n'));
      return 1;
    }
    
    if (!authResult.user.is_active) {
      console.log(chalk.red('\n❌ Your account is not active\n'));
      console.log(chalk.gray('Please contact support for assistance.\n'));
      return 1;
    }
    
    console.log(chalk.green(`✓ Authenticated as ${authResult.user.email || authResult.user.id}`));
    if (authResult.user.tier) {
      console.log(chalk.gray(`  Tier: ${authResult.user.tier}\n`));
    } else {
      console.log();
    }
    
    // Step 1: Load project config
    console.log(chalk.bold('→ Loading project configuration...\n'));
    const config = loadConfig(projectRoot);
    validateConfig(config);
    
    // Validate architecture
    const architecture = options.architecture || config.architecture;
    if (architecture && architecture !== 'x86_64') {
      console.log(chalk.red('\n❌ Only x86_64 architecture is currently supported\n'));
      console.log(chalk.gray('ARM64 support is coming soon.\n'));
      return 1;
    }
    
    // Step 1.5: Interactive project selection
    console.log(chalk.bold('→ Selecting project...\n'));
    const projects = await listProjects();
    let selectedProjectId: string;
    let selectedProjectName: string;
    
    if (projects.length === 0) {
      // No existing projects - create new one
      console.log(chalk.gray('No existing projects found.\n'));
      const { projectName } = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectName',
          message: 'Enter project name:',
          default: config.projectName,
          validate: (input: string) => {
            if (!input || !input.trim()) {
              return 'Project name cannot be empty';
            }
            return true;
          }
        }
      ]);
      
      console.log(chalk.gray(`\nCreating new project "${projectName}"...\n`));
      const newProject = await createProject(projectName);
      selectedProjectId = newProject.id;
      selectedProjectName = projectName;
      console.log(chalk.green(`✓ Project created\n`));
    } else {
      // User has existing projects - show selection
      const choices = [
        ...projects.map(p => ({
          name: `${p.name} (update existing)`,
          value: { type: 'existing', id: p.id, name: p.name }
        })),
        {
          name: chalk.green('+ Create new project'),
          value: { type: 'new' }
        }
      ];
      
      const { selection } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selection',
          message: 'Select a project:',
          choices
        }
      ]);
      
      if (selection.type === 'existing') {
        selectedProjectId = selection.id;
        selectedProjectName = selection.name;
        console.log(chalk.gray(`\nUpdating project "${selectedProjectName}"\n`));
      } else {
        // Creating new project
        const { projectName } = await inquirer.prompt([
          {
            type: 'input',
            name: 'projectName',
            message: 'Enter new project name:',
            default: config.projectName,
            validate: (input: string) => {
              if (!input || !input.trim()) {
                return 'Project name cannot be empty';
              }
              return true;
            }
          }
        ]);
        
        console.log(chalk.gray(`\nCreating new project "${projectName}"...\n`));
        const newProject = await createProject(projectName);
        selectedProjectId = newProject.id;
        selectedProjectName = projectName;
        console.log(chalk.green(`✓ Project created\n`));
      }
    }
    
    console.log(`Project: ${selectedProjectName}`);
    
    // Step 2: Safety Checks
    console.log(chalk.bold('→ Running safety checks...\n'));
    let spec;
    let findings: any[] = [];
    let safetySkipped = false;
    
    try {
        spec = loadOpenAPISpec(projectRoot);
        const operations = normalizeOpenAPISpec(spec);
        findings = evaluateOperations(operations);
        
        // Always print safety results
        printSafetyResults(findings);
        
        const safe = isDeploymentSafe(findings);
        if (!safe) {
            console.log(chalk.red('\n❌ Deployment blocked due to security issues\n'));
            console.log(chalk.gray('Fix the security issues above or remove openapi.yaml to skip safety checks.\n'));
            return 1;
        }
    } catch (e: any) {
        if (e.message.includes('No OpenAPI specification found')) {
             console.log(chalk.yellow('⚠️  No OpenAPI spec found. Skipping safety checks.'));
             safetySkipped = true;
             spec = {}; 
        } else {
            throw e;
        }
    }
    
    console.log();

    if (options.dryRun) {
        console.log(chalk.blue('ℹ Dry run mode - stopping before deployment'));
        return 0;
    }

    // Step 3: Upload Source Code (Cloud Build)
    console.log(chalk.bold('→ Uploading source code...\n'));
    
    // Create deployment first to get upload URL
    const deployment = await createDeployment(
      {
        projectId: selectedProjectId,
        projectName: selectedProjectName,
        runtime: config.runtime,
        openApiSpec: spec,
        safetyFindings: findings,
        handler: config.handler,
        architecture: options.architecture || config.architecture,
      }
    );
    
    console.log(chalk.green(`✓ Deployment created: ${deployment.deploymentId}\n`));
    
    // Upload source code to presigned URL
    if (deployment.uploadUrl) {
      const sourceZip = await uploadSourceCode(projectRoot, selectedProjectName, deployment.deploymentId);
      
      // Upload to S3 via presigned URL
      const uploadResponse = await fetch(deployment.uploadUrl, {
        method: 'PUT',
        body: sourceZip,
        headers: {
          'Content-Type': 'application/zip',
        },
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload source code: ${uploadResponse.statusText}`);
      }
      
      console.log(chalk.green('✓ Source code uploaded\n'));
    }
    
    console.log(chalk.bold('→ Build queued (cloud build in progress)...\n'));
    
    // Step 7: Poll for completion
    console.log(chalk.bold('→ Waiting for deployment...\n'));
    const finalStatus = await waitForDeployment(deployment.deploymentId);

    // Step 8: Finalize
    console.log();
    
    if (finalStatus.status === 'live' && finalStatus.url) {
      printSuccess(finalStatus.url, safetySkipped);
      return 0;
    } else if (finalStatus.status === 'blocked') {
      printSafetyResults(finalStatus.findings || findings);
      return 1;
    } else if (finalStatus.status === 'failed') {
      console.log(chalk.red('❌ Deployment failed'));
      return 1;
    } else {
      console.log(chalk.red(`❌ Unexpected status: ${finalStatus.status}`));
      return 1;
    }

  } catch (error: any) {
    console.log();
    console.log(chalk.red('❌ Deployment failed\n'));
    
    if (error.message.includes('No OpenAPI specification found')) {
      console.log(chalk.red('Error: No OpenAPI spec found'));
    } else {
      console.log(chalk.yellow('Error details:'));
      console.log(error.message);
      
      // Show stack trace in debug mode
      if (process.env.DEBUG) {
        console.log('\nStack trace:');
        console.log(error.stack);
      }
    }
    return 1;
  }
}
