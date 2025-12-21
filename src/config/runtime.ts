/**
 * Runtime configuration for CLI
 * This gets configuration at runtime instead of using hardcoded .env files
 */

export interface RuntimeConfig {
  controlPlaneUrl: string;
  isProduction: boolean;
}

/**
 * Get runtime configuration
 * Uses environment variables or defaults to production API
 */
export function getRuntimeConfig(): RuntimeConfig {
  // Allow override via environment variable (for development)
  const envUrl = process.env.DISPATCH_API_URL;
  
  // Default to production API
  const controlPlaneUrl = envUrl || 'https://api.usedp.xyz';
  
  // Detect if running against production
  const isProduction = !envUrl || controlPlaneUrl.includes('https://api.usedp.xyz');
  
  return {
    controlPlaneUrl: controlPlaneUrl.replace(/\/$/, ''),
    isProduction
  };
}

/**
 * Get control plane URL
 */
export function getControlPlaneUrl(): string {
  const config = getRuntimeConfig();
  return config.controlPlaneUrl;
}