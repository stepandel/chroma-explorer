import { describe, expect, it } from 'vitest'
import { getConnectionAnalyticsProperties } from '../../electron/analytics-events'
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

})
