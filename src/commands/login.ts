import { Command } from 'commander';
import { loginWithPassword } from '../services/auth';
import { askQuestion, askPassword } from '../utils/input';
import chalk from 'chalk';

export async function runLogin(options: { email?: string; password?: string }) {
  let email = options.email;
  let password = options.password;
  
  console.log(chalk.blue('\n🔐 Dispatch Login\n'));
  
  if (!email) {
    email = await askQuestion('Email: ');
  }
  
  if (!password) {
    password = await askPassword('Password: ');
  }
  
  if (!email || !password) {
    console.error(chalk.red('\n❌ Email and password are required.'));
    process.exit(1);
  }
  
  console.log(chalk.gray('\n⏳ Authenticating...'));
  
  const success = await loginWithPassword(email.trim(), password.trim());
  
  if (success) {
    console.log(chalk.green('✅ Successfully logged in!'));
    console.log(chalk.gray('Credentials saved to ~/.dispatch/credentials.json\n'));
  } else {
    console.error(chalk.red('\n❌ Login failed. Please check your credentials.\n'));
    process.exit(1);
  }
}
