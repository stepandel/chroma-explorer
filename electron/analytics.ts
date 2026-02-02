import { trackEvent, initialize } from '@aptabase/electron/main'

let isInitialized = false

/**
 * Initialize Aptabase analytics
 * Fails silently if APTABASE_APP_KEY is not configured
 */
export function initAnalytics(): void {
  try {
    const appKey = process.env.APTABASE_APP_KEY

    if (!appKey) {
      console.log('[Analytics] APTABASE_APP_KEY not configured, analytics disabled')
      return
    }

    initialize(appKey)
    isInitialized = true
    console.log('[Analytics] Initialized successfully')
  } catch (error) {
    console.warn('[Analytics] Failed to initialize:', error instanceof Error ? error.message : 'Unknown error')
    isInitialized = false
  }
}

/**
 * Track an analytics event
 * @param eventName - Name of the event to track
 * @param properties - Optional properties to attach to the event
 */
export function track(eventName: string, properties?: Record<string, string | number | boolean>): void {
  if (!isInitialized) {
    return
  }

  try {
    trackEvent(eventName, properties)
  } catch (error) {
    // Fail silently
    console.warn('[Analytics] Failed to track event:', eventName, error instanceof Error ? error.message : 'Unknown error')
  }
}
