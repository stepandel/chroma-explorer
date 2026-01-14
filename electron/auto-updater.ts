import { autoUpdater, UpdateInfo } from 'electron-updater'
import { BrowserWindow, ipcMain } from 'electron'
import log from 'electron-log'

// Configure logging for auto-updater
autoUpdater.logger = log
log.transports.file.level = 'info'

// Enable auto-download and install on quit
autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true

export interface UpdateStatus {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  info?: UpdateInfo
  progress?: {
    percent: number
    bytesPerSecond: number
    transferred: number
    total: number
  }
  error?: string
}

function sendStatusToAllWindows(status: UpdateStatus) {
  const windows = BrowserWindow.getAllWindows()
  windows.forEach(win => {
    win.webContents.send('updater:status', status)
  })
}

export function initAutoUpdater() {
  // Check for updates event handlers
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...')
    sendStatusToAllWindows({ status: 'checking' })
  })

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    log.info('Update available:', info.version)
    sendStatusToAllWindows({ status: 'available', info })
  })

  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    log.info('Update not available. Current version is up to date.')
    sendStatusToAllWindows({ status: 'not-available', info })
  })

  autoUpdater.on('error', (err: Error) => {
    log.error('Error in auto-updater:', err)
    sendStatusToAllWindows({ status: 'error', error: err.message })
  })

  autoUpdater.on('download-progress', (progress) => {
    log.info(`Download progress: ${progress.percent.toFixed(1)}%`)
    sendStatusToAllWindows({
      status: 'downloading',
      progress: {
        percent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total
      }
    })
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    log.info('Update downloaded:', info.version)
    sendStatusToAllWindows({ status: 'downloaded', info })
  })

  // IPC handlers for renderer process
  ipcMain.handle('updater:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      return { success: true, data: result?.updateInfo }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to check for updates'
      return { success: false, error: message }
    }
  })

  ipcMain.handle('updater:download', async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to download update'
      return { success: false, error: message }
    }
  })

  ipcMain.handle('updater:install', async () => {
    try {
      // This will quit the app and install the update
      autoUpdater.quitAndInstall()
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to install update'
      return { success: false, error: message }
    }
  })
}

export function checkForUpdates() {
  autoUpdater.checkForUpdates().catch(err => {
    log.error('Error checking for updates:', err)
  })
}
