/**
 * Source code uploader for cloud builds
 */

import * as path from 'path';
import archiver from 'archiver';
import chalk from 'chalk';

/**
 * Create zip archive of source code and return as Buffer
 * Returns the zipped source code for upload
 */
export async function uploadSourceCode(
  projectRoot: string,
  projectName: string,
  deploymentId: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const sizeKB = (buffer.length / 1024).toFixed(1);
      console.log(chalk.gray(`Source code zipped: ${sizeKB} KB`));
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
    ];

    archive.glob('**/*', {
      cwd: projectRoot,
      ignore,
      dot: true,
    });

    archive.finalize();
  });
}
