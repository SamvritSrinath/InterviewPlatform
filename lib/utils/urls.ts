/**
 * URL utilities for the unified application
 * Since we're now a single app, these return the current origin
 */

/**
 * Get the current app URL (same for all routes now)
 * Returns the current origin in browser, or env var/server origin
 */
export function getAppUrl(): string {
  // In browser, use current origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Server-side: use environment variable or default
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

/**
 * Get the questions/archive URL (now same as main app)
 * Kept for backward compatibility during migration
 */
export function getQuestionsAppUrl(): string {
  return getAppUrl();
}

/**
 * Get the main app URL (now same as app URL)
 * Kept for backward compatibility during migration
 */
export function getMainAppUrl(): string {
  return getAppUrl();
}
