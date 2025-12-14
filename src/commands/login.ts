import { Command } from 'commander';
import * as readline from 'readline';
import { saveToken } from '../utils/credentials';
import chalk from 'chalk';

function askQuestion(query: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

export async function runLogin(options: { token?: string }) {
  let token = options.token;
  
  if (!token) {
    console.log(chalk.blue('Please enter your Dispatch Access Token (from Supabase):'));
    token = await askQuestion('> ');
  }
  
  if (!token || token.trim().length === 0) {
    console.error(chalk.red('Token is required.'));
    process.exit(1);
  }
  
  saveToken(token.trim());
  console.log(chalk.green('Successfully logged in. Credentials saved.'));
}
