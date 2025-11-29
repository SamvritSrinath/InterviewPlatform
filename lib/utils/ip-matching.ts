/**
 * IP Matching Utilities
 * Utilities for matching IP addresses and correlating sessions
 */

/**
 * Normalize IP address for comparison
 * Handles IPv4 and IPv6, removes port numbers
 */
export function normalizeIP(ip: string | null | undefined): string | null {
  if (!ip) return null;

  // Remove port if present (e.g., "192.168.1.1:8080" -> "192.168.1.1")
  const ipWithoutPort = ip.split(':')[0];

  // Handle IPv6 mapped IPv4 addresses (::ffff:192.168.1.1 -> 192.168.1.1)
  if (ipWithoutPort.startsWith('::ffff:')) {
    return ipWithoutPort.replace('::ffff:', '');
  }

  return ipWithoutPort.trim();
}

/**
 * Check if two IP addresses match
 */
export function ipAddressesMatch(
  ip1: string | null | undefined,
  ip2: string | null | undefined
): boolean {
  const normalized1 = normalizeIP(ip1);
  const normalized2 = normalizeIP(ip2);

  if (!normalized1 || !normalized2) {
    return false;
  }

  return normalized1 === normalized2;
}

/**
 * Extract IP from request headers
 */
export function extractIPFromHeaders(headers: Headers | Record<string, string | string[] | undefined>): string | null {
  // Handle Headers object
  if (headers instanceof Headers) {
    const forwardedFor = headers.get('x-forwarded-for');
    if (forwardedFor) {
      // x-forwarded-for can contain multiple IPs, take the first one
      return forwardedFor.split(',')[0].trim();
    }
    return headers.get('x-real-ip') || null;
  }

  // Handle plain object
  const forwardedFor = headers['x-forwarded-for'];
  if (forwardedFor) {
    const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ip.split(',')[0].trim();
  }
  
  const realIP = headers['x-real-ip'];
  if (realIP) {
    return Array.isArray(realIP) ? realIP[0] : realIP;
  }

  return null;
}

/**
 * Check temporal correlation between two timestamps
 * Returns true if timestamps are within the specified window (in minutes)
 */
export function isWithinTimeWindow(
  timestamp1: string | Date,
  timestamp2: string | Date,
  windowMinutes: number = 30
): boolean {
  const date1 = typeof timestamp1 === 'string' ? new Date(timestamp1) : timestamp1;
  const date2 = typeof timestamp2 === 'string' ? new Date(timestamp2) : timestamp2;

  const diffMs = Math.abs(date1.getTime() - date2.getTime());
  const diffMinutes = diffMs / (1000 * 60);

  return diffMinutes <= windowMinutes;
}

