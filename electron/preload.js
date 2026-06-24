const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('__NOTIFICATION_API__', {
  showNotification: (data) => ipcRenderer.send('show-notification', data),
  playSound: () => ipcRenderer.send('play-notification-sound'),
})
