import { Command } from 'commander';
import { debugLog } from '../utils/debug';
import { getControlPlaneUrl } from '../config/runtime';

interface TriggerOptions {
  deploymentId: string;
  projectName: string;
  s3Key?: string;
  debug?: boolean;
}

export async function runTrigger(deploymentId: string, options: TriggerOptions) {
  try {
    console.log(`🚀 Manually triggering deployment execution for: ${deploymentId}`);
    

    
    const CONTROL_PLANE_URL = getControlPlaneUrl();
    
    // Note: This is a development/internal command that requires control plane access
    console.log('⚠️  This is an internal development command');
    console.log('   For production use: dispatch deploy (which handles execution automatically)');
    
    const payload = {
      deployment_id: deploymentId,
      project_name: options.projectName,
      s3_key: options.s3Key || `artifacts/${options.projectName}/${deploymentId}.zip`
    };
    
    debugLog('Triggering deployment with payload:', JSON.stringify(payload, null, 2));
    
    // For production CLI, all deployment execution is handled automatically by the control plane
    // This command is mainly for development/testing scenarios
    const response = await fetch(`${CONTROL_PLANE_URL}/internal/execute-deployment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }
    
    const result = await response.json();
    console.log('✅ Deployment execution triggered successfully!');
    debugLog('Response:', JSON.stringify(result, null, 2));
    
    console.log(`\n📊 Now watch your deployment progress with:`);
    console.log(`   dispatch poll ${deploymentId}`);
    
  } catch (error) {
    console.error('❌ Failed to trigger deployment:', error);
    process.exit(1);
  }
}

export const triggerCommand = new Command('trigger')
  .description('Manually trigger deployment execution (for testing)')
  .argument('<deployment-id>', 'Deployment ID to trigger')
  .requiredOption('-p, --project-name <name>', 'Project name')
  .option('-s, --s3-key <key>', 'S3 artifact key (auto-generated if not provided)')
  .option('--debug', 'Enable debug logging')
  .action(runTrigger);