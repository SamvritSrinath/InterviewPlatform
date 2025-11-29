/**
 * Get the questions app URL for the current environment
 * Uses environment variable if set, otherwise detects production vs development
 */
export function getQuestionsAppUrl(): string {
  // Check if environment variable is explicitly set
  if (process.env.NEXT_PUBLIC_QUESTIONS_APP_URL) {
    return process.env.NEXT_PUBLIC_QUESTIONS_APP_URL;
  }
  
  // In browser, check if we're in production
  if (typeof window !== 'undefined') {
    const isProduction = !window.location.hostname.includes('localhost') && 
                        !window.location.hostname.includes('127.0.0.1');
    if (isProduction) {
      return 'https://question-archive.vercel.app';
    }
  }
  
  // Default to localhost for development
  return 'http://localhost:3001';
}

/**
 * Get the main app URL for the current environment
 */
export function getMainAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  // In browser, check if we're in production
  if (typeof window !== 'undefined') {
    const isProduction = !window.location.hostname.includes('localhost') && 
                        !window.location.hostname.includes('127.0.0.1');
    if (isProduction) {
      return 'https://interview-platform-ecru-gamma.vercel.app';
    }
  }
  
  // Default to localhost for development
  return 'http://localhost:3000';
}

