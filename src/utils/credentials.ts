import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.dispatch');
const CREDENTIALS_FILE = path.join(CONFIG_DIR, 'credentials.json');

interface Credentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user?: {
    id: string;
    email?: string;
    tier?: string;
  };
}

export function saveCredentials(credentials: Credentials) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2));
}

export function getCredentials(): Credentials | null {
  if (!fs.existsSync(CREDENTIALS_FILE)) {
    console.error(`Debug: Credentials file not found at: ${CREDENTIALS_FILE}`);
    return null;
  }
  try {
    const content = fs.readFileSync(CREDENTIALS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Debug: Error reading credentials file: ${err}`);
    return null;
  }
}

export function clearCredentials() {
  if (fs.existsSync(CREDENTIALS_FILE)) {
    fs.unlinkSync(CREDENTIALS_FILE);
  }
}

export function getToken(): string | null {
  const creds = getCredentials();
  return creds?.accessToken || null;
}

export function getCredentialsPath(): string {
  return CREDENTIALS_FILE;
}
