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
 * Requires dispatch.yaml to exist - no defaults
 */
export function loadConfig(projectRoot: string = '.'): DeploymentConfig {
  const configPath = path.join(projectRoot, 'dispatch.yaml');
  
  // Check if dispatch.yaml exists
  if (!fs.existsSync(configPath)) {
    throw new Error(
      `dispatch.yaml not found in ${path.resolve(projectRoot)}\n` +
      'Please create a dispatch.yaml file with your project configuration.\n' +
      'Example:\n' +
      '  projectName: my-api\n' +
      '  runtime: python3.11\n' +
      '  handler: app.handler\n' +
      '  architecture: x86_64'
    );
  }
  
  const content = fs.readFileSync(configPath, 'utf-8');
  const config = yaml.load(content) as any;
  console.log('Loaded config:', JSON.stringify(config, null, 2));
  
  return {
    projectName: config.projectName || config.project || config.name || path.basename(path.resolve(projectRoot)),
    runtime: config.runtime,
    region: config.region || 'eu-west-2',
    handler: config.handler || 'lambda_adapter.handler',
    architecture: config.architecture || 'x86_64',
    timeout: config.timeout,
    memory: config.memory,
  };
}

/**
 * Validate project configuration
 */
export function validateConfig(config: DeploymentConfig): void {
  if (!config.projectName || config.projectName.length === 0) {
    throw new Error('Project name is required');
  }
  
  // Validate project name length
  // Lambda function name format: dispatch-{username}-{projectName}
  // Max Lambda name: 64 chars
  // Conservative estimate assuming max username of 20 chars: 64 - 9 - 20 - 1 = 34
  const maxProjectNameLength = 34;
  if (config.projectName.length > maxProjectNameLength) {
    throw new Error(
      `Project name is too long (${config.projectName.length} chars). ` +
      `Maximum allowed is ${maxProjectNameLength} characters.\n` +
      `The deployed Lambda function name will be: dispatch-{username}-${config.projectName}\n` +
      `AWS Lambda function names cannot exceed 64 characters.`
    );
  }
  
  if (!config.runtime || config.runtime.length === 0) {
    throw new Error('Runtime is required');
  }
}
