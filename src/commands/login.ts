import { Command } from 'commander';
import { loginWithAccessCode } from '../services/auth';
import { askQuestion } from '../utils/input';
import { getCredentialsPath } from '../utils/credentials';
import chalk from 'chalk';

export async function runLogin(options: { code?: string }) {
  let accessCode = options.code;
  
  console.log(chalk.blue('\n🔐 Dispatch Login\n'));
  console.log(chalk.gray('Get your access code from: https://usedp.xyz/dashboard\n'));
  
  if (!accessCode) {
    accessCode = await askQuestion('Access Code: ');
  }
  
  if (!accessCode) {
    console.error(chalk.red('\n❌ Access code is required.'));
    console.log(chalk.gray('Visit https://usedp.xyz/dashboard to generate your access code.'));
    process.exit(1);
  }
  
  console.log(chalk.gray('\n⏳ Verifying access code...'));
  
  const success = await loginWithAccessCode(accessCode.trim());
  
  if (success) {
    console.log(chalk.green('✅ Successfully logged in!'));
    console.log(chalk.gray(`Credentials saved to ${getCredentialsPath()}\n`));
  } else {
    console.error(chalk.red('\n❌ Login failed. Invalid or expired access code.\n'));
    console.log(chalk.gray('Visit https://usedp.xyz/dashboard to generate a new access code.'));
    process.exit(1);
  }
}
