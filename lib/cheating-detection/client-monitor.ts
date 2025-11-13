// Client-side cheating detection monitoring hooks

import { useEffect, useRef, useCallback } from 'react'

export interface CheatingEvent {
  type: 'tab_switch' | 'console_access' | 'clipboard' | 'llm_api' | 'copy_paste' | 'typing_pattern'
  timestamp: number
  details: any
}

export interface UseCheatingDetectionOptions {
  sessionId: string | null
  problemId?: string | null
  enabled?: boolean
}

export class CheatingMonitor {
  private events: CheatingEvent[] = []
  private sessionId: string | null = null
  private onEvent: ((event: CheatingEvent) => void) | null = null
  private typingIntervals: number[] = []
  private lastTypingTime: number = Date.now()
  private isMonitoring: boolean = false

  constructor(sessionId: string, onEvent: (event: CheatingEvent) => void) {
    this.sessionId = sessionId
    this.onEvent = onEvent
  }

  startMonitoring() {
    if (this.isMonitoring) return
    this.isMonitoring = true

    // Monitor tab switching
    this.monitorTabSwitching()
    
    // Monitor console access
    this.monitorConsoleAccess()
    
    // Monitor clipboard
    this.monitorClipboard()
    
    // Monitor network requests (LLM APIs)
    this.monitorNetworkRequests()
    
    // Monitor copy/paste events
    this.monitorCopyPaste()
    
    // Monitor typing patterns
    this.monitorTypingPatterns()
  }

  stopMonitoring() {
    this.isMonitoring = false
    // Cleanup would go here
  }

  logEvent(event: CheatingEvent) {
    this.events.push(event)
    if (this.onEvent) {
      this.onEvent(event)
    }
  }

  private monitorTabSwitching() {
    // Log all tab switches as suspicious behavior during interview
    // This is important for interviewers to monitor - store in DB
    // But send real-time alerts without storing every single switch
    let tabSwitchCount = 0
    let lastTabSwitchTime = Date.now()
    let lastAlertTime = Date.now()
    const alertThrottle = 10000 // Alert every 10 seconds max
    const tabSwitchWindow = 60000 // 1 minute window for counting

    document.addEventListener('visibilitychange', () => {
      const now = Date.now()
      const isHidden = document.hidden
      
      // Reset counter if enough time has passed
      if (now - lastTabSwitchTime > tabSwitchWindow) {
        tabSwitchCount = 0
      }
      
      tabSwitchCount++
      lastTabSwitchTime = now

      // ALWAYS log tab switches during interview (store in DB)
      // This is important for interviewers to see
      this.logEvent({
        type: 'tab_switch',
        timestamp: now,
        details: {
          action: isHidden ? 'tab_hidden' : 'tab_visible',
          switchCount: tabSwitchCount,
          sessionId: this.sessionId,
          suspicious: tabSwitchCount >= 3, // Mark as suspicious if 3+ switches in 1 minute
          severity: tabSwitchCount >= 5 ? 'high' : tabSwitchCount >= 3 ? 'medium' : 'low',
        },
      })

      // Send real-time alert if enough time has passed since last alert
      // (throttle alerts to avoid spam, but still log all switches in DB)
      if (now - lastAlertTime >= alertThrottle) {
        lastAlertTime = now
        // The alert will be sent via the cheating detection API
        // which stores in DB and triggers real-time subscription
      }
    })

    // Also monitor window blur for additional detection
    window.addEventListener('blur', () => {
      this.logEvent({
        type: 'tab_switch',
        timestamp: Date.now(),
        details: {
          action: 'window_blur',
          sessionId: this.sessionId,
          suspicious: true,
          severity: 'medium',
        },
      })
    })
  }

  private monitorConsoleAccess() {
    // FILTER: Don't log console access by default (too common, not necessarily cheating)
    // Console.log calls are common in development and legitimate use cases
    // Only log if there's a suspicious pattern (e.g., multiple console calls in rapid succession)
    // For now, we skip logging console access entirely to save storage
    // If you want to detect console access, you can enable it but be aware it will generate many logs
    
    // Skip console monitoring to save storage
    // Normal console usage is common and not necessarily cheating
    return
  }

  private monitorClipboard() {
    // FILTER: Don't log normal clipboard use (too common)
    // Normal copy/paste is common and not necessarily cheating
    // We handle copy/paste detection separately via copy_paste events
    // which are only logged if suspicious patterns are detected
    return
  }

  private monitorNetworkRequests() {
    const originalFetch = window.fetch
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString()
      
      // Check for LLM API patterns
      const llmPatterns = [
        /openai\.com/i,
        /api\.openai\.com/i,
        /anthropic\.com/i,
        /api\.anthropic\.com/i,
        /huggingface\.co/i,
        /googleapis\.com/i,
        /claude/i,
        /chatgpt/i,
        /gpt-4/i,
        /gpt-3/i,
        /cohere\.ai/i,
        /replicate\.com/i,
        /together\.ai/i,
      ]

      const isLlmRequest = llmPatterns.some((pattern) => pattern.test(url))

      if (isLlmRequest) {
        this.logEvent({
          type: 'llm_api',
          timestamp: Date.now(),
          details: {
            url: url.substring(0, 200),
            sessionId: this.sessionId,
          },
        })
      }

      return originalFetch(input, init)
    }
  }

  private monitorCopyPaste() {
    // FILTER: Only log copy/paste if suspicious pattern detected
    // Normal copy/paste is common and shouldn't be logged
    // We detect suspicious patterns via typing pattern analysis instead
    // Only log if large amounts of text are pasted at once (suspicious)
    let pasteCount = 0
    let lastPasteTime = Date.now()
    const pasteThreshold = 3 // Only log if 3+ pastes in short time
    const pasteWindow = 10000 // 10 second window

    document.addEventListener('paste', (e) => {
      const now = Date.now()
      
      // Reset counter if enough time has passed
      if (now - lastPasteTime > pasteWindow) {
        pasteCount = 0
      }
      
      pasteCount++
      lastPasteTime = now

      // Only log if suspicious pattern (multiple rapid pastes)
      if (pasteCount >= pasteThreshold) {
        this.logEvent({
          type: 'copy_paste',
          timestamp: now,
          details: {
            action: 'paste',
            pasteCount: pasteCount,
            sessionId: this.sessionId,
            suspicious: true,
          },
        })
      }
      // Otherwise, skip logging to save storage
    })
  }

  private monitorTypingPatterns() {
    // This would be called from the editor component
    // Track typing intervals to detect copy-paste patterns
  }

  recordTyping() {
    const now = Date.now()
    const interval = now - this.lastTypingTime
    this.lastTypingTime = now

    if (interval > 0 && interval < 10000) {
      // Only record reasonable intervals
      this.typingIntervals.push(interval)
      
      // Keep only last 100 intervals
      if (this.typingIntervals.length > 100) {
        this.typingIntervals.shift()
      }

      // Detect suspicious patterns (very fast or very uniform typing)
      if (this.typingIntervals.length > 10) {
        const avgInterval = this.typingIntervals.reduce((a, b) => a + b, 0) / this.typingIntervals.length
        const variance = this.typingIntervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / this.typingIntervals.length
        
        // Very uniform typing (low variance) might indicate copy-paste
        if (variance < 100 && avgInterval < 50) {
          this.logEvent({
            type: 'typing_pattern',
            timestamp: Date.now(),
            details: {
              pattern: 'suspicious_uniform_typing',
              avgInterval,
              variance,
              sessionId: this.sessionId,
            },
          })
        }
      }
    }
  }

  getEvents(): CheatingEvent[] {
    return [...this.events]
  }

  clearEvents() {
    this.events = []
  }
}

// React hook for cheating detection
export function useCheatingDetection(options: UseCheatingDetectionOptions) {
  const { sessionId, problemId, enabled = true } = options
  const monitorRef = useRef<CheatingMonitor | null>(null)
  const eventsRef = useRef<CheatingEvent[]>([])

  useEffect(() => {
    if (!enabled || !sessionId) return

    const handleEvent = async (event: CheatingEvent) => {
      eventsRef.current.push(event)

      // Send event to API
      try {
        const response = await fetch('/api/cheating/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: event.type,
            details: event.details,
            problemId,
            sessionId,
            platform: navigator.platform,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
        })

        if (!response.ok) {
          console.error('Failed to log cheating event:', await response.text())
        }
      } catch (error) {
        console.error('Error sending cheating event:', error)
      }
    }

    monitorRef.current = new CheatingMonitor(sessionId, handleEvent)
    monitorRef.current.startMonitoring()

    return () => {
      if (monitorRef.current) {
        monitorRef.current.stopMonitoring()
      }
    }
  }, [enabled, sessionId, problemId])

  const handleTyping = useCallback(() => {
    if (monitorRef.current) {
      monitorRef.current.recordTyping()
    }
  }, [])

  const logEvent = useCallback((type: CheatingEvent['type'], details: any) => {
    if (monitorRef.current) {
      monitorRef.current.logEvent({
        type,
        timestamp: Date.now(),
        details,
      })
    }
  }, [])

  return {
    handleTyping,
    logEvent,
    events: eventsRef.current,
  }
}

