/**
 * IP Matching Utilities
 * Utilities for matching IP addresses and correlating sessions
 */
/**
 * Normalize IP address for comparison
 * Handles IPv4 and IPv6, removes port numbers
 */
export declare function normalizeIP(ip: string | null | undefined): string | null;
/**
 * Check if two IP addresses match
 */
export declare function ipAddressesMatch(ip1: string | null | undefined, ip2: string | null | undefined): boolean;
/**
 * Extract IP from request headers
 */
export declare function extractIPFromHeaders(headers: Headers | Record<string, string | string[] | undefined>): string | null;
/**
 * Check temporal correlation between two timestamps
 * Returns true if timestamps are within the specified window (in minutes)
 */
export declare function isWithinTimeWindow(timestamp1: string | Date, timestamp2: string | Date, windowMinutes?: number): boolean;
