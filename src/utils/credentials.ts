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
    return null;
  }
  try {
    const content = fs.readFileSync(CREDENTIALS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
}

export function clearCredentials() {
  if (fs.existsSync(CREDENTIALS_FILE)) {
    fs.unlinkSync(CREDENTIALS_FILE);
  }
}

// Legacy support for old token-only format
export function saveToken(token: string) {
  // Convert to new format with a far-future expiry
  const credentials: Credentials = {
    accessToken: token,
    refreshToken: '', // No refresh token in legacy mode
    expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
  };
  saveCredentials(credentials);
}

export function getToken(): string | null {
  const creds = getCredentials();
  return creds?.accessToken || null;
}
