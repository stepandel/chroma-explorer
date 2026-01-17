import Store from 'electron-store'
import { app } from 'electron'
import path from 'path'
import { existsSync, unlinkSync } from 'fs'
import { ConnectionProfile, EmbeddingFunctionOverride } from './types'
import { getEncryptionKey } from './secure-key-manager'

// Delete legacy store files encrypted with the old hardcoded key
function deleteLegacyStore(): void {
  try {
    const legacyPath = path.join(app.getPath('userData'), 'chroma-connections.json')
    if (existsSync(legacyPath)) {
      unlinkSync(legacyPath)
      console.log('[ConnectionStore] Deleted legacy store file')
    }
  } catch {
    // Ignore errors
  }
}

interface StoreSchema {
  profiles: ConnectionProfile[]
  lastActiveProfileId: string | null
  // Store overrides separately so they persist even for unsaved profiles
  // Key format: "profileId:collectionName"
  embeddingOverrides: Record<string, EmbeddingFunctionOverride>
}

// Lazy-initialized store (requires app to be ready for keychain access)
let store: Store<StoreSchema> | null = null

function getStore(): Store<StoreSchema> {
  if (!store) {
    store = new Store<StoreSchema>({
      name: 'chroma-connections-v2',
      defaults: {
        profiles: [],
        lastActiveProfileId: null,
        embeddingOverrides: {},
      },
      encryptionKey: getEncryptionKey(),
    })
    deleteLegacyStore()
  }
  return store
}

export class ConnectionStore {
  getProfiles(): ConnectionProfile[] {
    return getStore().get('profiles', [])
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

    getStore().set('profiles', profiles)
  }

  deleteProfile(id: string): void {
    const profiles = this.getProfiles().filter((p) => p.id !== id)
    getStore().set('profiles', profiles)

    // Clear last active if it was the deleted profile
    if (this.getLastActiveProfileId() === id) {
      this.setLastActiveProfileId(null)
    }
  }

  getLastActiveProfileId(): string | null {
    return getStore().get('lastActiveProfileId', null)
  }

  setLastActiveProfileId(id: string | null): void {
    getStore().set('lastActiveProfileId', id)
  }

  getEmbeddingOverride(profileId: string, collectionName: string): EmbeddingFunctionOverride | null {
    const key = `${profileId}:${collectionName}`
    const overrides = getStore().get('embeddingOverrides', {})
    return overrides[key] ?? null
  }

  setEmbeddingOverride(profileId: string, collectionName: string, override: EmbeddingFunctionOverride): void {
    const key = `${profileId}:${collectionName}`
    const overrides = getStore().get('embeddingOverrides', {})
    overrides[key] = override
    getStore().set('embeddingOverrides', overrides)
  }

  clearEmbeddingOverride(profileId: string, collectionName: string): void {
    const key = `${profileId}:${collectionName}`
    const overrides = getStore().get('embeddingOverrides', {})
    delete overrides[key]
    getStore().set('embeddingOverrides', overrides)
  }
}

export const connectionStore = new ConnectionStore()
