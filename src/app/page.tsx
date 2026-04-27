'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { toPng } from 'html-to-image'
import MenuPreview, { MenuSection, MenuItem } from './components/MenuPreview'
import styles from './page.module.css'

// ---------------------------------------------------------------------------
// Markdown parser
// ---------------------------------------------------------------------------
function parseMarkdown(text: string): MenuSection[] {
  const sections: MenuSection[] = []
  let current: MenuSection | null = null

  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue

    if (line.startsWith('####')) {
      const content = line.replace(/^#+\s*/, '').replace(/\*+/g, '').trim()
      const [eng, chn] = content.split('|').map(s => s.trim())
      current = { english: eng || content, chinese: chn || '', items: [] }
      sections.push(current)
      continue
    }

    if (/^#{1,3}[^#]/.test(line)) continue
    if (!current) continue

    const isNote = line.startsWith('_')
    if (!line.startsWith('*') && !isNote) continue

    const content = line.replace(/^[*_]+/, '').replace(/[*_]+$/, '').trim()
    const parts = content.split('|').map(s => s.trim())

    const item: MenuItem =
      parts.length >= 2
        ? { english: parts[0], chinese: parts[1], isNote }
        : { english: parts[0], chinese: '', isNote }

    if (item.english) current.items.push(item)
  }

  return sections
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------
const DEFAULT_MD = `### *Dinner Menu 晚宴菜單*
*April 28, 2026 | 2026年4月28日*

#### *APPETIZERS | 開胃小菜*
*Japanese-style Marinated Cherry Tomatoes | 日式小蕃茄*
*Sweet and Sour Pickled Daikon | 糖醋白蘿蔔*
*Taiwanese-style Pickled Cucumbers | 台式醃小黃瓜*

#### *SASHIMI | 生魚片*
*Premium Toro Sashimi Platter | 高檔拖羅生魚片拼盤*
_— Courtesy of Samuel & Lily | 由 Samuel & Lily 提供 —_

#### *HOT DISHES | 熱菜*
*Beef-wrapped Enoki Mushrooms | 牛肉包金針菇*
*Stir-fried Chives with Bean Sprouts | 韭菜炒銀芽*
*Slow-braised Beef Stew | 燉牛肉*
*Taiwanese Braised Pork Belly | 台式控肉*

#### *SOUP | 湯品*
*Pork Rib Soup with Radish and Corn | 蘿蔔排骨玉米湯*`

// ---------------------------------------------------------------------------
// Shared style helpers
// ---------------------------------------------------------------------------
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#444',
  marginBottom: '6px',
  marginTop: '16px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1.5px solid #ddd',
  borderRadius: '8px',
  fontSize: '14px',
  color: '#111',
  background: '#fafafa',
  boxSizing: 'border-box',
  outline: 'none',
  fontFamily: 'inherit',
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function Home() {
  const [restaurantName, setRestaurantName] = useState("Lillian's Bistro")
  const [dateTime, setDateTime] = useState('28/4/2026 6:00pm')
  const [hosts, setHosts] = useState('Lilly和Samuel')
  const [markdown, setMarkdown] = useState(DEFAULT_MD)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')

  // previewZoom: how much to visually shrink the 750px card to fit the screen.
  // The hidden ref element is always full-size; only the visible clone is zoomed.
  const [previewZoom, setPreviewZoom] = useState(1)

  // Ref for the hidden full-size element used for PNG capture
  const downloadRef = useRef<HTMLDivElement>(null)

  const sections = parseMarkdown(markdown)

  // Compute zoom so the preview fits the available width
  useEffect(() => {
    const update = () => {
      if (window.innerWidth < 768) {
        // Mobile: fill screen width minus padding
        const available = window.innerWidth - 32
        setPreviewZoom(Math.min(1, available / 750))
      } else {
        setPreviewZoom(1)
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const handleDownload = useCallback(async () => {
    if (!downloadRef.current) return
    setBusy(true)
    try {
      await document.fonts.ready
      const dataUrl = await toPng(downloadRef.current, {
        pixelRatio: 2,
        backgroundColor: 'white',
      })

      const filename = `${(restaurantName || 'menu').replace(/\s+/g, '-').toLowerCase()}.png`

      // On mobile, use the Web Share API so iOS "Save Image" sends directly to Photos
      // and Android shows the native share sheet. Falls back to <a download> on desktop.
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], filename, { type: 'image/png' })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] })
      } else {
        const a = document.createElement('a')
        a.download = filename
        a.href = dataUrl
        a.click()
      }
    } catch (err) {
      // User cancelled the share sheet — not a real error
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('PNG export failed:', err)
      }
    } finally {
      setBusy(false)
    }
  }, [restaurantName])

  const menuProps = { restaurantName, dateTime, hosts, sections }

  const downloadButton = (
    <button
      onClick={handleDownload}
      disabled={busy}
      style={{
        width: '100%',
        padding: '13px 0',
        marginTop: '16px',
        background: busy ? '#f0a0cc' : '#FF4DB3',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '15px',
        fontWeight: 700,
        cursor: busy ? 'not-allowed' : 'pointer',
        letterSpacing: '0.5px',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      {busy ? 'Generating…' : '⬇ Download PNG'}
    </button>
  )

  return (
    <div className={styles.layout}>
      {/* Hidden full-size card used exclusively for PNG capture */}
      <div
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        <MenuPreview ref={downloadRef} {...menuProps} />
      </div>

      {/* ── Mobile tab bar ── */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tabBtn} ${tab === 'edit' ? styles.tabBtnActive : ''}`}
          onClick={() => setTab('edit')}
        >
          Edit
        </button>
        <button
          className={`${styles.tabBtn} ${tab === 'preview' ? styles.tabBtnActive : ''}`}
          onClick={() => setTab('preview')}
        >
          Preview
        </button>
      </div>

      {/* ── Form panel ── */}
      <aside
        className={`${styles.formPanel} ${tab !== 'edit' ? styles.mobileHidden : ''}`}
      >
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#111', margin: '0 0 4px' }}>
          Menu Card Generator
        </h1>
        <p style={{ fontSize: '13px', color: '#888', margin: '0 0 4px' }}>
          Fill in the fields — the preview updates live.
        </p>
        <p style={{ fontSize: '12px', color: '#bbb', margin: '0 0 4px' }}>
          <code>*English | 中文*</code> for items
        </p>
        <p style={{ fontSize: '12px', color: '#bbb', margin: '0 0 12px' }}>
          <code>#### *SECTION | 中文*</code> for sections · <code>_note_</code> for italics
        </p>

        <label style={labelStyle}>Restaurant Name</label>
        <input
          style={inputStyle}
          value={restaurantName}
          onChange={e => setRestaurantName(e.target.value)}
          placeholder="e.g. Lillian's Bistro"
        />

        <label style={labelStyle}>Date &amp; Time</label>
        <input
          style={inputStyle}
          value={dateTime}
          onChange={e => setDateTime(e.target.value)}
          placeholder="e.g. 28/4/2026 6:00pm"
        />

        <label style={labelStyle}>Host Names</label>
        <input
          style={inputStyle}
          value={hosts}
          onChange={e => setHosts(e.target.value)}
          placeholder="e.g. Lilly和Samuel"
        />

        <label style={labelStyle}>Menu (Markdown)</label>
        <textarea
          style={{
            ...inputStyle,
            flex: 1,
            minHeight: '200px',
            resize: 'vertical',
            fontFamily: 'monospace',
            fontSize: '12px',
            lineHeight: 1.5,
          }}
          value={markdown}
          onChange={e => setMarkdown(e.target.value)}
          spellCheck={false}
        />

        {downloadButton}
      </aside>

      {/* ── Preview panel ── */}
      <main
        className={`${styles.previewPanel} ${tab !== 'preview' ? styles.mobileHidden : ''}`}
      >
        <p className={styles.previewLabel}>
          Live preview · downloaded PNG is 2× resolution
        </p>

        {/* Visible card — zoomed to fit on small screens */}
        <div style={{ zoom: previewZoom, flexShrink: 0 }}>
          <MenuPreview {...menuProps} />
        </div>

        {/* Download button also available in the preview tab on mobile */}
        <div
          style={{ marginTop: '16px', maxWidth: `${750 * previewZoom}px` }}
        >
          {downloadButton}
        </div>
      </main>
    </div>
  )
}
