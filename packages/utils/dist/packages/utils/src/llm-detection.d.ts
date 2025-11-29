/**
 * LLM Detection Utilities
 * Detects LLM traffic based on user agent patterns and referrer analysis
 */
export interface LLMDetectionResult {
    isLLM: boolean;
    llmType?: string;
    confidence: 'high' | 'medium' | 'low';
    userAgent?: string;
    referrer?: string;
}
/**
 * Detects if a request is from an LLM based on user agent
 */
export declare function detectLLMFromUserAgent(userAgent: string | null | undefined): LLMDetectionResult;
/**
 * Detects if a request is from an LLM based on referrer
 */
export declare function detectLLMFromReferrer(referrer: string | null | undefined): LLMDetectionResult;
/**
 * Comprehensive LLM detection combining user agent and referrer analysis
 */
export declare function detectLLMTraffic(userAgent?: string | null, referrer?: string | null): LLMDetectionResult;
/**
 * Get pattern type string for logging
 */
export declare function getLLMPatternType(result: LLMDetectionResult): string;
