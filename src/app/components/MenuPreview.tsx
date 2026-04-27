'use client'
import { forwardRef } from 'react'

export interface MenuItem {
  english: string
  chinese: string
  isNote?: boolean
}

export interface MenuSection {
  english: string
  chinese: string
  items: MenuItem[]
}

export interface CornerImages {
  tl: string   // top-left  — 130×130 data URL, already cropped & flipped
  tr: string   // top-right
  bl: string   // bottom-left
  br: string   // bottom-right
}

export interface MenuData {
  restaurantName: string
  dateTime: string
  hosts: string
  sections: MenuSection[]
  corners?: CornerImages
}

const PINK = '#FF4DB3'

// Each corner is a pre-rendered 130×130 data URL with the correct crop and
// flip already baked in by canvas — no CSS transforms or overflow:hidden needed.
function CornerOrnament({ src }: { src: string }) {
  return (
    <img
      src={src}
      alt=""
      style={{ display: 'block', width: 130, height: 130, lineHeight: 0, flexShrink: 0 }}
    />
  )
}

// Border line positions derived from pixel measurements of the source image:
//   source top border  y ≈ 69px  →  69 × (130/300) ≈ 30px in container
//   source left border x ≈ 137px → 137 × (130/300) ≈ 59px in container
const FRAME_T = 30   // top/bottom frame line offset from card edge
const FRAME_S = 59   // left/right frame line offset from card edge

// ---------------------------------------------------------------------------
// MenuPreview
// ---------------------------------------------------------------------------
const MenuPreview = forwardRef<HTMLDivElement, MenuData>(
  ({ restaurantName, dateTime, hosts, sections, corners }, ref) => (
    <div
      ref={ref}
      style={{
        width: '750px',
        background: 'white',
        position: 'relative',
        fontFamily: '"Times New Roman", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", serif',
        color: PINK,
      }}
    >
      {/* Horizontal frame lines — continue from the image corner border */}
      <div style={{ position: 'absolute', top: FRAME_T, left: 130, right: 130, height: 2, background: PINK }} />
      <div style={{ position: 'absolute', bottom: FRAME_T, left: 130, right: 130, height: 2, background: PINK }} />

      {/* Vertical frame lines */}
      <div style={{ position: 'absolute', left: FRAME_S, top: 130, bottom: 130, width: 2, background: PINK }} />
      <div style={{ position: 'absolute', right: FRAME_S, top: 130, bottom: 130, width: 2, background: PINK }} />

      {/* Corner ornaments — pre-rendered 130×130 data URLs, no transforms needed */}
      {corners && <>
        <div style={{ position: 'absolute', top: 0, left: 0 }}><CornerOrnament src={corners.tl} /></div>
        <div style={{ position: 'absolute', top: 0, right: 0 }}><CornerOrnament src={corners.tr} /></div>
        <div style={{ position: 'absolute', bottom: 0, left: 0 }}><CornerOrnament src={corners.bl} /></div>
        <div style={{ position: 'absolute', bottom: 0, right: 0 }}><CornerOrnament src={corners.br} /></div>
      </>}

      {/* Page content */}
      <div style={{ padding: '88px 106px 68px', textAlign: 'center' }}>
        {/* Restaurant name */}
        <div
          style={{
            fontFamily: 'var(--font-great-vibes), "Great Vibes", cursive',
            fontSize: '56px',
            fontWeight: 400,
            color: PINK,
            lineHeight: 1.25,
            marginBottom: '16px',
          }}
        >
          {restaurantName || 'Restaurant Name'}
        </div>

        {/* Date / time */}
        {dateTime && (
          <div style={{ fontSize: '19px', marginBottom: '4px' }}>{dateTime}</div>
        )}

        {/* Host names */}
        {hosts && (
          <div style={{ fontSize: '19px', marginBottom: '22px' }}>{hosts}</div>
        )}

        {/* Menu sections */}
        {sections.map((section, si) => (
          <div key={si}>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 700,
                letterSpacing: '3px',
                marginTop: si === 0 ? '4px' : '22px',
                marginBottom: '14px',
              }}
            >
              {section.english}
            </div>

            {section.items.map((item, ii) => (
              <div key={ii} style={{ marginBottom: item.isNote ? '6px' : '16px' }}>
                {item.isNote ? (
                  <div style={{ fontSize: '14px', fontStyle: 'italic', opacity: 0.9 }}>
                    {item.chinese && <div>{item.chinese}</div>}
                    <div>{item.english}</div>
                  </div>
                ) : (
                  <>
                    {item.chinese && (
                      <div style={{ fontSize: '19px', fontWeight: 600, marginBottom: '2px' }}>
                        {item.chinese}
                      </div>
                    )}
                    <div style={{ fontSize: '15px' }}>{item.english}</div>
                  </>
                )}
              </div>
            ))}
          </div>
        ))}

        <div style={{ height: '28px' }} />
      </div>
    </div>
  )
)

MenuPreview.displayName = 'MenuPreview'
export default MenuPreview
