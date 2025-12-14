import * as path from 'path';
import { spawn } from 'child_process';
import { BuildArtifact } from '../types/deployment';

// Hardcoded for Phase 2 Dev Environment
const BUILD_SCRIPT = 'c:\\Users\\alexd\\Documents\\Repositories\\dispatch\\dispatch-build-system\\scripts\\build_cli.py';

export async function buildArtifact(projectPath: string): Promise<BuildArtifact> {
  console.log(`Building artifact using ${BUILD_SCRIPT}...`);
  
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
