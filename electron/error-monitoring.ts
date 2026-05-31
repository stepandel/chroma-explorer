import { app } from 'electron'
import * as Sentry from '@sentry/electron/main'

const SENSITIVE_KEY_PATTERN = /(api[-_]?key|token|secret|password|credential|authorization|document|metadata|embedding|query|url)/i
const URL_PATTERN = /\bhttps?:\/\/[^\s"'<>]+/gi
const LONG_TOKEN_PATTERN = /\b[A-Za-z0-9_-]{32,}\b/g
const MAX_STRING_LENGTH = 500
const MAX_DEBUG_STRING_LENGTH = 10_000
const MAX_SANITIZE_DEPTH = 12
const DEBUG_STRING_KEY_PATTERN = /^(message|stack|componentStack|exception|value|type)$/i

let initialized = false

function redactString(value: string, maxLength = MAX_STRING_LENGTH): string {
  const redacted = value
    .replace(URL_PATTERN, '[redacted-url]')
    .replace(LONG_TOKEN_PATTERN, '[redacted-token]')

  return redacted.length > maxLength ? redacted.slice(0, maxLength) : redacted
}

function sanitizeValue(
  value: unknown,
  key = '',
  depth = 0,
  seen = new WeakSet<object>()
): unknown {
  if (depth >= MAX_SANITIZE_DEPTH) {
    return '[max-depth-exceeded]'
  }

  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return '[redacted]'
  }

  if (typeof value === 'string') {
    const maxLength = DEBUG_STRING_KEY_PATTERN.test(key) ? MAX_DEBUG_STRING_LENGTH : MAX_STRING_LENGTH
    return redactString(value, maxLength)
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return '[circular]'
    }
    seen.add(value)
    return value.slice(0, 10).map((item) => sanitizeValue(item, '', depth + 1, seen))
  }

  if (value && typeof value === 'object') {
    if (seen.has(value)) {
      return '[circular]'
    }
    seen.add(value)
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 30)
    return Object.fromEntries(entries.map(([entryKey, entryValue]) => [
      entryKey,
      sanitizeValue(entryValue, entryKey, depth + 1, seen),
    ]))
  }

  return value
}

function getSentryDsn(): string {
  return process.env.SENTRY_DSN || process.env.VITE_SENTRY_DSN || ''
}

function getSentryRelease(): string {
  return process.env.SENTRY_RELEASE || `chroma-explorer@${app.getVersion()}`
}

export function initErrorMonitoring(enabled: boolean): void {
  if (initialized || Sentry.isInitialized()) {
    initialized = true
    return
  }

  const dsn = getSentryDsn()
  if (!enabled || !dsn) {
    if (!dsn) {
      console.log('[ErrorMonitoring] SENTRY_DSN not configured, error reporting disabled')
    }
    return
  }

  Sentry.init({
    dsn,
    environment: app.isPackaged ? 'production' : 'development',
    release: getSentryRelease(),
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeBreadcrumb(breadcrumb) {
      return sanitizeValue(breadcrumb) as Sentry.Breadcrumb
    },
    beforeSend(event) {
      const sanitized = sanitizeValue(event) as Sentry.ErrorEvent
      delete sanitized.request
      delete sanitized.user
      return sanitized
    },
  })

  Sentry.setTags({
    packaged: String(app.isPackaged),
    platform: process.platform,
    arch: process.arch,
    electron: process.versions.electron || 'unknown',
  })

  initialized = true
  console.log('[ErrorMonitoring] Initialized successfully')
}

export function setErrorMonitoringEnabled(enabled: boolean): void {
  if (enabled) {
    initErrorMonitoring(true)
    return
  }

  if (initialized || Sentry.isInitialized()) {
    void Sentry.close(2000).finally(() => {
      initialized = false
      console.log('[ErrorMonitoring] Disabled')
    })
  }
}

export function captureMainError(error: unknown, context?: Record<string, string | number | boolean>): void {
  if (!initialized && !Sentry.isInitialized()) {
    return
  }

  Sentry.withScope((scope) => {
    if (context) {
      scope.setTags(Object.fromEntries(
        Object.entries(context).map(([key, value]) => [key, String(value)])
      ))
    }
    Sentry.captureException(error)
  })
}
