import { app, BrowserWindow, ipcMain, Menu, MenuItemConstructorOptions } from 'electron'
import path from 'node:path'

// Set app name before anything else (affects menu bar, about dialog, etc.)
const isReleaseBuild = process.env.CHROMA_EXPLORER_RELEASE === '1'
app.name = isReleaseBuild ? 'Chroma Explorer' : 'Chroma Explorer Dev'
if (process.env.CHROMA_EXPLORER_USER_DATA_DIR) {
  app.setPath('userData', process.env.CHROMA_EXPLORER_USER_DATA_DIR)
} else if (!isReleaseBuild) {
  app.setPath('userData', path.join(app.getPath('appData'), 'Chroma Explorer Dev'))
}
import { fileURLToPath } from 'node:url'
import { chromaDBConnectionPool } from './chromadb-service'
import { connectionStore } from './connection-store'
import { settingsStore, ApiKeys, Theme } from './settings-store'
import { windowManager } from './window-manager'
import { createApplicationMenu, updateThemeMenu } from './menu'
import { CopyProgress } from './types'
import {
  parseApiKeys,
  parseCollectionName,
  parseConnectionProfile,
  parseCopyCollectionParams,
  parseCreateCollectionParams,
  parseCreateDocumentParams,
  parseCreateDocumentsBatchParams,
  parseDeleteDocumentsParams,
  parseEmbeddingOverride,
  parseErrorReportingEnabled,
  parseProfileId,
  parseSearchDocumentsParams,
  parseTheme,
  parseUpdateDocumentParams,
} from './ipc-contract'
import { openValidatedExternalUrl } from './external-url'
import { initAutoUpdater, checkForUpdates } from './auto-updater'
import { initAnalytics, track } from './analytics'
import {
  getAddedApiKeyProviders,
  getConnectionAnalyticsProperties,
  isChromaCloudApiKeyAdded,
} from './analytics-events'
import { configureTransformersCache } from './transformers-cache'
import { captureMainError, initErrorMonitoring, setErrorMonitoringEnabled } from './error-monitoring'
import { showPaidUpdateNoticeOnStartup } from './paid-update-notice'

// Inject stored API keys into process.env at startup
configureTransformersCache()
settingsStore.injectIntoProcessEnv()
initErrorMonitoring(settingsStore.isErrorReportingEnabled())

// Track active copy operations per profile for cancellation
const activeCopyOperations: Map<string, AbortController> = new Map()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public')

function reportIpcError(error: unknown, operation: string, fallbackMessage: string) {
  captureMainError(error, { operation })
  const message = error instanceof Error ? error.message : fallbackMessage
  return { success: false, error: message }
}

// Set up IPC handlers
ipcMain.handle('chromadb:connect', async (_event, rawProfileId: unknown, rawProfile: unknown) => {
  try {
    const profileId = parseProfileId(rawProfileId)
    const profile = parseConnectionProfile(rawProfile)
    await chromaDBConnectionPool.connect(profileId, profile)
    track('chroma_connected', getConnectionAnalyticsProperties(profile))
    return { success: true }
  } catch (error) {
    return reportIpcError(error, 'chromadb.connect', 'Failed to connect to ChromaDB')
  }
})

ipcMain.handle('chromadb:listCollections', async (_event, rawProfileId: unknown) => {
  try {
    const profileId = parseProfileId(rawProfileId)
    const service = chromaDBConnectionPool.getConnection(profileId)
    if (!service) {
      return { success: false, error: 'Not connected to ChromaDB' }
    }
    const collections = await service.listCollections()
    return { success: true, data: collections }
  } catch (error) {
    return reportIpcError(error, 'chromadb.listCollections', 'Failed to fetch collections')
  }
})

ipcMain.handle('chromadb:getDocuments', async (_event, rawProfileId: unknown, rawCollectionName: unknown) => {
  try {
    const profileId = parseProfileId(rawProfileId)
    const collectionName = parseCollectionName(rawCollectionName)
    const service = chromaDBConnectionPool.getConnection(profileId)
    if (!service) {
      return { success: false, error: 'Not connected to ChromaDB' }
    }
    const documents = await service.getCollectionDocuments(collectionName)
    return { success: true, data: documents }
  } catch (error) {
    return reportIpcError(error, 'chromadb.getDocuments', 'Failed to fetch documents')
  }
})

ipcMain.handle('chromadb:searchDocuments', async (_event, rawProfileId: unknown, rawParams: unknown) => {
  try {
    const profileId = parseProfileId(rawProfileId)
    const params = parseSearchDocumentsParams(rawParams)
    const service = chromaDBConnectionPool.getConnection(profileId)
    if (!service) {
      return { success: false, error: 'Not connected to ChromaDB' }
    }
    // Check for user embedding override
    const embeddingOverride = connectionStore.getEmbeddingOverride(profileId, params.collectionName)
    const documents = await service.searchDocuments(params, embeddingOverride)
    return { success: true, data: documents }
  } catch (error) {
    return reportIpcError(error, 'chromadb.searchDocuments', 'Failed to search documents')
  }
})

ipcMain.handle('chromadb:updateDocument', async (_event, rawProfileId: unknown, rawParams: unknown) => {
  try {
    const profileId = parseProfileId(rawProfileId)
    const params = parseUpdateDocumentParams(rawParams)
    const service = chromaDBConnectionPool.getConnection(profileId)
    if (!service) {
      return { success: false, error: 'Not connected to ChromaDB' }
    }
    // Check for user embedding override (needed for regeneration)
    const embeddingOverride = connectionStore.getEmbeddingOverride(profileId, params.collectionName)
    await service.updateDocument(params, embeddingOverride)
    track('document_updated')
    return { success: true }
  } catch (error) {
    return reportIpcError(error, 'chromadb.updateDocument', 'Failed to update document')
  }
})

ipcMain.handle('chromadb:createDocument', async (_event, rawProfileId: unknown, rawParams: unknown) => {
  try {
    const profileId = parseProfileId(rawProfileId)
    const params = parseCreateDocumentParams(rawParams)
    const service = chromaDBConnectionPool.getConnection(profileId)
    if (!service) {
      return { success: false, error: 'Not connected to ChromaDB' }
    }
    // Check for user embedding override (needed for embedding generation)
    const embeddingOverride = connectionStore.getEmbeddingOverride(profileId, params.collectionName)
    await service.createDocument(params, embeddingOverride)
    track('document_created')
    return { success: true }
  } catch (error) {
    return reportIpcError(error, 'chromadb.createDocument', 'Failed to create document')
  }
})

ipcMain.handle('chromadb:deleteDocuments', async (_event, rawProfileId: unknown, rawParams: unknown) => {
  try {
    const profileId = parseProfileId(rawProfileId)
    const params = parseDeleteDocumentsParams(rawParams)
    const service = chromaDBConnectionPool.getConnection(profileId)
    if (!service) {
      return { success: false, error: 'Not connected to ChromaDB' }
    }
    await service.deleteDocuments(params)
    track('documents_deleted', {
      count: params.ids.length
    })
    return { success: true }
  } catch (error) {
    return reportIpcError(error, 'chromadb.deleteDocuments', 'Failed to delete documents')
  }
})

ipcMain.handle('chromadb:createDocumentsBatch', async (_event, rawProfileId: unknown, rawParams: unknown) => {
  try {
    const profileId = parseProfileId(rawProfileId)
    const params = parseCreateDocumentsBatchParams(rawParams)
    const service = chromaDBConnectionPool.getConnection(profileId)
    if (!service) {
      return { success: false, error: 'Not connected to ChromaDB' }
    }
    // Check for user embedding override
    const embeddingOverride = connectionStore.getEmbeddingOverride(profileId, params.collectionName)
    const result = await service.createDocumentsBatch(params, embeddingOverride)
    track('documents_imported', {
      count: params.documents.length
    })
    return { success: true, data: result }
  } catch (error) {
    return reportIpcError(error, 'chromadb.createDocumentsBatch', 'Failed to create documents')
  }
})

ipcMain.handle('chromadb:createCollection', async (_event, rawProfileId: unknown, rawParams: unknown) => {
  try {
    const profileId = parseProfileId(rawProfileId)
    const params = parseCreateCollectionParams(rawParams)
    const service = chromaDBConnectionPool.getConnection(profileId)
    if (!service) {
      return { success: false, error: 'Not connected to ChromaDB' }
    }
    const collection = await service.createCollection(params)
    const metadataDistance = params.metadata?.['hnsw:space']
    track('collection_created', {
      distanceFunction: typeof metadataDistance === 'string' ? metadataDistance : params.hnsw?.space || 'default'
    })
    return { success: true, data: collection }
  } catch (error) {
    return reportIpcError(error, 'chromadb.createCollection', 'Failed to create collection')
  }
})

ipcMain.handle('chromadb:deleteCollection', async (_event, rawProfileId: unknown, rawCollectionName: unknown) => {
  try {
    const profileId = parseProfileId(rawProfileId)
    const collectionName = parseCollectionName(rawCollectionName)
    const service = chromaDBConnectionPool.getConnection(profileId)
    if (!service) {
      return { success: false, error: 'Not connected to ChromaDB' }
    }
    await service.deleteCollection(collectionName)
    track('collection_deleted')
    return { success: true }
  } catch (error) {
    return reportIpcError(error, 'chromadb.deleteCollection', 'Failed to delete collection')
  }
})

ipcMain.handle('chromadb:copyCollection', async (event, rawProfileId: unknown, rawParams: unknown) => {
  let profileId = ''
  try {
    profileId = parseProfileId(rawProfileId)
    const params = parseCopyCollectionParams(rawParams)
    const service = chromaDBConnectionPool.getConnection(profileId)
    if (!service) {
      return { success: false, error: 'Not connected to ChromaDB' }
    }

    // Create abort controller for this copy operation
    const abortController = new AbortController()
    activeCopyOperations.set(profileId, abortController)

    // Check for user embedding override
    const embeddingOverride = connectionStore.getEmbeddingOverride(profileId, params.sourceCollectionName)

    // Progress callback sends updates to renderer
    const onProgress = (progress: CopyProgress) => {
      event.sender.send('chromadb:copyProgress', progress)
    }

    const result = await service.copyCollection(params, embeddingOverride, onProgress, abortController.signal)

    // Clean up abort controller
    activeCopyOperations.delete(profileId)

    if (result.success) {
      track('collection_duplicated', {
        documentsCopied: result.copiedDocuments
      })
    }

    return { success: result.success, data: result, error: result.error }
  } catch (error) {
    activeCopyOperations.delete(profileId)
    return reportIpcError(error, 'chromadb.copyCollection', 'Failed to copy collection')
  }
})

ipcMain.handle('chromadb:cancelCopy', async (_event, rawProfileId: unknown) => {
  const profileId = parseProfileId(rawProfileId)
  const controller = activeCopyOperations.get(profileId)
  if (controller) {
    controller.abort()
    activeCopyOperations.delete(profileId)
    return { success: true }
  }
  return { success: false, error: 'No active copy operation' }
})

// Context menu IPC handlers
ipcMain.on('context-menu:show-collection', (event, collectionName: string, options?: { hasCopiedCollection?: boolean }) => {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'Copy Collection',
      click: () => event.sender.send('context-menu:action', { action: 'copy', collectionName })
    },
    {
      label: 'Paste Collection',
      enabled: options?.hasCopiedCollection ?? false,
      click: () => event.sender.send('context-menu:action', { action: 'paste', collectionName })
    },
    { type: 'separator' },
    {
      label: 'Delete Collection',
      click: () => event.sender.send('context-menu:action', { action: 'delete', collectionName })
    }
  ]
  const menu = Menu.buildFromTemplate(template)
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    menu.popup({ window: win })
  }
})

ipcMain.on('context-menu:show-collection-panel', (event, options?: { hasCopiedCollection?: boolean }) => {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'Paste Collection',
      enabled: options?.hasCopiedCollection ?? false,
      click: () => event.sender.send('context-menu:action', { action: 'paste', collectionName: '' })
    }
  ]
  const menu = Menu.buildFromTemplate(template)
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    menu.popup({ window: win })
  }
})

// Document context menu handlers
ipcMain.on('context-menu:show-document', (event, documentId: string, options?: { hasCopiedDocuments?: boolean }) => {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'Copy',
      click: () => event.sender.send('context-menu:document-action', { action: 'copy', documentId })
    },
    {
      label: 'Paste',
      enabled: options?.hasCopiedDocuments ?? false,
      click: () => event.sender.send('context-menu:document-action', { action: 'paste', documentId })
    },
    { type: 'separator' },
    {
      label: 'Delete',
      click: () => event.sender.send('context-menu:document-action', { action: 'delete', documentId })
    }
  ]
  const menu = Menu.buildFromTemplate(template)
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    menu.popup({ window: win })
  }
})

ipcMain.on('context-menu:show-documents-panel', (event, options?: { hasCopiedDocuments?: boolean }) => {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'Paste',
      enabled: options?.hasCopiedDocuments ?? false,
      click: () => event.sender.send('context-menu:document-action', { action: 'paste' })
    }
  ]
  const menu = Menu.buildFromTemplate(template)
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    menu.popup({ window: win })
  }
})

// Profile context menu handler
ipcMain.on('context-menu:show-profile', (event, profileId: string) => {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'Connect',
      click: () => event.sender.send('context-menu:profile-action', { action: 'connect', profileId })
    },
    {
      label: 'Edit',
      click: () => event.sender.send('context-menu:profile-action', { action: 'edit', profileId })
    },
    { type: 'separator' },
    {
      label: 'Delete',
      click: () => event.sender.send('context-menu:profile-action', { action: 'delete', profileId })
    }
  ]
  const menu = Menu.buildFromTemplate(template)
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    menu.popup({ window: win })
  }
})

// Profile management IPC handlers
ipcMain.handle('profiles:getAll', async () => {
  try {
    const profiles = connectionStore.getProfiles()
    return { success: true, data: profiles }
  } catch (error) {
    return reportIpcError(error, 'profiles.getAll', 'Failed to fetch profiles')
  }
})

ipcMain.handle('profiles:save', async (_event, rawProfile: unknown) => {
  try {
    const profile = parseConnectionProfile(rawProfile)
    const previousProfile = connectionStore.getProfiles().find((p) => p.id === profile.id)
    connectionStore.saveProfile(profile)
    if (isChromaCloudApiKeyAdded(previousProfile, profile)) {
      track('api_key_added', { provider: 'chroma-cloud' })
    }
    return { success: true }
  } catch (error) {
    return reportIpcError(error, 'profiles.save', 'Failed to save profile')
  }
})

ipcMain.handle('profiles:delete', async (_event, rawId: unknown) => {
  try {
    const id = parseProfileId(rawId)
    connectionStore.deleteProfile(id)
    return { success: true }
  } catch (error) {
    return reportIpcError(error, 'profiles.delete', 'Failed to delete profile')
  }
})

ipcMain.handle('profiles:getLastActive', async () => {
  try {
    const id = connectionStore.getLastActiveProfileId()
    return { success: true, data: id }
  } catch (error) {
    return reportIpcError(error, 'profiles.getLastActive', 'Failed to fetch last active profile')
  }
})

ipcMain.handle('profiles:setLastActive', async (_event, rawId: unknown) => {
  try {
    const id = rawId === null ? null : parseProfileId(rawId)
    connectionStore.setLastActiveProfileId(id)
    return { success: true }
  } catch (error) {
    return reportIpcError(error, 'profiles.setLastActive', 'Failed to set last active profile')
  }
})

ipcMain.handle('profiles:getEmbeddingOverride', async (_event, rawProfileId: unknown, rawCollectionName: unknown) => {
  try {
    const profileId = parseProfileId(rawProfileId)
    const collectionName = parseCollectionName(rawCollectionName)
    const override = connectionStore.getEmbeddingOverride(profileId, collectionName)
    return { success: true, data: override }
  } catch (error) {
    return reportIpcError(error, 'profiles.getEmbeddingOverride', 'Failed to get embedding override')
  }
})

ipcMain.handle('profiles:setEmbeddingOverride', async (_event, rawProfileId: unknown, rawCollectionName: unknown, rawOverride: unknown) => {
  try {
    const profileId = parseProfileId(rawProfileId)
    const collectionName = parseCollectionName(rawCollectionName)
    const override = parseEmbeddingOverride(rawOverride)
    connectionStore.setEmbeddingOverride(profileId, collectionName, override)
    return { success: true }
  } catch (error) {
    return reportIpcError(error, 'profiles.setEmbeddingOverride', 'Failed to set embedding override')
  }
})

ipcMain.handle('profiles:clearEmbeddingOverride', async (_event, rawProfileId: unknown, rawCollectionName: unknown) => {
  try {
    const profileId = parseProfileId(rawProfileId)
    const collectionName = parseCollectionName(rawCollectionName)
    connectionStore.clearEmbeddingOverride(profileId, collectionName)
    return { success: true }
  } catch (error) {
    return reportIpcError(error, 'profiles.clearEmbeddingOverride', 'Failed to clear embedding override')
  }
})

// Window management IPC handlers
ipcMain.handle('window:create-connection', async (_event, rawProfile: unknown) => {
  try {
    const profile = parseConnectionProfile(rawProfile)
    const { window: win, windowId } = windowManager.createConnectionWindow(profile)
    return { success: true, data: { windowId } }
  } catch (error) {
    return reportIpcError(error, 'window.createConnection', 'Failed to create connection window')
  }
})

ipcMain.handle('window:get-info', async (event) => {
  try {
    // Get the window that made the request
    const webContents = event.sender
    const win = BrowserWindow.fromWebContents(webContents)

    if (!win) {
      return { success: false, error: 'Window not found' }
    }

    // Check if it's a connection window
    for (const { windowId, window: w, profileId } of windowManager.getAllConnectionWindows()) {
      if (w === win) {
        return {
          success: true,
          data: {
            type: 'connection',
            windowId,
            profileId,
          },
        }
      }
    }

    // Check if it's the setup window
    if (win === windowManager.getSetupWindow()) {
      return {
        success: true,
        data: {
          type: 'setup',
        },
      }
    }

    return { success: false, error: 'Window type unknown' }
  } catch (error) {
    return reportIpcError(error, 'window.getInfo', 'Failed to get window info')
  }
})

ipcMain.handle('window:close-current', async (event) => {
  try {
    const webContents = event.sender
    const win = BrowserWindow.fromWebContents(webContents)

    if (!win) {
      return { success: false, error: 'Window not found' }
    }

    win.close()
    return { success: true }
  } catch (error) {
    return reportIpcError(error, 'window.closeCurrent', 'Failed to close window')
  }
})

ipcMain.handle('window:get-profile', async (_event, rawProfileId: unknown) => {
  try {
    const profileId = parseProfileId(rawProfileId)
    // Try to get from cache first (for unsaved profiles)
    const cachedProfile = windowManager.getCachedProfile(profileId)
    if (cachedProfile) {
      return { success: true, data: cachedProfile }
    }

    // Fall back to saved profiles
    const profiles = connectionStore.getProfiles()
    const profile = profiles.find(p => p.id === profileId)

    if (!profile) {
      return { success: false, error: `Profile not found: ${profileId}` }
    }

    return { success: true, data: profile }
  } catch (error) {
    return reportIpcError(error, 'window.getProfile', 'Failed to get profile')
  }
})

ipcMain.handle('window:open-developer-message', async () => {
  try {
    windowManager.createDeveloperMessageWindow()
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to open developer message'
    return { success: false, error: message }
  }
})

// Settings IPC handlers
ipcMain.handle('settings:getApiKeys', async () => {
  try {
    const apiKeys = settingsStore.getApiKeys()
    return { success: true, data: apiKeys }
  } catch (error) {
    return reportIpcError(error, 'settings.getApiKeys', 'Failed to get API keys')
  }
})

ipcMain.handle('settings:setApiKeys', async (_event, rawApiKeys: unknown) => {
  try {
    const previousApiKeys = settingsStore.getApiKeys()
    const apiKeys: ApiKeys = parseApiKeys(rawApiKeys)
    settingsStore.setApiKeys(apiKeys)
    for (const provider of getAddedApiKeyProviders(previousApiKeys, apiKeys)) {
      track('api_key_added', { provider })
    }
    return { success: true }
  } catch (error) {
    return reportIpcError(error, 'settings.setApiKeys', 'Failed to save API keys')
  }
})

ipcMain.handle('settings:getTheme', async () => {
  try {
    const theme = settingsStore.getTheme()
    return { success: true, data: theme }
  } catch (error) {
    return reportIpcError(error, 'settings.getTheme', 'Failed to get theme')
  }
})

ipcMain.handle('settings:setTheme', async (event, rawTheme: unknown) => {
  try {
    const theme: Theme = parseTheme(rawTheme)
    settingsStore.setTheme(theme)
    // Broadcast theme change to all windows except the sender
    const senderWindow = BrowserWindow.fromWebContents(event.sender)
    BrowserWindow.getAllWindows().forEach(win => {
      if (win !== senderWindow) {
        win.webContents.send('settings:theme-changed', theme)
      }
    })
    // Update menu to reflect new theme selection
    updateThemeMenu()
    return { success: true }
  } catch (error) {
    return reportIpcError(error, 'settings.setTheme', 'Failed to set theme')
  }
})

ipcMain.handle('settings:getErrorReportingEnabled', async () => {
  try {
    return { success: true, data: settingsStore.isErrorReportingEnabled() }
  } catch (error) {
    return reportIpcError(error, 'settings.getErrorReportingEnabled', 'Failed to get error reporting setting')
  }
})

ipcMain.handle('settings:setErrorReportingEnabled', async (event, rawEnabled: unknown) => {
  try {
    const enabled = parseErrorReportingEnabled(rawEnabled)
    settingsStore.setErrorReportingEnabled(enabled)
    setErrorMonitoringEnabled(enabled)

    const senderWindow = BrowserWindow.fromWebContents(event.sender)
    BrowserWindow.getAllWindows().forEach(win => {
      if (win !== senderWindow) {
        win.webContents.send('settings:error-reporting-changed', enabled)
      }
    })

    return { success: true }
  } catch (error) {
    return reportIpcError(error, 'settings.setErrorReportingEnabled', 'Failed to set error reporting setting')
  }
})

ipcMain.handle('settings:openWindow', async () => {
  try {
    windowManager.createSettingsWindow()
    return { success: true }
  } catch (error) {
    return reportIpcError(error, 'settings.openWindow', 'Failed to open settings')
  }
})

// Shell IPC handlers
ipcMain.handle('shell:openExternal', async (_event, rawUrl: unknown) => {
  try {
    await openValidatedExternalUrl(rawUrl)
    return { success: true }
  } catch (error) {
    return reportIpcError(error, 'shell.openExternal', 'Failed to open URL')
  }
})


// Initialize analytics BEFORE app.whenReady() as required by Aptabase SDK
initAnalytics()

app.whenReady().then(() => {
  track('app_started')

  // Create application menu
  createApplicationMenu()

  // Initialize auto-updater
  initAutoUpdater()

  // Create setup window
  windowManager.createSetupWindow()

  setTimeout(() => {
    showPaidUpdateNoticeOnStartup().catch(error => {
      captureMainError(error, { operation: 'paidUpdateNotice.showOnStartup' })
    })
  }, 1200)

  // Check for updates after a short delay (only in production)
  if (app.isPackaged) {
    setTimeout(() => {
      checkForUpdates()
    }, 3000)
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  track('app_closed')
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    windowManager.createSetupWindow()
  }
})
