import chalk from 'chalk';
import { clearCredentials } from '../utils/credentials';

export async function runLogout() {
  console.log(chalk.blue('\n👋 Dispatch Logout\n'));
  
  clearCredentials();
  
  console.log(chalk.green('✅ Successfully logged out!'));
  console.log(chalk.gray('Your credentials have been removed.\n'));
}
