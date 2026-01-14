import 'dotenv/config'
import { app, BrowserWindow, ipcMain, Menu, MenuItemConstructorOptions, shell } from 'electron'

// Set app name before anything else (affects menu bar, about dialog, etc.)
app.name = 'Chroma Explorer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromaDBConnectionPool } from './chromadb-service'
import { connectionStore } from './connection-store'
import { settingsStore, ApiKeys } from './settings-store'
import { windowManager } from './window-manager'
import { createApplicationMenu } from './menu'
import { ConnectionProfile, SearchDocumentsParams, UpdateDocumentParams, CreateDocumentParams, DeleteDocumentsParams, CreateDocumentsBatchParams, CreateCollectionParams, CopyCollectionParams } from './types'
import { initAutoUpdater, checkForUpdates } from './auto-updater'

// Inject stored API keys into process.env at startup
settingsStore.injectIntoProcessEnv()

// Track active copy operations per profile for cancellation
const activeCopyOperations: Map<string, AbortController> = new Map()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public')

// Set up IPC handlers
ipcMain.handle('chromadb:connect', async (_event, profileId: string, profile: ConnectionProfile) => {
  try {
    await chromaDBConnectionPool.connect(profileId, profile)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to connect to ChromaDB'
    return { success: false, error: message }
  }
})

ipcMain.handle('chromadb:listCollections', async (_event, profileId: string) => {
  try {
    const service = chromaDBConnectionPool.getConnection(profileId)
    if (!service) {
      return { success: false, error: 'Not connected to ChromaDB' }
    }
    const collections = await service.listCollections()
    return { success: true, data: collections }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch collections'
    return { success: false, error: message }
  }
})

ipcMain.handle('chromadb:getDocuments', async (_event, profileId: string, collectionName: string) => {
  try {
    const service = chromaDBConnectionPool.getConnection(profileId)
    if (!service) {
      return { success: false, error: 'Not connected to ChromaDB' }
    }
    const documents = await service.getCollectionDocuments(collectionName)
    return { success: true, data: documents }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch documents'
    return { success: false, error: message }
  }
})

ipcMain.handle('chromadb:searchDocuments', async (_event, profileId: string, params: SearchDocumentsParams) => {
  try {
    const service = chromaDBConnectionPool.getConnection(profileId)
    if (!service) {
      return { success: false, error: 'Not connected to ChromaDB' }
    }
    // Check for user embedding override
    const embeddingOverride = connectionStore.getEmbeddingOverride(profileId, params.collectionName)
    const documents = await service.searchDocuments(params, embeddingOverride)
    return { success: true, data: documents }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to search documents'
    return { success: false, error: message }
  }
})

ipcMain.handle('chromadb:updateDocument', async (_event, profileId: string, params: UpdateDocumentParams) => {
  try {
    const service = chromaDBConnectionPool.getConnection(profileId)
    if (!service) {
      return { success: false, error: 'Not connected to ChromaDB' }
    }
    // Check for user embedding override (needed for regeneration)
    const embeddingOverride = connectionStore.getEmbeddingOverride(profileId, params.collectionName)
    await service.updateDocument(params, embeddingOverride)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update document'
    return { success: false, error: message }
  }
})

ipcMain.handle('chromadb:createDocument', async (_event, profileId: string, params: CreateDocumentParams) => {
  try {
    const service = chromaDBConnectionPool.getConnection(profileId)
    if (!service) {
      return { success: false, error: 'Not connected to ChromaDB' }
    }
    // Check for user embedding override (needed for embedding generation)
    const embeddingOverride = connectionStore.getEmbeddingOverride(profileId, params.collectionName)
    await service.createDocument(params, embeddingOverride)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create document'
    return { success: false, error: message }
  }
})

ipcMain.handle('chromadb:deleteDocuments', async (_event, profileId: string, params: DeleteDocumentsParams) => {
  try {
    const service = chromaDBConnectionPool.getConnection(profileId)
    if (!service) {
      return { success: false, error: 'Not connected to ChromaDB' }
    }
    await service.deleteDocuments(params)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete documents'
    return { success: false, error: message }
  }
})

ipcMain.handle('chromadb:createDocumentsBatch', async (_event, profileId: string, params: CreateDocumentsBatchParams) => {
  try {
    const service = chromaDBConnectionPool.getConnection(profileId)
    if (!service) {
      return { success: false, error: 'Not connected to ChromaDB' }
    }
    // Check for user embedding override
    const embeddingOverride = connectionStore.getEmbeddingOverride(profileId, params.collectionName)
    const result = await service.createDocumentsBatch(params, embeddingOverride)
    return { success: true, data: result }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create documents'
    return { success: false, error: message }
  }
})

ipcMain.handle('chromadb:createCollection', async (_event, profileId: string, params: CreateCollectionParams) => {
  try {
    const service = chromaDBConnectionPool.getConnection(profileId)
    if (!service) {
      return { success: false, error: 'Not connected to ChromaDB' }
    }
    const collection = await service.createCollection(params)
    return { success: true, data: collection }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create collection'
    return { success: false, error: message }
  }
})

ipcMain.handle('chromadb:deleteCollection', async (_event, profileId: string, collectionName: string) => {
  try {
    const service = chromaDBConnectionPool.getConnection(profileId)
    if (!service) {
      return { success: false, error: 'Not connected to ChromaDB' }
    }
    await service.deleteCollection(collectionName)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete collection'
    return { success: false, error: message }
  }
})

ipcMain.handle('chromadb:copyCollection', async (event, profileId: string, params: CopyCollectionParams) => {
  try {
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
    const onProgress = (progress: any) => {
      event.sender.send('chromadb:copyProgress', progress)
    }

    const result = await service.copyCollection(params, embeddingOverride, onProgress, abortController.signal)

    // Clean up abort controller
    activeCopyOperations.delete(profileId)

    return { success: result.success, data: result, error: result.error }
  } catch (error) {
    activeCopyOperations.delete(profileId)
    const message = error instanceof Error ? error.message : 'Failed to copy collection'
    return { success: false, error: message }
  }
})

ipcMain.handle('chromadb:cancelCopy', async (_event, profileId: string) => {
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
    const message = error instanceof Error ? error.message : 'Failed to fetch profiles'
    return { success: false, error: message }
  }
})

ipcMain.handle('profiles:save', async (_event, profile: ConnectionProfile) => {
  try {
    connectionStore.saveProfile(profile)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save profile'
    return { success: false, error: message }
  }
})

ipcMain.handle('profiles:delete', async (_event, id: string) => {
  try {
    connectionStore.deleteProfile(id)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete profile'
    return { success: false, error: message }
  }
})

ipcMain.handle('profiles:getLastActive', async () => {
  try {
    const id = connectionStore.getLastActiveProfileId()
    return { success: true, data: id }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch last active profile'
    return { success: false, error: message }
  }
})

ipcMain.handle('profiles:setLastActive', async (_event, id: string | null) => {
  try {
    connectionStore.setLastActiveProfileId(id)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to set last active profile'
    return { success: false, error: message }
  }
})

ipcMain.handle('profiles:getEmbeddingOverride', async (_event, profileId: string, collectionName: string) => {
  try {
    const override = connectionStore.getEmbeddingOverride(profileId, collectionName)
    return { success: true, data: override }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get embedding override'
    return { success: false, error: message }
  }
})

ipcMain.handle('profiles:setEmbeddingOverride', async (_event, profileId: string, collectionName: string, override: any) => {
  try {
    connectionStore.setEmbeddingOverride(profileId, collectionName, override)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to set embedding override'
    return { success: false, error: message }
  }
})

ipcMain.handle('profiles:clearEmbeddingOverride', async (_event, profileId: string, collectionName: string) => {
  try {
    connectionStore.clearEmbeddingOverride(profileId, collectionName)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to clear embedding override'
    return { success: false, error: message }
  }
})

// Window management IPC handlers
ipcMain.handle('window:create-connection', async (_event, profile: ConnectionProfile) => {
  try {
    const { window: win, windowId } = windowManager.createConnectionWindow(profile)
    return { success: true, data: { windowId } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create connection window'
    return { success: false, error: message }
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
    const message = error instanceof Error ? error.message : 'Failed to get window info'
    return { success: false, error: message }
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
    const message = error instanceof Error ? error.message : 'Failed to close window'
    return { success: false, error: message }
  }
})

ipcMain.handle('window:get-profile', async (_event, profileId: string) => {
  try {
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
    const message = error instanceof Error ? error.message : 'Failed to get profile'
    return { success: false, error: message }
  }
})

// Settings IPC handlers
ipcMain.handle('settings:getApiKeys', async () => {
  try {
    const apiKeys = settingsStore.getApiKeys()
    return { success: true, data: apiKeys }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get API keys'
    return { success: false, error: message }
  }
})

ipcMain.handle('settings:setApiKeys', async (_event, apiKeys: ApiKeys) => {
  try {
    settingsStore.setApiKeys(apiKeys)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save API keys'
    return { success: false, error: message }
  }
})

// Shell IPC handlers
ipcMain.handle('shell:openExternal', async (_event, url: string) => {
  try {
    await shell.openExternal(url)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to open URL'
    return { success: false, error: message }
  }
})

app.whenReady().then(() => {
  // Create application menu
  createApplicationMenu()

  // Initialize auto-updater
  initAutoUpdater()

  // Create setup window
  windowManager.createSetupWindow()

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

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    windowManager.createSetupWindow()
  }
})
