const { app, BrowserWindow, Menu, Notification, ipcMain, shell, nativeImage } = require('electron')
const path = require('node:path')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

const APP_URL =
  process.env.BTF_APP_URL?.trim() ||
  (isDev ? 'http://localhost:3000/admin/tickets' : 'https://support.belowthefold.gr/admin/tickets')

const PROTOCOL = 'btf-support'

let mainWindow = null

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

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
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
          label: 'COMMS',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => navigateTo('/admin/tickets?openComms=1'),
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
