const { app, BrowserWindow, Menu, ipcMain, Notification } = require('electron')
const path = require('path')

const isDev = process.env.NODE_ENV === 'development'

// ----- Меню без Reload/Force Reload в production -----
function createMenu() {
  if (isDev) return // в dev оставляем стандартное меню (Reload, DevTools)

  const isMac = process.platform === 'darwin'

  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : [{
      label: 'File',
      submenu: [{ role: 'quit' }]
    }]),
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' }
        ] : [{ role: 'close' }])
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 600,
    height: 700,
    minWidth: 400,
    minHeight: 500,
    backgroundColor: '#000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))

    // Блокировка случайного refresh в production (F5, Ctrl+R, Cmd+R)
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (
        input.key === 'F5' ||
        (input.control && input.key.toLowerCase() === 'r') ||
        (input.meta && input.key.toLowerCase() === 'r')
      ) {
        event.preventDefault()
      }
    })
  }

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorDescription)
  })
}

// ----- IPC: Notification System -----
ipcMain.on('show-notification', (event, data) => {
  try {
    const notification = new Notification({
      title: data.title || 'Notification',
      body: data.body || '',
      silent: true,
    })
    notification.show()
  } catch (err) {
    console.error('Notification error:', err)
  }
})

// ----- IPC: Notification Sound (stub — ready for audio file) -----
ipcMain.on('play-notification-sound', () => {
  // TODO: Play sound file when audio asset is provided
  // Example:
  // const soundPath = path.join(__dirname, '../public/sounds/notification.mp3')
  // if (require('fs').existsSync(soundPath)) {
  //   const player = new (require('sound-play'))(soundPath, 0.5)
  //   player.play()
  // }
})

app.whenReady().then(() => {
  createMenu()
  createWindow()
})

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
