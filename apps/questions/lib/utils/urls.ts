/**
 * Get the questions app's own URL for the current environment
 * This is used within the questions app to reference itself
 */
export function getQuestionsAppUrl(): string {
  // Check if environment variable is explicitly set for the questions app
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  // Check if NEXT_PUBLIC_QUESTIONS_APP_URL is set (legacy, but support it)
  if (process.env.NEXT_PUBLIC_QUESTIONS_APP_URL) {
    return process.env.NEXT_PUBLIC_QUESTIONS_APP_URL;
  }
  
  // In browser, use the current origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Check if we're in production via Vercel environment variable
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Default to localhost for development
  return 'http://localhost:3001';
}

