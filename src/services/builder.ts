/**
 * Build artifact packager
 * 
 * STUB IMPLEMENTATION
 * This simulates the Lambda artifact build process.
 * Replace with real build packager when ready.
 */

import * as path from 'path';
import { BuildArtifact } from '../types/deployment';

/**
 * Build deployment artifact (Lambda ZIP)
 * 
 * STUB: Returns mock artifact metadata
 * REAL: Would invoke the actual build packager to:
 *   - Bundle source code
 *   - Install dependencies
 *   - Add runtime adapter
 *   - Create Lambda ZIP file
 */
export async function buildArtifact(projectRoot: string): Promise<BuildArtifact> {
  console.log('[STUB] Building deployment artifact...');
  console.log(`[STUB] Project root: ${projectRoot}`);
  
  // Simulate build process
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  console.log('[STUB] Bundling source code...');
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('[STUB] Installing dependencies...');
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('[STUB] Adding runtime adapter...');
  await new Promise(resolve => setTimeout(resolve, 300));
  
  console.log('[STUB] Creating Lambda ZIP...');
  await new Promise(resolve => setTimeout(resolve, 400));
  
  // STUB: Return mock artifact metadata
  const artifact: BuildArtifact = {
    zipPath: path.join(projectRoot, '.dispatch', 'build', 'lambda.zip'),
    size: 2457600, // ~2.4 MB
    hash: 'sha256:abc123def456...',
  };
  
  console.log(`[STUB] Build complete: ${artifact.zipPath}`);
  console.log(`[STUB] Size: ${(artifact.size / 1024 / 1024).toFixed(2)} MB`);
  
  return artifact;
}

/**
 * Clean build artifacts
 * 
 * STUB: Logs cleanup action
 * REAL: Would delete temporary build files
 */
export async function cleanBuildArtifacts(projectRoot: string): Promise<void> {
  console.log('[STUB] Cleaning build artifacts...');
  
  // STUB: Nothing to actually clean
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.log('[STUB] Build artifacts cleaned');
}
