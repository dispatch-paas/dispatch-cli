/**
 * Authentication service
 * 
 * STUB IMPLEMENTATION
 * This is a placeholder that simulates authentication.
 * Replace with real Supabase auth when ready.
 */

import { User } from '../types/deployment';

/**
 * Authenticate the current user
 * 
 * STUB: Returns mock user data
 * REAL: Would retrieve stored Supabase token and validate it
 */
export async function authenticateUser(): Promise<User> {
  console.log('[STUB] Authenticating user...');
  
  // Simulate auth check delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // STUB: Return mock authenticated user
  const mockUser: User = {
    id: 'user_123',
    email: 'developer@example.com',
    token: 'mock_supabase_token_abc123',
  };
  
  console.log(`[STUB] Authenticated as: ${mockUser.email}`);
  
  return mockUser;
}

/**
 * Check if user is authenticated
 * 
 * STUB: Always returns true
 * REAL: Would check for valid stored token
 */
export async function isAuthenticated(): Promise<boolean> {
  console.log('[STUB] Checking authentication status...');
  
  // STUB: Always authenticated for now
  return true;
}

/**
 * Get authentication token
 * 
 * STUB: Returns mock token
 * REAL: Would retrieve from secure storage
 */
export function getAuthToken(): string {
  return 'mock_supabase_token_abc123';
}
