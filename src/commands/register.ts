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
    
    // Ask for confirmation
    const confirmPassword = await askPassword('Confirm password: ');
    
    if (password !== confirmPassword) {
      console.error(chalk.red('\n❌ Passwords do not match.'));
      process.exit(1);
    }
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
    console.log(chalk.yellow('📧 Please check your email to confirm your account.'));
    console.log(chalk.gray('After confirming, run: dispatch login\n'));
  } else {
    console.error(chalk.red('\n❌ Registration failed. Email may already be in use.\n'));
    process.exit(1);
  }
}
