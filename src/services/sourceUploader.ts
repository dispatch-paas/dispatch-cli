/**
 * Source code uploader for cloud builds
 */

import * as path from 'path';
import archiver from 'archiver';
import chalk from 'chalk';

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

    // Add all files except common ignore patterns
    const ignore = [
      'node_modules/**',
      '.git/**',
      '.venv/**',
      '__pycache__/**',
      '*.pyc',
      '.env',
      '.DS_Store',
      'dist/**',
      'build/**',
      '*.zip',
      '.dispatch/**', // Ignore the .dispatch folder itself
    ];

    archive.glob('**/*', {
      cwd: projectRoot,
      ignore,
      dot: true,
    });

    archive.finalize();
  });
}
