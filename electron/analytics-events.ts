import type { ConnectionProfile } from './types'
import type { ApiKeys } from './settings-store'

export type ConnectionMode = 'local' | 'hosted'
export type ConnectionType = 'cloud' | 'self-hosted'

interface ApiKeyProvider {
  provider: string
  keyFields: (keyof ApiKeys)[]
}

const API_KEY_PROVIDERS: ApiKeyProvider[] = [
  { provider: 'openai', keyFields: ['OPENAI_API_KEY'] },
  { provider: 'cohere', keyFields: ['COHERE_API_KEY'] },
  { provider: 'google-gemini', keyFields: ['GEMINI_API_KEY'] },
  { provider: 'jina', keyFields: ['JINA_API_KEY'] },
  { provider: 'mistral', keyFields: ['MISTRAL_API_KEY'] },
  { provider: 'voyageai', keyFields: ['VOYAGE_API_KEY'] },
  { provider: 'together-ai', keyFields: ['TOGETHER_API_KEY'] },
  { provider: 'cloudflare', keyFields: ['CLOUDFLARE_API_KEY'] },
  { provider: 'morph', keyFields: ['MORPH_API_KEY'] },
]

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

function hasValue(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

export function getAddedApiKeyProviders(previous: ApiKeys, next: ApiKeys): string[] {
  const addedProviders = new Set<string>()

  for (const { provider, keyFields } of API_KEY_PROVIDERS) {
    const wasAdded = keyFields.some((key) => !hasValue(previous[key]) && hasValue(next[key]))

    if (wasAdded) {
      addedProviders.add(provider)
    }
  }

  return Array.from(addedProviders)
}

export function isChromaCloudApiKeyAdded(previous: ConnectionProfile | undefined, next: ConnectionProfile): boolean {
  return inferConnectionType(next) === 'cloud' && !hasValue(previous?.apiKey) && hasValue(next.apiKey)
}
