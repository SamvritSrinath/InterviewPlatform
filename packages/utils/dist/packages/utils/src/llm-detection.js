"use strict";
/**
 * LLM Detection Utilities
 * Detects LLM traffic based on user agent patterns and referrer analysis
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectLLMFromUserAgent = detectLLMFromUserAgent;
exports.detectLLMFromReferrer = detectLLMFromReferrer;
exports.detectLLMTraffic = detectLLMTraffic;
exports.getLLMPatternType = getLLMPatternType;
/**
 * Known LLM user agent patterns
 */
const LLM_USER_AGENT_PATTERNS = [
    // OpenAI
    { pattern: /GPTBot/i, type: 'openai-gptbot', confidence: 'high' },
    { pattern: /ChatGPT-User/i, type: 'openai-chatgpt', confidence: 'high' },
    { pattern: /OpenAI/i, type: 'openai', confidence: 'medium' },
    // Anthropic
    { pattern: /anthropic-ai/i, type: 'anthropic', confidence: 'high' },
    { pattern: /Claude/i, type: 'anthropic-claude', confidence: 'medium' },
    // Google
    { pattern: /Google-Extended/i, type: 'google-extended', confidence: 'high' },
    { pattern: /Gemini/i, type: 'google-gemini', confidence: 'high' },
    { pattern: /GoogleAI/i, type: 'google-ai', confidence: 'medium' },
    // Perplexity
    { pattern: /PerplexityBot/i, type: 'perplexity', confidence: 'high' },
    { pattern: /Perplexity/i, type: 'perplexity', confidence: 'medium' },
    // Other AI services
    { pattern: /CCBot/i, type: 'common-crawl', confidence: 'low' },
    { pattern: /anthropic/i, type: 'anthropic', confidence: 'medium' },
    { pattern: /cohere/i, type: 'cohere', confidence: 'medium' },
    { pattern: /ai21/i, type: 'ai21', confidence: 'medium' },
];
/**
 * Detects if a request is from an LLM based on user agent
 */
function detectLLMFromUserAgent(userAgent) {
    if (!userAgent) {
        return {
            isLLM: false,
            confidence: 'low',
        };
    }
    for (const { pattern, type, confidence } of LLM_USER_AGENT_PATTERNS) {
        if (pattern.test(userAgent)) {
            return {
                isLLM: true,
                llmType: type,
                confidence,
                userAgent,
            };
        }
    }
    return {
        isLLM: false,
        confidence: 'low',
        userAgent,
    };
}
/**
 * Detects if a request is from an LLM based on referrer
 */
function detectLLMFromReferrer(referrer) {
    if (!referrer) {
        return {
            isLLM: false,
            confidence: 'low',
        };
    }
    const referrerLower = referrer.toLowerCase();
    // Check for known AI service domains
    const aiDomains = [
        'openai.com',
        'chat.openai.com',
        'anthropic.com',
        'claude.ai',
        'perplexity.ai',
        'gemini.google.com',
        'bard.google.com',
    ];
    for (const domain of aiDomains) {
        if (referrerLower.includes(domain)) {
            return {
                isLLM: true,
                llmType: domain.split('.')[0],
                confidence: 'high',
                referrer,
            };
        }
    }
    return {
        isLLM: false,
        confidence: 'low',
        referrer,
    };
}
/**
 * Comprehensive LLM detection combining user agent and referrer analysis
 */
function detectLLMTraffic(userAgent, referrer) {
    const userAgentResult = detectLLMFromUserAgent(userAgent);
    const referrerResult = detectLLMFromReferrer(referrer);
    // If either detection method finds an LLM, return positive result
    if (userAgentResult.isLLM || referrerResult.isLLM) {
        return {
            isLLM: true,
            llmType: userAgentResult.llmType || referrerResult.llmType,
            confidence: userAgentResult.confidence === 'high' || referrerResult.confidence === 'high'
                ? 'high'
                : userAgentResult.confidence === 'medium' || referrerResult.confidence === 'medium'
                    ? 'medium'
                    : 'low',
            userAgent: userAgent || undefined,
            referrer: referrer || undefined,
        };
    }
    return {
        isLLM: false,
        confidence: 'low',
        userAgent: userAgent || undefined,
        referrer: referrer || undefined,
    };
}
/**
 * Get pattern type string for logging
 */
function getLLMPatternType(result) {
    if (!result.isLLM) {
        return 'human';
    }
    return `llm_${result.llmType || 'unknown'}`;
}
//# sourceMappingURL=llm-detection.js.map