import { User } from '../types/deployment';
import { getToken } from '../utils/credentials';

/**
 * Authenticate the current user
 * 
 * Retrieves stored Supabase token.
 */
export async function authenticateUser(): Promise<User> {
  const token = getToken();
  
  if (!token) {
    throw new Error('Not authenticated. Please run "dispatch login" first.');
  }
  
  // In a full implementation, we would validate the token with the Control Plane
  // and fetch user details. For now, we return the token for use.
  
  return {
    id: 'user_from_token', // Resolved by Control Plane
    email: 'email_from_token',
    token: token,
  };
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  return !!getToken();
}

/**
 * Get authentication token
 */
export function getAuthToken(): string {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated. Please run "dispatch login" first.');
  }
  return token;
}
