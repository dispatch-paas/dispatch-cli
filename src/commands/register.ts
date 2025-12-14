import { Command } from 'commander';
import { registerUser } from '../services/auth';
import { askQuestion, askPassword } from '../utils/input';
import chalk from 'chalk';

export async function runRegister(options: { email?: string; password?: string }) {
  let email = options.email;
  let password = options.password;
  
  console.log(chalk.blue('\n📝 Dispatch Registration\n'));
  
  if (!email) {
    email = await askQuestion('Email: ');
  }
  
  if (!password) {
    password = await askPassword('Password (min 6 characters): ');
  }
  
  if (!email || !password) {
    console.error(chalk.red('\n❌ Email and password are required.'));
    process.exit(1);
  }
  
  if (password.length < 6) {
    console.error(chalk.red('\n❌ Password must be at least 6 characters long.'));
    process.exit(1);
  }
  
  console.log(chalk.gray('\n⏳ Creating account...'));
  
  const success = await registerUser(email.trim(), password.trim());
  
  if (success) {
    console.log(chalk.green('✅ Account created successfully!'));
    console.log(chalk.gray('You are now logged in.'));
    console.log(chalk.gray('Credentials saved to ~/.dispatch/credentials.json\n'));
  } else {
    console.error(chalk.red('\n❌ Registration failed. Please try again.\n'));
    process.exit(1);
  }
}
