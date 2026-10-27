import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownToLine, Check, ChevronDown, ExternalLink, Grid2X2, Heart,
  Info, LayoutList, Minus, Plus, Search, SlidersHorizontal, Sparkles, X,
} from 'lucide-react'
import { fonts as fallbackFonts, googleCssUrl } from './fonts'

const defaultSample = '言葉に、静かな輪郭を。 Shape your ideas.'

function App() {
  const [query, setQuery] = useState('')
  const [fontCatalog, setFontCatalog] = useState(fallbackFonts)
  const [catalogState, setCatalogState] = useState('loading')
  const [category, setCategory] = useState('すべて')
  const [language, setLanguage] = useState('すべて')
  const [sample, setSample] = useState(defaultSample)
  const [fontSize, setFontSize] = useState(34)
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('fontdock:favorites') || '[]'))
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [sort, setSort] = useState('人気順')
  const [view, setView] = useState('grid')
  const [notice, setNotice] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [visibleLimit, setVisibleLimit] = useState(24)
  const searchRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('fontdock:favorites', JSON.stringify(favorites))
  }, [favorites])

  useEffect(() => {
    const focusSearch = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadCatalog() {
      try {
        let result
        if (window.fontDock) result = await window.fontDock.list()
        else {
          const response = await fetch('https://fonts.google.com/metadata/fonts')
          if (!response.ok) throw new Error('Catalog unavailable')
          const data = await response.json()
          result = { status: 'loaded', fonts: normalizeWebCatalog(data.familyMetadataList || []) }
        }
        if (!cancelled && result.status === 'loaded' && result.fonts.length) {
          setFontCatalog(result.fonts)
          setCatalogState('loaded')
        } else if (!cancelled) setCatalogState('fallback')
      } catch {
        if (!cancelled) setCatalogState('fallback')
      }
    }
    loadCatalog()
    return () => { cancelled = true }
  }, [])

  const categories = useMemo(() => ['すべて', ...new Set(fontCatalog.map((font) => font.category))], [fontCatalog])

  const visibleFonts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const result = fontCatalog.filter((font) => {
      const matchesQuery = !normalizedQuery || [font.family, font.label, font.author, ...font.tags]
        .join(' ').toLowerCase().includes(normalizedQuery)
      return matchesQuery
        && (category === 'すべて' || font.category === category)
        && (language === 'すべて' || font.language === language)
        && (!onlyFavorites || favorites.includes(font.family))
    })
    if (sort === '名前順') return [...result].sort((a, b) => a.family.localeCompare(b.family))
    if (sort === 'ウェイト数順') return [...result].sort((a, b) => b.weights - a.weights)
    if (sort === '新着順') return [...result].sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || ''))
    return [...result].sort((a, b) => (a.popularity || 99999) - (b.popularity || 99999))
  }, [fontCatalog, query, category, language, onlyFavorites, favorites, sort])

  useEffect(() => setVisibleLimit(24), [query, category, language, onlyFavorites, sort])

  const toggleFavorite = (family) => {
    setFavorites((current) => current.includes(family)
      ? current.filter((item) => item !== family)
      : [...current, family])
  }

  const showNotice = (message, type = 'success', filePath) => {
    setNotice({ message, type, filePath })
    window.setTimeout(() => setNotice(null), 5000)
  }

  const downloadFont = async (font) => {
    if (!window.fontDock) {
      window.open(`https://fonts.google.com/specimen/${font.family.replaceAll(' ', '+')}`, '_blank')
      showNotice('Google Fonts の配布ページを開きました')
      return
    }
    showNotice(`${font.label} をダウンロードしています…`, 'loading')
    const result = await window.fontDock.download(font)
    if (result.status === 'saved') showNotice('ダウンロードが完了しました', 'success', result.filePath)
    else if (result.status === 'error') showNotice(`ダウンロードできませんでした：${result.message}`, 'error')
    else setNotice(null)
  }

  const clearFilters = () => {
    setQuery(''); setCategory('すべて'); setLanguage('すべて'); setOnlyFavorites(false)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Font Dock ホーム">
          <span className="brand-mark"><span>F</span><span>d</span></span>
          <span>Font Dock</span>
        </a>
        <div className="header-search">
          <Search size={17} />
          <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="フォント名や作者で検索" />
          <kbd>⌘ K</kbd>
        </div>
        <div className="header-actions">
          <button className="help-button" title="このアプリについて"><Info size={19} /></button>
          <div className="avatar">YT</div>
        </div>
      </header>

      <aside className={`sidebar ${showFilters ? 'mobile-open' : ''}`}>
        <div className="mobile-filter-head">
          <strong>絞り込み</strong>
          <button onClick={() => setShowFilters(false)}><X size={20} /></button>
        </div>
        <nav className="side-nav">
          <button className={!onlyFavorites ? 'active' : ''} onClick={() => setOnlyFavorites(false)}>
            <Sparkles size={17} />見つける<span>{fontCatalog.length}</span>
          </button>
          <button className={onlyFavorites ? 'active' : ''} onClick={() => setOnlyFavorites(true)}>
            <Heart size={17} />お気に入り<span>{favorites.length}</span>
          </button>
        </nav>
        <div className="side-section">
          <div className="side-label">カテゴリー</div>
          <div className="category-list">
            {categories.map((item) => (
              <button key={item} className={category === item ? 'selected' : ''} onClick={() => setCategory(item)}>
                <span>{item}</span><span>{item === 'すべて' ? fontCatalog.length : fontCatalog.filter((f) => f.category === item).length}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="side-section">
          <div className="side-label">言語</div>
          <div className="segmented">
            {['すべて', '日本語', '欧文'].map((item) => (
              <button key={item} className={language === item ? 'selected' : ''} onClick={() => setLanguage(item)}>{item}</button>
            ))}
          </div>
        </div>
        <div className="license-note">
          <span className="leaf">✦</span>
          <div><strong>すべて商用利用可能</strong><p>掲載フォントはオープンライセンスで提供されています。</p></div>
        </div>
      </aside>

      <main className="main-content" id="top">
        <section className="intro">
          <div>
            <span className="eyebrow">OPEN FONT LIBRARY · {catalogState === 'loading' ? 'カタログ読込中' : `${fontCatalog.length.toLocaleString()} FAMILIES`}</span>
            <h1>好きな文字と、<br /><em>出会う場所。</em></h1>
            <p>自由に使える美しいフォントを、言葉を変えながら比べてみよう。</p>
          </div>
          <div className="intro-glyph" aria-hidden="true">あ<span>Aa</span></div>
        </section>

        <section className="sample-panel">
          <div className="sample-input-wrap">
            <label>プレビューテキスト</label>
            <input value={sample} onChange={(e) => setSample(e.target.value)} placeholder="表示したい文章を入力" />
            {sample !== defaultSample && <button className="reset-sample" onClick={() => setSample(defaultSample)}>リセット</button>}
          </div>
          <div className="size-control">
            <span>文字サイズ</span>
            <button onClick={() => setFontSize((s) => Math.max(18, s - 2))}><Minus size={14} /></button>
            <input type="range" min="18" max="64" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} />
            <button onClick={() => setFontSize((s) => Math.min(64, s + 2))}><Plus size={14} /></button>
            <output>{fontSize}px</output>
          </div>
        </section>

        <section className="results-toolbar">
          <div className="result-count"><strong>{visibleFonts.length}</strong> fonts</div>
          <button className="mobile-filter" onClick={() => setShowFilters(true)}><SlidersHorizontal size={16} />絞り込み</button>
          <div className="toolbar-right">
            <label className="sort-select">{sort}<ChevronDown size={14} />
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option>人気順</option><option>新着順</option><option>名前順</option><option>ウェイト数順</option>
              </select>
            </label>
            <div className="view-switch">
              <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}><Grid2X2 size={16} /></button>
              <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}><LayoutList size={17} /></button>
            </div>
          </div>
        </section>

        {visibleFonts.length > 0 ? (
          <section className={`font-grid ${view}`}>
            {visibleFonts.slice(0, visibleLimit).map((font) => (
              <FontCard key={font.family} font={font} sample={sample || font.sample || font.family} fontSize={fontSize}
                favorite={favorites.includes(font.family)} onFavorite={toggleFavorite} onDownload={downloadFont} />
            ))}
            {visibleFonts.length > visibleLimit && (
              <button className="load-more" onClick={() => setVisibleLimit((limit) => limit + 24)}>
                さらに24件を表示 <span>{visibleLimit.toLocaleString()} / {visibleFonts.length.toLocaleString()}</span>
              </button>
            )}
          </section>
        ) : (
          <div className="empty-state"><span>あ</span><h2>フォントが見つかりませんでした</h2><p>検索語や絞り込みを変えてみてください。</p><button onClick={clearFilters}>条件をクリア</button></div>
        )}
      </main>

      {showFilters && <div className="sidebar-scrim" onClick={() => setShowFilters(false)} />}
      {notice && (
        <div className={`toast ${notice.type}`}>
          <span className="toast-icon">{notice.type === 'loading' ? <span className="spinner" /> : notice.type === 'error' ? <X size={15} /> : <Check size={15} />}</span>
          <span>{notice.message}</span>
          {notice.filePath && <button onClick={() => window.fontDock?.reveal(notice.filePath)}>Finderで表示</button>}
        </div>
      )}
    </div>
  )
}

function FontCard({ font, sample, fontSize, favorite, onFavorite, onDownload }) {
  useEffect(() => {
    const id = `font-${font.family.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = googleCssUrl(font.family)
    document.head.appendChild(link)
  }, [font.family])

  const openSource = () => {
    const url = `https://fonts.google.com/specimen/${font.family.replaceAll(' ', '+')}`
    window.fontDock ? window.fontDock.openSource(url) : window.open(url, '_blank')
  }

  return (
    <article className="font-card">
      <div className="card-top">
        <div>
          <div className="font-title-row"><h2>{font.label}</h2>{font.featured && <span className="new-badge">PICK</span>}</div>
          <p>{font.author}</p>
        </div>
        <button className={`favorite-button ${favorite ? 'active' : ''}`} onClick={() => onFavorite(font.family)} aria-label="お気に入り">
          <Heart size={18} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="font-preview" style={{ fontFamily: `'${font.family}', sans-serif`, fontSize: `${fontSize}px` }}>{sample}</div>
      <div className="font-meta">
        <div className="weight-dots" title={`${font.weights}ウェイト`}>
          {Array.from({ length: Math.min(font.weights, 7) }, (_, i) => <i key={i} style={{ height: 6 + i * 1.5 }} />)}
          <span>{font.weights} weights</span>
        </div>
        <span>{font.category}</span>
        <span>{font.language}</span>
      </div>
      <div className="card-bottom">
        <button className="license-link" onClick={openSource} title={font.license}>OFL <ExternalLink size={12} /></button>
        <div className="tag-list">{font.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
        <button className="download-button" onClick={() => onDownload(font)}><ArrowDownToLine size={16} /><span>ダウンロード</span></button>
      </div>
    </article>
  )
}

export default App

function normalizeWebCatalog(list) {
  const categoryMap = { 'Sans Serif': 'サンセリフ', Serif: 'セリフ', Display: 'ディスプレイ', Handwriting: '手書き', Monospace: '等幅' }
  return list.filter((font) => font.isOpenSource !== false).map((font) => {
    const weights = new Set(Object.keys(font.fonts || {}).map((key) => key.replace('i', '')))
    const isJapanese = (font.subsets || []).includes('japanese')
    return {
      family: font.family, label: font.displayName || font.family,
      category: categoryMap[font.category] || font.category || 'その他', language: isJapanese ? '日本語' : '欧文',
      subsets: font.subsets || [], weights: Math.max(weights.size, 1), license: 'Open-source license',
      author: (font.designers || []).join(', ') || 'Unknown designer', featured: font.popularity <= 24,
      popularity: font.popularity || 99999, dateAdded: font.dateAdded || '',
      tags: [isJapanese ? '日本語対応' : font.category || 'Open source', ...(font.axes?.length ? ['Variable'] : [])],
    }
  })
}
