'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { toPng } from 'html-to-image'
import MenuPreview, { MenuData, CornerImages } from './components/MenuPreview'
import styles from './page.module.css'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Role = 'user' | 'assistant'
interface Message { role: Role; content: string }

const EMPTY_MENU: MenuData = { restaurantName: "Lillian's Bistro", dateTime: '', hosts: '', sections: [] }

const GREETING = '你好！我来帮你制作 Lillian\'s Bistro 的菜单卡。请问活动的日期和时间是什么？'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function extractMenuState(text: string): MenuData | null {
  const m = text.match(/<menu_state>([\s\S]*?)<\/menu_state>/)
  if (!m) return null
  try {
    const p = JSON.parse(m[1].trim())
    return {
      restaurantName: p.restaurantName ?? '',
      dateTime:       p.dateTime ?? '',
      hosts:          p.hosts ?? '',
      sections:       Array.isArray(p.sections) ? p.sections : [],
    }
  } catch { return null }
}

function stripMenuState(text: string): string {
  return text.replace(/<menu_state>[\s\S]*?<\/menu_state>/g, '').trim()
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function Home() {
  const [messages, setMessages]   = useState<Message[]>([{ role: 'assistant', content: GREETING }])
  const [input, setInput]         = useState('')
  const [busy, setBusy]           = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [tab, setTab]             = useState<'chat' | 'preview'>('chat')
  const [previewZoom, setPreviewZoom] = useState(1)
  const [menuData, setMenuData]   = useState<MenuData>(EMPTY_MENU)
  const [corners, setCorners] = useState<CornerImages | undefined>(undefined)

  const downloadRef = useRef<HTMLDivElement>(null)
  const chatEndRef  = useRef<HTMLDivElement>(null)
  const inputRef    = useRef<HTMLInputElement>(null)

  // Pre-render each corner as a 130×130 canvas crop with the flip baked in.
  // This avoids large data URLs and removes any CSS transform / overflow:hidden
  // that html-to-image struggles with on mobile.
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      const CROP = 300, OUT = 130

      function makeCorner(flipX: boolean, flipY: boolean): string {
        const c = document.createElement('canvas')
        c.width = OUT; c.height = OUT
        const ctx = c.getContext('2d')!
        if (flipX && flipY) { ctx.translate(OUT, OUT); ctx.scale(-1, -1) }
        else if (flipX)     { ctx.translate(OUT, 0);   ctx.scale(-1,  1) }
        else if (flipY)     { ctx.translate(0,   OUT); ctx.scale( 1, -1) }
        ctx.drawImage(img, 0, 0, CROP, CROP, 0, 0, OUT, OUT)
        return c.toDataURL('image/png')
      }

      setCorners({
        tl: makeCorner(false, false),
        tr: makeCorner(true,  false),
        bl: makeCorner(false, true),
        br: makeCorner(true,  true),
      })
    }
    img.src = '/image.png'
  }, [])

  // Responsive zoom for mobile preview
  useEffect(() => {
    const update = () => {
      setPreviewZoom(
        window.innerWidth < 768 ? Math.min(1, (window.innerWidth - 32) / 750) : 1
      )
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Keep chat scrolled to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ---------------------------------------------------------------------------
  const sendMessage = useCallback(async (currentMessages: Message[], userText: string) => {
    const updated = [...currentMessages, { role: 'user' as Role, content: userText }]
    setMessages(updated)
    setBusy(true)

    try {
      const apiMessages = updated.slice(1).map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      })
      const { text } = await res.json()

      const state = extractMenuState(text)
      if (state) setMenuData(state)

      setMessages(prev => [...prev, { role: 'assistant', content: text }])
    } catch (err) {
      console.error('Chat error:', err)
    } finally {
      setBusy(false)
      inputRef.current?.focus()
    }
  }, [])

  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text || busy) return
    setInput('')
    sendMessage(messages, text)
  }, [input, busy, messages, sendMessage])

  // ---------------------------------------------------------------------------
  const handleDownload = useCallback(async () => {
    if (!downloadRef.current) return
    setDownloading(true)
    try {
      await document.fonts.ready
      const dataUrl = await toPng(downloadRef.current, { pixelRatio: 2, backgroundColor: 'white' })
      const filename = `${(menuData.restaurantName || 'menu').replace(/\s+/g, '-').toLowerCase()}.png`
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
      if (err instanceof Error && err.name !== 'AbortError') console.error('PNG export failed:', err)
    } finally {
      setDownloading(false)
    }
  }, [menuData.restaurantName])

  // ---------------------------------------------------------------------------
  const menuProps = { ...menuData, corners }

  const downloadBtn = (full: boolean) => (
    <button
      onClick={handleDownload}
      disabled={downloading}
      style={{
        width: full ? '100%' : undefined,
        padding: full ? '13px 0' : '8px 18px',
        background: downloading ? '#f0a0cc' : '#FF4DB3',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: full ? '15px' : '13px',
        fontWeight: 700,
        cursor: downloading ? 'not-allowed' : 'pointer',
        letterSpacing: '0.3px',
        flexShrink: 0,
      }}
    >
      {downloading ? 'Generating…' : '⬇ Download PNG'}
    </button>
  )

  return (
    <div className={styles.layout}>
      {/* Hidden full-size capture element */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none' }} aria-hidden="true">
        <MenuPreview ref={downloadRef} {...menuProps} />
      </div>

      {/* ── Mobile tab bar ── */}
      <div className={styles.tabBar}>
        <button className={`${styles.tabBtn} ${tab === 'chat'    ? styles.tabBtnActive : ''}`} onClick={() => setTab('chat')}>Chat</button>
        <button className={`${styles.tabBtn} ${tab === 'preview' ? styles.tabBtnActive : ''}`} onClick={() => setTab('preview')}>Preview</button>
      </div>

      {/* ── Chat panel ── */}
      <aside className={`${styles.formPanel} ${tab !== 'chat' ? styles.mobileHidden : ''}`}>
        {/* Message list */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '8px' }}>
          {messages.map((msg, i) => {
            const text = msg.role === 'assistant' ? stripMenuState(msg.content) : msg.content
            if (!text) return null
            const isUser = msg.role === 'user'
            return (
              <div key={i} style={{
                alignSelf:    isUser ? 'flex-end' : 'flex-start',
                maxWidth:     '88%',
                background:   isUser ? '#FF4DB3' : '#f2f2f2',
                color:        isUser ? 'white' : '#111',
                borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                padding:      '10px 14px',
                fontSize:     '14px',
                lineHeight:   1.55,
                whiteSpace:   'pre-wrap',
              }}>
                {text}
              </div>
            )
          })}
          {busy && (
            <div style={{ alignSelf: 'flex-start', padding: '10px 14px' }}>
              <div className={styles.spinner} />
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input row */}
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0, paddingTop: '10px', borderTop: '1px solid #eee' }}>
          <input
            ref={inputRef}
            style={{
              flex: 1,
              padding: '10px 14px',
              border: '1.5px solid #ddd',
              borderRadius: '10px',
              fontSize: '14px',
              outline: 'none',
              fontFamily: 'inherit',
              background: '#fafafa',
            }}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Type a message…"
            disabled={busy}
          />
          <button
            onClick={handleSend}
            disabled={busy || !input.trim()}
            style={{
              padding: '10px 18px',
              background: '#FF4DB3',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: busy || !input.trim() ? 'not-allowed' : 'pointer',
              opacity: busy || !input.trim() ? 0.45 : 1,
              flexShrink: 0,
              transition: 'opacity 0.15s',
            }}
          >
            Send
          </button>
        </div>
      </aside>

      {/* ── Preview panel ── */}
      <main className={`${styles.previewPanel} ${tab !== 'preview' ? styles.mobileHidden : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexShrink: 0 }}>
          <span style={{ fontSize: '12px', color: '#aaa' }}>Live preview · 2× PNG on download</span>
          {downloadBtn(false)}
        </div>

        <div style={{ zoom: previewZoom, flexShrink: 0 }}>
          <MenuPreview {...menuProps} />
        </div>

        {/* Mobile-only full-width download button below preview */}
        <div className={styles.mobileDownload} style={{ marginTop: '16px', maxWidth: `${750 * previewZoom}px` }}>
          {downloadBtn(true)}
        </div>
      </main>
    </div>
  )
}
