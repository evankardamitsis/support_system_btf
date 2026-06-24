const { app, BrowserWindow, Menu, Notification, ipcMain, shell, nativeImage } = require('electron')
const path = require('node:path')
const { initDesktopUpdater, checkForDesktopUpdates } = require('./updater.cjs')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

const APP_URL =
  process.env.BTF_APP_URL?.trim() ||
  (isDev ? 'http://localhost:3000/admin/tickets' : 'https://support.belowthefold.gr/admin/tickets')

const PROTOCOL = 'btf-support'

let mainWindow = null
let activeBounceId = null

function appIcon() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png')
  const image = nativeImage.createFromPath(iconPath)
  return image.isEmpty() ? undefined : image
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    title: 'BTF Support',
    icon: appIcon(),
    backgroundColor: '#111114',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const target = new URL(url)
    const appOrigin = new URL(APP_URL).origin

    if (target.origin !== appOrigin) {
      event.preventDefault()
      void shell.openExternal(url)
    }
  })

  void mainWindow.loadURL(APP_URL)

  wireWindowFocusEvents()

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function cancelActiveBounce() {
  if (process.platform === 'darwin' && app.dock && activeBounceId !== null) {
    app.dock.cancelBounce(activeBounceId)
    activeBounceId = null
  }
}

function wireWindowFocusEvents() {
  if (!mainWindow) return

  const sendFocusState = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    const focused = mainWindow.isFocused()
    mainWindow.webContents.send('btf-desktop:focus-change', focused)
    if (focused) cancelActiveBounce()
  }

  mainWindow.on('focus', sendFocusState)
  mainWindow.on('blur', sendFocusState)
  mainWindow.on('show', sendFocusState)
  mainWindow.on('hide', sendFocusState)
  sendFocusState()
}

function buildMenu() {
  const template = [
    {
      label: 'BTF Support',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow?.webContents.reload(),
        },
        {
          label: 'Check for Updates…',
          click: () => {
            void checkForDesktopUpdates({ silent: false })
          },
        },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { type: 'separator' }, { role: 'front' }],
    },
    {
      label: 'Navigate',
      submenu: [
        {
          label: 'Tickets',
          accelerator: 'CmdOrCtrl+1',
          click: () => navigateTo('/admin/tickets'),
        },
        {
          label: 'Ops',
          accelerator: 'CmdOrCtrl+2',
          click: () => navigateTo('/admin/ops'),
        },
        {
          label: 'COMMS',
          accelerator: 'CmdOrCtrl+3',
          click: () => toggleComms(),
        },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function navigateTo(pathname) {
  if (!mainWindow) return
  const origin = new URL(APP_URL).origin
  void mainWindow.loadURL(`${origin}${pathname}`)
}

function toggleComms() {
  if (!mainWindow) return
  mainWindow.webContents.send('btf-desktop:toggle-comms')
}

function handleDeepLink(url) {
  if (!url.startsWith(`${PROTOCOL}://`)) return

  const target = url.replace(`${PROTOCOL}://`, 'https://')
  if (mainWindow) {
    void mainWindow.loadURL(target)
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  } else {
    app.whenReady().then(() => {
      createWindow()
      void mainWindow?.loadURL(target)
    })
  }
}

function registerProtocol() {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [
        path.resolve(process.argv[1]),
      ])
    }
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL)
  }
}

if (process.platform === 'darwin') {
  app?.dock?.setIcon(appIcon())
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    const deepLink = argv.find(arg => arg.startsWith(`${PROTOCOL}://`))
    if (deepLink) handleDeepLink(deepLink)
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  registerProtocol()

  app.whenReady().then(() => {
    buildMenu()
    createWindow()
    if (!isDev) initDesktopUpdater()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
      else mainWindow?.focus()
    })
  })
}

app.on('open-url', (event, url) => {
  event.preventDefault()
  handleDeepLink(url)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.on('btf-desktop:set-badge', (_event, count) => {
  if (process.platform !== 'darwin' || !app.dock) return
  const value = typeof count === 'number' && Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
  app.dock.setBadge(value > 0 ? (value > 99 ? '99+' : String(value)) : '')
})

ipcMain.on('btf-desktop:bounce', (_event, mode) => {
  if (process.platform !== 'darwin' || !app.dock) return
  const bounceMode = mode === 'critical' ? 'critical' : 'informational'
  if (bounceMode === 'critical') {
    // Cancel any existing critical bounce before starting a new one
    cancelActiveBounce()
    activeBounceId = app.dock.bounce('critical')
  } else {
    app.dock.bounce('informational')
  }
})

ipcMain.on('btf-desktop:cancel-bounce', () => {
  cancelActiveBounce()
})

ipcMain.on('btf-desktop:notify', (_event, payload) => {
  if (!Notification.isSupported()) return
  if (!payload || typeof payload !== 'object') return

  const { title, body, href } = payload
  const notification = new Notification({
    title: typeof title === 'string' ? title : 'BTF Support',
    body: typeof body === 'string' ? body : undefined,
    silent: false,
  })

  notification.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
    if (typeof href === 'string' && href.startsWith('/')) {
      const origin = new URL(APP_URL).origin
      void mainWindow?.loadURL(`${origin}${href}`)
    }
  })

  notification.show()
})
