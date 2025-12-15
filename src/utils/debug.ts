/**
 * Debug logging utility
 */

let debugEnabled = false;

export function setDebugEnabled(enabled: boolean) {
  debugEnabled = enabled;
}

export function isDebugEnabled(): boolean {
  return debugEnabled;
}

export function debugLog(...args: any[]) {
  if (debugEnabled) {
    console.log('[DEBUG]', ...args);
  }
}
