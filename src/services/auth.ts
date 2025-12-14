import { getCredentials, saveCredentials, clearCredentials } from '../utils/credentials';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from CLI directory
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const CONTROL_PLANE_URL = process.env.DISPATCH_API_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://foqrspnwkbyqlisopelb.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsImtpZCI6IjE2RDdqbm4rZi8xbTlCUWQiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2ZvcXJzcG53a2J5cWxpc29wZWxiLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczMzUxMzY1OCwiZXhwIjoyMDQ5MDg5NjU4fQ.Kx8aBPVMJIQwdXPJZwKqjOlBBXBPQMvDZJRCJqKQOIE';

interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email?: string;
  };
}

export async function refreshAccessToken(): Promise<string | null> {
  const creds = getCredentials();
  
  if (!creds || !creds.refreshToken) {
    console.error('No refresh token available. Please login again.');
    return null;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        refresh_token: creds.refreshToken,
      }),
    });

    if (!response.ok) {
      console.error('Failed to refresh token. Please login again.');
      clearCredentials();
      return null;
    }

    const data = await response.json() as RefreshResponse;

    // Save new credentials
    saveCredentials({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });

    return data.access_token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

export async function getValidToken(): Promise<string | null> {
  const creds = getCredentials();
  
  if (!creds) {
    return null;
  }

  // Check if token is expired or will expire in the next 5 minutes
  const expiryBuffer = 5 * 60 * 1000; // 5 minutes
  const isExpired = creds.expiresAt < (Date.now() + expiryBuffer);

  if (isExpired && creds.refreshToken) {
    console.log('🔄 Access token expired, refreshing...');
    return await refreshAccessToken();
  }

  return creds.accessToken;
}

export async function loginWithPassword(email: string, password: string): Promise<boolean> {
  try {
    console.log('🔍 Debug: Attempting login...');
    console.log('  URL:', `${SUPABASE_URL}/auth/v1/token?grant_type=password`);
    console.log('  Email:', email);
    
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    console.log('🔍 Debug: Response status:', response.status);
    console.log('🔍 Debug: Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('🔍 Debug: Error response body:', errorText);
      
      try {
        const error = JSON.parse(errorText) as any;
        console.error('Login failed:', error.error_description || error.msg || error.message || 'Unknown error');
      } catch {
        console.error('Login failed:', errorText);
      }
      return false;
    }

    const responseText = await response.text();
    console.log('🔍 Debug: Success response body:', responseText);
    
    const data = JSON.parse(responseText) as RefreshResponse;

    // Save credentials
    saveCredentials({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });

    return true;
  } catch (error: any) {
    console.error('🔍 Debug: Exception caught:', error);
    console.error('Login error:', error.message || error);
    return false;
  }
}

export async function registerUser(email: string, password: string): Promise<boolean> {
  try {
    console.log('🔍 Debug: Attempting registration...');
    console.log('  URL:', `${SUPABASE_URL}/auth/v1/signup`);
    console.log('  Email:', email);
    
    const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    console.log('🔍 Debug: Response status:', response.status);
    console.log('🔍 Debug: Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('🔍 Debug: Error response body:', errorText);
      
      try {
        const error = JSON.parse(errorText) as any;
        console.error('Registration failed:', error.error_description || error.msg || error.message || 'Unknown error');
      } catch {
        console.error('Registration failed:', errorText);
      }
      return false;
    }

    const responseText = await response.text();
    console.log('🔍 Debug: Success response body:', responseText);
    
    const data = JSON.parse(responseText) as RefreshResponse;

    // Save credentials
    saveCredentials({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });

    return true;
  } catch (error: any) {
    console.error('🔍 Debug: Exception caught:', error);
    console.error('Registration error:', error.message || error);
    return false;
  }
}

