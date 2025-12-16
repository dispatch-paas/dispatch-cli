import { Command } from 'commander';
import { pollDeploymentStatus } from '../services/controlPlane';
import { debugLog } from '../utils/debug';

interface PollOptions {
  debug?: boolean;
  interval?: number;
  maxAttempts?: number;
}

export async function runPoll(deploymentId: string, options: PollOptions) {
  try {
    console.log(`📊 Polling deployment status: ${deploymentId}`);
    
    const interval = options.interval || 2000;
    const maxAttempts = options.maxAttempts || 120;
    
    let lastStatus = '';
    
    const getStatusMessage = (status: string): string => {
      switch (status) {
        case 'pending': return '⏳ Queuing deployment';
        case 'building': return '🔨 Building artifact';
        case 'iam-setup': return '🔐 Setting up IAM role';
        case 'lambda-deploying': return '🚀 Deploying Lambda function';
        case 'lambda-verifying': return '✅ Verifying Lambda deployment';
        case 'api-setup': return '🌐 Setting up API Gateway';
        case 'api-verifying': return '✅ Verifying API Gateway';
        case 'finalizing': return '🔍 Performing final checks';
        case 'deploying': return '🔄 Finalizing deployment';
        case 'live': return '✅ Deployment complete';
        case 'failed': return '❌ Deployment failed';
        default: return `⏳ ${status}`;
      }
    };
    
    for (let i = 0; i < maxAttempts; i++) {
      const status = await pollDeploymentStatus(deploymentId);
      debugLog(`Poll attempt ${i + 1}: status="${status.status}", url="${status.url}"`);
      
      // Show status change messages
      if (status.status !== lastStatus) {
        const message = getStatusMessage(status.status);
        console.log(message);
        lastStatus = status.status;
      }
      
      if (status.status === 'live') {
        console.log(`\n🎉 Deployment complete!`);
        if (status.url) {
          console.log(`🌐 Live URL: ${status.url}`);
        }
        return;
      }
      
      if (status.status === 'failed') {
        console.log(`\n💥 Deployment failed`);
        process.exit(1);
      }
      
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    console.log(`\n⏱️ Polling timed out after ${maxAttempts} attempts`);
    
  } catch (error) {
    console.error('❌ Failed to poll deployment:', error);
    process.exit(1);
  }
}

export const pollCommand = new Command('poll')
  .description('Poll deployment status with progressive updates')
  .argument('<deployment-id>', 'Deployment ID to poll')
  .option('--debug', 'Enable debug logging')
  .option('-i, --interval <ms>', 'Polling interval in milliseconds', '2000')
  .option('-m, --max-attempts <num>', 'Maximum polling attempts', '120')
  .action((deploymentId, options) => {
    runPoll(deploymentId, {
      ...options,
      interval: parseInt(options.interval),
      maxAttempts: parseInt(options.maxAttempts)
    });
  });