const { contextBridge, ipcRenderer } = require('electron')

ipcRenderer.on('btf-desktop:toggle-comms', () => {
  window.dispatchEvent(new CustomEvent('btf-desktop:toggle-comms'))
})

contextBridge.exposeInMainWorld('btfDesktop', {
  platform: process.platform,
  isDesktop: true,
  notify({ title, body, href }) {
    ipcRenderer.send('btf-desktop:notify', { title, body, href })
  },
})
