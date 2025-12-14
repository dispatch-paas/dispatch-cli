/**
 * dispatch deploy command
 * 
 * The primary deployment workflow that orchestrates:
 * - Safety validation
 * - Authentication
 * - Build packaging
 * - Artifact upload
 * - Deployment status tracking
 */

import chalk from 'chalk';
import { loadOpenAPISpec } from '../utils/loader';
import { normalizeOpenAPISpec } from '../utils/normalizer';
import {
  evaluateOperations,
  isDeploymentSafe,
  getFindingSummary,
} from '../utils/safety';
import { loadConfig, validateConfig } from '../utils/config';
import { authenticateUser } from '../services/auth';
import { createDeployment, waitForDeployment } from '../services/controlPlane';
import { buildArtifact } from '../services/builder';
import { uploadArtifact } from '../services/uploader';

interface DeployOptions {
  dryRun?: boolean;
  project?: string;
}

/**
 * Print deployment blocked message
 */
function printBlocked(findings: any[]): void {
  console.log(chalk.red('❌ Deployment blocked\n'));

  const blockingIssues = findings.filter((f) => f.severity === 'block');

  if (blockingIssues.length > 0) {
    console.log('Blocking issues:');
    for (const issue of blockingIssues) {
      console.log(chalk.red(`• ${issue.method} ${issue.route}`));
      console.log(`  ${issue.message}`);
    }

    console.log('\nFix:');
    console.log('- Declare authentication in OpenAPI');
    console.log('- OR explicitly mark route as public with a reason (x-public + x-reason)');
  }
}

/**
 * Print deployment failed message
 */
function printFailed(reason: string): void {
  console.log(chalk.red('❌ Deployment failed\n'));
  console.log('Reason:');
  console.log(reason);
  console.log('\nTry again or contact support.');
}

/**
 * Print deployment success message
 */
function printSuccess(url: string): void {
  console.log(chalk.green('✔ Safety checks passed'));
  console.log(chalk.green('✔ Build completed'));
  console.log(chalk.green('✔ Deployment live\n'));
  console.log('API URL:');
  console.log(chalk.cyan(url));
}

/**
 * Run the deploy command
 */
export async function runDeploy(options: DeployOptions = {}): Promise<number> {
  const projectRoot = options.project || '.';

  try {
    // Step 1: Load project config
    console.log(chalk.bold('\n→ Loading project configuration...\n'));
    const config = loadConfig(projectRoot);
    validateConfig(config);
    console.log(`Project: ${config.projectName}`);
    console.log(`Runtime: ${config.runtime}\n`);

    // Step 2: Run local safety checks
    console.log(chalk.bold('→ Running safety checks...\n'));
    
    const spec = loadOpenAPISpec(projectRoot);
    const operations = normalizeOpenAPISpec(spec);
    const findings = evaluateOperations(operations);
    const safe = isDeploymentSafe(findings);

    if (!safe) {
      printBlocked(findings);
      return 1;
    }

    const summary = getFindingSummary(findings);
    console.log(chalk.green('✓ Safety checks passed'));
    
    if (summary.warn > 0) {
      console.log(chalk.yellow(`  ${summary.warn} warning(s) - review recommended`));
    }
    console.log();

    // Dry run stops here
    if (options.dryRun) {
      console.log(chalk.blue('ℹ Dry run mode - stopping before deployment'));
      console.log('Deployment would proceed if run without --dry-run\n');
      return 0;
    }

    // Step 3: Authenticate user
    console.log(chalk.bold('→ Authenticating...\n'));
    const user = await authenticateUser();
    console.log(chalk.green('✓ Authenticated\n'));

    // Step 4: Create deployment
    console.log(chalk.bold('→ Creating deployment...\n'));
    const deployment = await createDeployment(
      {
        projectName: config.projectName,
        runtime: config.runtime,
        openApiSpec: spec,
        safetyFindings: findings,
      },
      user
    );
    console.log(chalk.green(`✓ Deployment created: ${deployment.deploymentId}\n`));

    // Step 5: Build artifact
    console.log(chalk.bold('→ Building artifact...\n'));
    const artifact = await buildArtifact(projectRoot);
    console.log(chalk.green('✓ Build completed\n'));

    // Step 6: Upload artifact
    console.log(chalk.bold('→ Uploading artifact...\n'));
    if (deployment.uploadUrl) {
      await uploadArtifact(artifact, deployment.uploadUrl);
      console.log(chalk.green('✓ Upload completed\n'));
    }

    // Step 7: Poll deployment status
    console.log(chalk.bold('→ Deploying to AWS...\n'));
    const finalStatus = await waitForDeployment(deployment.deploymentId, user);

    // Step 8: Print final result
    console.log();
    
    if (finalStatus.status === 'live' && finalStatus.url) {
      printSuccess(finalStatus.url);
      return 0;
    } else if (finalStatus.status === 'blocked') {
      printBlocked(finalStatus.findings || findings);
      return 1;
    } else if (finalStatus.status === 'failed') {
      printFailed(finalStatus.error || 'Unknown deployment error');
      return 1;
    } else {
      printFailed(`Unexpected deployment status: ${finalStatus.status}`);
      return 1;
    }
  } catch (error) {
    // Handle errors
    console.log();
    
    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('No OpenAPI specification found')) {
        console.log(chalk.red('❌ Error\n'));
        console.log(error.message);
      } else if (error.message.includes('unauthenticated') || error.message.includes('authentication')) {
        console.log(chalk.red('❌ Authentication required\n'));
        console.log('Please run: dispatch login');
      } else {
        console.log(chalk.red('❌ Deployment failed\n'));
        console.log(error.message);
      }
    } else {
      console.log(chalk.red('❌ Deployment failed\n'));
      console.log('An unexpected error occurred.');
    }
    
    return 1;
  }
}
