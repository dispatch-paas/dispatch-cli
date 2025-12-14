/**
 * dispatch check command - Local safety check for API deployments
 *
 * This command:
 * - Loads the OpenAPI specification
 * - Normalizes operations
 * - Evaluates safety rules
 * - Prints formatted results
 * - Exits with appropriate status code
 */

import chalk from 'chalk';
import { loadOpenAPISpec } from '../utils/loader';
import { normalizeOpenAPISpec } from '../utils/normalizer';
import {
  evaluateOperations,
  isDeploymentSafe,
  getFindingSummary,
} from '../utils/safety';
import { NormalizedOperation, SafetyFinding } from '../types';

/**
 * Print success output when no blocking issues are found
 */
function printSuccess(operations: NormalizedOperation[], findings: SafetyFinding[]): void {
  const summary = getFindingSummary(findings);

  if (summary.warn === 0) {
    console.log(chalk.green('✔ Safety checks passed\n'));

    // Count protected vs public routes
    const protectedRoutes = operations.filter(
      (op) => op.security.length > 0 && !op.is_public_override
    ).length;
    const publicRoutes = operations.filter(
      (op) => op.security.length === 0 || op.is_public_override
    ).length;

    console.log(`Routes analyzed: ${operations.length}`);
    console.log(`Protected routes: ${protectedRoutes}`);
    console.log(`Public routes: ${publicRoutes}`);
    console.log('\nNo blocking issues detected.');
  } else {
    console.log(chalk.yellow('⚠ Safety checks completed with warnings\n'));

    const warnings = findings.filter((f) => f.severity === 'warn');
    if (warnings.length > 0) {
      console.log('Warnings:');
      for (const warning of warnings) {
        console.log(chalk.yellow(`• ${warning.method} ${warning.route}`));
        console.log(`  ${warning.message}`);
      }
    }

    console.log('\nDeployment would be allowed.');
  }
}

/**
 * Print failure output when blocking issues are found
 */
function printFailure(findings: SafetyFinding[]): void {
  console.log(chalk.red('❌ Safety checks failed\n'));

  const blockingIssues = findings.filter((f) => f.severity === 'block');

  if (blockingIssues.length > 0) {
    console.log('Blocking issues:');
    for (const issue of blockingIssues) {
      console.log(chalk.red(`• ${issue.method} ${issue.route}`));
      console.log(`  ${issue.message}`);
    }

    console.log('\nFix:');
    console.log('- Declare authentication in OpenAPI');
    console.log('- OR explicitly mark the route as public with a reason (x-public + x-reason)');
  }

  console.log('\nDeployment would be blocked.');
}

/**
 * Print error message
 */
function printError(message: string): void {
  console.log(chalk.red('❌ Error\n'));
  console.log(message);
}

/**
 * Run the safety check command
 */
export async function runCheck(projectRoot: string = '.'): Promise<number> {
  try {
    // Step 1: Load OpenAPI specification
    const spec = loadOpenAPISpec(projectRoot);

    // Step 2: Normalize operations
    const operations = normalizeOpenAPISpec(spec);

    // Step 3: Evaluate safety rules
    const findings = evaluateOperations(operations);

    // Step 4: Print results
    const safe = isDeploymentSafe(findings);

    if (safe) {
      printSuccess(operations, findings);
      return 0;
    } else {
      printFailure(findings);
      return 1;
    }
  } catch (error) {
    // Step 5: Handle errors
    if (error instanceof Error) {
      printError(error.message);
    } else {
      printError('An unexpected error occurred.');
    }
    return 1;
  }
}
