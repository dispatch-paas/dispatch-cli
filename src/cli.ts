#!/usr/bin/env node
/**
 * Dispatch CLI - Main entry point
 *
 * Safety-first serverless API PaaS command-line interface
 */

import { Command } from 'commander';
import { runCheck } from './commands/check';
import { runDeploy } from './commands/deploy';
import { runLogin } from './commands/login';

const program = new Command();

program
  .name('dispatch')
  .description('CLI for Dispatch - Safety-first serverless API PaaS')
  .version('1.0.0');

// dispatch check command
program
  .command('check')
  .description('Run local safety checks on your API')
  .option('-p, --project <path>', 'Project root directory', '.')
  .action(async (options) => {
    const exitCode = await runCheck(options.project);
    process.exit(exitCode);
  });

// dispatch deploy command
program
  .command('deploy')
  .description('Deploy your API to production')
  .option('-p, --project <path>', 'Project root directory', '.')
  .option('--dry-run', 'Run safety checks only without deploying')
  .action(async (options) => {
    const exitCode = await runDeploy(options);
    process.exit(exitCode);
  });

// dispatch login command
program
  .command('login')
  .description('Authenticate with Dispatch')
  .option('-t, --token <token>', 'Directly provide access token')
  .action(async (options) => {
    await runLogin(options);
  });

// Parse command line arguments
program.parse();
