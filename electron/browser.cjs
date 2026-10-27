const { WebContentsView, ipcMain } = require('electron')

function normalizeUrl(value) {
  const input = String(value || '').trim()
  if (!input) throw new Error('URLを入力してください。')
  const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(input) ? input : `https://${input}`)
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('http または https のURLを指定してください。')
  return url.href
}

const fontCache = new Map()
async function loadFont(family) {
  if (!fontCache.has(family)) {
    const pending = (async () => {
      const response = await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}&display=swap`, { signal: AbortSignal.timeout(20000) })
      if (!response.ok) throw new Error('フォントを取得できませんでした。')
      const css = await response.text()
      const faces = await Promise.all([...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].map(async ([, body]) => {
        const url = body.match(/url\(['"]?(https:\/\/fonts\.gstatic\.com\/[^)'"\s]+)['"]?\)/)?.[1]
        if (!url) throw new Error('フォントの形式を読み取れませんでした。')
        const data = await fetch(url, { signal: AbortSignal.timeout(30000) })
        if (!data.ok) throw new Error('フォントをダウンロードできませんでした。')
        return {
          data: Buffer.from(await data.arrayBuffer()).toString('base64'),
          descriptors: {
            style: body.match(/font-style:\s*([^;]+)/)?.[1]?.trim() || 'normal',
            weight: body.match(/font-weight:\s*([^;]+)/)?.[1]?.trim() || '400',
            unicodeRange: body.match(/unicode-range:\s*([^;]+)/)?.[1]?.trim() || 'U+0-10FFFF',
          },
        }
      }))
      if (!faces.length) throw new Error('このフォントを読み込めませんでした。')
      return faces
    })()
    fontCache.set(family, pending)
    pending.catch(() => fontCache.delete(family))
  }
  return fontCache.get(family)
}

function createBrowser(win) {
  let view
  let cssKey
  let revision = 0
  let family = ''
  let appliedFont = ''
  let fontError = ''
  let error = ''
  let applying = false
  const send = () => {
    if (win.isDestroyed() || !view || view.webContents.isDestroyed()) return
    const wc = view.webContents
    win.webContents.send('browser:state', {
      url: wc.getURL(), title: wc.getTitle(), loading: wc.isLoading(),
      canGoBack: wc.navigationHistory.canGoBack(), canGoForward: wc.navigationHistory.canGoForward(),
      family, appliedFont, applying, fontError, error,
    })
  }
  async function applyFont() {
    if (!view || view.webContents.isDestroyed() || !view.webContents.getURL()) return
    const current = ++revision
    const wc = view.webContents
    const selected = family
    applying = !!selected
    fontError = ''
    send()
    try {
      await wc.executeJavaScript(`window.__fontDockRevision = ${current}`)
      if (current !== revision || wc.isDestroyed()) return
      // Load binary font data in the main process so the site's font-src policy
      // does not prevent a local preview. Never relax its CSP or web security.
      if (selected) {
        const faces = await loadFont(selected)
        if (current !== revision || wc.isDestroyed()) return
        await wc.executeJavaScript(`(async () => {
          if (window.__fontDockRevision !== ${current}) return;
          const faces = ${JSON.stringify(faces)};
          const loaded = await Promise.all(faces.map(async ({ data, descriptors }) => {
            const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
            return new FontFace('FontDockPreview', bytes.buffer, descriptors).load();
          }));
          if (window.__fontDockRevision !== ${current}) return;
          if (window.__fontDockFaces) window.__fontDockFaces.forEach(face => document.fonts.delete(face));
          loaded.forEach(face => document.fonts.add(face));
          window.__fontDockFaces = loaded;
        })()`)
      } else {
        await wc.executeJavaScript(`if (window.__fontDockFaces) {
          window.__fontDockFaces.forEach(face => document.fonts.delete(face));
          window.__fontDockFaces = [];
        }`)
      }
      if (current !== revision || wc.isDestroyed()) return
      await wc.executeJavaScript(`document.documentElement.${selected ? "setAttribute('data-font-dock-preview', '')" : "removeAttribute('data-font-dock-preview')"}`)
      if (current !== revision || wc.isDestroyed()) return
      if (cssKey) await wc.removeInsertedCSS(cssKey)
      cssKey = undefined
      if (selected) {
        cssKey = await wc.insertCSS(`
          :where(html[data-font-dock-preview], html[data-font-dock-preview] body, html[data-font-dock-preview] body *):not(svg, svg *, [class*="icon"], [class*="Icon"], .fa, .fas, .fab, .material-icons) {
            font-family: 'FontDockPreview', sans-serif !important;
          }
        `, { cssOrigin: 'user' })
      }
      appliedFont = selected
    } catch (failure) {
      if (current === revision) fontError = `フォントを適用できませんでした：${failure.message}`
    } finally {
      if (current === revision) { applying = false; send() }
    }
  }
  const ensureView = () => {
    if (view) return view
    view = new WebContentsView({ webPreferences: {
      partition: 'persist:font-dock-browser', nodeIntegration: false,
      contextIsolation: true, sandbox: true, webSecurity: true,
    } })
    win.contentView.addChildView(view)
    view.setVisible(false)
    const wc = view.webContents
    wc.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))
    wc.on('will-navigate', (event, url) => {
      try { normalizeUrl(url) } catch { event.preventDefault() }
    })
    wc.on('will-redirect', (event, url) => {
      try { normalizeUrl(url) } catch { event.preventDefault() }
    })
    wc.setWindowOpenHandler(({ url }) => {
      navigate(url)
      return { action: 'deny' }
    })
    wc.on('did-start-navigation', (_event, _url, inPlace, mainFrame) => {
      if (mainFrame && !inPlace) {
        revision++
        cssKey = undefined
        error = ''; appliedFont = ''; applying = false; fontError = ''
      }
      send()
    })
    for (const event of ['did-start-loading', 'did-stop-loading', 'did-navigate', 'did-navigate-in-page', 'page-title-updated']) wc.on(event, send)
    wc.on('dom-ready', () => { applyFont() })
    wc.on('did-fail-load', (_event, code, description, _url, mainFrame) => {
      if (mainFrame && code !== -3) { error = `ページを開けませんでした：${description}`; send() }
    })
    wc.on('render-process-gone', () => { error = 'ページが停止しました。再読み込みしてください。'; send() })
    return view
  }
  async function navigate(input) {
    try {
      const url = normalizeUrl(input)
      const wc = ensureView().webContents
      error = ''
      await wc.loadURL(url)
    } catch (failure) {
      if (!win.isDestroyed() && failure.code !== 'ERR_ABORTED') { error = failure.message; send() }
    }
  }
  const handlers = {
    'browser:layout': (_event, bounds) => {
      if (!bounds?.visible) { view?.setVisible(false); return }
      if (!['x', 'y', 'width', 'height'].every(key => Number.isFinite(bounds[key]))) return
      const [width, height] = win.getContentSize()
      const x = Math.max(0, Math.min(width, Math.round(bounds.x)))
      const y = Math.max(0, Math.min(height, Math.round(bounds.y)))
      const browser = ensureView()
      browser.setBounds({ x, y, width: Math.max(0, Math.min(width - x, Math.round(bounds.width))), height: Math.max(0, Math.min(height - y, Math.round(bounds.height))) })
      browser.setVisible(true)
      send()
    },
    'browser:navigate': (_event, url) => { ensureView(); navigate(url) },
    'browser:action': (_event, action) => {
      if (!view) return
      const wc = view.webContents
      const history = wc.navigationHistory
      if (action === 'back' && history.canGoBack()) history.goBack()
      if (action === 'forward' && history.canGoForward()) history.goForward()
      if (action === 'reload') { error = ''; wc.reload() }
      if (action === 'stop') wc.stop()
    },
    'browser:font': (_event, value) => {
      if (typeof value !== 'string' || value.length > 150) return
      family = value
      applyFont()
    },
  }
  for (const [channel, handler] of Object.entries(handlers)) {
    ipcMain.handle(channel, (event, ...args) => {
      if (event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame) throw new Error('アクセスできません。')
      return handler(event, ...args)
    })
  }
  win.on('closed', () => {
    revision++
    for (const channel of Object.keys(handlers)) ipcMain.removeHandler(channel)
    if (view && !view.webContents.isDestroyed()) view.webContents.close()
  })
}

module.exports = { createBrowser, normalizeUrl }
