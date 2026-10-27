const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('fontDock', {
  list: () => ipcRenderer.invoke('font:list'),
  download: (font) => ipcRenderer.invoke('font:download', font),
  reveal: (filePath) => ipcRenderer.invoke('font:reveal', filePath),
  openSource: (url) => ipcRenderer.invoke('font:open-source', url),
})
