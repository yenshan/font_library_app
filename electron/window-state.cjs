const fs = require('fs')

const defaultBounds = { width: 1440, height: 940 }

function loadWindowState(filePath, screen) {
  try {
    const state = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    if (!['x', 'y', 'width', 'height'].every((key) => Number.isSafeInteger(state[key])) ||
        state.width <= 0 || state.height <= 0) return { ...defaultBounds }

    const { workArea } = screen.getDisplayMatching(state)
    const width = Math.min(Math.max(state.width, 940), workArea.width)
    const height = Math.min(Math.max(state.height, 680), workArea.height)
    return {
      x: Math.max(workArea.x, Math.min(state.x, workArea.x + workArea.width - width)),
      y: Math.max(workArea.y, Math.min(state.y, workArea.y + workArea.height - height)),
      width,
      height,
      maximized: state.maximized === true,
    }
  } catch {
    return { ...defaultBounds }
  }
}

function trackWindowState(win, app, filePath) {
  let timer
  const save = () => {
    clearTimeout(timer)
    if (win.isDestroyed() || win.isMinimized() || win.isFullScreen()) return
    try {
      fs.writeFileSync(filePath, JSON.stringify({
        ...win.getNormalBounds(),
        maximized: win.isMaximized(),
      }))
    } catch (error) {
      console.warn('ウィンドウの位置とサイズを保存できませんでした:', error.message)
    }
  }
  const scheduleSave = () => {
    clearTimeout(timer)
    timer = setTimeout(save, 250)
  }

  for (const event of ['move', 'resize', 'maximize', 'unmaximize']) {
    win.on(event, scheduleSave)
  }
  win.on('close', save)
  app.on('before-quit', save)
  win.on('closed', () => {
    clearTimeout(timer)
    app.removeListener('before-quit', save)
  })
}

module.exports = { loadWindowState, trackWindowState }
