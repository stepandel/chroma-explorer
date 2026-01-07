import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromaDBService } from './chromadb-service'
import { connectionStore } from './connection-store'
import { tabsStore } from './tabs-store'
import { ConnectionProfile, SearchDocumentsParams } from './types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    titleBarStyle: 'hiddenInset', // macOS: show traffic lights, hide title
    title: '', // Remove default title
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(process.env.DIST, 'index.html'))
  }
}

// Set up IPC handlers
ipcMain.handle('chromadb:connect', async (_event, profile: ConnectionProfile) => {
  try {
    await chromaDBService.connect(profile)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to connect to ChromaDB'
    return { success: false, error: message }
  }
})

ipcMain.handle('chromadb:listCollections', async () => {
  try {
    const collections = await chromaDBService.listCollections()
    return { success: true, data: collections }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch collections'
    return { success: false, error: message }
  }
})

ipcMain.handle('chromadb:getDocuments', async (_event, collectionName: string) => {
  try {
    const documents = await chromaDBService.getCollectionDocuments(collectionName)
    return { success: true, data: documents }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch documents'
    return { success: false, error: message }
  }
})

ipcMain.handle('chromadb:searchDocuments', async (_event, params: SearchDocumentsParams) => {
  try {
    const documents = await chromaDBService.searchDocuments(params)
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
ipcMain.handle('tabs:save', async (_event, data: any) => {
  try {
    tabsStore.save(data)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save tabs'
    return { success: false, error: message }
  }
})

ipcMain.handle('tabs:load', async () => {
  try {
    const data = tabsStore.load()
    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load tabs'
    return { success: false, error: message }
  }
})

ipcMain.handle('tabs:clear', async () => {
  try {
    tabsStore.clear()
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to clear tabs'
    return { success: false, error: message }
  }
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
