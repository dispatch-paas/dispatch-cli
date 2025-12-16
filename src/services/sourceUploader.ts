/**
 * Source code uploader for cloud builds
 */

import * as path from 'path';
import archiver from 'archiver';
import chalk from 'chalk';

/**
 * Read .gitignore patterns from project root
 */
function readGitignorePatterns(projectRoot: string): string[] {
  const fs = require('fs');
  const gitignorePath = path.join(projectRoot, '.gitignore');
  
  if (!fs.existsSync(gitignorePath)) {
    return [];
  }
  
  try {
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    return content
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line && !line.startsWith('#')) // Remove empty lines and comments
      .map((line: string) => {
        // Convert gitignore patterns to glob patterns
        if (line.endsWith('/')) {
          return line + '**'; // Directory patterns
        }
        if (!line.includes('/') && !line.includes('*')) {
          return '**/' + line; // File patterns anywhere in tree
        }
        return line;
      });
  } catch (error) {
    console.log(chalk.yellow('⚠️  Could not read .gitignore file, using default patterns'));
    return [];
  }
}

/**
 * Create zip archive of source code, save to .dispatch folder, and return as Buffer
 * Returns the zipped source code for upload
 */
export async function uploadSourceCode(
  projectRoot: string,
  projectName: string,
  deploymentId: string,
  userTier?: string
): Promise<Buffer> {
  const fs = require('fs');
  
  // Create .dispatch folder if it doesn't exist
  const dispatchFolder = path.join(projectRoot, '.dispatch');
  if (!fs.existsSync(dispatchFolder)) {
    fs.mkdirSync(dispatchFolder, { recursive: true });
    console.log(chalk.gray('Created .dispatch folder for build artifacts'));
    
    // Create .gitignore in .dispatch folder to ignore build artifacts
    const gitignorePath = path.join(dispatchFolder, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(gitignorePath, '# Build artifacts\n*.zip\n*.tar.gz\n');
    }
  }

  // Create archive filename
  const archiveFilename = `${deploymentId}.zip`;
  const archivePath = path.join(dispatchFolder, archiveFilename);

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    // Also save to file
    const output = fs.createWriteStream(archivePath);
    archive.pipe(output);

    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const sizeKB = (buffer.length / 1024).toFixed(1);
      const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
      
      // Validate package size based on tier
      const sizeBytes = buffer.length;
      const sizeLimits = {
        free: 25 * 1024 * 1024,     // 25 MB
        pro: 100 * 1024 * 1024,    // 100 MB
        enterprise: Infinity        // Unlimited
      };
      
      const tierLimit = sizeLimits[userTier as keyof typeof sizeLimits] || sizeLimits.free;
      
      if (sizeBytes > tierLimit) {
        const limitMB = tierLimit === Infinity ? 'unlimited' : (tierLimit / (1024 * 1024)).toString();
        let upgradeMessage = '';
        
        if (userTier === 'free') {
          upgradeMessage = ' Consider upgrading to Pro tier (100 MB limit) or reducing package size.';
        } else if (userTier === 'pro') {
          upgradeMessage = ' Consider upgrading to Enterprise tier (unlimited) or reducing package size.';
        }
        
        const error = new Error(
          `Package size (${sizeMB} MB) exceeds ${userTier || 'free'} tier limit of ${limitMB} MB.${upgradeMessage}`
        );
        reject(error);
        return;
      }
      
      console.log(chalk.gray(`Source code zipped: ${sizeKB} KB`));
      if (parseFloat(sizeMB) >= 1) {
        console.log(chalk.gray(`Package size: ${sizeMB} MB`));
      }
      console.log(chalk.gray(`Saved to: .dispatch/${archiveFilename}`));
      
      // Show tier-specific size info
      const currentSizeMB = parseFloat(sizeMB);
      if (userTier === 'free') {
        const remainingMB = (25 - currentSizeMB).toFixed(2);
        if (parseFloat(remainingMB) < 5) {
          console.log(chalk.yellow(`⚠️  Free tier: ${remainingMB} MB remaining (25 MB limit)`));
        }
      } else if (userTier === 'pro') {
        const remainingMB = (100 - currentSizeMB).toFixed(2);
        if (parseFloat(remainingMB) < 10) {
          console.log(chalk.yellow(`⚠️  Pro tier: ${remainingMB} MB remaining (100 MB limit)`));
        }
      } else if (userTier === 'enterprise') {
        if (currentSizeMB > 50) {
          console.log(chalk.gray(`📦 Enterprise tier: ${sizeMB} MB (unlimited)`));
        }
      }
      
      // Create deployment metadata file
      const metadata = {
        deploymentId,
        projectName,
        timestamp: new Date().toISOString(),
        archiveSize: buffer.length,
        archiveFilename
      };
      const metadataPath = path.join(dispatchFolder, `${deploymentId}.json`);
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      
      resolve(buffer);
    });
    archive.on('error', reject);

    // Read project .gitignore patterns
    const gitignorePatterns = readGitignorePatterns(projectRoot);
    
    // Add all files except common ignore patterns
    const defaultIgnore = [
      // Node.js
      'node_modules/**',
      
      // Git
      '.git/**',
      '.gitignore',
      
      // Python virtual environments
      '.venv/**',
      'venv/**',
      'env/**',
      '.env/**',
      'virtualenv/**',
      '.virtualenv/**',
      
      // Python compiled files and cache
      '__pycache__/**',
      '**/__pycache__/**',
      '*.pyc',
      '*.pyo',
      '*.pyd',
      '.Python',
      
      // Python distribution / packaging
      'build/**',
      'develop-eggs/**',
      'dist/**',
      'downloads/**',
      'eggs/**',
      '.eggs/**',
      'lib/**',
      'lib64/**',
      'parts/**',
      'sdist/**',
      'var/**',
      'wheels/**',
      '*.egg-info/**',
      '.installed.cfg',
      '*.egg',
      'MANIFEST',
      
      // Python testing
      '.tox/**',
      '.coverage',
      '.coverage.*',
      '.cache',
      '.pytest_cache/**',
      'nosetests.xml',
      'coverage.xml',
      '*.cover',
      '.hypothesis/**',
      
      // Python IDEs
      '.idea/**',
      '.vscode/**',
      '*.swp',
      '*.swo',
      '*~',
      
      // Environment files
      '.env',
      '.env.local',
      '.env.*.local',
      
      // OS files
      '.DS_Store',
      'Thumbs.db',
      
      // Archive files
      '*.zip',
      '*.tar.gz',
      '*.tar',
      
      // Dispatch build artifacts
      '.dispatch/**', // Ignore the .dispatch folder itself
    ];
    
    // Combine default patterns with .gitignore patterns
    const allIgnorePatterns = [...defaultIgnore, ...gitignorePatterns];
    
    console.log(chalk.gray(`Excluding ${allIgnorePatterns.length} patterns from deployment package`));
    if (gitignorePatterns.length > 0) {
      console.log(chalk.gray(`Found ${gitignorePatterns.length} additional patterns from .gitignore`));
    }

    archive.glob('**/*', {
      cwd: projectRoot,
      ignore: allIgnorePatterns,
      dot: true,
    });

    archive.finalize();
  });
}
