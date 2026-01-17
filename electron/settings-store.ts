import Store from 'electron-store'
import { app } from 'electron'
import path from 'path'
import { existsSync } from 'fs'
import { getEncryptionKey } from './secure-key-manager'

// Migrate data from legacy v1 store (hardcoded key) to v2 store (keychain)
function migrateFromLegacyStore(newStore: Store<SettingsSchema>): void {
  // Only migrate if new store is empty
  const currentKeys = newStore.get('apiKeys', {})
  if (Object.keys(currentKeys).length > 0) return

  // Check if legacy store file exists
  const legacyPath = path.join(app.getPath('userData'), 'chroma-settings.json')
  if (!existsSync(legacyPath)) return

  try {
    const legacyStore = new Store<SettingsSchema>({
      name: 'chroma-settings',
      defaults: { apiKeys: {} },
      encryptionKey: 'chroma-explorer-settings-key-v1',
    })

    const legacyKeys = legacyStore.get('apiKeys', {})

    if (Object.keys(legacyKeys).length > 0) {
      console.log('[SettingsStore] Migrating API keys from legacy store')
      newStore.set('apiKeys', legacyKeys)
      legacyStore.clear()
      console.log('[SettingsStore] Migration complete')
    }
  } catch (error) {
    console.warn('[SettingsStore] Could not migrate from legacy store:', error)
  }
}

export interface ApiKeys {
  OPENAI_API_KEY?: string
  COHERE_API_KEY?: string
  GEMINI_API_KEY?: string
  JINA_API_KEY?: string
  MISTRAL_API_KEY?: string
  VOYAGE_API_KEY?: string
  TOGETHER_API_KEY?: string
  CLOUDFLARE_ACCOUNT_ID?: string
  CLOUDFLARE_API_KEY?: string
  MORPH_API_KEY?: string
}

interface SettingsSchema {
  apiKeys: ApiKeys
}

// Lazy-initialized store (requires app to be ready for keychain access)
let store: Store<SettingsSchema> | null = null

function getStore(): Store<SettingsSchema> {
  if (!store) {
    store = new Store<SettingsSchema>({
      name: 'chroma-settings-v2',
      defaults: {
        apiKeys: {},
      },
      encryptionKey: getEncryptionKey(),
    })
    migrateFromLegacyStore(store)
  }
  return store
}

export class SettingsStore {
  getApiKeys(): ApiKeys {
    return getStore().get('apiKeys', {})
  }

  setApiKeys(keys: ApiKeys): void {
    getStore().set('apiKeys', keys)
    this.injectIntoProcessEnv()
  }

  setApiKey(envVar: keyof ApiKeys, value: string | undefined): void {
    const apiKeys = this.getApiKeys()
    if (value) {
      apiKeys[envVar] = value
    } else {
      delete apiKeys[envVar]
    }
    getStore().set('apiKeys', apiKeys)
    this.injectIntoProcessEnv()
  }

  // Inject all stored API keys into process.env
  injectIntoProcessEnv(): void {
    const apiKeys = this.getApiKeys()
    for (const [key, value] of Object.entries(apiKeys)) {
      if (value) {
        process.env[key] = value
      }
    }
  }
}

export const settingsStore = new SettingsStore()
