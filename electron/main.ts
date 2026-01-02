import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromaDBService } from './chromadb-service.js'

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
ipcMain.handle('chromadb:connect', async (_event, host: string, port: number) => {
  try {
    await chromaDBService.connect(host, port)
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
