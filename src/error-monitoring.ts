import * as Sentry from '@sentry/electron/renderer'

let initialized = false

export async function initRendererErrorMonitoring(): Promise<void> {
  try {
    const enabled = await window.electronAPI.settings.getErrorReportingEnabled()
    setRendererErrorMonitoringEnabled(enabled)

    window.electronAPI.settings.onErrorReportingChange((nextEnabled) => {
      setRendererErrorMonitoringEnabled(nextEnabled)
    })
  } catch (error) {
    console.warn('[ErrorMonitoring] Failed to read renderer setting:', error)
  }
}

export function setRendererErrorMonitoringEnabled(enabled: boolean): void {
  if (enabled && !initialized && !Sentry.isInitialized()) {
    Sentry.init()
    initialized = true
    return
  }

  if (!enabled && (initialized || Sentry.isInitialized())) {
    const client = Sentry.getClient()
    void Promise.resolve(client?.close(2000)).finally(() => {
      initialized = false
    })
  }
}

export function captureRendererError(error: unknown, context?: Record<string, string>): void {
  if (!initialized && !Sentry.isInitialized()) {
    return
  }

  Sentry.withScope((scope) => {
    if (context) {
      scope.setTags(context)
    }
    Sentry.captureException(error)
  })
}
