// WhimsicalComponents.jsx
// ES6 module: whimsical drag-and-drop canvas components for Sketchpad
// Exports: WHIMSICAL_COMPONENTS, renderWhimsicalElement, WhimsicalComponentPicker

// ─── Component type registry ──────────────────────────────────────────────────
export const WHIMSICAL_COMPONENTS = [
    { id: 'wc-button', label: 'Button', icon: '⬭', defaultW: 160, defaultH: 48 },
    { id: 'wc-progress', label: 'Progress Bar', icon: '▬', defaultW: 260, defaultH: 56 },
    { id: 'wc-table', label: 'Table', icon: '⊞', defaultW: 340, defaultH: 180 },
    { id: 'wc-radio', label: 'Radio Group', icon: '◉', defaultW: 200, defaultH: 120 },
    { id: 'wc-avatar', label: 'Avatar', icon: '◯', defaultW: 80, defaultH: 80 },
    { id: 'wc-card', label: 'Card', icon: '▭', defaultW: 240, defaultH: 140 },
    { id: 'wc-badge', label: 'Badge', icon: '◈', defaultW: 120, defaultH: 38 },
    { id: 'wc-toggle', label: 'Toggle', icon: '⬮', defaultW: 160, defaultH: 44 },
]

// ─── Whimsy color palette ─────────────────────────────────────────────────────
const W = {
    coral: '#FF6B6B',
    mint: '#4ECDC4',
    butter: '#FFE66D',
    lilac: '#A8A4CE',
    sky: '#74B9FF',
    peach: '#FAB1A0',
    sage: '#55EFC4',
    ink: '#2D3436',
    cloud: '#FFEAA7',
    blush: '#FD79A8',
    teal: '#00CEC9',
    lemon: '#FDCB6E',
}

// ─── Helper: draw a rounded rect path ────────────────────────────────────────
function rrect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
}

// ─── Helper: wobbly path (hand-drawn feel) ────────────────────────────────────
function wobblePath(ctx, x, y, w, h, wobble = 2.5) {
    const jitter = () => (Math.random() - 0.5) * wobble
    ctx.beginPath()
    ctx.moveTo(x + jitter(), y + jitter())
    ctx.lineTo(x + w + jitter(), y + jitter())
    ctx.lineTo(x + w + jitter(), y + h + jitter())
    ctx.lineTo(x + jitter(), y + h + jitter())
    ctx.closePath()
}

// ─── Helper: draw text centered ──────────────────────────────────────────────
function centerText(ctx, text, cx, cy, font, size, color, maxWidth) {
    ctx.save()
    ctx.font = `${size}px ${font}`
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    if (maxWidth) ctx.fillText(text, cx, cy, maxWidth)
    else ctx.fillText(text, cx, cy)
    ctx.restore()
}

// ─── Component default data factories ─────────────────────────────────────────
export function makeComponentData(type) {
    switch (type) {
        case 'wc-button':
            return { label: 'Click me!', variant: 'primary', accent: W.coral }
        case 'wc-progress':
            return { label: 'Loading…', value: 65, accent: W.mint }
        case 'wc-table':
            return {
                cols: ['Name', 'Role', 'Status'],
                rows: [
                    ['Alice', 'Designer', 'Active'],
                    ['Bob', 'Engineer', 'Away'],
                    ['Carol', 'PM', 'Active'],
                ],
            }
        case 'wc-radio':
            return {
                label: 'Pick one',
                options: ['Option A', 'Option B', 'Option C'],
                selected: 0,
            }
        case 'wc-avatar':
            return { initials: 'AJ', bgColor: W.sky, label: 'AJ' }
        case 'wc-card':
            return { title: 'Card Title', body: 'Some description text here.', accent: W.lilac }
        case 'wc-badge':
            return { label: 'New ✦', accent: W.butter }
        case 'wc-toggle':
            return { label: 'Dark mode', on: false, accent: W.teal }
        default:
            return {}
    }
}

// ─── Main render dispatcher ──────────────────────────────────────────────────
export function renderWhimsicalElement(ctx, el, selected, panX, panY, zoom) {
    ctx.save()
    ctx.translate(panX, panY)
    ctx.scale(zoom, zoom)

    const x = Math.min(el.x1, el.x2)
    const y = Math.min(el.y1, el.y2)
    const w = Math.abs(el.x2 - el.x1) || (WHIMSICAL_COMPONENTS.find(c => c.id === el.tool)?.defaultW ?? 200)
    const h = Math.abs(el.y2 - el.y1) || (WHIMSICAL_COMPONENTS.find(c => c.id === el.tool)?.defaultH ?? 80)

    switch (el.tool) {
        case 'wc-button': drawButton(ctx, el, x, y, w, h); break
        case 'wc-progress': drawProgress(ctx, el, x, y, w, h); break
        case 'wc-table': drawTable(ctx, el, x, y, w, h); break
        case 'wc-radio': drawRadio(ctx, el, x, y, w, h); break
        case 'wc-avatar': drawAvatar(ctx, el, x, y, w, h); break
        case 'wc-card': drawCard(ctx, el, x, y, w, h); break
        case 'wc-badge': drawBadge(ctx, el, x, y, w, h); break
        case 'wc-toggle': drawToggle(ctx, el, x, y, w, h); break
    }

    if (selected) {
        ctx.strokeStyle = '#6366f1'
        ctx.lineWidth = 1.5 / zoom
        ctx.setLineDash([5 / zoom, 3 / zoom])
        ctx.globalAlpha = 0.9
        ctx.strokeRect(x - 8, y - 8, w + 16, h + 16)
        ctx.setLineDash([])
        // corner handles
        const handles = [
            [x - 8, y - 8], [x + w / 2, y - 8], [x + w + 8, y - 8],
            [x + w + 8, y + h / 2], [x + w + 8, y + h + 8],
            [x + w / 2, y + h + 8], [x - 8, y + h + 8], [x - 8, y + h / 2],
        ]
        ctx.globalAlpha = 1
        handles.forEach(([hx, hy]) => {
            ctx.beginPath()
            ctx.arc(hx, hy, 5 / zoom, 0, Math.PI * 2)
            ctx.fillStyle = '#fff'
            ctx.fill()
            ctx.strokeStyle = '#6366f1'
            ctx.lineWidth = 1.5 / zoom
            ctx.stroke()
        })
    }

    ctx.restore()
}

// ─── Button ───────────────────────────────────────────────────────────────────
function drawButton(ctx, el, x, y, w, h) {
    const d = el.data || {}
    const accent = d.accent || W.coral
    const label = d.label || 'Button'
    const r = h / 2

    // shadow / offset (whimsical solid shadow)
    ctx.fillStyle = W.ink
    rrect(ctx, x + 4, y + 4, w, h, r)
    ctx.fill()

    // body fill
    ctx.fillStyle = accent
    rrect(ctx, x, y, w, h, r)
    ctx.fill()

    // hand-drawn border
    ctx.strokeStyle = W.ink
    ctx.lineWidth = 2
    rrect(ctx, x, y, w, h, r)
    ctx.stroke()

    // shine strip
    ctx.save()
    rrect(ctx, x, y, w, h, r)
    ctx.clip()
    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    ctx.fillRect(x, y, w, h * 0.45)
    ctx.restore()

    // sparkle ✦
    ctx.font = '11px serif'
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText('✦', x + 14, y + h / 2)

    centerText(ctx, label, x + w / 2 + 8, y + h / 2, "'Kalam', cursive", Math.max(12, h * 0.36), W.ink)
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function drawProgress(ctx, el, x, y, w, h) {
    const d = el.data || {}
    const accent = d.accent || W.mint
    const label = d.label || 'Progress'
    const pct = Math.min(100, Math.max(0, d.value ?? 60))

    const barY = y + h * 0.5
    const barH = Math.max(14, h * 0.32)
    const r = barH / 2

    // label
    ctx.font = `bold 13px 'Kalam', cursive`
    ctx.fillStyle = W.ink
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(label, x + 2, barY - barH / 2 - 4)

    // percentage label right
    ctx.textAlign = 'right'
    ctx.fillText(`${pct}%`, x + w, barY - barH / 2 - 4)

    // track shadow
    ctx.fillStyle = 'rgba(0,0,0,0.10)'
    rrect(ctx, x + 3, barY + 3, w, barH, r)
    ctx.fill()

    // track bg
    ctx.fillStyle = '#F0F0EE'
    rrect(ctx, x, barY, w, barH, r)
    ctx.fill()
    ctx.strokeStyle = W.ink
    ctx.lineWidth = 1.5
    rrect(ctx, x, barY, w, barH, r)
    ctx.stroke()

    // fill bar
    const fillW = Math.max(barH, w * pct / 100)
    ctx.fillStyle = accent
    rrect(ctx, x, barY, fillW, barH, r)
    ctx.fill()

    // fill border
    ctx.strokeStyle = W.ink
    ctx.lineWidth = 1.5
    rrect(ctx, x, barY, fillW, barH, r)
    ctx.stroke()

    // shine
    ctx.save()
    rrect(ctx, x, barY, fillW, barH, r)
    ctx.clip()
    ctx.fillStyle = 'rgba(255,255,255,0.28)'
    ctx.fillRect(x, barY, fillW, barH / 2)
    ctx.restore()

    // tick marks
    for (let t = 25; t < 100; t += 25) {
        const tx = x + w * t / 100
        ctx.strokeStyle = 'rgba(0,0,0,0.10)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(tx, barY + barH * 0.2)
        ctx.lineTo(tx, barY + barH * 0.8)
        ctx.stroke()
    }

    // little emoji at the end of progress
    const emojis = ['🌱', '🌿', '🌳', '🌟']
    const ei = Math.floor(pct / 26)
    ctx.font = `${barH}px serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(emojis[Math.min(ei, 3)], x + fillW - barH * 0.4, barY + barH / 2)
}

// ─── Table ────────────────────────────────────────────────────────────────────
function drawTable(ctx, el, x, y, w, h) {
    const d = el.data || {}
    const cols = d.cols || ['Col 1', 'Col 2', 'Col 3']
    const rows = d.rows || [['Cell', 'Cell', 'Cell']]
    const nc = cols.length
    const nr = rows.length
    const cw = w / nc
    const rowH = Math.max(28, (h - 36) / Math.max(nr, 1))
    const hdrH = 36

    // card background
    ctx.fillStyle = '#FFFDF7'
    rrect(ctx, x, y, w, h, 10)
    ctx.fill()
    ctx.strokeStyle = W.ink
    ctx.lineWidth = 2
    rrect(ctx, x, y, w, h, 10)
    ctx.stroke()

    // header row
    ctx.fillStyle = W.butter
    ctx.save()
    rrect(ctx, x, y, w, hdrH, 10)
    ctx.clip()
    ctx.fillRect(x, y, w, hdrH)
    ctx.restore()

    // header border bottom
    ctx.strokeStyle = W.ink
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(x, y + hdrH)
    ctx.lineTo(x + w, y + hdrH)
    ctx.stroke()

    // header text
    cols.forEach((col, ci) => {
        centerText(ctx, col, x + cw * ci + cw / 2, y + hdrH / 2, "'DM Sans', sans-serif", 12, W.ink)
    })

    // vertical col dividers in header
    for (let ci = 1; ci < nc; ci++) {
        ctx.strokeStyle = 'rgba(0,0,0,0.12)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x + cw * ci, y)
        ctx.lineTo(x + cw * ci, y + h)
        ctx.stroke()
    }

    // rows
    rows.forEach((row, ri) => {
        const ry = y + hdrH + ri * rowH
        if (ri % 2 === 1) {
            ctx.fillStyle = 'rgba(78,205,196,0.07)'
            ctx.fillRect(x + 1, ry, w - 2, Math.min(rowH, y + h - ry))
        }
        // row divider
        ctx.strokeStyle = 'rgba(0,0,0,0.07)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, ry + rowH)
        ctx.lineTo(x + w, ry + rowH)
        ctx.stroke()

        cols.forEach((_, ci) => {
            const cell = (row[ci] ?? '—')
            // status badge for 3rd col
            if (ci === nc - 1 && (cell === 'Active' || cell === 'Away' || cell === 'Done' || cell === 'Pending')) {
                const bColor = cell === 'Active' || cell === 'Done' ? W.sage : cell === 'Pending' ? W.lemon : W.peach
                const bx = x + cw * ci + cw / 2 - 28
                const by = ry + rowH / 2 - 9
                rrect(ctx, bx, by, 56, 18, 9)
                ctx.fillStyle = bColor
                ctx.fill()
                ctx.strokeStyle = W.ink
                ctx.lineWidth = 1
                rrect(ctx, bx, by, 56, 18, 9)
                ctx.stroke()
                centerText(ctx, cell, x + cw * ci + cw / 2, ry + rowH / 2, "'DM Sans', sans-serif", 10, W.ink)
            } else {
                centerText(ctx, cell, x + cw * ci + cw / 2, ry + rowH / 2, "'DM Sans', sans-serif", 11, W.ink)
            }
        })
    })
}

// ─── Radio Group ─────────────────────────────────────────────────────────────
function drawRadio(ctx, el, x, y, w, h) {
    const d = el.data || {}
    const opts = d.options || ['Option A', 'Option B', 'Option C']
    const sel = d.selected ?? 0
    const lbl = d.label || 'Choose one'
    const accent = W.coral

    // card bg
    ctx.fillStyle = '#FFFDF7'
    rrect(ctx, x, y, w, h, 10)
    ctx.fill()
    ctx.strokeStyle = W.ink
    ctx.lineWidth = 1.5
    rrect(ctx, x, y, w, h, 10)
    ctx.stroke()

    // group label
    ctx.font = `bold 13px 'Kalam', cursive`
    ctx.fillStyle = W.ink
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(lbl, x + 14, y + 22)

    const startY = y + 36
    const itemH = (h - 40) / Math.max(opts.length, 1)

    opts.forEach((opt, i) => {
        const cy = startY + i * itemH + itemH / 2
        const cr = 8
        const cx = x + 18

        // outer circle
        ctx.beginPath()
        ctx.arc(cx, cy, cr, 0, Math.PI * 2)
        ctx.fillStyle = i === sel ? accent : '#F0F0EE'
        ctx.fill()
        ctx.strokeStyle = W.ink
        ctx.lineWidth = 1.5
        ctx.stroke()

        // inner dot
        if (i === sel) {
            ctx.beginPath()
            ctx.arc(cx, cy, cr * 0.42, 0, Math.PI * 2)
            ctx.fillStyle = '#fff'
            ctx.fill()
        }

        // label
        ctx.font = `13px 'DM Sans', sans-serif`
        ctx.fillStyle = W.ink
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText(opt, cx + cr + 8, cy)
    })
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function drawAvatar(ctx, el, x, y, w, h) {
    const d = el.data || {}
    const init = (d.initials || 'AJ').slice(0, 2).toUpperCase()
    const bg = d.bgColor || W.sky
    const r = Math.min(w, h) / 2
    const cx = x + w / 2
    const cy = y + h / 2

    // shadow
    ctx.beginPath()
    ctx.arc(cx + 3, cy + 3, r, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0,0,0,0.15)'
    ctx.fill()

    // main circle
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fillStyle = bg
    ctx.fill()
    ctx.strokeStyle = W.ink
    ctx.lineWidth = 2
    ctx.stroke()

    // shine arc
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.clip()
    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    ctx.beginPath()
    ctx.arc(cx - r * 0.2, cy - r * 0.3, r * 0.7, 0, Math.PI)
    ctx.fill()
    ctx.restore()

    // initials
    centerText(ctx, init, cx, cy, "'Kalam', cursive", r * 0.72, W.ink)

    // label below
    if (d.label && d.label !== init) {
        ctx.font = `11px 'DM Sans', sans-serif`
        ctx.fillStyle = W.ink
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(d.label, cx, y + h + 4)
    }

    // little star badge
    ctx.font = `${r * 0.45}px serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('★', cx + r * 0.5, cy - r * 0.5)
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function drawCard(ctx, el, x, y, w, h) {
    const d = el.data || {}
    const title = d.title || 'Card Title'
    const body = d.body || 'Description here.'
    const accent = d.accent || W.lilac

    // solid shadow
    ctx.fillStyle = W.ink
    rrect(ctx, x + 5, y + 5, w, h, 12)
    ctx.fill()

    // card body
    ctx.fillStyle = '#FFFDF7'
    rrect(ctx, x, y, w, h, 12)
    ctx.fill()

    // accent top strip
    ctx.save()
    rrect(ctx, x, y, w, h, 12)
    ctx.clip()
    ctx.fillStyle = accent
    ctx.fillRect(x, y, w, 40)
    ctx.restore()

    ctx.strokeStyle = W.ink
    ctx.lineWidth = 2
    rrect(ctx, x, y, w, h, 12)
    ctx.stroke()

    // title
    centerText(ctx, title, x + w / 2, y + 22, "'Kalam', cursive", 15, W.ink)

    // divider doodle line
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 4])
    ctx.beginPath()
    ctx.moveTo(x + 12, y + 42)
    ctx.lineTo(x + w - 12, y + 42)
    ctx.stroke()
    ctx.setLineDash([])

    // body text (wrapped)
    ctx.font = `12px 'DM Sans', sans-serif`
    ctx.fillStyle = '#555'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    const words = body.split(' ')
    let line = ''
    let lineY = y + 52
    const maxW = w - 24
    words.forEach(word => {
        const test = line ? `${line} ${word}` : word
        if (ctx.measureText(test).width > maxW) {
            ctx.fillText(line, x + 12, lineY)
            line = word
            lineY += 16
        } else {
            line = test
        }
    })
    ctx.fillText(line, x + 12, lineY)

    // little doodle star bottom right
    ctx.font = '14px serif'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('✦', x + w - 10, y + h - 8)
}

// ─── Badge ────────────────────────────────────────────────────────────────────
function drawBadge(ctx, el, x, y, w, h) {
    const d = el.data || {}
    const label = d.label || 'Badge'
    const accent = d.accent || W.butter
    const r = h / 2

    ctx.fillStyle = W.ink
    rrect(ctx, x + 3, y + 3, w, h, r)
    ctx.fill()

    ctx.fillStyle = accent
    rrect(ctx, x, y, w, h, r)
    ctx.fill()

    ctx.strokeStyle = W.ink
    ctx.lineWidth = 2
    rrect(ctx, x, y, w, h, r)
    ctx.stroke()

    // shine
    ctx.save()
    rrect(ctx, x, y, w, h, r)
    ctx.clip()
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.fillRect(x, y, w, h * 0.5)
    ctx.restore()

    centerText(ctx, label, x + w / 2, y + h / 2, "'Kalam', cursive", Math.max(10, h * 0.4), W.ink)
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function drawToggle(ctx, el, x, y, w, h) {
    const d = el.data || {}
    const lbl = d.label || 'Toggle'
    const on = !!d.on
    const accent = d.accent || W.teal

    const tw = 46
    const th = 24
    const tx = x + 10
    const ty = y + h / 2 - th / 2

    // track shadow
    ctx.fillStyle = 'rgba(0,0,0,0.12)'
    rrect(ctx, tx + 2, ty + 2, tw, th, th / 2)
    ctx.fill()

    // track
    ctx.fillStyle = on ? accent : '#D0D0CC'
    rrect(ctx, tx, ty, tw, th, th / 2)
    ctx.fill()

    ctx.strokeStyle = W.ink
    ctx.lineWidth = 1.5
    rrect(ctx, tx, ty, tw, th, th / 2)
    ctx.stroke()

    // knob
    const kr = th / 2 - 3
    const kcx = on ? tx + tw - kr - 4 : tx + kr + 4
    const kcy = ty + th / 2

    ctx.beginPath()
    ctx.arc(kcx + 1.5, kcy + 1.5, kr, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.fill()

    ctx.beginPath()
    ctx.arc(kcx, kcy, kr, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()
    ctx.strokeStyle = W.ink
    ctx.lineWidth = 1.5
    ctx.stroke()

    // shine on knob
    ctx.save()
    ctx.beginPath()
    ctx.arc(kcx, kcy, kr, 0, Math.PI * 2)
    ctx.clip()
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fillRect(kcx - kr, kcy - kr, kr * 2, kr)
    ctx.restore()

    // label
    ctx.font = `13px 'DM Sans', sans-serif`
    ctx.fillStyle = W.ink
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(lbl, tx + tw + 10, ty + th / 2)

    // on/off dot indicator
    const dotX = tx + tw - 10
    ctx.beginPath()
    ctx.arc(dotX, ty + th / 2, 3, 0, Math.PI * 2)
    ctx.fillStyle = on ? '#fff' : 'rgba(255,255,255,0.5)'
    ctx.fill()
}

// ─── Hit-test for whimsical elements ─────────────────────────────────────────
export function getWhimsicalBounds(el) {
    const comp = WHIMSICAL_COMPONENTS.find(c => c.id === el.tool)
    const x = Math.min(el.x1, el.x2)
    const y = Math.min(el.y1, el.y2)
    const w = Math.abs(el.x2 - el.x1) || comp?.defaultW || 200
    const h = Math.abs(el.y2 - el.y1) || comp?.defaultH || 80
    return { x, y, w, h }
}

// ─── WhimsicalComponentPicker React panel ─────────────────────────────────────
import React, { useState } from 'react'

const PICKER_ACCENT = '#FF6B6B'

export function WhimsicalComponentPicker({ onPick, onClose }) {
    const [hover, setHover] = useState(null)

    return (
        <div style={{
            position: 'absolute', left: 8, top: 8,
            width: 192, background: '#FFFDF7',
            borderRadius: 14, border: '2px solid #2D3436',
            padding: '12px 10px', zIndex: 25,
            boxShadow: '4px 4px 0px #2D3436',
            fontFamily: "'DM Sans', sans-serif",
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{
                    fontSize: 12, fontWeight: 700, color: '#2D3436',
                    fontFamily: "'Kalam', cursive", letterSpacing: '.04em',
                }}>✦ Components</span>
                <button
                    onClick={onClose}
                    style={{
                        width: 22, height: 22, border: '1.5px solid #2D3436',
                        borderRadius: 6, background: '#FF6B6B', cursor: 'pointer',
                        fontSize: 11, lineHeight: 1, color: '#fff', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>✕</button>
            </div>

            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                {WHIMSICAL_COMPONENTS.map(c => (
                    <button
                        key={c.id}
                        onMouseEnter={() => setHover(c.id)}
                        onMouseLeave={() => setHover(null)}
                        onClick={() => onPick(c.id)}
                        style={{
                            border: hover === c.id ? '2px solid #FF6B6B' : '2px solid #2D3436',
                            borderRadius: 9,
                            background: hover === c.id ? '#FFE8E8' : '#F7F4EE',
                            padding: '8px 4px',
                            cursor: 'pointer',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                            boxShadow: hover === c.id ? '2px 2px 0 #FF6B6B' : '2px 2px 0 #2D3436',
                            transition: 'all 0.12s',
                            transform: hover === c.id ? 'translate(-1px,-1px)' : 'none',
                        }}
                    >
                        <span style={{ fontSize: 18 }}>{c.icon}</span>
                        <span style={{
                            fontSize: 9.5, fontWeight: 600, color: '#2D3436',
                            fontFamily: "'DM Sans', sans-serif", textAlign: 'center', lineHeight: 1.2,
                        }}>{c.label}</span>
                    </button>
                ))}
            </div>

            <div style={{
                marginTop: 10, padding: '6px 8px',
                background: '#FFE66D', borderRadius: 7,
                border: '1.5px solid #2D3436',
                fontSize: 10, color: '#2D3436', lineHeight: 1.4,
                fontFamily: "'DM Sans', sans-serif",
            }}>
                🎨 Click a component, then click on canvas to place it!
            </div>
        </div>
    )
}

export default WhimsicalComponentPicker