import { spawn } from 'child_process';

// Hardcoded for Phase 2 Dev Environment
const DEPLOY_SCRIPT = 'c:\\Users\\alexd\\Documents\\Repositories\\dispatch\\dispatch-runtime-adapters\\scripts\\manual_deploy.py';

export async function deployToAws(artifactPath: string, functionName: string): Promise<string> {
    console.log(`Deploying to AWS using ${DEPLOY_SCRIPT}...`);
    // python manual_deploy.py --artifact <path> --function-name <name>
    
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [
            DEPLOY_SCRIPT,
            '--artifact', artifactPath,
            '--function-name', functionName,
            '--region', 'eu-west-2' // Hardcoded region
        ]);
        
        let stdout = '';
        
        pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
            process.stdout.write(data); 
        });
        
        pythonProcess.stderr.on('data', (data) => {
            process.stderr.write(data);
        });
        
        pythonProcess.on('close', (code) => {
             if (code !== 0) {
                 reject(new Error(`Deploy failed with code ${code}`));
             } else {
                 // "API Endpoint: https://..."
                 const match = stdout.match(/API Endpoint: (https:\/\/[^\s]+)/);
                 if (match) {
                     resolve(match[1]);
                 } else {
                     // Try finding it in another format or just return empty string 
                     // and let CLI try to construct it or fail gracefully
                     resolve('');
                 }
             }
        });
    });
}
