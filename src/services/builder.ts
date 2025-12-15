import * as path from 'path';
import { spawn } from 'child_process';
import { BuildArtifact } from '../types/deployment';

// Build script location - should be configured via environment variable in production
const BUILD_SCRIPT = process.env.DISPATCH_BUILD_SCRIPT || 
  path.join(__dirname, '..', '..', '..', 'dispatch-build-system', 'scripts', 'auto_build.py');

export async function buildArtifact(projectPath: string): Promise<BuildArtifact> {
  console.log(`Building artifact...`);
  
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [
        BUILD_SCRIPT,
        '--project-root', path.resolve(projectPath)
    ]);
    
    let stdout = '';
    
    pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
        // Pass build logs to stderr so user sees them but they don't corrupt stdout capture
        process.stderr.write(data);
    });
    
    pythonProcess.on('close', (code) => {
        if (code !== 0) {
            reject(new Error(`Build failed with code ${code}`));
            return;
        }
        
        try {
            // Find JSON in the last line of stdout
            const lines = stdout.trim().split('\n');
            const lastLine = lines[lines.length - 1];
            
            const result = JSON.parse(lastLine);
            
            resolve({
                zipPath: result.artifact_path,
                size: result.artifact_size_bytes,
                hash: result.hash || 'nohash'
            });
        } catch (e: any) {
            reject(new Error(`Failed to parse build output: ${e.message}\nOutput: ${stdout}`));
        }
    });
  });
}

export async function cleanBuildArtifacts(projectRoot: string): Promise<void> {
  console.log('Cleaning build artifacts...');
  // Implementation omitted for now
}
