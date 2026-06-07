const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('btfDesktop', {
  platform: process.platform,
  isDesktop: true,
  notify({ title, body, href }) {
    ipcRenderer.send('btf-desktop:notify', { title, body, href })
  },
})
