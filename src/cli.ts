#!/usr/bin/env node
import { Command } from 'commander';
import { runCheck } from './commands/check';
import { runDeploy } from './commands/deploy';
import { runLogin } from './commands/login';
import { runLogout } from './commands/logout';
import { runProjects } from './commands/projects';
import { runPoll } from './commands/poll';
import { setDebugEnabled } from './utils/debug';

const program = new Command();

program
  .name('dispatch')
  .description('CLI for Dispatch - Safety-first serverless API PaaS')
  .version('1.0.0')
  .option('--debug', 'Enable debug logging');

// dispatch check command
program
  .command('check')
  .description('Run local safety checks on your API')
  .option('-p, --project <path>', 'Project root directory', '.')
  .action(async (options) => {
    if (program.opts().debug) setDebugEnabled(true);
    const exitCode = await runCheck(options.project);
    process.exit(exitCode);
  });

// dispatch deploy command  
program
  .command('deploy')
  .description('Deploy your API to production')
  .option('-p, --project <path>', 'Project root directory', '.')
  .option('-s, --source <path>', 'Source directory path (alias for --project)', '.')
  .option('--dry-run', 'Run safety checks only without deploying')
  .option('--arch, --architecture <arch>', 'Target architecture (x86_64 only - arm64 coming soon)')
  .action(async (options) => {
    if (program.opts().debug) setDebugEnabled(true);
    const exitCode = await runDeploy(options);
    process.exit(exitCode);
  });

// dispatch delete command  
program
  .command('delete')
  .description('Delete a deployment')
  .option('-p, --project <path>', 'Project root directory', '.')
  .action(async (options) => {
    if (program.opts().debug) setDebugEnabled(true);
    const { runDelete } = await import('./commands/delete');
    const exitCode = await runDelete(options);
    process.exit(exitCode);
  });

// dispatch logs command  
program
  .command('logs')
  .description('View deployment build logs')
  .option('-p, --project <path>', 'Project root directory', '.')
  .action(async (options) => {
    if (program.opts().debug) setDebugEnabled(true);
    const { runLogs } = await import('./commands/logs');
    const exitCode = await runLogs(options);
    process.exit(exitCode);
  });

// dispatch login command
program
  .command('login')
  .description('Authenticate with your Dispatch access code')
  .option('-c, --code <code>', 'Access code from dashboard')
  .action(async (options) => {
    if (program.opts().debug) setDebugEnabled(true);
    await runLogin(options);
  });

// dispatch logout command
program
  .command('logout')
  .description('Remove local credentials')
  .action(async () => {
    if (program.opts().debug) setDebugEnabled(true);
    await runLogout();
  });

// dispatch projects command
program
  .command('projects')
  .description('Manage your projects')
  .argument('<action>', 'Action to perform (list)')
  .action(async (action, options) => {
    if (program.opts().debug) setDebugEnabled(true);
    const exitCode = await runProjects(action, options);
    process.exit(exitCode);
  });

// dispatch poll command
program
  .command('poll')
  .description('Poll deployment status with progressive updates')
  .argument('<deployment-id>', 'Deployment ID to poll')
  .option('-i, --interval <ms>', 'Polling interval in milliseconds', '2000')
  .option('-m, --max-attempts <num>', 'Maximum polling attempts', '120')
  .action(async (deploymentId, options) => {
    if (program.opts().debug) setDebugEnabled(true);
    await runPoll(deploymentId, {
      ...options,
      interval: parseInt(options.interval),
      maxAttempts: parseInt(options.maxAttempts)
    });
  });

// Parse command line arguments
program.parse();
