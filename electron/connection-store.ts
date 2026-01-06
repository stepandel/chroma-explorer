import Store from 'electron-store'
import { ConnectionProfile } from './types.js'

interface StoreSchema {
  profiles: ConnectionProfile[]
  lastActiveProfileId: string | null
}

const store = new Store<StoreSchema>({
  name: 'chroma-connections',
  defaults: {
    profiles: [],
    lastActiveProfileId: null,
  },
  encryptionKey: 'chroma-explorer-obfuscation-key-v1',
})

export class ConnectionStore {
  getProfiles(): ConnectionProfile[] {
    return store.get('profiles', [])
  }

  saveProfile(profile: ConnectionProfile): void {
    const profiles = this.getProfiles()
    const existingIndex = profiles.findIndex((p) => p.id === profile.id)

    if (existingIndex >= 0) {
      // Update existing profile
      profiles[existingIndex] = { ...profile, lastUsed: Date.now() }
    } else {
      // Add new profile
      profiles.push({ ...profile, createdAt: Date.now(), lastUsed: Date.now() })
    }

    store.set('profiles', profiles)
  }

  deleteProfile(id: string): void {
    const profiles = this.getProfiles().filter((p) => p.id !== id)
    store.set('profiles', profiles)

    // Clear last active if it was the deleted profile
    if (this.getLastActiveProfileId() === id) {
      this.setLastActiveProfileId(null)
    }
  }

  getLastActiveProfileId(): string | null {
    return store.get('lastActiveProfileId', null)
  }

  setLastActiveProfileId(id: string | null): void {
    store.set('lastActiveProfileId', id)
  }
}

export const connectionStore = new ConnectionStore()
