import { safeStorage, app } from 'electron'
import { randomBytes, createHash } from 'crypto'
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs'
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
 * Fallback behavior:
 * - If keychain access is denied, uses a deterministic fallback key
 * - The fallback key is derived from app path + bundle ID for consistency
 * - This ensures data remains readable even when keychain is denied
 *
 * Keychain access persists across app updates because:
 * - macOS ties access to bundle ID + code signing identity
 * - As long as appId stays 'com.chromaexplorer.app' and same cert is used, no re-prompts
 */

const KEY_FILE_NAME = 'encryption-key.enc'
const KEY_LENGTH = 32 // 256 bits
const FALLBACK_KEY_PREFIX = 'chroma-explorer-fallback-v2'

let cachedKey: string | null = null
let keychainAccessDenied = false

function getKeyFilePath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, KEY_FILE_NAME)
}

function generateRandomKey(): string {
  return randomBytes(KEY_LENGTH).toString('hex')
}

/**
 * Generates a deterministic fallback key based on app location.
 * This ensures the same key is used across sessions when keychain is denied.
 * Note: This is less secure than keychain but prevents crashes and data loss.
 */
function getDeterministicFallbackKey(): string {
  // Use app path + bundle ID to create a machine-specific but deterministic key
  const appPath = app.getAppPath()
  const bundleId = 'com.chromaexplorer.app'
  const seed = `${FALLBACK_KEY_PREFIX}:${appPath}:${bundleId}`
  return createHash('sha256').update(seed).digest('hex')
}

/**
 * Gets or creates the encryption key.
 * Uses OS keychain for secure storage - user is prompted once on first access.
 * Falls back gracefully if keychain access is denied.
 *
 * @returns The encryption key as a hex string
 */
export function getEncryptionKey(): string {
  // Return cached key if available (avoid repeated keychain access)
  if (cachedKey) {
    return cachedKey
  }

  // If we know keychain was denied, use fallback immediately
  if (keychainAccessDenied) {
    cachedKey = getDeterministicFallbackKey()
    return cachedKey
  }

  // Check if safeStorage is available
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn('[SecureKeyManager] safeStorage not available, using fallback key')
    cachedKey = getDeterministicFallbackKey()
    return cachedKey
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

      // Check if this is a keychain access denial
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('denied') || errorMessage.includes('canceled') || errorMessage.includes('user refused')) {
        console.warn('[SecureKeyManager] Keychain access denied, using fallback key')
        keychainAccessDenied = true
        cachedKey = getDeterministicFallbackKey()
        return cachedKey
      }

      // Key file exists but can't be decrypted - might be corruption
      // Try to remove and regenerate
      console.warn('[SecureKeyManager] Removing corrupted key file')
      try {
        unlinkSync(keyFilePath)
      } catch {
        // Ignore deletion errors
      }
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

    // Check if this is a keychain access denial
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('denied') || errorMessage.includes('canceled') || errorMessage.includes('user refused')) {
      console.warn('[SecureKeyManager] Keychain access denied during encryption, using fallback key')
      keychainAccessDenied = true
      cachedKey = getDeterministicFallbackKey()
      return cachedKey
    }

    // Other error - use the new key in memory only (won't persist across restarts)
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
