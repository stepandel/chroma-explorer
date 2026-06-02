import { describe, expect, it } from 'vitest'
import {
  getAddedApiKeyProviders,
  getConnectionAnalyticsProperties,
  isChromaCloudApiKeyAdded,
} from '../../electron/analytics-events'
import type { ConnectionProfile } from '../../electron/types'

function profile(overrides: Partial<ConnectionProfile>): ConnectionProfile {
  return {
    id: 'profile-id',
    name: 'Profile',
    url: 'http://localhost:8000',
    createdAt: 1,
    ...overrides,
  }
}

describe('analytics event helpers', () => {
  it('classifies localhost self-hosted connections as local', () => {
    expect(getConnectionAnalyticsProperties(profile({
      connectionType: 'self-hosted',
      url: 'http://localhost:8000',
    }))).toEqual({
      connection_type: 'self-hosted',
      connection_mode: 'local',
    })
  })

  it('classifies remote self-hosted connections as hosted', () => {
    expect(getConnectionAnalyticsProperties(profile({
      connectionType: 'self-hosted',
      url: 'https://db.example.com',
    }))).toEqual({
      connection_type: 'self-hosted',
      connection_mode: 'hosted',
    })
  })

  it('classifies Chroma Cloud connections as hosted without reading host details', () => {
    expect(getConnectionAnalyticsProperties(profile({
      connectionType: 'cloud',
      url: 'https://api.trychroma.com',
    }))).toEqual({
      connection_type: 'cloud',
      connection_mode: 'hosted',
    })
  })

  it('reports newly added settings API key providers once per provider', () => {
    expect(getAddedApiKeyProviders(
      { OPENAI_API_KEY: '', COHERE_API_KEY: 'existing' },
      { OPENAI_API_KEY: 'new-key', COHERE_API_KEY: 'changed', CLOUDFLARE_ACCOUNT_ID: 'account' }
    )).toEqual(['openai'])
  })

  it('reports Chroma Cloud API keys only when they are newly added', () => {
    expect(isChromaCloudApiKeyAdded(undefined, profile({
      connectionType: 'cloud',
      apiKey: 'new-key',
    }))).toBe(true)

    expect(isChromaCloudApiKeyAdded(profile({
      connectionType: 'cloud',
      apiKey: 'old-key',
    }), profile({
      connectionType: 'cloud',
      apiKey: 'new-key',
    }))).toBe(false)
  })
})
