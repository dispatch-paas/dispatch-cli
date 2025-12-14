import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.dispatch');
const CREDENTIALS_FILE = path.join(CONFIG_DIR, 'credentials');

export function saveToken(token: string) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify({ token }));
}

export function getToken(): string | null {
  if (!fs.existsSync(CREDENTIALS_FILE)) {
    return null;
  }
  try {
    const content = fs.readFileSync(CREDENTIALS_FILE, 'utf-8');
    const data = JSON.parse(content);
    return data.token;
  } catch (err) {
    return null;
  }
}
