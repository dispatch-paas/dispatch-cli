#!/usr/bin/env node
/**
 * Dispatch CLI - Main entry point
 *
 * Safety-first serverless API PaaS command-line interface
 */

import { Command } from 'commander';
import { runCheck } from './commands/check';

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

// Parse command line arguments
program.parse();
