import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Bookmark, Globe, RotateCw, Star, X } from 'lucide-react'

const browser = window.fontDock?.browser
const bookmarksKey = 'fontdock:bookmarks'

function isWebUrl(value) {
  try { return ['http:', 'https:'].includes(new URL(value).protocol) } catch { return false }
}

function readBookmarks() {
  try {
    const saved = JSON.parse(localStorage.getItem(bookmarksKey) || '[]')
    if (!Array.isArray(saved)) return []
    const seen = new Set()
    return saved.filter(item => {
      if (!item || !isWebUrl(item.url) || typeof item.title !== 'string' || seen.has(item.url)) return false
      seen.add(item.url)
      return true
    })
  } catch { return [] }
}

export default function BrowserPanel({ active, fonts, family, onFamilyChange }) {
  const viewportRef = useRef(null)
  const lastUrlRef = useRef('')
  const [address, setAddress] = useState('https://x.com')
  const [fontQuery, setFontQuery] = useState('')
  const [state, setState] = useState({ url: '', title: '', loading: false, applying: false, appliedFont: '', error: '', fontError: '' })
  const [submitted, setSubmitted] = useState(false)
  const [bookmarks, setBookmarks] = useState(readBookmarks)
  const [bookmarkError, setBookmarkError] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(bookmarksKey, JSON.stringify(bookmarks))
      setBookmarkError('')
    } catch {
      setBookmarkError('ブックマークを保存できませんでした。')
    }
  }, [bookmarks])

  useEffect(() => browser?.onState((next) => {
    setState(next)
    if (next.url) {
      if (next.url !== lastUrlRef.current) setAddress(next.url)
      lastUrlRef.current = next.url
      setSubmitted(true)
    }
  }), [])

  useEffect(() => { browser?.font(family) }, [family])

  useLayoutEffect(() => {
    if (!browser) return
    if (!active) { browser.layout({ visible: false }); return }
    const update = () => {
      const rect = viewportRef.current?.getBoundingClientRect()
      if (rect) browser.layout({ visible: submitted, x: rect.x, y: rect.y, width: rect.width, height: rect.height })
    }
    const observer = new ResizeObserver(update)
    if (viewportRef.current) observer.observe(viewportRef.current)
    window.addEventListener('resize', update)
    update()
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
      browser.layout({ visible: false })
    }
  }, [active, submitted])

  const navigate = (event) => {
    event.preventDefault()
    if (!address.trim() || !browser) return
    setSubmitted(true)
    browser.navigate(address)
  }
  const candidates = fonts.filter(font => `${font.family} ${font.label}`.toLowerCase().includes(fontQuery.trim().toLowerCase()))
  const selection = fonts.find(font => font.family === family)
  const bookmarked = bookmarks.some(item => item.url === state.url)
  const removeBookmark = (url) => setBookmarks(current => current.filter(item => item.url !== url))
  const toggleBookmark = () => {
    if (!isWebUrl(state.url)) return
    if (bookmarked) { removeBookmark(state.url); return }
    setBookmarks(current => current.some(item => item.url === state.url) ? current : [...current, {
      url: state.url,
      title: state.title.trim() || new URL(state.url).hostname,
    }])
  }
  const openBookmark = (url) => {
    if (!browser) return
    setAddress(url)
    setSubmitted(true)
    browser.navigate(url)
  }

  return (
    <section className={`browser-panel ${active ? 'is-active' : ''}`} aria-label="Webフォントプレビュー" hidden={!active}>
      {!browser && <p className="browser-warning">この機能はElectronアプリで利用できます。start.sh からアプリを起動してください。</p>}
      <div className="browser-toolbar">
        <div className="browser-navigation">
          <button title="戻る" aria-label="戻る" disabled={!state.canGoBack} onClick={() => browser?.action('back')}><ArrowLeft size={17} /></button>
          <button title="進む" aria-label="進む" disabled={!state.canGoForward} onClick={() => browser?.action('forward')}><ArrowRight size={17} /></button>
          <button title={state.loading ? '読み込みを停止' : '再読み込み'} aria-label={state.loading ? '読み込みを停止' : '再読み込み'} disabled={!submitted} onClick={() => browser?.action(state.loading ? 'stop' : 'reload')}>
            {state.loading ? <X size={17} /> : <RotateCw size={17} />}
          </button>
        </div>
        <form className="browser-address" onSubmit={navigate}>
          <Globe size={16} /><input aria-label="WebページのURL" value={address} onChange={event => setAddress(event.target.value)} placeholder="https://example.com" spellCheck={false} />
          <button type="button" className={`bookmark-toggle ${bookmarked ? 'is-saved' : ''}`} title={bookmarked ? 'ブックマークを解除' : 'このページをブックマーク'} aria-label={bookmarked ? 'ブックマークを解除' : 'このページをブックマーク'} aria-pressed={bookmarked} disabled={!browser || !isWebUrl(state.url)} onClick={toggleBookmark}><Star size={17} fill={bookmarked ? 'currentColor' : 'none'} /></button>
          <button type="submit" disabled={!browser || !address.trim()}>開く</button>
        </form>
      </div>
      <nav className="bookmarks-bar" aria-label="ブックマークバー">
        <Bookmark className="bookmarks-bar-icon" size={14} aria-hidden="true" />
        <div className="bookmarks-items">
          {bookmarks.length === 0 && <span className="bookmarks-empty">URL欄の☆でブックマークに追加</span>}
          {bookmarks.map(item => (
            <div className="bookmark-item" key={item.url}>
              <button className="bookmark-link" title={`${item.title}\n${item.url}`} disabled={!browser} onClick={() => openBookmark(item.url)}>{item.title}</button>
              <button className="bookmark-remove" title="ブックマークを削除" aria-label={`${item.title} のブックマークを削除`} onClick={() => removeBookmark(item.url)}><X size={12} /></button>
            </div>
          ))}
        </div>
      </nav>
      {bookmarkError && <p className="browser-warning" role="alert">{bookmarkError}</p>}
      <div className="browser-font-toolbar">
        <label className="browser-font-search">フォントを探す<input value={fontQuery} onChange={event => setFontQuery(event.target.value)} placeholder="フォント名で絞り込み" /></label>
        <label className="browser-font-select">ページのフォント
          <select value={family} onChange={event => onFamilyChange(event.target.value)} disabled={!browser}>
            <option value="">サイト標準</option>
            {family && !candidates.some(font => font.family === family) && <option value={family}>{selection?.label || family}</option>}
            {candidates.map(font => <option key={font.family} value={font.family}>{font.label} · {font.language}</option>)}
          </select>
        </label>
        <button className="browser-reset" disabled={!family} onClick={() => onFamilyChange('')}>標準に戻す</button>
      </div>
      <div className="browser-status" role="status">
        <span>{state.loading ? 'ページを読み込み中…' : state.title || 'URLを入力してページを開いてください'}</span>
        <span>{state.applying ? 'フォントを適用中…' : state.appliedFont ? `${state.appliedFont} を適用` : 'サイト標準のフォント'}</span>
      </div>
      {(state.error || state.fontError) && <div className="browser-warning" role="alert">{state.error || state.fontError}</div>}
      <div className="browser-viewport" ref={viewportRef}>
        {!submitted && <div className="browser-empty"><Globe size={38} /><h2>Webページでフォントを試す</h2><p>URLを入力して「開く」を押してください。<br />フォント一覧の「Webで試す」からも選べます。</p></div>}
      </div>
      <p className="browser-footnote">画像の文字・絵文字・一部の埋め込み表示には適用されません。サイトによってはログインや表示が制限される場合があります。</p>
    </section>
  )
}
