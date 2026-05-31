import { autoUpdater, UpdateInfo } from 'electron-updater'
import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import log from 'electron-log'

// Configure logging for auto-updater
autoUpdater.logger = log
log.transports.file.level = 'info'

// Background checks may download quietly and install on quit.
// Manual menu checks temporarily disable auto-download so the user can choose.
autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true

let manualUpdateCheck: Promise<void> | null = null

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

function getDialogParent(window?: BrowserWindow | null): BrowserWindow | undefined {
  if (window && !window.isDestroyed()) return window

  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow && !focusedWindow.isDestroyed()) return focusedWindow

  return BrowserWindow.getAllWindows().find(win => !win.isDestroyed())
}

async function showUpdateMessage(
  parentWindow: BrowserWindow | undefined,
  options: Electron.MessageBoxOptions
) {
  if (parentWindow && !parentWindow.isDestroyed()) {
    return dialog.showMessageBox(parentWindow, options)
  }

  return dialog.showMessageBox(options)
}

async function promptToInstall(parentWindow: BrowserWindow | undefined, version: string) {
  const { response } = await showUpdateMessage(parentWindow, {
    type: 'info',
    buttons: ['Restart and Install', 'Later'],
    defaultId: 0,
    cancelId: 1,
    message: `Chroma Explorer ${version} is ready to install.`,
    detail: 'Restart Chroma Explorer to finish installing the update.',
  })

  if (response === 0) {
    autoUpdater.quitAndInstall()
  }
}

async function runManualUpdateCheck(parentWindow: BrowserWindow | undefined) {
  if (!app.isPackaged) {
    await showUpdateMessage(parentWindow, {
      type: 'info',
      buttons: ['OK'],
      message: 'Updates are only available in packaged builds.',
      detail: 'Build and install a release version of Chroma Explorer to test the autoupdater.',
    })
    return
  }

  const previousAutoDownload = autoUpdater.autoDownload
  autoUpdater.autoDownload = false

  try {
    const result = await autoUpdater.checkForUpdates()
    const updateInfo = result?.updateInfo

    if (!updateInfo || updateInfo.version === app.getVersion()) {
      await showUpdateMessage(parentWindow, {
        type: 'info',
        buttons: ['OK'],
        message: 'Chroma Explorer is up to date.',
        detail: `Version ${app.getVersion()} is the latest available version.`,
      })
      return
    }

    const { response } = await showUpdateMessage(parentWindow, {
      type: 'info',
      buttons: ['Download and Install', 'Later'],
      defaultId: 0,
      cancelId: 1,
      message: `Chroma Explorer ${updateInfo.version} is available.`,
      detail: `You are currently running version ${app.getVersion()}.`,
    })

    if (response !== 0) return

    await autoUpdater.downloadUpdate()
    await promptToInstall(parentWindow, updateInfo.version)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to check for updates'
    log.error('Manual update check failed:', error)
    await showUpdateMessage(parentWindow, {
      type: 'error',
      buttons: ['OK'],
      message: 'Unable to check for updates.',
      detail: message,
    })
  } finally {
    autoUpdater.autoDownload = previousAutoDownload
  }
}

export function checkForUpdatesFromMenu(window?: BrowserWindow | null) {
  if (manualUpdateCheck) return manualUpdateCheck

  const parentWindow = getDialogParent(window)
  manualUpdateCheck = runManualUpdateCheck(parentWindow).finally(() => {
    manualUpdateCheck = null
  })

  return manualUpdateCheck
}
