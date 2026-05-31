import { app } from 'electron'
import * as Sentry from '@sentry/electron/main'

const SENSITIVE_KEY_PATTERN = /(api[-_]?key|token|secret|password|credential|authorization|document|metadata|embedding|query|url)/i
const URL_PATTERN = /\bhttps?:\/\/[^\s"'<>]+/gi
const LONG_TOKEN_PATTERN = /\b[A-Za-z0-9_-]{32,}\b/g
const MAX_STRING_LENGTH = 500

let initialized = false

function redactString(value: string): string {
  return value
    .replace(URL_PATTERN, '[redacted-url]')
    .replace(LONG_TOKEN_PATTERN, '[redacted-token]')
    .slice(0, MAX_STRING_LENGTH)
}

function sanitizeValue(value: unknown, key = ''): unknown {
  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return '[redacted]'
  }

  if (typeof value === 'string') {
    return redactString(value)
  }

  if (Array.isArray(value)) {
    return value.slice(0, 10).map((item) => sanitizeValue(item))
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 30)
    return Object.fromEntries(entries.map(([entryKey, entryValue]) => [
      entryKey,
      sanitizeValue(entryValue, entryKey),
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
