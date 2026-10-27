const { app, BrowserWindow, ipcMain, dialog, shell, screen } = require('electron')
const path = require('path')
const fs = require('fs')
const { loadWindowState, trackWindowState } = require('./window-state.cjs')
const { createBrowser } = require('./browser.cjs')

const isDev = process.argv.includes('--dev')
let fontCatalogCache = null

const categoryMap = {
  'Sans Serif': 'サンセリフ',
  'Serif': 'セリフ',
  'Display': 'ディスプレイ',
  'Handwriting': '手書き',
  'Monospace': '等幅',
}

function normalizeFont(font) {
  const weights = new Set(Object.keys(font.fonts || {}).map((key) => key.replace('i', '')))
  const isJapanese = (font.subsets || []).includes('japanese')
  return {
    family: font.family,
    label: font.displayName || font.family,
    category: categoryMap[font.category] || font.category || 'その他',
    language: isJapanese ? '日本語' : '欧文',
    subsets: font.subsets || [],
    weights: Math.max(weights.size, 1),
    license: 'Open-source license',
    author: (font.designers || []).join(', ') || 'Unknown designer',
    featured: font.popularity <= 24,
    popularity: font.popularity || 99999,
    dateAdded: font.dateAdded || '',
    tags: [isJapanese ? '日本語対応' : font.category || 'Open source', ...(font.axes?.length ? ['Variable'] : [])],
  }
}

function createWindow() {
  const statePath = path.join(app.getPath('userData'), 'window-state.json')
  const { maximized, ...bounds } = loadWindowState(statePath, screen)
  const win = new BrowserWindow({
    ...bounds,
    minWidth: Math.min(940, bounds.width),
    minHeight: Math.min(680, bounds.height),
    titleBarStyle: 'default',
    title: 'Font Dock',
    backgroundColor: '#f5f4ef',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (maximized) win.maximize()
  trackWindowState(win, app, statePath)
  createBrowser(win)

  if (isDev) win.loadURL('http://127.0.0.1:5173')
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

ipcMain.handle('font:download', async (_event, font) => {
  const safeName = font.family.replace(/[^a-z0-9-_ ]/gi, '').replace(/\s+/g, '-')
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: `${font.family} を保存`,
    defaultPath: path.join(app.getPath('downloads'), `${safeName}.zip`),
    filters: [{ name: 'ZIP archive', extensions: ['zip'] }],
  })
  if (canceled || !filePath) return { status: 'cancelled' }

  try {
    const url = `https://fonts.google.com/download?family=${encodeURIComponent(font.family)}`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Download failed (${response.status})`)
    const data = Buffer.from(await response.arrayBuffer())
    await fs.promises.writeFile(filePath, data)
    return { status: 'saved', filePath }
  } catch (error) {
    return { status: 'error', message: error.message }
  }
})

ipcMain.handle('font:list', async () => {
  if (fontCatalogCache) return { status: 'loaded', fonts: fontCatalogCache }
  try {
    const response = await fetch('https://fonts.google.com/metadata/fonts')
    if (!response.ok) throw new Error(`Catalog request failed (${response.status})`)
    const data = await response.json()
    fontCatalogCache = (data.familyMetadataList || []).filter((font) => font.isOpenSource !== false).map(normalizeFont)
    return { status: 'loaded', fonts: fontCatalogCache }
  } catch (error) {
    return { status: 'error', message: error.message }
  }
})

ipcMain.handle('font:reveal', (_event, filePath) => shell.showItemInFolder(filePath))
ipcMain.handle('font:open-source', (_event, url) => shell.openExternal(url))

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow())
})

app.on('window-all-closed', () => {
  app.quit()
})
