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
import { getValidToken } from '../services/auth';

interface DeployOptions {
  dryRun?: boolean;
  project?: string;
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
  const projectRoot = options.project || '.';

  try {
    // Step 0: Check authentication
    console.log(chalk.bold('\n→ Verifying authentication...\n'));
    const token = await getValidToken();
    if (!token) {
      console.log(chalk.red('\n❌ Authentication required to deploy\n'));
      console.log(chalk.gray('Please login first:'));
      console.log(chalk.cyan('  dispatch login\n'));
      console.log(chalk.gray('Get your access code from: https://dispatch.dev/dashboard\n'));
      return 1;
    }
    console.log(chalk.green('✓ Authenticated\n'));
    
    // Step 1: Load project config
    console.log(chalk.bold('→ Loading project configuration...\n'));
    const config = loadConfig(projectRoot);
    validateConfig(config);
    console.log(`Project: ${config.projectName}`);
    
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
            console.log(chalk.yellow('\n⚠️  Proceeding with deployment despite safety warnings...\n'));
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

    // Step 3: Build
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
        handler: config.handler,
        architecture: config.architecture,
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
