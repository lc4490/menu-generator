'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { toPng } from 'html-to-image'
import MenuPreview, { MenuSection, MenuItem } from './components/MenuPreview'
import styles from './page.module.css'

// ---------------------------------------------------------------------------
// Markdown parser — flexible, forgiving input
// ---------------------------------------------------------------------------
const CJK = /[一-鿿㐀-䶿豈-﫿]/

function splitBilingual(raw: string): { english: string; chinese: string } {
  // Explicit | separator
  const pipe = raw.indexOf('|')
  if (pipe > 0) {
    const a = raw.slice(0, pipe).trim()
    const b = raw.slice(pipe + 1).trim()
    if (CJK.test(b) && !CJK.test(a)) return { english: a, chinese: b }
    if (CJK.test(a) && !CJK.test(b)) return { english: b, chinese: a }
    return { english: a, chinese: b }
  }
  // Auto-detect Latin/CJK boundary (e.g. "Beef Stew燉牛肉")
  const cjkStart = raw.search(CJK)
  if (cjkStart < 0) return { english: raw, chinese: '' }
  if (cjkStart === 0) {
    const latinStart = raw.search(/[A-Za-z]/)
    if (latinStart > 0) return { english: raw.slice(latinStart).trim(), chinese: raw.slice(0, latinStart).trim() }
    return { english: '', chinese: raw }
  }
  return { english: raw.slice(0, cjkStart).trim(), chinese: raw.slice(cjkStart).trim() }
}

function parseMarkdown(text: string): MenuSection[] {
  const sections: MenuSection[] = []
  let current: MenuSection | null = null

  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue

    // Section header: ### or #### (or more hashes)
    if (/^#{3,}/.test(line)) {
      const content = line.replace(/^#+\s*/, '').replace(/\*+/g, '').trim()
      const { english, chinese } = splitBilingual(content)
      current = { english: english || content, chinese, items: [] }
      sections.push(current)
      continue
    }

    // Skip # and ## (top-level title lines)
    if (line.startsWith('#')) continue
    if (!current) continue

    // Note: _..._ wrapped or starts with em-dash
    const isNote = line.startsWith('_') || /^—/.test(line)

    // Strip any markdown decoration: *, _, -, • from start/end
    const content = line
      .replace(/^\*+\s?/, '').replace(/\*+$/, '')
      .replace(/^_+\s?/, '').replace(/_+$/, '')
      .replace(/^[-•]\s+/, '')
      .trim()

    if (!content) continue

    const { english, chinese } = splitBilingual(content)
    const eng = english || chinese
    if (eng) current.items.push({ english: eng, chinese: english ? chinese : '', isNote })
  }

  return sections
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------
const DEFAULT_MD = `#### APPETIZERS | 開胃小菜
Japanese-style Marinated Cherry Tomatoes | 日式小蕃茄
Sweet and Sour Pickled Daikon | 糖醋白蘿蔔
Taiwanese-style Pickled Cucumbers | 台式醃小黃瓜

#### SASHIMI | 生魚片
Premium Toro Sashimi Platter | 高檔拖羅生魚片拼盤
_— Courtesy of Samuel & Lily | 由 Samuel & Lily 提供 —_

#### HOT DISHES | 熱菜
Beef-wrapped Enoki Mushrooms | 牛肉包金針菇
Stir-fried Chives with Bean Sprouts | 韭菜炒銀芽
Slow-braised Beef Stew | 燉牛肉
Taiwanese Braised Pork Belly | 台式控肉

#### SOUP | 湯品
Pork Rib Soup with Radish and Corn | 蘿蔔排骨玉米湯`

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
  // Pre-encoded data URL for the corner image — avoids html-to-image's fetch step
  const [cornerSrc, setCornerSrc] = useState('/image.png')

  // Ref for the hidden full-size element used for PNG capture
  const downloadRef = useRef<HTMLDivElement>(null)

  const sections = parseMarkdown(markdown)

  // Convert corner image to data URL once so html-to-image never has to fetch it
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d')!.drawImage(img, 0, 0)
      setCornerSrc(canvas.toDataURL('image/png'))
    }
    img.src = '/image.png'
  }, [])

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
      // Wait for all images (corner ornaments) to finish loading
      await Promise.all(
        Array.from(downloadRef.current.querySelectorAll('img')).map(img =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>(res => { img.onload = () => res(); img.onerror = () => res() })
        )
      )
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
      {/* Hidden full-size card used exclusively for PNG capture.
          Must NOT use visibility:hidden — it's inherited and makes html-to-image
          capture a blank white box. Off-screen position is sufficient. */}
      <div
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        <MenuPreview ref={downloadRef} {...menuProps} cornerSrc={cornerSrc} />
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
          菜單生成器 Menu Generator
        </h1>
        <p style={{ fontSize: '13px', color: '#888', margin: '0 0 8px' }}>
          填寫欄位，預覽即時更新。Fill in the fields — preview updates live.
        </p>
        <p style={{ fontSize: '12px', color: '#bbb', margin: '0 0 12px' }}>
          <code>#### SECTION | 中文</code> for sections &nbsp;·&nbsp; <code>English | 中文</code> for items &nbsp;·&nbsp; <code>_note_</code> for italics
        </p>

        <label style={labelStyle}>餐廳名稱 &nbsp;Restaurant Name</label>
        <input
          style={inputStyle}
          value={restaurantName}
          onChange={e => setRestaurantName(e.target.value)}
          placeholder="e.g. Lillian's Bistro"
        />

        <label style={labelStyle}>日期時間 &nbsp;Date &amp; Time</label>
        <input
          style={inputStyle}
          value={dateTime}
          onChange={e => setDateTime(e.target.value)}
          placeholder="e.g. 28/4/2026 6:00pm"
        />

        <label style={labelStyle}>主人名稱 &nbsp;Host Names</label>
        <input
          style={inputStyle}
          value={hosts}
          onChange={e => setHosts(e.target.value)}
          placeholder="e.g. Lilly和Samuel"
        />

        <label style={labelStyle}>菜單內容 &nbsp;Menu</label>
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
