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
  setBadge(count) {
    ipcRenderer.send('btf-desktop:set-badge', count)
  },
  bounce(mode) {
    ipcRenderer.send('btf-desktop:bounce', mode)
  },
  cancelBounce() {
    ipcRenderer.send('btf-desktop:cancel-bounce')
  },
  onFocusChange(callback) {
    if (typeof callback !== 'function') return () => {}
    const listener = (_event, focused) => callback(Boolean(focused))
    ipcRenderer.on('btf-desktop:focus-change', listener)
    return () => ipcRenderer.removeListener('btf-desktop:focus-change', listener)
  },
})
