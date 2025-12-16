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
  deploymentId: string
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
      console.log(chalk.gray(`Source code zipped: ${sizeKB} KB`));
      console.log(chalk.gray(`Saved to: .dispatch/${archiveFilename}`));
      
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
