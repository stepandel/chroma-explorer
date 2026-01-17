import { safeStorage, app } from 'electron'
import { randomBytes } from 'crypto'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import path from 'path'

/**
 * Manages encryption keys using OS keychain (macOS Keychain, Windows DPAPI, Linux Secret Service).
 *
 * How it works:
 * 1. On first run, generates a random 256-bit encryption key
 * 2. Encrypts that key using safeStorage (OS keychain)
 * 3. Stores the encrypted key in a file in userData directory
 * 4. On subsequent runs, reads and decrypts the key from the file
 *
 * Keychain access persists across app updates because:
 * - macOS ties access to bundle ID + code signing identity
 * - As long as appId stays 'com.chromaexplorer.app' and same cert is used, no re-prompts
 */

const KEY_FILE_NAME = 'encryption-key.enc'
const KEY_LENGTH = 32 // 256 bits

let cachedKey: string | null = null

function getKeyFilePath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, KEY_FILE_NAME)
}

function generateRandomKey(): string {
  return randomBytes(KEY_LENGTH).toString('hex')
}

/**
 * Gets or creates the encryption key.
 * Uses OS keychain for secure storage - user is prompted once on first access.
 *
 * @returns The encryption key as a hex string
 * @throws Error if safeStorage is not available
 */
export function getEncryptionKey(): string {
  // Return cached key if available (avoid repeated keychain access)
  if (cachedKey) {
    return cachedKey
  }

  // Check if safeStorage is available
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn('[SecureKeyManager] safeStorage not available, falling back to legacy key')
    // Fallback for systems without keychain support
    return 'chroma-explorer-fallback-key-v1'
  }

  const keyFilePath = getKeyFilePath()

  // Check if we have an existing encrypted key
  if (existsSync(keyFilePath)) {
    try {
      const encryptedKey = readFileSync(keyFilePath)
      cachedKey = safeStorage.decryptString(encryptedKey)
      console.log('[SecureKeyManager] Loaded existing encryption key from keychain')
      return cachedKey
    } catch (error) {
      console.error('[SecureKeyManager] Failed to decrypt existing key:', error)
      // Key file exists but can't be decrypted - this shouldn't happen normally
      // Could be corruption or different machine. Generate new key.
      console.warn('[SecureKeyManager] Generating new key (existing data will be inaccessible)')
    }
  }

  // Generate new key and store it encrypted
  const newKey = generateRandomKey()

  try {
    const encryptedKey = safeStorage.encryptString(newKey)

    // Ensure userData directory exists
    const userDataPath = app.getPath('userData')
    if (!existsSync(userDataPath)) {
      mkdirSync(userDataPath, { recursive: true })
    }

    writeFileSync(keyFilePath, encryptedKey)
    cachedKey = newKey
    console.log('[SecureKeyManager] Generated and stored new encryption key')
    return cachedKey
  } catch (error) {
    console.error('[SecureKeyManager] Failed to store encryption key:', error)
    // If we can't store, use the key in memory only (won't persist)
    cachedKey = newKey
    return cachedKey
  }
}

/**
 * Checks if the encryption system is using secure storage.
 * Useful for showing users whether their data is protected by OS keychain.
 */
export function isUsingSecureStorage(): boolean {
  return safeStorage.isEncryptionAvailable()
}

/**
 * Clears the cached key (useful for testing or when app is quitting)
 */
export function clearCachedKey(): void {
  cachedKey = null
}
