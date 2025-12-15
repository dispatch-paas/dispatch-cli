import { getCredentials, saveCredentials, clearCredentials } from '../utils/credentials';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from CLI directory
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const CONTROL_PLANE_URL = process.env.DISPATCH_API_URL || 'http://localhost:3000';

interface AccessCodeResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email?: string;
    tier?: string;
  };
}

export async function loginWithAccessCode(accessCode: string): Promise<boolean> {
  try {
    console.log('🔍 Verifying access code with control plane...');
    
    const response = await fetch(`${CONTROL_PLANE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_code: accessCode,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as any;
      console.error('❌ Login failed:', errorData.error || response.statusText);
      return false;
    }

    const data = await response.json() as AccessCodeResponse;

    // Save credentials
    saveCredentials({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
      user: {
        id: data.user.id,
        email: data.user.email,
        tier: data.user.tier,
      },
    });

    return true;
  } catch (error) {
    console.error('❌ Error during login:', error);
    return false;
  }
}

export async function getValidToken(): Promise<string | null> {
  const creds = getCredentials();
  
  if (!creds) {
    console.error('❌ Not logged in. Please run: dispatch login');
    return null;
  }

  // For now, we'll use simple token expiration without refresh
  // The access code model means users just re-login when token expires
  const isExpired = creds.expiresAt < Date.now();

  if (isExpired) {
    console.error('❌ Session expired. Please login again: dispatch login');
    clearCredentials();
    return null;
  }

  return creds.accessToken;
}
