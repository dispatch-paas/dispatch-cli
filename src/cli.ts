#!/usr/bin/env node
import { Command } from 'commander';
import { runCheck } from './commands/check';
import { runDeploy } from './commands/deploy';
import { runLogin } from './commands/login';
import { runLogout } from './commands/logout';

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
  .description('Authenticate with your Dispatch access code')
  .option('-c, --code <code>', 'Access code from dashboard')
  .action(async (options) => {
    await runLogin(options);
  });

// dispatch logout command
program
  .command('logout')
  .description('Remove local credentials')
  .action(async () => {
    await runLogout();
  });

// Parse command line arguments
program.parse();
