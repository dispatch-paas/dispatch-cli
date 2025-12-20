/**
 * Initialize a new Dispatch project
 */
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';

interface InitOptions {
  force?: boolean;
}

const DISPATCH_YAML_TEMPLATE = `projectName: my-api
runtime: python3.12
handler: app.handler
architecture: x86_64

# Optional: Lambda configuration
# timeout: 30     # seconds (free: 5s, pro: 15s, enterprise: 30s)
# memory: 512     # MB (free: 512MB, pro: 1536MB, enterprise: 3072MB)
`;

export async function runInit(options: InitOptions = {}): Promise<number> {
  try {
    const projectRoot = process.cwd();
    const configPath = path.join(projectRoot, 'dispatch.yaml');
    
    console.log(chalk.bold('\n→ Initializing Dispatch project...\n'));
    
    // Check if dispatch.yaml already exists
    if (fs.existsSync(configPath) && !options.force) {
      console.log(chalk.yellow('⚠️  dispatch.yaml already exists in this directory\n'));
      
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: 'Do you want to overwrite it?',
          default: false
        }
      ]);
      
      if (!overwrite) {
        console.log(chalk.gray('\nCancelled. Existing dispatch.yaml was not modified.\n'));
        return 0;
      }
      
      console.log();
    }
    
    // Prompt for project configuration
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'Project name:',
        default: path.basename(projectRoot),
        validate: (input: string) => {
          if (!input || !input.trim()) {
            return 'Project name cannot be empty';
          }
          // Check for valid project name (alphanumeric, hyphens, underscores)
          if (!/^[a-zA-Z0-9_-]+$/.test(input)) {
            return 'Project name can only contain letters, numbers, hyphens, and underscores';
          }
          return true;
        }
      },
      {
        type: 'list',
        name: 'runtime',
        message: 'Runtime:',
        choices: [
          { name: 'Python 3.12 (stable)', value: 'python3.12' },
          { name: 'Python 3.11 (stable)', value: 'python3.11' },
          { name: 'Python 3.10 (stable)', value: 'python3.10' },
          { name: 'Python 3.9 (stable)', value: 'python3.9' },
          { name: 'Python 3.14 (experimental)', value: 'python3.14' },
          { name: 'Python 3.13 (experimental)', value: 'python3.13' },
          { name: 'Node.js 20.x (stable)', value: 'nodejs20.x' },
          { name: 'Node.js 18.x (stable)', value: 'nodejs18.x' },
          { name: 'Node.js 16.x (stable)', value: 'nodejs16.x' },
          { name: 'Node.js 24.x (experimental)', value: 'nodejs24.x' },
          { name: 'Node.js 22.x (experimental)', value: 'nodejs22.x' },
          { name: 'Java 21 (stable)', value: 'java21' },
          { name: 'Java 17 (stable)', value: 'java17' },
          { name: 'Java 11 (stable)', value: 'java11' },
        ],
        default: 'python3.12'
      },
      {
        type: 'input',
        name: 'handler',
        message: 'Handler:',
        default: 'app.handler',
        validate: (input: string) => {
          if (!input || !input.trim()) {
            return 'Handler cannot be empty';
          }
          return true;
        }
      },
      {
        type: 'list',
        name: 'architecture',
        message: 'Architecture:',
        choices: [
          { name: 'x86_64', value: 'x86_64' },
        ],
        default: 'x86_64'
      },
      {
        type: 'confirm',
        name: 'advancedConfig',
        message: 'Configure timeout and memory?',
        default: false
      }
    ]);
    
    let timeoutConfig = '';
    let memoryConfig = '';
    let timeoutValue: number | undefined;
    let memoryValue: number | undefined;
    
    if (answers.advancedConfig) {
      const advanced = await inquirer.prompt([
        {
          type: 'number',
          name: 'timeout',
          message: 'Timeout (seconds):',
          default: 30,
          validate: (input: number) => {
            if (input < 1 || input > 900) {
              return 'Timeout must be between 1 and 900 seconds';
            }
            return true;
          }
        },
        {
          type: 'number',
          name: 'memory',
          message: 'Memory (MB):',
          default: 512,
          validate: (input: number) => {
            if (input < 128 || input > 10240) {
              return 'Memory must be between 128 and 10240 MB';
            }
            return true;
          }
        }
      ]);
      
      timeoutValue = advanced.timeout;
      memoryValue = advanced.memory;
      timeoutConfig = `\ntimeout: ${advanced.timeout}`;
      memoryConfig = `\nmemory: ${advanced.memory}`;
    }
    
    // Generate dispatch.yaml content
    const yamlContent = `projectName: ${answers.projectName}
runtime: ${answers.runtime}
handler: ${answers.handler}
architecture: ${answers.architecture}${timeoutConfig}${memoryConfig}

# Tier limits:
# free:       timeout: 5s,  memory: 512MB
# pro:        timeout: 15s, memory: 1536MB
# enterprise: timeout: 30s, memory: 3072MB
`;
    
    // Write dispatch.yaml
    fs.writeFileSync(configPath, yamlContent, 'utf8');
    
    console.log(chalk.green('\n✅ Created dispatch.yaml\n'));
    console.log(chalk.gray('Configuration:'));
    console.log(chalk.cyan(`  Project: ${answers.projectName}`));
    console.log(chalk.cyan(`  Runtime: ${answers.runtime}`));
    console.log(chalk.cyan(`  Handler: ${answers.handler}`));
    console.log(chalk.cyan(`  Architecture: ${answers.architecture}`));
    
    if (timeoutValue !== undefined && memoryValue !== undefined) {
      console.log(chalk.cyan(`  Timeout: ${timeoutValue}s`));
      console.log(chalk.cyan(`  Memory: ${memoryValue}MB`));
    }
    
    console.log(chalk.bold('\n→ Next steps:\n'));
    console.log(chalk.gray('1. Create your API code (e.g., app.py)'));
    console.log(chalk.gray('2. (Optional) Create openapi.yaml for safety checks'));
    console.log(chalk.gray('3. Run: dispatch deploy\n'));
    
    return 0;
  } catch (error: any) {
    console.error(chalk.red('\n❌ Failed to initialize project\n'));
    console.error(chalk.gray(error.message));
    console.error();
    return 1;
  }
}
