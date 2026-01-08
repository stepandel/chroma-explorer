import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromaDBConnectionPool } from './chromadb-service'
import { connectionStore } from './connection-store'
import { tabsStore } from './tabs-store'
import { windowManager } from './window-manager'
import { createApplicationMenu } from './menu'
import { ConnectionProfile, SearchDocumentsParams } from './types'

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
    const documents = await service.searchDocuments(params)
    return { success: true, data: documents }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to search documents'
    return { success: false, error: message }
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

// Tabs management IPC handlers
ipcMain.handle('tabs:save', async (_event, windowId: string, data: any) => {
  try {
    tabsStore.save(windowId, data)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save tabs'
    return { success: false, error: message }
  }
})

ipcMain.handle('tabs:load', async (_event, windowId: string) => {
  try {
    const data = tabsStore.load(windowId)
    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load tabs'
    return { success: false, error: message }
  }
})

ipcMain.handle('tabs:clear', async (_event, windowId: string) => {
  try {
    tabsStore.clear(windowId)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to clear tabs'
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

app.whenReady().then(() => {
  // Create application menu
  createApplicationMenu()

  // Create setup window
  windowManager.createSetupWindow()
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
