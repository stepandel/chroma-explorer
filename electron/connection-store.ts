import Store from 'electron-store'
import { app } from 'electron'
import path from 'path'
import { existsSync, unlinkSync } from 'fs'
import { ConnectionProfile, EmbeddingFunctionOverride } from './types'
import { getEncryptionKey } from './secure-key-manager'

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
      name: 'chroma-connections-v2', // New name to avoid conflicts with old unreadable data
      defaults: {
        profiles: [],
        lastActiveProfileId: null,
        embeddingOverrides: {},
      },
      encryptionKey: getEncryptionKey(),
    })

    // Migrate from old store if it exists and new store is empty
    migrateFromLegacyStore()
  }
  return store
}

/**
 * Migrate data from the old hardcoded-key store to the new secure store.
 * This runs once when the new store is first created.
 */
function migrateFromLegacyStore(): void {
  if (!store) return

  // Only migrate if new store is empty
  const currentProfiles = store.get('profiles', [])
  if (currentProfiles.length > 0) return

  // Check if legacy store file exists before attempting migration
  const legacyPath = path.join(app.getPath('userData'), 'chroma-connections.json')
  if (!existsSync(legacyPath)) {
    return // No legacy store to migrate
  }

  try {
    // Try to read from old store (with hardcoded key)
    const legacyStore = new Store<StoreSchema>({
      name: 'chroma-connections',
      defaults: {
        profiles: [],
        lastActiveProfileId: null,
        embeddingOverrides: {},
      },
      encryptionKey: 'chroma-explorer-obfuscation-key-v1',
    })

    const legacyProfiles = legacyStore.get('profiles', [])
    const legacyLastActive = legacyStore.get('lastActiveProfileId', null)
    const legacyOverrides = legacyStore.get('embeddingOverrides', {})

    if (legacyProfiles.length > 0) {
      console.log(`[ConnectionStore] Migrating ${legacyProfiles.length} profiles from legacy store`)
      store.set('profiles', legacyProfiles)
      store.set('lastActiveProfileId', legacyLastActive)
      store.set('embeddingOverrides', legacyOverrides)

      // Clear legacy store after successful migration
      legacyStore.clear()
      console.log('[ConnectionStore] Migration complete, legacy store cleared')
    }
  } catch (error) {
    // Migration failed - likely encryption key mismatch or corrupted file
    // Delete the legacy file so we don't keep trying
    console.warn('[ConnectionStore] Could not migrate legacy store, removing it')
    try {
      unlinkSync(legacyPath)
    } catch {
      // Ignore deletion errors
    }
  }
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
