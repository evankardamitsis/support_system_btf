const { Notification, dialog } = require('electron')
const { autoUpdater } = require('electron-updater')

let checking = false

function showUpdateNotification(body) {
  if (!Notification.isSupported()) return
  new Notification({ title: 'BTF Support', body }).show()
}

function initDesktopUpdater() {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowDowngrade = false

  autoUpdater.on('update-available', () => {
    showUpdateNotification('A new version is downloading in the background.')
  })

  autoUpdater.on('update-not-available', () => {
    checking = false
  })

  autoUpdater.on('update-downloaded', () => {
    checking = false
    const restartNow = dialog.showMessageBoxSync({
      type: 'info',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      message: 'BTF Support update ready',
      detail: 'Restart the app to install the latest desktop version.',
    })

    if (restartNow === 0) {
      autoUpdater.quitAndInstall()
    }
  })

  autoUpdater.on('error', (error) => {
    checking = false
    console.error('Desktop auto-update failed:', error?.message || error)
  })

  setTimeout(() => {
    void checkForDesktopUpdates({ silent: true })
  }, 30_000)

  setInterval(() => {
    void checkForDesktopUpdates({ silent: true })
  }, 4 * 60 * 60 * 1000)
}

async function checkForDesktopUpdates({ silent = false } = {}) {
  if (checking) return
  checking = true

  try {
    const result = await autoUpdater.checkForUpdates()
    const latest = result?.updateInfo?.version
    const current = autoUpdater.currentVersion.version

    if (!silent && (!latest || latest === current)) {
      dialog.showMessageBoxSync({
        type: 'info',
        message: 'You’re up to date',
        detail: `BTF Support ${current} is the latest release.`,
      })
    }
  } catch (error) {
    if (!silent) {
      dialog.showMessageBoxSync({
        type: 'error',
        message: 'Could not check for updates',
        detail: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  } finally {
    checking = false
  }
}

module.exports = { initDesktopUpdater, checkForDesktopUpdates }
