/**
 * Project configuration loader
 * 
 * Loads dispatch.yaml configuration file
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { DeploymentConfig } from '../types/deployment';

/**
 * Load project configuration from dispatch.yaml
 * 
 * Falls back to sensible defaults if file doesn't exist
 */
export function loadConfig(projectRoot: string = '.'): DeploymentConfig {
  const configPath = path.join(projectRoot, 'dispatch.yaml');
  
  // If config file exists, load it
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf-8');
    const config = yaml.load(content) as any;
    
    return {
      projectName: config.project || config.name || path.basename(path.resolve(projectRoot)),
      runtime: config.runtime || 'nodejs18',
      region: config.region || 'eu-west-1',
    };
  }
  
  // Otherwise, use defaults
  return {
    projectName: path.basename(path.resolve(projectRoot)),
    runtime: 'nodejs18',
    region: 'eu-west-1',
  };
}

/**
 * Validate project configuration
 */
export function validateConfig(config: DeploymentConfig): void {
  if (!config.projectName || config.projectName.length === 0) {
    throw new Error('Project name is required');
  }
  
  if (!config.runtime || config.runtime.length === 0) {
    throw new Error('Runtime is required');
  }
}
