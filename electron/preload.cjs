const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('fontDock', {
  list: () => ipcRenderer.invoke('font:list'),
  download: (font) => ipcRenderer.invoke('font:download', font),
  reveal: (filePath) => ipcRenderer.invoke('font:reveal', filePath),
  openSource: (url) => ipcRenderer.invoke('font:open-source', url),
  browser: {
    layout: (bounds) => ipcRenderer.invoke('browser:layout', bounds),
    navigate: (url) => ipcRenderer.invoke('browser:navigate', url),
    action: (action) => ipcRenderer.invoke('browser:action', action),
    font: (family) => ipcRenderer.invoke('browser:font', family),
    onState: (callback) => {
      const listener = (_event, state) => callback(state)
      ipcRenderer.on('browser:state', listener)
      return () => ipcRenderer.removeListener('browser:state', listener)
    },
  },
})
