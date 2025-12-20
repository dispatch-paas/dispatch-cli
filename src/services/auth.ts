import { getCredentials, saveCredentials, clearCredentials } from '../utils/credentials';
import { debugLog } from '../utils/debug';
import { getControlPlaneUrl } from '../config/runtime';

const getControlPlane = () => getControlPlaneUrl();

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
    debugLog(`Control Plane URL: ${getControlPlane()}`);
    
    const response = await fetch(`${getControlPlane()}/auth/login`, {
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
      if (errorData.details) {
        console.error('   Details:', errorData.details);
      }
      if (errorData.hint) {
        console.error('   Hint:', errorData.hint);
      }
      console.error('   Status:', response.status);
      return false;
    }

    const data = await response.json() as AccessCodeResponse;
    debugLog('Access code verified, saving credentials...');

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

  // Check local JWT expiration first
  const isLocallyExpired = creds.expiresAt < Date.now();

  if (isLocallyExpired) {
    console.error('❌ Session expired. Please login again: dispatch login');
    clearCredentials();
    return null;
  }

  // Verify with server that access_code hasn't expired
  try {
    const verifyResponse = await fetch(`${getControlPlane()}/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${creds.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!verifyResponse.ok) {
      if (verifyResponse.status === 401) {
        console.error('❌ Session invalid or expired (access_code expires_at). Please login again: dispatch login');
        clearCredentials();
        return null;
      }
    }
  } catch (error) {
    // Network error - allow local token to be used
    debugLog('Warning: Could not verify token with server, using local expiration check');
  }

  return creds.accessToken;
}

interface VerifyResponse {
  authenticated: boolean;
  user: {
    id: string;
    email?: string;
    tier?: string;
    is_active: boolean;
  };
}

/**
 * Verify authentication with control plane
 * This validates the token and ensures the user account is valid and active
 */
export async function verifyAuthentication(): Promise<VerifyResponse | null> {
  const token = await getValidToken();
  
  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${getControlPlane()}/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as any;
      
      if (response.status === 401) {
        console.error('❌ Session invalid or expired. Please login again: dispatch login');
        clearCredentials();
        return null;
      }
      
      if (response.status === 403) {
        console.error('❌ Account is not active. Please contact support.');
        return null;
      }
      
      console.error('❌ Authentication verification failed:', errorData.error || response.statusText);
      return null;
    }

    const data = await response.json() as VerifyResponse;
    
    // Update local credentials with latest user info
    const creds = getCredentials();
    if (creds && data.user) {
      saveCredentials({
        ...creds,
        user: {
          id: data.user.id,
          email: data.user.email,
          tier: data.user.tier,
        },
      });
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error verifying authentication:', error);
    return null;
  }
}
