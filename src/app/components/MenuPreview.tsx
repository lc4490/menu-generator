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

export interface MenuData {
  restaurantName: string
  dateTime: string
  hosts: string
  sections: MenuSection[]
  cornerSrc?: string  // data URL for the capture element; falls back to /image.png
}

const PINK = '#FF4DB3'

// ---------------------------------------------------------------------------
// Corner ornament — crops the top-left 300×300px of /image.png and scales
// it to 130×130. The source image (1545×2000) has its border lines at
// x≈137px (left) and y≈69px (top), which map to x≈59 / y≈30 in the
// 130px container. CSS frame lines are positioned to continue from those
// exact coordinates.
// ---------------------------------------------------------------------------
function CornerOrnament({
  flipX, flipY, src,
}: { flipX?: boolean; flipY?: boolean; src: string }) {
  const tf = [flipX && 'scaleX(-1)', flipY && 'scaleY(-1)'].filter(Boolean).join(' ')
  const scale = 130 / 300

  return (
    <div
      style={{
        width: 130,
        height: 130,
        overflow: 'hidden',
        lineHeight: 0,
        flexShrink: 0,
        transform: tf || undefined,
      }}
    >
      <img
        src={src}
        alt=""
        style={{
          display: 'block',
          width:  Math.round(1545 * scale),
          height: Math.round(2000 * scale),
        }}
      />
    </div>
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
  ({ restaurantName, dateTime, hosts, sections, cornerSrc = '/image.png' }, ref) => (
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

      {/* Corner ornaments — image-based, mirrored for each corner */}
      <div style={{ position: 'absolute', top: 0, left: 0 }}><CornerOrnament src={cornerSrc} /></div>
      <div style={{ position: 'absolute', top: 0, right: 0 }}><CornerOrnament src={cornerSrc} flipX /></div>
      <div style={{ position: 'absolute', bottom: 0, left: 0 }}><CornerOrnament src={cornerSrc} flipY /></div>
      <div style={{ position: 'absolute', bottom: 0, right: 0 }}><CornerOrnament src={cornerSrc} flipX flipY /></div>

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
