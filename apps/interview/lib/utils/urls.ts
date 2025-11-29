/**
 * Get the questions app URL for the current environment
 * Uses runtime browser detection first, then environment variable, then defaults
 */
export function getQuestionsAppUrl(): string {
  // In browser, check if we're in production FIRST (most reliable runtime check)
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    
    // Check if we're on a Vercel domain - always use production URL
    if (hostname.includes('vercel.app') || hostname.includes('vercel.com')) {
      return 'https://question-archive.vercel.app';
    }
    
    // If we're not on localhost and not a private IP, assume production
    if (hostname !== 'localhost' && 
        hostname !== '127.0.0.1' &&
        !hostname.startsWith('192.168.') &&
        !hostname.startsWith('10.') &&
        hostname !== '') {
      return 'https://question-archive.vercel.app';
    }
  }
  
  // Check if environment variable is explicitly set (only if not localhost)
  const envUrl = process.env.NEXT_PUBLIC_QUESTIONS_APP_URL;
  if (envUrl && envUrl.trim() !== '' && !envUrl.includes('localhost')) {
    return envUrl;
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

