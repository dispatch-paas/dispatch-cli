/**
 * Run the deploy command
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
import { createDeployment, waitForDeployment } from '../services/controlPlane';
import { buildArtifact } from '../services/builder';
import { uploadArtifact } from '../services/uploader';

interface DeployOptions {
  dryRun?: boolean;
  project?: string;
}

function printBlocked(findings: any[]): void {
  console.log(chalk.red('❌ Deployment blocked\n'));

  const blockingIssues = findings.filter((f: any) => f.severity === 'block');

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

function printSuccess(url: string): void {
  console.log(chalk.green('✔ Safety checks passed'));
  console.log(chalk.green('✔ Build completed'));
  console.log(chalk.green('✔ Upload completed'));
  console.log(chalk.green('✔ Deployment live\n'));
  console.log('API URL:');
  console.log(chalk.cyan(url));
}

export async function runDeploy(options: DeployOptions = {}): Promise<number> {
  const projectRoot = options.project || '.';

  try {
    // Step 1: Load project config
    console.log(chalk.bold('\n→ Loading project configuration...\n'));
    const config = loadConfig(projectRoot);
    validateConfig(config);
    console.log(`Project: ${config.projectName}`);
    
    // Step 2: Safety Checks
    console.log(chalk.bold('→ Running safety checks...\n'));
    let spec;
    let findings: any[] = [];
    try {
        spec = loadOpenAPISpec(projectRoot);
        const operations = normalizeOpenAPISpec(spec);
        findings = evaluateOperations(operations);
        const safe = isDeploymentSafe(findings);
        if (!safe) {
            printBlocked(findings);
            return 1;
        }
        console.log(chalk.green('✓ Safety checks passed'));
    } catch (e: any) {
        if (e.message.includes('No OpenAPI specification found')) {
             console.log(chalk.yellow('⚠ No OpenAPI spec found. Skipping safety checks.'));
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

    // Step 3: Authenticate (automatic via token refresh)
    console.log(chalk.bold('→ Authenticating...\n'));
    const { getValidToken } = await import('../services/auth');
    const token = await getValidToken();
    if (!token) {
        console.error(chalk.red('❌ Not authenticated. Please run: dispatch login\n'));
        return 1;
    }
    console.log(chalk.green('✓ Authenticated\n'));

    // Step 4: Build
    console.log(chalk.bold('→ Building artifact...\n'));
    const artifact = await buildArtifact(projectRoot);
    console.log(chalk.green(`✓ Build completed (${(artifact.size/1024).toFixed(1)} KB)\n`));

    // Step 5: Upload
    console.log(chalk.bold('→ Uploading artifact...\n'));
    const s3Key = await uploadArtifact(artifact.zipPath, config.projectName);
    console.log(chalk.green('✓ Upload completed\n'));

    // Step 6: Create Deployment (Control Plane)
    console.log(chalk.bold('→ Initiating deployment...\n'));
    const deployment = await createDeployment(
      {
        projectName: config.projectName,
        runtime: config.runtime,
        openApiSpec: spec,
        safetyFindings: findings,
      },
      s3Key
    );
    console.log(chalk.green(`✓ Deployment initiated: ${deployment.deploymentId}\n`));
    
    // Step 7: Poll for completion
    console.log(chalk.bold('→ Waiting for deployment...\n'));
    const finalStatus = await waitForDeployment(deployment.deploymentId);

    // Step 8: Finalize
    console.log();
    
    if (finalStatus.status === 'live' && finalStatus.url) {
      printSuccess(finalStatus.url);
      return 0;
    } else if (finalStatus.status === 'blocked') {
      printBlocked(finalStatus.findings || findings);
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
    if (error.message.includes('No OpenAPI specification found')) {
      console.log(chalk.red('❌ Error: No OpenAPI spec found'));
    } else {
      console.log(chalk.red('❌ Deployment failed\n'));
      console.log(error.message);
    }
    return 1;
  }
}
