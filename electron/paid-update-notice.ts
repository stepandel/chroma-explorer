import { app, BrowserWindow, dialog } from 'electron'
import { settingsStore } from './settings-store'
import { openValidatedExternalUrl } from './external-url'

const websiteDownloadUrl = 'https://www.chroma-explorer.com/account'

function getDialogParent(): BrowserWindow | undefined {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow && !focusedWindow.isDestroyed()) return focusedWindow

  return BrowserWindow.getAllWindows().find(win => !win.isDestroyed())
}

async function showNotice(markAsSeen: boolean) {
  const parentWindow = getDialogParent()
  const options: Electron.MessageBoxOptions = {
    type: 'info',
    buttons: ['Go to Website', 'Keep Using This Version'],
    defaultId: 0,
    cancelId: 1,
    message: 'Future Chroma Explorer updates are moving to the website.',
    detail:
      'You can keep using this version for free. To receive future app updates, download the new macOS binary from chroma-explorer.com.',
  }

  const result = parentWindow && !parentWindow.isDestroyed()
    ? await dialog.showMessageBox(parentWindow, options)
    : await dialog.showMessageBox(options)

  if (markAsSeen) {
    settingsStore.setPaidUpdateNoticeShownForVersion(app.getVersion())
  }

  if (result.response === 0) {
    await openValidatedExternalUrl(websiteDownloadUrl)
  }
}

export async function showPaidUpdateNotice() {
  await showNotice(false)
}

export async function showPaidUpdateNoticeOnce() {
  if (!app.isPackaged) return
  if (app.getVersion() !== '0.5.2') return
  if (settingsStore.getPaidUpdateNoticeShownForVersion() === app.getVersion()) return

  await showNotice(true)
}
