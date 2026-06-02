import type { ConnectionProfile } from './types'

export type ConnectionMode = 'local' | 'hosted'
export type ConnectionType = 'cloud' | 'self-hosted'

function inferConnectionType(profile: ConnectionProfile): ConnectionType {
  if (profile.connectionType) return profile.connectionType

  try {
    return new URL(profile.url).hostname.endsWith('trychroma.com') ? 'cloud' : 'self-hosted'
  } catch {
    return 'self-hosted'
  }
}

function isLocalHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase()

  return (
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    normalized === '::1' ||
    normalized === '0.0.0.0' ||
    normalized.startsWith('127.')
  )
}

export function getConnectionAnalyticsProperties(profile: ConnectionProfile): {
  connection_type: ConnectionType
  connection_mode: ConnectionMode
} {
  const connectionType = inferConnectionType(profile)

  if (connectionType === 'cloud') {
    return {
      connection_type: connectionType,
      connection_mode: 'hosted',
    }
  }

  try {
    const { hostname } = new URL(profile.url)
    return {
      connection_type: connectionType,
      connection_mode: isLocalHostname(hostname) ? 'local' : 'hosted',
    }
  } catch {
    return {
      connection_type: connectionType,
      connection_mode: 'hosted',
    }
  }
}
