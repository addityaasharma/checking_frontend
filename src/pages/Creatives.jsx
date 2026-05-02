import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import {
    WHIMSICAL_COMPONENTS,
    renderWhimsicalElement,
    getWhimsicalBounds,
    makeComponentData,
    WhimsicalComponentPicker,
} from '../component/creativesfile/WhimscialComponentPicker'

const WC_TOOLS = WHIMSICAL_COMPONENTS.map(c => c.id)

const COLORS = ['#1a1a2e', '#e63946', '#2a9d8f', '#e9c46a', '#f4a261', '#457b9d', '#6a4c93', '#06d6a0', '#ffffff']
const FONT_SIZES = [12, 16, 20, 28, 36, 48]
const FONTS = ["'Kalam', cursive", "'Space Mono', monospace", "'DM Sans', sans-serif"]
const FONT_LABELS = ['Handwriting', 'Mono', 'Sans']
const BG_OPTIONS = [
    { id: 'white', label: 'Plain', style: '#ffffff' },
    { id: 'dot', label: 'Dots', style: 'dot' },
    { id: 'grid', label: 'Grid', style: 'grid' },
    { id: 'line', label: 'Lines', style: 'line' },
    { id: 'dark', label: 'Dark', style: '#1a1a2e' },
]
const SHAPES = ['rect', 'circle', 'diamond', 'hexagon', 'cylinder', 'parallelogram', 'cloud', 'note']
const SHAPE_ICONS = {
    rect: '▭', circle: '○', diamond: '◇', hexagon: '⬡', cylinder: '⌀', parallelogram: '▱', cloud: '☁', note: '🗒'
}
const STICKY_COLORS = ['#fef08a', '#bfdbfe', '#bbf7d0', '#fecaca', '#e9d5ff', '#fed7aa']
const ARROW_STYLES = ['line', 'dashed', 'dotted']
const ARROW_ENDS = ['none', 'arrow', 'filled', 'circle']
const VANISH_DURATION = 300
const VANISH_FADE = 100
const CONNECTABLE_TOOLS = ['rect', 'circle', 'diamond', 'shape']

const isMobile = () => window.innerWidth < 640

// ── Helper: wrap text into lines that fit within maxWidth ──
// NOTE: ctx.font MUST be set before calling this
function wrapText(ctx, text, maxWidth) {
    if (!text) return ['']
    const paragraphs = String(text).split('\n')
    const lines = []
    for (const para of paragraphs) {
        if (para === '') { lines.push(''); continue }
        const words = para.split(' ')
        let current = ''
        for (const word of words) {
            // Handle very long single words — break them character by character
            if (ctx.measureText(word).width > maxWidth) {
                if (current) { lines.push(current); current = '' }
                let charBuf = ''
                for (const ch of word) {
                    if (ctx.measureText(charBuf + ch).width > maxWidth) {
                        lines.push(charBuf); charBuf = ch
                    } else { charBuf += ch }
                }
                if (charBuf) current = charBuf
                continue
            }
            const test = current ? current + ' ' + word : word
            if (ctx.measureText(test).width > maxWidth && current) {
                lines.push(current); current = word
            } else { current = test }
        }
        if (current) lines.push(current)
    }
    return lines.length ? lines : ['']
}

function shapePath(type, x, y, w, h) {
    switch (type) {
        case 'rect': return null
        case 'circle': return null
        case 'diamond': {
            const cx = x + w / 2, cy = y + h / 2
            return `M${cx},${y} L${x + w},${cy} L${cx},${y + h} L${x},${cy} Z`
        }
        case 'hexagon': {
            const cx = x + w / 2, cy = y + h / 2, rx = w / 2, ry = h / 2
            const pts = []
            for (let i = 0; i < 6; i++) {
                const a = Math.PI / 180 * (60 * i - 30)
                pts.push(`${cx + rx * Math.cos(a)},${cy + ry * Math.sin(a)}`)
            }
            return `M${pts.join('L')}Z`
        }
        case 'cylinder': {
            const rx = w / 2, ry = 14, cx = x + rx
            return `M${x},${y + ry} Q${x},${y} ${cx},${y} Q${x + w},${y} ${x + w},${y + ry} L${x + w},${y + h - ry} Q${x + w},${y + h} ${cx},${y + h} Q${x},${y + h} ${x},${y + h - ry} Z`
        }
        case 'parallelogram': {
            const sk = w * 0.18
            return `M${x + sk},${y} L${x + w},${y} L${x + w - sk},${y + h} L${x},${y + h} Z`
        }
        case 'cloud': {
            const cx = x + w / 2, cy = y + h / 2
            return `M${x + w * 0.2},${cy + h * 0.2} Q${x + w * 0.05},${cy + h * 0.2} ${x + w * 0.1},${cy} Q${x + w * 0.08},${y + h * 0.1} ${x + w * 0.25},${y + h * 0.15} Q${x + w * 0.3},${y} ${cx},${y + h * 0.05} Q${x + w * 0.65},${y} ${x + w * 0.75},${y + h * 0.15} Q${x + w * 0.95},${y + h * 0.1} ${x + w * 0.9},${cy} Q${x + w * 0.98},${cy + h * 0.2} ${x + w * 0.8},${cy + h * 0.2} Q${x + w * 0.85},${y + h} ${x + w * 0.5},${y + h} Q${x + w * 0.15},${y + h} ${x + w * 0.2},${cy + h * 0.2} Z`
        }
        case 'note': {
            const fold = 16
            return `M${x},${y} L${x + w - fold},${y} L${x + w},${y + fold} L${x + w},${y + h} L${x},${y + h} Z M${x + w - fold},${y} L${x + w - fold},${y + fold} L${x + w},${y + fold}`
        }
        default: return null
    }
}

function getAnchors(el) {
    const b = getElementBounds(el)
    return [
        { side: 'top', x: b.x + b.w / 2, y: b.y },
        { side: 'bottom', x: b.x + b.w / 2, y: b.y + b.h },
        { side: 'left', x: b.x, y: b.y + b.h / 2 },
        { side: 'right', x: b.x + b.w, y: b.y + b.h / 2 },
    ]
}

function getShapeEdgePoint(el, side) {
    return getAnchors(el).find(a => a.side === side) || getAnchors(el)[0]
}

function getConnectorCurve(el, elements) {
    let x1 = el.x1, y1 = el.y1, x2 = el.x2, y2 = el.y2
    if (el.fromId) {
        const src = elements.find(e => e.id === el.fromId)
        if (src) { const a = getShapeEdgePoint(src, el.fromSide); x1 = a.x; y1 = a.y }
    }
    if (el.toId) {
        const dst = elements.find(e => e.id === el.toId)
        if (dst) { const a = getShapeEdgePoint(dst, el.toSide); x2 = a.x; y2 = a.y }
    }
    const BEND = 60
    const getBend = (side, x, y) => {
        if (side === 'right') return [x + BEND, y]
        if (side === 'left') return [x - BEND, y]
        if (side === 'bottom') return [x, y + BEND]
        if (side === 'top') return [x, y - BEND]
        return [x, y]
    }
    const [c1x, c1y] = getBend(el.fromSide || 'right', x1, y1)
    const [c2x, c2y] = getBend(el.toSide || 'left', x2, y2)
    return { x1, y1, x2, y2, c1x, c1y, c2x, c2y }
}

function drawElement(ctx, el, selected, panX, panY, zoom, allElements, editingLabelId) {
    ctx.save()
    ctx.translate(panX, panY)
    ctx.scale(zoom, zoom)
    const { tool, color, size } = el
    ctx.strokeStyle = color || '#1a1a2e'
    ctx.lineWidth = size || 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = 0.93
    if (tool === 'eraser') { ctx.globalCompositeOperation = 'destination-out'; ctx.strokeStyle = 'rgba(0,0,0,1)'; ctx.globalAlpha = 1 }
    if (tool === 'vanish') {
        const age = el._alpha ?? 1
        if (age <= 0) { ctx.restore(); return }
        ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = age * 0.92
        ctx.lineWidth = (size || 3) * 1.4; ctx.strokeStyle = '#ff2d55'; ctx.shadowColor = '#ff2d55'; ctx.shadowBlur = 10 * age
        const pts = el.points || []
        if (pts.length < 2) { ctx.restore(); ctx.restore(); return }
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1])
        for (let i = 1; i < pts.length - 1; i++) {
            const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2
            ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my)
        }
        ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]); ctx.stroke()
        ctx.globalAlpha = age * 0.6; ctx.lineWidth = (size || 3) * 0.5; ctx.strokeStyle = '#ffffff'; ctx.shadowBlur = 4; ctx.stroke()
        ctx.restore(); ctx.restore(); return
    }
    if (tool === 'pencil' || tool === 'eraser' || tool === 'pen' || tool === 'highlighter') {
        if (tool === 'highlighter') { ctx.globalAlpha = 0.35; ctx.lineWidth = (size || 3) * 6 }
        const pts = el.points || []
        if (pts.length < 2) { ctx.restore(); return }
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1])
        if (pts.length === 2) { ctx.lineTo(pts[1][0], pts[1][1]) }
        else {
            for (let i = 1; i < pts.length - 1; i++) {
                const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2
                ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my)
            }
            ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1])
        }
        ctx.stroke()
    } else if (tool === 'connector') {
        const { x1, y1, x2, y2, c1x, c1y, c2x, c2y } = getConnectorCurve(el, allElements || [])
        ctx.strokeStyle = color || '#457b9d'; ctx.lineWidth = size || 2
        const dashStyle = el.arrowStyle === 'dashed' ? [8, 5] : el.arrowStyle === 'dotted' ? [2, 5] : []
        ctx.setLineDash(dashStyle); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.bezierCurveTo(c1x, c1y, c2x, c2y, x2, y2); ctx.stroke(); ctx.setLineDash([])
        const dx = x2 - c2x, dy = y2 - c2y, len = Math.sqrt(dx * dx + dy * dy)
        if (len > 1) {
            const nx = dx / len, ny = dy / len, hs = Math.max(12, (size || 2) * 4)
            ctx.beginPath(); ctx.moveTo(x2, y2)
            ctx.lineTo(x2 - nx * hs + ny * hs * 0.4, y2 - ny * hs - nx * hs * 0.4)
            ctx.lineTo(x2 - nx * hs - ny * hs * 0.4, y2 - ny * hs + nx * hs * 0.4)
            ctx.closePath(); ctx.fillStyle = color || '#457b9d'; ctx.fill()
        }
    } else if (tool === 'line' || tool === 'arrow' || tool === 'dashed-arrow' || tool === 'double-arrow') {
        const dashStyle = el.arrowStyle === 'dashed' ? [8, 5] : el.arrowStyle === 'dotted' ? [2, 5] : []
        ctx.setLineDash(dashStyle); ctx.beginPath(); ctx.moveTo(el.x1, el.y1); ctx.lineTo(el.x2, el.y2); ctx.stroke(); ctx.setLineDash([])
        const drawHead = (x2, y2, x1, y1) => {
            const dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy)
            if (len < 4) return
            const nx = dx / len, ny = dy / len, hs = Math.max(12, size * 4)
            if (el.arrowEnd === 'circle') { ctx.beginPath(); ctx.arc(x2, y2, hs * 0.4, 0, Math.PI * 2); ctx.fillStyle = color || '#1a1a2e'; ctx.fill() }
            else if (el.arrowEnd !== 'none') {
                ctx.beginPath(); ctx.moveTo(x2, y2)
                ctx.lineTo(x2 - nx * hs + ny * hs * 0.4, y2 - ny * hs - nx * hs * 0.4)
                ctx.lineTo(x2 - nx * hs - ny * hs * 0.4, y2 - ny * hs + nx * hs * 0.4)
                ctx.closePath()
                if (el.arrowEnd === 'filled') { ctx.fillStyle = color || '#1a1a2e'; ctx.fill() } else ctx.stroke()
            }
        }
        if (tool === 'arrow' || tool === 'dashed-arrow') drawHead(el.x2, el.y2, el.x1, el.y1)
        if (tool === 'double-arrow') { drawHead(el.x2, el.y2, el.x1, el.y1); drawHead(el.x1, el.y1, el.x2, el.y2) }
    } else if (tool === 'rect') {
        ctx.beginPath()
        const r = el.radius || 0, x = Math.min(el.x1, el.x2), y = Math.min(el.y1, el.y2), w = Math.abs(el.x2 - el.x1), h = Math.abs(el.y2 - el.y1)
        if (r > 0 && ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h)
        if (el.fill) { ctx.fillStyle = el.fill; ctx.fill() }; ctx.stroke()
        if (el.id !== editingLabelId) drawShapeLabel(ctx, el, x, y, w, h)
    } else if (tool === 'circle') {
        const cx = (el.x1 + el.x2) / 2, cy = (el.y1 + el.y2) / 2, rx = Math.abs(el.x2 - el.x1) / 2, ry = Math.abs(el.y2 - el.y1) / 2
        ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
        if (el.fill) { ctx.fillStyle = el.fill; ctx.fill() }; ctx.stroke()
        const x = Math.min(el.x1, el.x2), y = Math.min(el.y1, el.y2), w = Math.abs(el.x2 - el.x1), h = Math.abs(el.y2 - el.y1)
        if (el.id !== editingLabelId) drawShapeLabel(ctx, el, x, y, w, h)
    } else if (tool === 'shape') {
        const x = Math.min(el.x1, el.x2), y = Math.min(el.y1, el.y2), w = Math.abs(el.x2 - el.x1) || 80, h = Math.abs(el.y2 - el.y1) || 60

        if (el.shapeType === '__custom__' && el._customPath) {
            const path2d = new Path2D(el._customPath)
            if (el.fill) { ctx.fillStyle = el.fill; ctx.fill(path2d) }
            ctx.stroke(path2d)
            if (el.id !== editingLabelId) drawShapeLabel(ctx, el, x, y, w, h)
        } else {
            const p = shapePath(el.shapeType, x, y, w, h)
            if (p) {
                const path2d = new Path2D(p)
                if (el.fill) { ctx.fillStyle = el.fill; ctx.fill(path2d) }; ctx.stroke(path2d)
            } else if (el.shapeType === 'rect') {
                if (el.fill) { ctx.fillStyle = el.fill; ctx.fillRect(x, y, w, h) }; ctx.strokeRect(x, y, w, h)
            } else if (el.shapeType === 'circle') {
                ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
                if (el.fill) { ctx.fillStyle = el.fill; ctx.fill() }; ctx.stroke()
            }
            if (el.id !== editingLabelId) drawShapeLabel(ctx, el, x, y, w, h)
        }
    } else if (tool === 'text' || tool === 'sticky') {
        const fs = el.fontSize || 18, font = el.font || "'Kalam', cursive"
        ctx.font = `${fs}px ${font}`
        ctx.globalAlpha = 1

        if (el.tool === 'sticky') {
            const pad = 12
            const lh = fs * 1.4
            const bw = el.width || 200
            const maxTextW = bw - pad * 2

            // Font MUST be set before wrapText so measureText works correctly
            ctx.font = `${fs}px ${font}`
            const wrappedLines = wrapText(ctx, el.text || '', maxTextW)

            // Auto-grow: height = header(24) + topPad + lines + bottomPad
            const contentH = 24 + pad + wrappedLines.length * lh + pad
            const bh = Math.max(80, contentH)
            // Persist so hit-testing / selection handles stay accurate
            el.height = bh
            el.width = bw

            // Draw background
            ctx.globalAlpha = 1
            ctx.fillStyle = el.bgColor || '#fef08a'
            ctx.fillRect(el.x1, el.y1, bw, bh)
            // Header strip
            ctx.fillStyle = 'rgba(0,0,0,0.10)'
            ctx.fillRect(el.x1, el.y1, bw, 24)
            // Border
            ctx.strokeStyle = 'rgba(0,0,0,0.15)'
            ctx.lineWidth = 1
            ctx.strokeRect(el.x1, el.y1, bw, bh)

            // Draw wrapped text lines
            ctx.fillStyle = '#1a1a2e'
            ctx.font = `${fs}px ${font}`
            ctx.textBaseline = 'top'
            wrappedLines.forEach((ln, i) => {
                ctx.fillText(ln, el.x1 + pad, el.y1 + 24 + pad + i * lh)
            })
            ctx.textBaseline = 'alphabetic'
        } else {
            // Plain text: render with wrapping using stored maxWidth if available
            const lines = (el.text || '').split('\n')
            ctx.fillStyle = color || '#1a1a2e'
            lines.forEach((ln, i) => ctx.fillText(ln, el.x1, el.y1 + i * fs * 1.35))
        }
    } else if (tool === 'image' && el.img) {
        const x = Math.min(el.x1, el.x2), y = Math.min(el.y1, el.y2)
        const w = Math.abs(el.x2 - el.x1) || el.img.naturalWidth || 200, h = Math.abs(el.y2 - el.y1) || el.img.naturalHeight || 150
        ctx.drawImage(el.img, x, y, w, h)
    }
    if (selected) {
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1
        ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 1.5 / zoom; ctx.setLineDash([5 / zoom, 3 / zoom])
        const b = getElementBounds(el); ctx.strokeRect(b.x - 8, b.y - 8, b.w + 16, b.h + 16); ctx.setLineDash([])
        const handles = getHandles(b); ctx.fillStyle = '#ffffff'
        handles.forEach(([hx, hy]) => {
            ctx.beginPath(); ctx.arc(hx, hy, 5 / zoom, 0, Math.PI * 2); ctx.fill()
            ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 1.5 / zoom; ctx.stroke()
        })
    }
    ctx.restore()
}

// ── drawShapeLabel: wraps label text inside shape bounds ──
function drawShapeLabel(ctx, el, x, y, w, h) {
    const label = el.label; if (!label) return
    ctx.save(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'
    const fs = el.labelSize || 14, font = el.labelFont || "'DM Sans', sans-serif"
    // Set font BEFORE measuring
    ctx.font = `${fs}px ${font}`
    ctx.fillStyle = el.labelColor || el.color || '#1a1a2e'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const pad = 10
    const maxW = Math.max(20, w - pad * 2)
    const lines = wrapText(ctx, label, maxW)
    const lh = fs * 1.35
    lines.forEach((ln, i) => {
        const ty = y + h / 2 + (i - (lines.length - 1) / 2) * lh
        ctx.fillText(ln, x + w / 2, ty)
    })
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.restore()
}

function drawHoverConnectors(ctx, el, panX, panY, zoom) {
    if (!el || !CONNECTABLE_TOOLS.includes(el.tool)) return
    const anchors = getAnchors(el)
    ctx.save(); ctx.translate(panX, panY); ctx.scale(zoom, zoom)
    anchors.forEach(a => {
        ctx.beginPath(); ctx.arc(a.x, a.y, 10, 0, Math.PI * 2); ctx.fillStyle = '#6366f1'; ctx.globalAlpha = 0.85; ctx.fill()
        ctx.globalAlpha = 1; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5
        const offsets = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] }
        const [ox, oy] = offsets[a.side] || [0, -1]
        ctx.beginPath(); ctx.moveTo(a.x - ox * 3 - oy * 3, a.y - oy * 3 + ox * 3); ctx.lineTo(a.x + ox * 5, a.y + oy * 5); ctx.lineTo(a.x - ox * 3 + oy * 3, a.y - oy * 3 - ox * 3); ctx.stroke()
    })
    ctx.restore()
}

function drawClonePreview(ctx, el, side, panX, panY, zoom) {
    if (!el) return
    const b = getElementBounds(el), a = getAnchors(el).find(x => x.side === side)
    if (!a) return
    const DIST = 100, offsets = { top: [0, -DIST], bottom: [0, DIST], left: [-DIST, 0], right: [DIST, 0] }
    const [ox, oy] = offsets[side] || [DIST, 0]
    ctx.save(); ctx.translate(panX, panY); ctx.scale(zoom, zoom)
    ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4])
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + ox / 2, a.y + oy / 2); ctx.stroke(); ctx.setLineDash([])
    ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.globalAlpha = 0.45
    ctx.strokeRect(b.x + ox, b.y + oy, b.w, b.h); ctx.setLineDash([])
    const gcx = b.x + ox + b.w / 2, gcy = b.y + oy + b.h / 2
    ctx.globalAlpha = 0.9; ctx.fillStyle = '#6366f1'; ctx.beginPath(); ctx.arc(gcx, gcy, 10, 0, Math.PI * 2); ctx.fill()
    ctx.globalAlpha = 1; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(gcx - 5, gcy); ctx.lineTo(gcx + 5, gcy); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(gcx, gcy - 5); ctx.lineTo(gcx, gcy + 5); ctx.stroke()
    ctx.restore()
}

function getHandles(b) {
    return [[b.x, b.y], [b.x + b.w / 2, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h / 2], [b.x + b.w, b.y + b.h], [b.x + b.w / 2, b.y + b.h], [b.x, b.y + b.h], [b.x, b.y + b.h / 2]]
}

function getElementBounds(el) {
    if (WC_TOOLS.includes(el.tool)) return getWhimsicalBounds(el)
    if (el.points) {
        const xs = el.points.map(p => p[0]), ys = el.points.map(p => p[1])
        const x = Math.min(...xs), y = Math.min(...ys)
        return { x, y, w: Math.max(1, Math.max(...xs) - x), h: Math.max(1, Math.max(...ys) - y) }
    }
    if (el.tool === 'text') {
        const lines = (el.text || '').split('\n')
        const fs = el.fontSize || 18
        return { x: el.x1, y: el.y1 - fs, w: Math.max(60, lines.reduce((m, l) => Math.max(m, l.length * fs * 0.6), 0)), h: lines.length * fs * 1.35 }
    }
    if (el.tool === 'sticky') return { x: el.x1, y: el.y1, w: el.width || 200, h: el.height || 100 }
    if (el.tool === 'connector') {
        const x = Math.min(el.x1 || 0, el.x2 || 0), y = Math.min(el.y1 || 0, el.y2 || 0)
        return { x, y, w: Math.max(10, Math.abs((el.x2 || 0) - (el.x1 || 0))), h: Math.max(10, Math.abs((el.y2 || 0) - (el.y1 || 0))) }
    }
    const x = Math.min(el.x1 || 0, el.x2 || 0), y = Math.min(el.y1 || 0, el.y2 || 0)
    return { x, y, w: Math.max(1, Math.abs((el.x2 || 0) - (el.x1 || 0))), h: Math.max(1, Math.abs((el.y2 || 0) - (el.y1 || 0))) }
}

function hitTest(el, px, py) {
    const b = getElementBounds(el)
    return px >= b.x - 10 && px <= b.x + b.w + 10 && py >= b.y - 10 && py <= b.y + b.h + 10
}

function marqueeHitTest(el, mx, my, mw, mh) {
    const b = getElementBounds(el)
    const rx1 = Math.min(mx, mx + mw), ry1 = Math.min(my, my + mh), rx2 = Math.max(mx, mx + mw), ry2 = Math.max(my, my + mh)
    return !(b.x + b.w < rx1 || b.x > rx2 || b.y + b.h < ry1 || b.y > ry2)
}

function drawMarquee(ctx, sx, sy, sw, sh, panX, panY, zoom) {
    ctx.save(); ctx.translate(panX, panY); ctx.scale(zoom, zoom)
    ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 1.5 / zoom; ctx.setLineDash([6 / zoom, 3 / zoom]); ctx.globalAlpha = 0.85
    ctx.strokeRect(sx, sy, sw, sh); ctx.fillStyle = 'rgba(99,102,241,0.06)'; ctx.fillRect(sx, sy, sw, sh)
    ctx.setLineDash([]); ctx.restore()
}

function scoreRectangle(points, minX, minY, maxX, maxY) {
    const w = maxX - minX, h = maxY - minY
    if (w < 10 || h < 10) return 0
    const thr = Math.max(w, h) * 0.18
    let onSide = 0
    for (const [px, py] of points) {
        const d = Math.min(Math.abs(px - minX), Math.abs(px - maxX), Math.abs(py - minY), Math.abs(py - maxY))
        if (d < thr) onSide++
    }
    return onSide / points.length
}

// NEW — add this right after scoreRectangle
function countCorners(points, threshold = 0.25) {
    let corners = 0
    const step = Math.max(1, Math.floor(points.length / 40))
    for (let i = step * 2; i < points.length - step * 2; i += step) {
        const dx1 = points[i][0] - points[i - step * 2][0]
        const dy1 = points[i][1] - points[i - step * 2][1]
        const dx2 = points[i + step * 2][0] - points[i][0]
        const dy2 = points[i + step * 2][1] - points[i][1]
        const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1)
        const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)
        if (len1 < 2 || len2 < 2) continue
        const dot = (dx1 * dx2 + dy1 * dy2) / (len1 * len2)
        if (dot < threshold) corners++
    }
    return corners
}

function recognizeShape(points) {
    if (!points || points.length < 10) return null
    const xs = points.map(p => p[0]), ys = points.map(p => p[1])
    const minX = Math.min(...xs), maxX = Math.max(...xs)
    const minY = Math.min(...ys), maxY = Math.max(...ys)
    const w = maxX - minX, h = maxY - minY
    if (w < 20 && h < 20) return null

    const first = points[0], last = points[points.length - 1]
    const closeDist = Math.sqrt((last[0] - first[0]) ** 2 + (last[1] - first[1]) ** 2)
    const isClosed = closeDist < Math.max(w, h) * 0.4
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2

    const distToSegment = ([px, py], [x1, y1], [x2, y2]) => {
        const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) || 1
        return Math.abs((y2 - y1) * px - (x2 - x1) * py + x2 * y1 - y2 * x1) / len
    }

    const avgDeviationFromPoly = (pts, vertices) => {
        const sides = vertices.map((v, i) => [v, vertices[(i + 1) % vertices.length]])
        return pts.reduce((sum, p) => sum + Math.min(...sides.map(([a, b]) => distToSegment(p, a, b))), 0) / pts.length
    }

    const regularPolyVertices = (n, rx = w / 2, ry = h / 2, angleOffset = 0) =>
        Array.from({ length: n }, (_, i) => {
            const a = (2 * Math.PI * i) / n - Math.PI / 2 + angleOffset
            return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]
        })

    const starVertices = (n, rx = w / 2, ry = h / 2, innerRatio = 0.45) => {
        const pts = []
        for (let i = 0; i < n * 2; i++) {
            const a = (Math.PI * i) / n - Math.PI / 2
            const r = i % 2 === 0 ? 1 : innerRatio
            pts.push([cx + rx * r * Math.cos(a), cy + ry * r * Math.sin(a)])
        }
        return pts
    }

    // ── Radii from centroid ──
    const radii = points.map(([px, py]) => Math.sqrt((px - cx) ** 2 + (py - cy) ** 2))
    const avgR = radii.reduce((a, b) => a + b) / radii.length
    const rStd = Math.sqrt(radii.reduce((a, b) => a + (b - avgR) ** 2, 0) / radii.length)
    const rVariance = rStd / avgR

    // ── Line (open, nearly straight) ──
    if (!isClosed && points.length > 4) {
        const [ax, ay] = first, [bx, by] = last
        const len = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2) || 1
        const maxDev = points.reduce((m, [px, py]) => {
            const d = Math.abs((by - ay) * px - (bx - ax) * py + bx * ay - by * ax) / len
            return Math.max(m, d)
        }, 0)
        if (maxDev < Math.max(w, h) * 0.12)
            return { type: 'line', x1: ax, y1: ay, x2: bx, y2: by }
    }

    if (!isClosed) return null

    const dim = Math.max(w, h)

    // ── Corner detection ──
    const corners = countCorners(points)

    // ── Rectangle score ──
    const rectScore = scoreRectangle(points, minX, minY, maxX, maxY)

    // ── Circle: check FIRST using corners + radius variance ──
    // A circle has smooth curvature → very few corners, low radius variance
    const aspectRatio = Math.abs(w - h) / Math.max(w, h)
    if (corners <= 2 && rVariance < 0.22 && aspectRatio < 0.5) {
        return { type: 'circle', x1: minX, y1: minY, x2: maxX, y2: maxY }
    }

    // ── Rectangle: needs corner evidence ──
    if (rectScore > 0.55 && corners >= 3 && corners <= 6) {
        return { type: 'rect', x1: minX, y1: minY, x2: maxX, y2: maxY }
    }

    // ── For all remaining polygon/star shapes: pick the BEST match ──
    const candidates = [
        { id: 'triangle', dev: avgDeviationFromPoly(points, regularPolyVertices(3)), result: () => { const v = regularPolyVertices(3); return { type: '__polygon__', verts: v, x1: minX, y1: minY, x2: maxX, y2: maxY } } },
        { id: 'diamond', dev: avgDeviationFromPoly(points, regularPolyVertices(4, w / 2, h / 2, Math.PI / 4)), result: () => ({ type: 'shape', shapeType: 'diamond', x1: minX, y1: minY, x2: maxX, y2: maxY }) },
        { id: 'pentagon', dev: avgDeviationFromPoly(points, regularPolyVertices(5)), result: () => { const v = regularPolyVertices(5); return { type: '__polygon__', verts: v, x1: minX, y1: minY, x2: maxX, y2: maxY } } },
        { id: 'hexagon', dev: avgDeviationFromPoly(points, regularPolyVertices(6)), result: () => ({ type: 'shape', shapeType: 'hexagon', x1: minX, y1: minY, x2: maxX, y2: maxY }) },
        { id: 'heptagon', dev: avgDeviationFromPoly(points, regularPolyVertices(7)), result: () => { const v = regularPolyVertices(7); return { type: '__polygon__', verts: v, x1: minX, y1: minY, x2: maxX, y2: maxY } } },
        { id: 'octagon', dev: avgDeviationFromPoly(points, regularPolyVertices(8)), result: () => { const v = regularPolyVertices(8); return { type: '__polygon__', verts: v, x1: minX, y1: minY, x2: maxX, y2: maxY } } },
        { id: 'star4', dev: avgDeviationFromPoly(points, starVertices(4, w / 2, h / 2, 0.35)), result: () => { const v = starVertices(4, w / 2, h / 2, 0.35); return { type: '__star__', verts: v, x1: minX, y1: minY, x2: maxX, y2: maxY } } },
        { id: 'star5', dev: avgDeviationFromPoly(points, starVertices(5)), result: () => { const v = starVertices(5); return { type: '__star__', verts: v, x1: minX, y1: minY, x2: maxX, y2: maxY } } },
        { id: 'star6', dev: avgDeviationFromPoly(points, starVertices(6, w / 2, h / 2, 0.5)), result: () => { const v = starVertices(6, w / 2, h / 2, 0.5); return { type: '__star__', verts: v, x1: minX, y1: minY, x2: maxX, y2: maxY } } },
        { id: 'parallelogram', dev: avgDeviationFromPoly(points, [[minX + w * 0.18, minY], [maxX, minY], [maxX - w * 0.18, maxY], [minX, maxY]]), result: () => ({ type: 'shape', shapeType: 'parallelogram', x1: minX, y1: minY, x2: maxX, y2: maxY }) },
    ]

    // Sort by deviation and pick the best one under threshold
    candidates.sort((a, b) => a.dev - b.dev)
    const best = candidates[0]
    const secondBest = candidates[1]

    // Only accept if best is clearly better than second (margin > 15%) AND under threshold
    const threshold = dim * 0.14
    if (best.dev < threshold && best.dev < secondBest.dev * 0.85) {
        return best.result()
    }

    return null
}

const Icon = ({ d, size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
    </svg>
)

const icons = {
    pencil: 'M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z',
    pen: 'M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',
    highlight: 'M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18',
    eraser: 'M20 20H7L3 16l13.3-13.3a1 1 0 0 1 1.4 0l4.3 4.3a1 1 0 0 1 0 1.4L9.4 17',
    line: 'M5 19L19 5',
    arrow: 'M5 12h14M12 5l7 7-7 7',
    connector: 'M8 6a2 2 0 1 0 4 0 2 2 0 0 0-4 0zM12 16a2 2 0 1 0 4 0 2 2 0 0 0-4 0zM10 8l4 6',
    rect: 'M3 3h18v18H3z',
    circle: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0',
    diamond: 'M12 2L22 12L12 22L2 12Z',
    text: 'M4 6h16M4 12h16M4 18h7',
    sticky: 'M14 2H6a2 2 0 0 0-2 2v16l4-4h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z',
    shape: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    image: 'M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z',
    select: 'M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z',
    pan: 'M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20',
    undo: 'M3 7v6h6M3 13A9 9 0 1 0 5.17 5.17',
    redo: 'M21 7v6h-6M21 13A9 9 0 1 1 18.83 5.17',
    trash: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2',
    download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
    zoomIn: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35M11 8v6M8 11h6',
    zoomOut: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35M8 11h6',
    copy: 'M20 9H11a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2zM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
    close: 'M18 6L6 18M6 6l12 12',
    vanish: 'M3 12c0-1 .5-2 1.5-2.5S7 9 8 10s1 3 2 4 2.5 1.5 4 1c1.5-.5 2.5-2 2-3.5S14 9 13 8.5',
    editLabel: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
}

export default function Sketchpad() {
    const canvasRef = useRef(null)
    const wrapRef = useRef(null)
    const textareaRef = useRef(null)
    const fileRef = useRef(null)

    const stateRef = useRef({
        elements: [], redo: [], current: null, drawing: false,
        panOffset: { x: 0, y: 0 }, panStart: null, zoom: 1,
        selectedIds: new Set(), dragStart: null, dragEls: null,
        resizeHandle: null, idCounter: 0, marquee: null, isMarquee: false,
        hoverShapeId: null, hoverAnchorSide: null, connStart: null,
        groups: [], // array of Sets of element ids
    })

    const [tool, setTool] = useState('select')
    const [color, setColor] = useState('#1a1a2e')
    const [fill, setFill] = useState('none')
    const [strokeSize, setStrokeSize] = useState(2)
    const [fontSize, setFontSize] = useState(18)
    const [fontIdx, setFontIdx] = useState(0)
    const [zoom, setZoom] = useState(1)
    const [bg, setBg] = useState('dot')
    const [shapeType, setShapeType] = useState('rect')
    const [arrowStyle, setArrowStyle] = useState('line')
    const [arrowEnd, setArrowEnd] = useState('arrow')
    const [textInput, setTextInput] = useState(null)
    const [stickyColor, setStickyColor] = useState(STICKY_COLORS[0])
    const [mobileTab, setMobileTab] = useState('draw')
    const [labelMode, setLabelMode] = useState(null)
    const [selectedEl, setSelectedEl] = useState(null)
    const [selectionCount, setSelectionCount] = useState(0)
    const [viewVersion, setViewVersion] = useState(0)
    const [smartDraw, setSmartDraw] = useState(true)

    const [showWCPicker, setShowWCPicker] = useState(false)
    const [pendingWC, setPendingWC] = useState(null)
    const pendingWCRef = useRef(null)
    useEffect(() => { pendingWCRef.current = pendingWC }, [pendingWC])

    const toolRef = useRef('select')
    const colorRef = useRef('#1a1a2e')
    const fillRef = useRef('none')
    const sizeRef = useRef(2)
    const fontSizeRef = useRef(18)
    const fontRef = useRef(0)
    const shapeRef = useRef('rect')
    const arrowStyleRef = useRef('line')
    const arrowEndRef = useRef('arrow')
    const stickyColorRef = useRef(STICKY_COLORS[0])
    const vanishStrokesRef = useRef([])
    const animFrameRef = useRef(null)
    const textInputRef = useRef(null)
    const smartDrawRef = useRef(true)
    const editingIdRef = useRef(null)
    const editingIsLabelRef = useRef(false)


    useEffect(() => { toolRef.current = tool }, [tool])
    useEffect(() => { colorRef.current = color }, [color])
    useEffect(() => { fillRef.current = fill }, [fill])
    useEffect(() => { sizeRef.current = strokeSize }, [strokeSize])
    useEffect(() => { fontSizeRef.current = fontSize }, [fontSize])
    useEffect(() => { fontRef.current = fontIdx }, [fontIdx])
    useEffect(() => { shapeRef.current = shapeType }, [shapeType])
    useEffect(() => { arrowStyleRef.current = arrowStyle }, [arrowStyle])
    useEffect(() => { arrowEndRef.current = arrowEnd }, [arrowEnd])
    useEffect(() => { stickyColorRef.current = stickyColor }, [stickyColor])
    useEffect(() => { textInputRef.current = textInput }, [textInput])
    useEffect(() => { smartDrawRef.current = smartDraw }, [smartDraw])

    const newId = () => { stateRef.current.idCounter++; return stateRef.current.idCounter }

    const STORAGE_KEY = 'sketchpad_elements'
    const saveToStorage = useCallback(() => {
        try {
            const s = stateRef.current
            const serializable = s.elements.filter(el => el.tool !== 'image').map(el => { const { img, ...rest } = el; return rest })
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ elements: serializable, idCounter: s.idCounter }))
        } catch { }
    }, [])

    const loadFromStorage = useCallback(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY)
            if (!raw) return
            const { elements, idCounter } = JSON.parse(raw)
            const s = stateRef.current
            s.elements = elements || []; s.idCounter = idCounter || 0
        } catch { }
    }, [])

    const drawBackground = useCallback((ctx, w, h, bgStyle, panX, panY, z) => {
        if (bgStyle === '#1a1a2e') { ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, w, h) }
        else if (bgStyle === '#ffffff') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h) }
        else { ctx.fillStyle = '#fafaf9'; ctx.fillRect(0, 0, w, h) }

        const spacing = 24 * z, ox = (panX % spacing + spacing) % spacing, oy = (panY % spacing + spacing) % spacing
        ctx.save()

        if (bgStyle === 'dot') {
            ctx.fillStyle = '#d4d4d0'
            for (let x = ox - spacing; x < w + spacing; x += spacing)
                for (let y = oy - spacing; y < h + spacing; y += spacing) { ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill() }
        }
        else if (bgStyle === 'grid') {
            ctx.strokeStyle = '#e4e4e0'; ctx.lineWidth = 0.5
            for (let x = ox - spacing; x < w + spacing; x += spacing) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
            for (let y = oy - spacing; y < h + spacing; y += spacing) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }
        }
        else if (bgStyle === 'line') {
            ctx.strokeStyle = '#e0e0dc'; ctx.lineWidth = 0.6
            for (let y = oy - spacing; y < h + spacing; y += spacing) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }
        }
        ctx.restore()
    }, [])

    const redraw = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        const s = stateRef.current
        const bgOpt = BG_OPTIONS.find(b => b.id === bg) || BG_OPTIONS[0]
        drawBackground(ctx, canvas.width, canvas.height, bgOpt.style, s.panOffset.x, s.panOffset.y, s.zoom)

        s.elements.forEach(el => {
            const isEditingLabel = editingIdRef.current === el.id && editingIsLabelRef.current
            const isEditingText = editingIdRef.current === el.id && !editingIsLabelRef.current
            if (isEditingText) return
            if (WC_TOOLS.includes(el.tool)) {
                renderWhimsicalElement(ctx, el, s.selectedIds.has(el.id), s.panOffset.x, s.panOffset.y, s.zoom)
            } else {
                drawElement(ctx, el, s.selectedIds.has(el.id), s.panOffset.x, s.panOffset.y, s.zoom, s.elements, isEditingLabel ? el.id : null)
            }
        })

        if (s.current) {
            if (WC_TOOLS.includes(s.current.tool)) {
                renderWhimsicalElement(ctx, s.current, false, s.panOffset.x, s.panOffset.y, s.zoom)
            } else {
                drawElement(ctx, s.current, false, s.panOffset.x, s.panOffset.y, s.zoom, s.elements)
            }
        }

        if (s.marquee && s.isMarquee) drawMarquee(ctx, s.marquee.x, s.marquee.y, s.marquee.w, s.marquee.h, s.panOffset.x, s.panOffset.y, s.zoom)

        if (toolRef.current === 'select' && s.hoverShapeId) {
            if (s.hoverShapeId) {
                const hEl = s.elements.find(e => e.id === s.hoverShapeId)
                if (hEl) {
                    if (toolRef.current === 'select' && CONNECTABLE_TOOLS.includes(hEl.tool)) {
                        drawHoverConnectors(ctx, hEl, s.panOffset.x, s.panOffset.y, s.zoom)
                        if (s.hoverAnchorSide) drawClonePreview(ctx, hEl, s.hoverAnchorSide, s.panOffset.x, s.panOffset.y, s.zoom)
                    }
                    if (hEl.tool === 'text') {
                        const b = getElementBounds(hEl)
                        ctx.save(); ctx.translate(s.panOffset.x, s.panOffset.y); ctx.scale(s.zoom, s.zoom)
                        ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 1 / s.zoom
                        ctx.setLineDash([4 / s.zoom, 3 / s.zoom]); ctx.globalAlpha = 0.5
                        ctx.strokeRect(b.x - 6, b.y - 6, b.w + 12, b.h + 12)
                        ctx.setLineDash([]); ctx.restore()
                    }
                }
            }
        }

        if (toolRef.current === 'connector' && s.current) {
            ctx.save(); ctx.translate(s.panOffset.x, s.panOffset.y); ctx.scale(s.zoom, s.zoom)
            ctx.strokeStyle = '#457b9d'; ctx.lineWidth = sizeRef.current || 2; ctx.setLineDash([6, 4])
            ctx.beginPath(); ctx.moveTo(s.current.x1, s.current.y1); ctx.lineTo(s.current.x2, s.current.y2); ctx.stroke()
            ctx.setLineDash([]); ctx.restore()
        }

        if (pendingWCRef.current) {
            ctx.save()
            ctx.font = "bold 13px 'DM Sans', sans-serif"
            ctx.fillStyle = '#FF6B6B'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'bottom'
            ctx.fillText(`Click to place ${WHIMSICAL_COMPONENTS.find(c => c.id === pendingWCRef.current)?.label || ''}  ✦`, canvas.width / 2, canvas.height - 20)
            ctx.restore()
        }

        saveToStorage()
    }, [bg, drawBackground, saveToStorage])

    const resize = useCallback(() => {
        const canvas = canvasRef.current, wrap = wrapRef.current
        if (!canvas || !wrap) return
        const r = wrap.getBoundingClientRect()
        canvas.width = r.width; canvas.height = r.height; redraw()
    }, [redraw])

    useEffect(() => {
        const fonts = document.createElement('link')
        fonts.rel = 'stylesheet'
        fonts.href = 'https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&family=Space+Mono:wght@400;700&family=DM+Sans:wght@400;500;700&display=swap'
        document.head.appendChild(fonts)
        return () => { try { document.head.removeChild(fonts) } catch { console.log("error") } }
    }, [])

    useEffect(() => {
        const style = document.createElement('style')
        style.id = 'sketchpad-scrollbar'
        style.textContent = `
            .sketchpad-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
            .sketchpad-scroll::-webkit-scrollbar-track { background: transparent; }
            .sketchpad-scroll::-webkit-scrollbar-thumb { background: #d1d1ce; border-radius: 999px; }
            .sketchpad-scroll::-webkit-scrollbar-thumb:hover { background: #a1a19e; }
            .sketchpad-scroll { scrollbar-width: thin; scrollbar-color: #d1d1ce transparent; }
            .sel-toolbar-btn:hover { background: rgba(255,255,255,0.15) !important; }
            .sel-toolbar-btn-del:hover { background: rgba(239,68,68,0.25) !important; color: #fca5a5 !important; }
        `
        document.head.appendChild(style)
        return () => { try { document.head.removeChild(style) } catch { console.log("error") } }
    }, [])

    useEffect(() => { loadFromStorage(); redraw() }, []) // eslint-disable-line
    useEffect(() => { resize(); const ro = new ResizeObserver(resize); if (wrapRef.current) ro.observe(wrapRef.current); return () => ro.disconnect() }, [resize])
    useEffect(() => { redraw() }, [redraw, bg])

    const getPos = useCallback((e) => {
        const canvas = canvasRef.current
        if (!canvas) return { x: 0, y: 0 }
        const r = canvas.getBoundingClientRect(), s = stateRef.current
        const ce = e.touches ? e.touches[0] : e
        return { x: (ce.clientX - r.left - s.panOffset.x) / s.zoom, y: (ce.clientY - r.top - s.panOffset.y) / s.zoom }
    }, [])

    const getHoveredAnchor = useCallback((el, wx, wy) => {
        if (!el || !CONNECTABLE_TOOLS.includes(el.tool)) return null
        const s = stateRef.current
        for (const a of getAnchors(el)) {
            const dx = wx - a.x, dy = wy - a.y
            if (Math.sqrt(dx * dx + dy * dy) < 12 / s.zoom) return a
        }
        return null
    }, [])

    const cloneAndConnect = useCallback((srcEl, side) => {
        const s = stateRef.current
        const b = getElementBounds(srcEl)
        const DIST = 100
        const offsets = { top: [0, -(b.h + DIST)], bottom: [0, b.h + DIST], left: [-(b.w + DIST), 0], right: [b.w + DIST, 0] }
        const oppSide = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }
        const [ox, oy] = offsets[side] || [b.w + DIST, 0]
        const newEl = JSON.parse(JSON.stringify(srcEl))
        newEl.id = newId(); newEl.label = ''; newEl.x1 = srcEl.x1 + ox; newEl.y1 = srcEl.y1 + oy; newEl.x2 = srcEl.x2 + ox; newEl.y2 = srcEl.y2 + oy
        const conn = { id: newId(), tool: 'connector', x1: 0, y1: 0, x2: 0, y2: 0, fromId: srcEl.id, fromSide: side, toId: newEl.id, toSide: oppSide[side], color: '#457b9d', size: sizeRef.current || 2, arrowStyle: 'line' }
        s.elements.push(newEl, conn); s.redo = []; s.selectedIds = new Set([newEl.id]); s.hoverShapeId = null; s.hoverAnchorSide = null
        setSelectedEl({ ...newEl }); setSelectionCount(1); setViewVersion(v => v + 1); redraw()

        const canvas = canvasRef.current
        if (!canvas) return

        const nb = getElementBounds(newEl)
        const sc = { x: nb.x * s.zoom + s.panOffset.x, y: nb.y * s.zoom + s.panOffset.y }
        const sw = nb.w * s.zoom, sh = nb.h * s.zoom
        setTextInput({ x: sc.x + sw / 2 - 60, y: sc.y + sh / 2 - 16, sx: nb.x + nb.w / 2, sy: nb.y + nb.h / 2, color: colorRef.current, font: FONTS[fontRef.current], fontSize: 14, editId: newEl.id, isLabel: true, boxW: sw, boxH: sh })
        setTimeout(() => textareaRef.current?.focus(), 50)
    }, [redraw])

    const commitText = useCallback(() => {
        editingIdRef.current = null;
        editingIsLabelRef.current = false
        const ti = textInputRef.current
        const txt = textareaRef.current?.value ?? ''
        const s = stateRef.current
        if (ti) {
            if (ti.editId) {
                const el = s.elements.find(x => x.id === ti.editId)
                if (el) {
                    if (ti.isLabel) el.label = txt.trim() || ''
                    else el.text = txt || el.text
                }
            } else if (ti.stickyId) {
                const el = s.elements.find(x => x.id === ti.stickyId)
                if (el) el.text = txt
            } else if (txt.trim()) {
                const s = stateRef.current
                s.elements.push({
                    id: newId(), tool: 'text',
                    x1: ti.sx, y1: ti.sy,
                    text: txt, color: ti.color,
                    fontSize: ti.fontSize / s.zoom,
                    font: ti.font
                })
            }
            s.redo = []; redraw()
        }
        setTextInput(null)
        textInputRef.current = null
        if (textareaRef.current) textareaRef.current.value = ''
    }, [redraw])

    const vanishRedraw = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d'), s = stateRef.current, now = Date.now()
        const bgOpt = BG_OPTIONS.find(b => b.id === bg) || BG_OPTIONS[0]
        vanishStrokesRef.current.forEach(vs => {
            if (!vs.createdAt) { vs._alpha = 1; return }
            const age = now - vs.createdAt
            vs._alpha = age < VANISH_DURATION ? 1 : Math.max(0, 1 - (age - VANISH_DURATION) / VANISH_FADE)
        })
        vanishStrokesRef.current = vanishStrokesRef.current.filter(vs => !vs.createdAt || vs._alpha > 0)

        const hasVanish = vanishStrokesRef.current.length > 0 || (s.drawing && toolRef.current === 'vanish')
        if (hasVanish || s.drawing) {
            drawBackground(ctx, canvas.width, canvas.height, bgOpt.style, s.panOffset.x, s.panOffset.y, s.zoom)
            s.elements.forEach(el => {
                if (WC_TOOLS.includes(el.tool)) renderWhimsicalElement(ctx, el, s.selectedIds.has(el.id), s.panOffset.x, s.panOffset.y, s.zoom)
                else drawElement(ctx, el, s.selectedIds.has(el.id), s.panOffset.x, s.panOffset.y, s.zoom, s.elements)
            })
            if (s.current) drawElement(ctx, s.current, false, s.panOffset.x, s.panOffset.y, s.zoom, s.elements)
            vanishStrokesRef.current.forEach(vs => drawElement(ctx, vs, false, s.panOffset.x, s.panOffset.y, s.zoom, s.elements))
        }
        if (hasVanish) { animFrameRef.current = requestAnimationFrame(vanishRedraw) } else { animFrameRef.current = null; redraw() }
    }, [bg, redraw, drawBackground])

    const startVanishLoop = useCallback(() => {
        if (animFrameRef.current) return
        animFrameRef.current = requestAnimationFrame(vanishRedraw)
    }, [vanishRedraw])

    const onDown = useCallback((e) => {
        if (e.target !== canvasRef.current) return
        if (textInputRef.current) {
            commitText()
            return
        }
        e.preventDefault()
        const pos = getPos(e)
        const s = stateRef.current
        const t = toolRef.current

        if (pendingWCRef.current) {
            const id = newId()
            const comp = WHIMSICAL_COMPONENTS.find(c => c.id === pendingWCRef.current)
            s.elements.push({
                id, tool: pendingWCRef.current,
                x1: pos.x, y1: pos.y,
                x2: pos.x + (comp?.defaultW ?? 200),
                y2: pos.y + (comp?.defaultH ?? 80),
                data: makeComponentData(pendingWCRef.current),
            })
            s.redo = []
            setPendingWC(null)
            redraw()
            return
        }

        if (t === 'pan') { const ce = e.touches ? e.touches[0] : e; s.panStart = { x: ce.clientX - s.panOffset.x, y: ce.clientY - s.panOffset.y }; s.drawing = true; return }

        if (t === 'select') {
            if (s.hoverShapeId && s.hoverAnchorSide) { const hEl = s.elements.find(e => e.id === s.hoverShapeId); if (hEl) { cloneAndConnect(hEl, s.hoverAnchorSide); return } }
            if (s.selectedIds.size === 1) {
                const selEl = s.elements.find(el => s.selectedIds.has(el.id))
                if (selEl) {
                    const b = getElementBounds(selEl), handles = getHandles(b)
                    for (let i = 0; i < handles.length; i++) {
                        const [hx, hy] = handles[i]
                        if (Math.sqrt((pos.x - hx) ** 2 + (pos.y - hy) ** 2) < 10 / s.zoom) {
                            s.resizeHandle = { idx: i, el: selEl, origBounds: { ...b }, origEl: JSON.parse(JSON.stringify(selEl)) }
                            s.drawing = true; return
                        }
                    }
                }
            }
            let found = null
            for (let i = s.elements.length - 1; i >= 0; i--) { if (hitTest(s.elements[i], pos.x, pos.y)) { found = s.elements[i]; break } }
            if (found) {
                const groupIds = getGroupIds(found.id)
                if (!(e.shiftKey || e.ctrlKey || e.metaKey)) {
                    if (!s.selectedIds.has(found.id)) s.selectedIds = new Set(groupIds)
                } else {
                    const ns = new Set(s.selectedIds)
                    if (ns.has(found.id)) { groupIds.forEach(id => ns.delete(id)) }
                    else { groupIds.forEach(id => ns.add(id)) }
                    s.selectedIds = ns
                }
                setSelectedEl(s.elements.find(el => s.selectedIds.has(el.id)) || null); setSelectionCount(s.selectedIds.size)
                s.dragStart = { x: pos.x, y: pos.y }; s.dragEls = s.elements.filter(el => s.selectedIds.has(el.id)).map(el => JSON.parse(JSON.stringify(el)))
                s.drawing = true; s.isMarquee = false
            } else {
                s.selectedIds = new Set(); setSelectedEl(null); setSelectionCount(0)
                s.marquee = { x: pos.x, y: pos.y, w: 0, h: 0 }; s.isMarquee = true; s.drawing = true
            }
            redraw(); return
        }

        if (t === 'text') {
            for (let i = s.elements.length - 1; i >= 0; i--) {
                if (s.elements[i].tool === 'text' && hitTest(s.elements[i], pos.x, pos.y)) {
                    s.selectedIds = new Set([s.elements[i].id])
                    setSelectedEl({ ...s.elements[i] }); setSelectionCount(1)
                    setViewVersion(v => v + 1); redraw(); return
                }
            }
            const canvas = canvasRef.current, r = canvas.getBoundingClientRect(), ce = e.touches ? e.touches[0] : e
            const screenX = ce.clientX - r.left, screenY = ce.clientY - r.top
            setTextInput({
                x: screenX, y: screenY - (fontSizeRef.current || 18) * stateRef.current.zoom,
                sx: pos.x, sy: pos.y,
                color: colorRef.current, font: FONTS[fontRef.current],
                fontSize: (fontSizeRef.current || 18) * stateRef.current.zoom,
                // no boxW/boxH so it floats freely and auto-grows
            })
            setTimeout(() => textareaRef.current?.focus(), 50); return
        }

        if (t === 'sticky') {
            const id = newId()
            const el = { id, tool: 'sticky', x1: pos.x, y1: pos.y, text: 'Note', bgColor: stickyColorRef.current, width: 200, height: 100 }
            s.elements.push(el); s.redo = []; redraw()
            const canvas = canvasRef.current, r = canvas.getBoundingClientRect(), ce = e.touches ? e.touches[0] : e
            // Pass the sticky box dimensions so the textarea matches
            setTextInput({ x: ce.clientX - r.left, y: ce.clientY - r.top, sx: pos.x, sy: pos.y + 30, color: '#1a1a2e', font: FONTS[0], fontSize: 14, stickyId: id, boxW: 200 * s.zoom })
            setTimeout(() => textareaRef.current?.focus(), 50); return
        }

        if (t === 'image') { fileRef.current?.click(); return }

        // if (!['select', 'pan', 'sticky', 'image', 'connector', 'eraser'].includes(t)) {
        //     let found = null
        //     for (let i = s.elements.length - 1; i >= 0; i--) {
        //         if (hitTest(s.elements[i], pos.x, pos.y)) { found = s.elements[i]; break }
        //     }
        //     if (found) {
        //         s.selectedIds = new Set([found.id])
        //         setSelectedEl({ ...found }); setSelectionCount(1)
        //         s.dragStart = { x: pos.x, y: pos.y }
        //         s.dragEls = [JSON.parse(JSON.stringify(found))]
        //         s.drawing = true; s.isMarquee = false
        //         // Temporarily switch behavior to drag — handled by select drag logic in onMove
        //         toolRef.current = '__drag__'
        //         redraw(); return
        //     }
        // }

        if (t === 'connector') {
            let startEl = null, startSide = 'right'
            for (let i = s.elements.length - 1; i >= 0; i--) {
                const el = s.elements[i]; if (!CONNECTABLE_TOOLS.includes(el.tool)) continue
                const anchor = getHoveredAnchor(el, pos.x, pos.y); if (anchor) { startEl = el; startSide = anchor.side; break }
            }
            s.connStart = { elId: startEl?.id, side: startSide }
            s.current = { id: newId(), tool: 'connector', x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y, fromId: startEl?.id, fromSide: startSide, color: colorRef.current || '#457b9d', size: sizeRef.current || 2, arrowStyle: arrowStyleRef.current }
            s.drawing = true; s.redo = []; return
        }

        s.drawing = true; s.redo = []
        const id = newId()
        if (t === 'vanish') {
            const stroke = { id, tool: 'vanish', size: sizeRef.current, points: [[pos.x, pos.y]], createdAt: null, _alpha: 1 }
            vanishStrokesRef.current.push(stroke); s.current = stroke; startVanishLoop()
        } else if (t === 'pencil' || t === 'pen' || t === 'eraser' || t === 'highlighter') {
            s.current = { id, tool: t, color: colorRef.current, size: sizeRef.current, points: [[pos.x, pos.y]] }
        } else if (t === 'shape') {
            s.current = { id, tool: 'shape', shapeType: shapeRef.current, color: colorRef.current, fill: fillRef.current === 'none' ? null : fillRef.current, size: sizeRef.current, x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y }
        } else {
            s.current = { id, tool: t, color: colorRef.current, fill: fillRef.current === 'none' ? null : fillRef.current, size: sizeRef.current, arrowStyle: arrowStyleRef.current, arrowEnd: arrowEndRef.current, x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y }
        }
    }, [getPos, getHoveredAnchor, cloneAndConnect, redraw, startVanishLoop, commitText])

    const onMove = useCallback((e) => {
        const s = stateRef.current, pos = getPos(e), t = toolRef.current

        // ── Hover detection runs for all tools when not drawing ──
        if (!s.drawing) {
            // Hover all element types, not just connectable shapes
            let found = null
            for (let i = s.elements.length - 1; i >= 0; i--) {
                const el = s.elements[i]
                if (hitTest(el, pos.x, pos.y)) { found = el; break }
            }
            const newHov = found?.id || null
            const anchor = found && CONNECTABLE_TOOLS.includes(found.tool) ? getHoveredAnchor(found, pos.x, pos.y) : null
            if (newHov !== s.hoverShapeId || (anchor?.side || null) !== s.hoverAnchorSide) {
                s.hoverShapeId = newHov; s.hoverAnchorSide = anchor?.side || null; redraw()
            }
            return
        }

        e.preventDefault()

        if (t === 'pan' && s.panStart) { const ce = e.touches ? e.touches[0] : e; s.panOffset = { x: ce.clientX - s.panStart.x, y: ce.clientY - s.panStart.y }; redraw(); return }
        if (t === 'select' || t === '__drag__') {
            if (s.isMarquee && s.marquee) {
                s.marquee.w = pos.x - s.marquee.x; s.marquee.h = pos.y - s.marquee.y
                const inside = new Set(); s.elements.forEach(el => { if (marqueeHitTest(el, s.marquee.x, s.marquee.y, s.marquee.w, s.marquee.h)) inside.add(el.id) })
                s.selectedIds = inside; redraw(); return
            }
            if (s.resizeHandle && s.resizeHandle.el) {
                const el = s.elements.find(x => x.id === s.resizeHandle.el.id)
                if (!el) return
                const { idx: hi, origBounds: ob, origEl } = s.resizeHandle

                let nx1 = ob.x, ny1 = ob.y, nx2 = ob.x + ob.w, ny2 = ob.y + ob.h
                if (hi === 0 || hi === 6 || hi === 7) nx1 = pos.x
                if (hi === 0 || hi === 1 || hi === 2) ny1 = pos.y
                if (hi === 2 || hi === 3 || hi === 4) nx2 = pos.x
                if (hi === 4 || hi === 5 || hi === 6) ny2 = pos.y

                const nw = Math.max(10, Math.abs(nx2 - nx1))
                const nh = Math.max(10, Math.abs(ny2 - ny1))
                const minNx = Math.min(nx1, nx2)
                const minNy = Math.min(ny1, ny2)
                const scaleX = nw / (ob.w || 1)
                const scaleY = nh / (ob.h || 1)

                if (origEl?.points) {
                    el.points = origEl.points.map(([px, py]) => [
                        minNx + (px - ob.x) * scaleX,
                        minNy + (py - ob.y) * scaleY
                    ])
                } else if (el.shapeType === '__custom__' && origEl?._verts) {
                    const scaledVerts = origEl._verts.map(([vx, vy]) => [
                        minNx + (vx - ob.x) * scaleX,
                        minNy + (vy - ob.y) * scaleY
                    ])
                    el._verts = scaledVerts
                    el._customPath = scaledVerts.map((v, i) => `${i === 0 ? 'M' : 'L'}${v[0]},${v[1]}`).join(' ') + 'Z'
                    el.x1 = minNx; el.y1 = minNy; el.x2 = minNx + nw; el.y2 = minNy + nh
                } else {
                    el.x1 = nx1; el.y1 = ny1; el.x2 = nx2; el.y2 = ny2
                }

                redraw()
                return
            }
            if (s.dragStart && s.dragEls) {
                const dx = pos.x - s.dragStart.x, dy = pos.y - s.dragStart.y
                s.elements.forEach(el => {
                    if (!s.selectedIds.has(el.id)) return
                    const orig = s.dragEls.find(o => o.id === el.id); if (!orig) return
                    if (orig.points) el.points = orig.points.map(([px, py]) => [px + dx, py + dy])
                    else { if (orig.x1 !== undefined) el.x1 = orig.x1 + dx; if (orig.y1 !== undefined) el.y1 = orig.y1 + dy; if (orig.x2 !== undefined) el.x2 = orig.x2 + dx; if (orig.y2 !== undefined) el.y2 = orig.y2 + dy }
                })
                redraw(); return
            }
        }

        if (t === 'connector' && s.current) {
            s.current.x2 = pos.x; s.current.y2 = pos.y; s.current.toId = null; s.current.toSide = null
            for (const el of s.elements) {
                if (!CONNECTABLE_TOOLS.includes(el.tool)) continue
                const anchor = getHoveredAnchor(el, pos.x, pos.y)
                if (anchor && el.id !== s.current.fromId) { s.current.toId = el.id; s.current.toSide = anchor.side; break }
            }
            redraw(); return
        }

        if (t === 'pencil' || t === 'pen' || t === 'eraser' || t === 'highlighter' || t === 'vanish') { s.current?.points.push([pos.x, pos.y]) }
        else if (s.current) { s.current.x2 = pos.x; s.current.y2 = pos.y }
        redraw()
    }, [getPos, getHoveredAnchor, redraw])

    const onUp = useCallback(() => {
        const s = stateRef.current
        if (!s.drawing) return
        s.drawing = false
        if (toolRef.current === '__drag__') {
            toolRef.current = tool  // restore to current React state tool
            s.dragStart = null; s.dragEls = null
            const freshEl = s.elements.find(el => s.selectedIds.has(el.id)) || null
            setSelectedEl(freshEl ? { ...freshEl } : null); setViewVersion(v => v + 1); redraw(); return
        }
        if (toolRef.current === 'pan') { s.panStart = null; setViewVersion(v => v + 1); return }
        if (toolRef.current === 'select') {
            if (s.isMarquee) {
                if (s.marquee) { const inside = new Set(); s.elements.forEach(el => { if (marqueeHitTest(el, s.marquee.x, s.marquee.y, s.marquee.w, s.marquee.h)) inside.add(el.id) }); s.selectedIds = inside; setSelectionCount(inside.size); setSelectedEl(s.elements.find(el => inside.has(el.id)) ? { ...s.elements.find(el => inside.has(el.id)) } : null) }
                s.marquee = null; s.isMarquee = false; setViewVersion(v => v + 1); redraw(); return
            }
            s.dragStart = null; s.dragEls = null; s.resizeHandle = null
            const freshEl = s.elements.find(el => s.selectedIds.has(el.id)) || null
            setSelectedEl(freshEl ? { ...freshEl } : null); setSelectionCount(s.selectedIds.size); setViewVersion(v => v + 1); return
        }
        if (toolRef.current === 'vanish') { if (s.current) s.current.createdAt = Date.now(); s.current = null; startVanishLoop(); return }
        if (toolRef.current === 'connector' && s.current) {
            const ok = Math.abs(s.current.x2 - s.current.x1) > 5 || Math.abs(s.current.y2 - s.current.y1) > 5
            if (ok) s.elements.push({ ...s.current }); s.current = null; s.connStart = null; redraw(); return
        }
        if (s.current) {
            const p = s.current
            const ok = (p.points?.length > 1) || Math.abs((p.x2 || 0) - (p.x1 || 0)) > 3 || Math.abs((p.y2 || 0) - (p.y1 || 0)) > 3
            if (ok) {
                if (smartDrawRef.current && (p.tool === 'pencil' || p.tool === 'pen') && p.points?.length > 10) {
                    const recognized = recognizeShape(p.points)
                    if (recognized) {
                        const { type, verts, x1, y1, x2, y2 } = recognized

                        if (type === '__polygon__' || type === '__star__') {
                            const d = verts.map((v, i) => `${i === 0 ? 'M' : 'L'}${v[0]},${v[1]}`).join(' ') + 'Z'
                            s.elements.push({
                                id: p.id, tool: 'shape', shapeType: '__custom__',
                                _customPath: d, _verts: verts,
                                color: p.color, size: p.size, fill: null,
                                x1, y1, x2, y2
                            })
                        } else {
                            const { type: _t, verts: _v, points_n: _pn, sides: _s, ...rest } = recognized
                            s.elements.push({
                                id: p.id, tool: recognized.type,
                                shapeType: recognized.shapeType,
                                color: p.color, size: p.size, fill: null,
                                arrowStyle: 'line', arrowEnd: recognized.type === 'arrow' ? 'arrow' : 'none',
                                ...rest
                            })
                        }
                    } else {
                        s.elements.push(p)
                    }
                } else {
                    s.elements.push(p)
                }
            }
            s.current = null; redraw()
        }
    }, [redraw, startVanishLoop, tool])

    const onDblClick = useCallback((e) => {
        const pos = getPos(e), s = stateRef.current, canvas = canvasRef.current
        const r = canvas.getBoundingClientRect()
        for (let i = s.elements.length - 1; i >= 0; i--) {
            const el = s.elements[i]
            if (!hitTest(el, pos.x, pos.y)) continue

            if (WC_TOOLS.includes(el.tool)) {
                const newVal = prompt(`Edit ${el.tool} data (JSON):`, JSON.stringify(el.data || {}, null, 2))
                if (newVal) { try { el.data = JSON.parse(newVal); redraw() } catch (err) { alert('Invalid JSON: ' + err.message) } }
                return
            }

            if (['rect', 'circle', 'shape', 'diamond'].includes(el.tool)) {
                const b = getElementBounds(el)
                const sx = b.x * s.zoom + s.panOffset.x
                const sy = b.y * s.zoom + s.panOffset.y
                const sw = b.w * s.zoom
                const sh = b.h * s.zoom
                editingIdRef.current = el.id
                editingIsLabelRef.current = true
                redraw()
                setTextInput({
                    x: sx,
                    y: sy,
                    sx: b.x + b.w / 2, sy2: b.y + b.h / 2,
                    color: el.labelColor || el.color || '#1a1a2e',
                    font: el.labelFont || FONTS[1],
                    fontSize: (el.labelSize || 14) * s.zoom,
                    editId: el.id, isLabel: true,
                    initVal: el.label || '',
                    boxW: sw,
                    boxH: sh,
                })
                setTimeout(() => {
                    const ta = textareaRef.current
                    if (!ta) return
                    ta.focus()
                    // Place cursor at click position inside textarea
                    const clickX = e.clientX - r.left - sx
                    const clickY = e.clientY - r.top - sy
                    // Best-effort: put cursor at end, browser handles click-to-position
                    ta.setSelectionRange(ta.value.length, ta.value.length)
                }, 30)
                return
            }

            if (el.tool === 'text') {
                editingIdRef.current = el.id
                editingIsLabelRef.current = false
                redraw()
                const fs = el.fontSize || 18
                const screenX = el.x1 * s.zoom + s.panOffset.x
                const screenY = (el.y1 - fs) * s.zoom + s.panOffset.y
                setTextInput({
                    x: screenX,
                    y: screenY,
                    sx: el.x1, sy: el.y1,
                    color: el.color || colorRef.current,
                    font: el.font || FONTS[fontRef.current],
                    fontSize: fs * s.zoom,
                    editId: el.id, isLabel: false,
                    initVal: el.text || ''
                })
                setTimeout(() => {
                    const ta = textareaRef.current
                    if (!ta) return
                    ta.focus()

                    // Calculate which character position the click corresponds to
                    const clickX = e.clientX - r.left - screenX
                    const clickY = e.clientY - r.top - screenY
                    const lineHeight = fs * s.zoom * 1.35
                    const lines = (el.text || '').split('\n')
                    const lineIndex = Math.min(Math.floor(clickY / lineHeight), lines.length - 1)

                    // Build a temporary canvas to measure character positions
                    const tempCanvas = document.createElement('canvas')
                    const tempCtx = tempCanvas.getContext('2d')
                    tempCtx.font = `${fs * s.zoom}px ${el.font || FONTS[fontRef.current]}`

                    let charPos = 0
                    for (let l = 0; l < lineIndex; l++) {
                        charPos += lines[l].length + 1 // +1 for \n
                    }

                    const line = lines[Math.max(0, lineIndex)] || ''
                    let bestPos = line.length
                    for (let c = 0; c <= line.length; c++) {
                        const w = tempCtx.measureText(line.substring(0, c)).width
                        if (w >= clickX) {
                            const wPrev = c > 0 ? tempCtx.measureText(line.substring(0, c - 1)).width : 0
                            bestPos = (clickX - wPrev < w - clickX) ? c - 1 : c
                            break
                        }
                    }

                    ta.setSelectionRange(charPos + bestPos, charPos + bestPos)
                }, 30)
                return
            }

            if (el.tool === 'sticky') {
                const b = getElementBounds(el)
                const sx = b.x * s.zoom + s.panOffset.x
                const sy = b.y * s.zoom + s.panOffset.y
                const sw = b.w * s.zoom
                const sh = b.h * s.zoom
                setTextInput({
                    x: sx + 12 * s.zoom,
                    y: sy + 24 * s.zoom,
                    sx: el.x1, sy: el.y1 + 30,
                    color: '#1a1a2e', font: "'DM Sans', sans-serif",
                    fontSize: 14 * s.zoom,
                    stickyId: el.id, initVal: el.text || '',
                    boxW: sw - 24 * s.zoom,
                    boxH: sh - 24 * s.zoom,
                })
                setTimeout(() => textareaRef.current?.focus(), 30); return
            }
        }
    }, [getPos, redraw])

    useEffect(() => {
        const c = canvasRef.current; if (!c) return
        const onWheel = (e) => {
            e.preventDefault()
            const s = stateRef.current, canvas = canvasRef.current; if (!canvas) return
            if (e.ctrlKey) {
                const rect = canvas.getBoundingClientRect()
                const cx = e.clientX - rect.left, cy = e.clientY - rect.top
                const wx = (cx - s.panOffset.x) / s.zoom, wy = (cy - s.panOffset.y) / s.zoom
                const f = e.deltaY > 0 ? 0.9 : 1.1
                const nz = Math.min(5, Math.max(0.1, s.zoom * f))
                s.panOffset = { x: cx - wx * nz, y: cy - wy * nz }
                s.zoom = nz
                setZoom(Math.round(nz * 100) / 100)
                setViewVersion(v => v + 1)
            } else {
                s.panOffset = { x: s.panOffset.x - e.deltaX, y: s.panOffset.y - e.deltaY }
            }

            redraw()
        }

        let lastTouchDist = null
        let lastTouchMid = null
        let touchPanActive = false

        const getTouchMid = (t1, t2) => ({
            x: (t1.clientX + t2.clientX) / 2,
            y: (t1.clientY + t2.clientY) / 2,
        })
        const getTouchDist = (t1, t2) => {
            const dx = t1.clientX - t2.clientX, dy = t1.clientY - t2.clientY
            return Math.sqrt(dx * dx + dy * dy)
        }

        const onTS = (e) => {
            if (e.touches.length === 2) {
                e.preventDefault()
                touchPanActive = true
                lastTouchDist = getTouchDist(e.touches[0], e.touches[1])
                lastTouchMid = getTouchMid(e.touches[0], e.touches[1])
                const s = stateRef.current
                s.drawing = false; s.current = null
            } else {
                touchPanActive = false
                onDown(e)
            }
        }

        const onTM = (e) => {
            if (e.touches.length === 2) {
                e.preventDefault()
                const s = stateRef.current
                const canvas = canvasRef.current; if (!canvas) return
                const rect = canvas.getBoundingClientRect()

                const newDist = getTouchDist(e.touches[0], e.touches[1])
                const newMid = getTouchMid(e.touches[0], e.touches[1])

                if (lastTouchDist !== null && lastTouchMid !== null) {
                    // ── Pinch zoom ──
                    const scaleF = newDist / lastTouchDist
                    const cx = newMid.x - rect.left, cy = newMid.y - rect.top
                    const wx = (cx - s.panOffset.x) / s.zoom, wy = (cy - s.panOffset.y) / s.zoom
                    const nz = Math.min(5, Math.max(0.1, s.zoom * scaleF))
                    s.panOffset = { x: cx - wx * nz, y: cy - wy * nz }
                    s.zoom = nz
                    setZoom(Math.round(nz * 100) / 100)

                    // ── Two-finger pan ──
                    const dx = newMid.x - lastTouchMid.x, dy = newMid.y - lastTouchMid.y
                    s.panOffset = { x: s.panOffset.x + dx, y: s.panOffset.y + dy }

                    redraw()
                }

                lastTouchDist = newDist
                lastTouchMid = newMid
            } else if (!touchPanActive) {
                onMove(e)
            }
        }

        const onTE = (e) => {
            if (e.touches.length < 2) {
                touchPanActive = false
                lastTouchDist = null
                lastTouchMid = null
            }
            if (e.touches.length === 0) onUp(e)
        }

        c.addEventListener('wheel', onWheel, { passive: false })
        c.addEventListener('touchstart', onTS, { passive: false })
        c.addEventListener('touchmove', onTM, { passive: false })
        c.addEventListener('touchend', onTE, { passive: false })
        c.addEventListener('touchcancel', onTE, { passive: false })
        return () => {
            c.removeEventListener('wheel', onWheel)
            c.removeEventListener('touchstart', onTS)
            c.removeEventListener('touchmove', onTM)
            c.removeEventListener('touchend', onTE)
            c.removeEventListener('touchcancel', onTE)
        }
    }, [onDown, onMove, onUp, redraw])

    const commitLabel = useCallback(() => {
        if (!labelMode) return
        const s = stateRef.current, el = s.elements.find(x => x.id === labelMode.id)
        if (el) { el.label = labelMode.val; el.labelSize = 14; el.labelColor = colorRef.current }
        s.redo = []; redraw(); setLabelMode(null)
    }, [labelMode, redraw])

    const undo = useCallback(() => { const s = stateRef.current; if (s.elements.length) { s.redo.push(s.elements.pop()); redraw() } }, [redraw])
    const redo = useCallback(() => { const s = stateRef.current; if (s.redo.length) { s.elements.push(s.redo.pop()); redraw() } }, [redraw])
    const clearAll = useCallback(() => { if (window.confirm('Clear everything?')) { stateRef.current.elements = []; stateRef.current.redo = []; stateRef.current.selectedIds = new Set(); setSelectedEl(null); setSelectionCount(0); redraw() } }, [redraw])
    const deleteSelected = useCallback(() => { const s = stateRef.current; if (s.selectedIds.size === 0) return; s.elements = s.elements.filter(el => !s.selectedIds.has(el.id)); s.selectedIds = new Set(); setSelectedEl(null); setSelectionCount(0); s.redo = []; redraw() }, [redraw])
    const duplicateSelected = useCallback(() => {
        const s = stateRef.current
        const newEls = s.elements.filter(el => s.selectedIds.has(el.id)).map(el => {
            const copy = JSON.parse(JSON.stringify(el)); copy.id = newId()
            if (copy.points) copy.points = copy.points.map(([px, py]) => [px + 20, py + 20])
            else { copy.x1 = (copy.x1 || 0) + 20; copy.y1 = (copy.y1 || 0) + 20; if (copy.x2 !== undefined) copy.x2 += 20; if (copy.y2 !== undefined) copy.y2 += 20 }
            return copy
        })
        s.elements.push(...newEls); s.selectedIds = new Set(newEls.map(e => e.id))
        setSelectedEl(newEls[0] || null); setSelectionCount(newEls.length); redraw()
    }, [redraw])

    const groupSelected = useCallback(() => {
        const s = stateRef.current
        if (s.selectedIds.size < 2) return
        // Remove selected ids from any existing groups first
        s.groups = s.groups.map(g => {
            const next = new Set([...g].filter(id => !s.selectedIds.has(id)))
            return next
        }).filter(g => g.size > 1)
        s.groups.push(new Set(s.selectedIds))
        setViewVersion(v => v + 1)
        redraw()
    }, [redraw])

    const ungroupSelected = useCallback(() => {
        const s = stateRef.current
        s.groups = s.groups.filter(g => {
            return ![...g].some(id => s.selectedIds.has(id))
        })
        setViewVersion(v => v + 1)
        redraw()
    }, [redraw])

    const getGroupIds = useCallback((id) => {
        const s = stateRef.current
        const group = s.groups.find(g => g.has(id))
        return group ? new Set(group) : new Set([id])
    }, [])

    const exportPNG = useCallback(() => { const canvas = canvasRef.current; if (!canvas) return; const a = document.createElement('a'); a.download = 'sketchpad.png'; a.href = canvas.toDataURL('image/png'); a.click() }, [])
    const handleImageUpload = useCallback((e) => {
        const file = e.target.files?.[0]; if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => {
            const img = new Image()
            img.onload = () => {
                const s = stateRef.current, cx = (canvasRef.current?.width || 600) / 2 / s.zoom - s.panOffset.x / s.zoom, cy = (canvasRef.current?.height || 400) / 2 / s.zoom - s.panOffset.y / s.zoom
                const w = Math.min(img.naturalWidth, 400), h = img.naturalHeight * (w / img.naturalWidth)
                s.elements.push({ id: newId(), tool: 'image', img, x1: cx - w / 2, y1: cy - h / 2, x2: cx + w / 2, y2: cy + h / 2 }); s.redo = []; redraw()
            }
            img.src = ev.target.result
        }
        reader.readAsDataURL(file); e.target.value = ''
    }, [redraw])

    const zoomIn = () => { const s = stateRef.current; s.zoom = Math.min(5, s.zoom * 1.2); setZoom(Math.round(s.zoom * 100) / 100); setViewVersion(v => v + 1); redraw() }
    const zoomOut = () => { const s = stateRef.current; s.zoom = Math.max(0.1, s.zoom / 1.2); setZoom(Math.round(s.zoom * 100) / 100); setViewVersion(v => v + 1); redraw() }
    const resetZoom = () => { const s = stateRef.current; s.zoom = 1; s.panOffset = { x: 0, y: 0 }; setZoom(1); setViewVersion(v => v + 1); redraw() }
    const fitToScreen = useCallback(() => {
        const s = stateRef.current; if (!s.elements.length) return
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        s.elements.forEach(el => { const b = getElementBounds(el); minX = Math.min(minX, b.x); minY = Math.min(minY, b.y); maxX = Math.max(maxX, b.x + b.w); maxY = Math.max(maxY, b.y + b.h) })
        const canvas = canvasRef.current; if (!canvas) return
        const pad = 60, fw = canvas.width - pad * 2, fh = canvas.height - pad * 2, cw = maxX - minX || 1, ch = maxY - minY || 1
        const nz = Math.min(fw / cw, fh / ch, 2); s.zoom = nz; s.panOffset = { x: pad - minX * nz, y: pad - minY * nz }
        setZoom(Math.round(nz * 100) / 100); setViewVersion(v => v + 1); redraw()
    }, [redraw])

    useEffect(() => {
        const kd = (e) => {
            if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') return
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); return }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); redo(); return }
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); duplicateSelected(); return }
            if ((e.ctrlKey || e.metaKey) && e.key === 'g' && !e.shiftKey) { e.preventDefault(); groupSelected(); return }
            if ((e.ctrlKey || e.metaKey) && e.key === 'g' && e.shiftKey) { e.preventDefault(); ungroupSelected(); return }
            if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected()
            if (e.key === 'Escape') {
                stateRef.current.selectedIds = new Set(); stateRef.current.marquee = null; stateRef.current.isMarquee = false; stateRef.current.hoverShapeId = null; stateRef.current.hoverAnchorSide = null
                setSelectedEl(null); setSelectionCount(0)
                if (pendingWCRef.current) setPendingWC(null)
                redraw()
            }
            const map = { p: 'pencil', b: 'pen', h: 'highlighter', e: 'eraser', l: 'line', a: 'arrow', c: 'connector', r: 'rect', o: 'circle', s: 'shape', t: 'text', n: 'sticky', v: 'select', m: 'pan', i: 'image' }
            if (map[e.key]) setTool(map[e.key])
        }
        document.addEventListener('keydown', kd)
        return () => document.removeEventListener('keydown', kd)
    }, [undo, redo, deleteSelected, duplicateSelected, redraw])

    const inlineToolbarPos = useMemo(() => {
        const s = stateRef.current
        if (s.selectedIds.size === 0) return null
        let minX = Infinity, minY = Infinity, maxX = -Infinity
        s.elements.forEach(el => { if (!s.selectedIds.has(el.id)) return; const b = getElementBounds(el); minX = Math.min(minX, b.x); minY = Math.min(minY, b.y); maxX = Math.max(maxX, b.x + b.w) })
        if (!isFinite(minX)) return null
        const midWorldX = (minX + maxX) / 2, screenX = midWorldX * s.zoom + s.panOffset.x, screenY = minY * s.zoom + s.panOffset.y
        return { left: screenX, top: Math.max(8, screenY - 48) }
    }, [selectedEl, selectionCount, viewVersion]) // eslint-disable-line

    const S = useMemo(() => ({
        root: { display: 'flex', flexDirection: 'column', width: '100%', height: '100%', minHeight: 500, fontFamily: "'DM Sans', sans-serif", background: '#f5f5f0', overflow: 'hidden', position: 'relative' },
        topbar: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: '#ffffff', borderBottom: '1px solid #e8e8e4', flexWrap: 'nowrap', overflowX: 'auto', minHeight: 48, userSelect: 'none', flexShrink: 0 },
        toolBtn: (active, tid) => ({ width: 34, height: 34, border: tid === 'vanish' && active ? '1.5px solid #ff2d55' : active ? '1.5px solid #6366f1' : '1px solid transparent', borderRadius: 8, background: tid === 'vanish' && active ? '#fff0f3' : active ? '#eef2ff' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: tid === 'vanish' && active ? '#ff2d55' : active ? '#4f46e5' : '#52525b', transition: 'all 0.12s', flexShrink: 0 }),
        iconBtn: (active = false) => ({ width: 32, height: 32, border: `1px solid ${active ? '#e0e0ff' : '#e8e8e4'}`, borderRadius: 7, background: active ? '#f0f0ff' : '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? '#4f46e5' : '#71717a', transition: 'all 0.12s', flexShrink: 0 }),
        sep: { width: 1, height: 28, background: '#e8e8e4', flexShrink: 0, margin: '0 2px' },
        label: { fontSize: 11, color: '#9ca3af', userSelect: 'none', whiteSpace: 'nowrap' },
        canvasWrap: { flex: 1, position: 'relative', overflow: 'hidden' },
        propPanel: { position: 'absolute', right: 8, top: 8, width: 180, background: '#ffffff', borderRadius: 12, border: '1px solid #e8e8e4', padding: 12, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
        sidebarSection: { display: 'flex', flexDirection: 'column', gap: 6 },
        sidebarLabel: { fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: '.06em', textTransform: 'uppercase' },
        colorDot: (c, active) => ({ width: 20, height: 20, borderRadius: '50%', background: c, border: active ? '2.5px solid #6366f1' : '2px solid transparent', cursor: 'pointer', transform: active ? 'scale(1.2)' : 'scale(1)', transition: 'all 0.1s', flexShrink: 0, boxShadow: '0 0 0 1px rgba(0,0,0,0.1)' }),
        mobileBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, background: '#ffffff', borderTop: '1px solid #e8e8e4', padding: '8px 12px', zIndex: 30 },
        kbd: { display: 'inline-block', background: '#f4f4f2', border: '1px solid #ddd', borderRadius: 3, padding: '0 4px', fontSize: 10, color: '#666' },
    }), [])

    const mob = isMobile()

    const DRAW_TOOLS = [
        { id: 'select', icon: 'select', key: 'V', label: 'Select' },
        { id: 'pan', icon: 'pan', key: 'M', label: 'Pan' },
        null,
        { id: 'pencil', icon: 'pencil', key: 'P', label: 'Pencil' },
        { id: 'pen', icon: 'pen', key: 'B', label: 'Pen' },
        { id: 'highlighter', icon: 'highlight', key: 'H', label: 'Highlight' },
        { id: 'vanish', icon: 'vanish', key: 'F', label: 'Vanish Pen' },
        { id: 'eraser', icon: 'eraser', key: 'E', label: 'Eraser' },
        null,
        { id: 'line', icon: 'line', key: 'L', label: 'Line' },
        { id: 'arrow', icon: 'arrow', key: 'A', label: 'Arrow' },
        { id: 'connector', icon: 'connector', key: 'C', label: 'Smart Connector' },
        { id: 'double-arrow', icon: 'arrow', key: null, label: '↔ Arrow' },
        null,
        { id: 'rect', icon: 'rect', key: 'R', label: 'Rectangle' },
        { id: 'circle', icon: 'circle', key: 'O', label: 'Circle' },
        { id: 'diamond', icon: 'diamond', key: null, label: 'Diamond' },
        { id: 'shape', icon: 'shape', key: 'S', label: 'Shape' },
        null,
        { id: 'text', icon: 'text', key: 'T', label: 'Text' },
        { id: 'sticky', icon: 'sticky', key: 'N', label: 'Sticky' },
        { id: 'image', icon: 'image', key: 'I', label: 'Image' },
    ]

    const MOBILE_TOOLS = [
        { id: 'pencil', icon: 'pencil' }, { id: 'eraser', icon: 'eraser' },
        { id: 'arrow', icon: 'arrow' }, { id: 'connector', icon: 'connector' },
        { id: 'rect', icon: 'rect' }, { id: 'text', icon: 'text' },
        { id: 'sticky', icon: 'sticky' }, { id: 'select', icon: 'select' }, { id: 'pan', icon: 'pan' },
    ]

    const cursorFor = (t) => {
        if (pendingWCRef.current) return 'cell'
        if (t === 'pan') return 'grab'
        if (t === 'text' || t === 'sticky') return 'text'
        if (t === 'select') return 'default'
        if (t === 'eraser') return 'cell'
        return 'crosshair'
    }

    const hasSelection = selectionCount > 0

    return (
        <div style={S.root}>
            {!mob && (
                <div style={S.topbar} className="sketchpad-scroll">
                    {DRAW_TOOLS.map((t, i) => t === null
                        ? <div key={i} style={S.sep} />
                        : (
                            <button key={t.id} style={S.toolBtn(tool === t.id, t.id)} title={`${t.label}${t.key ? ` (${t.key})` : ''}`} onClick={() => setTool(t.id)}>
                                {t.id === 'vanish' ? <span style={{ fontSize: 13, color: tool === 'vanish' ? '#ff2d55' : '#999' }}>✦</span>
                                    : icons[t.icon] ? <Icon d={icons[t.icon]} /> : <span style={{ fontSize: 13 }}>{t.label}</span>}
                            </button>
                        )
                    )}
                    <div style={S.sep} />
                    <button
                        style={{
                            ...S.iconBtn(smartDraw),
                            width: 'auto', padding: '0 10px', fontSize: 11,
                            color: smartDraw ? '#4f46e5' : '#71717a',
                            fontWeight: smartDraw ? 600 : 400,
                            border: smartDraw ? '1.5px solid #6366f1' : '1px solid #e8e8e4',
                            background: smartDraw ? '#eef2ff' : '#ffffff',
                        }}
                        title="Smart Shape Recognition — auto-corrects pencil strokes into shapes"
                        onClick={() => setSmartDraw(v => !v)}
                    >
                        ⬡ Smart
                    </button>

                    {tool === 'shape' && (<>
                        {SHAPES.map(sh => (<button key={sh} style={S.toolBtn(shapeType === sh)} title={sh} onClick={() => setShapeType(sh)}><span style={{ fontSize: 14 }}>{SHAPE_ICONS[sh]}</span></button>))}
                        <div style={S.sep} />
                    </>)}

                    {(tool === 'arrow' || tool === 'dashed-arrow' || tool === 'connector') && (<>
                        <select value={arrowStyle} onChange={e => setArrowStyle(e.target.value)} style={{ height: 28, borderRadius: 6, border: '1px solid #e0e0e0', fontSize: 11, padding: '0 6px', color: '#555' }}>
                            {ARROW_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {tool !== 'connector' && (<select value={arrowEnd} onChange={e => setArrowEnd(e.target.value)} style={{ height: 28, borderRadius: 6, border: '1px solid #e0e0e0', fontSize: 11, padding: '0 6px', color: '#555' }}>{ARROW_ENDS.map(s => <option key={s} value={s}>{s}</option>)}</select>)}
                        <div style={S.sep} />
                    </>)}

                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        {COLORS.map(c => (<div key={c} style={S.colorDot(c, color === c)} onClick={() => setColor(c)} title={c} />))}
                        <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 20, height: 20, border: 'none', borderRadius: '50%', cursor: 'pointer', padding: 0 }} />
                    </div>
                    <div style={S.sep} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={S.label}>Fill</span>
                        <div style={{ ...S.colorDot('transparent', fill === 'none'), border: '1.5px dashed #ccc', position: 'relative' }} onClick={() => setFill('none')}>
                            {fill === 'none' && <span style={{ position: 'absolute', color: '#e55', fontSize: 12, top: -2, left: 2 }}>×</span>}
                        </div>
                        {COLORS.slice(0, 6).map(c => (<div key={c} style={S.colorDot(c, fill === c)} onClick={() => setFill(c)} />))}
                    </div>
                    <div style={S.sep} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={S.label}>Size</span>
                        <input type="range" min="1" max="24" value={strokeSize} onChange={e => setStrokeSize(Number(e.target.value))} style={{ width: 64, accentColor: '#6366f1' }} />
                        <span style={{ ...S.label, minWidth: 16 }}>{strokeSize}</span>
                    </div>
                    <div style={S.sep} />

                    {(tool === 'text' || tool === 'sticky') && (<>
                        <select value={fontSize} onChange={e => setFontSize(Number(e.target.value))} style={{ height: 28, borderRadius: 6, border: '1px solid #e0e0e0', fontSize: 11, padding: '0 4px', color: '#555' }}>
                            {FONT_SIZES.map(f => <option key={f} value={f}>{f}px</option>)}
                        </select>
                        {FONT_LABELS.map((fl, fi) => (<button key={fi} style={S.toolBtn(fontIdx === fi)} onClick={() => setFontIdx(fi)}><span style={{ fontSize: 12, fontFamily: FONTS[fi] }}>{fl[0]}</span></button>))}
                        <div style={S.sep} />
                    </>)}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={S.label}>BG</span>
                        {BG_OPTIONS.map(b => (<button key={b.id} style={{ ...S.toolBtn(bg === b.id), width: 'auto', padding: '0 6px', fontSize: 10 }} onClick={() => setBg(b.id)}>{b.label}</button>))}
                    </div>
                    <div style={S.sep} />

                    <button style={S.iconBtn()} onClick={undo} title="Undo (Ctrl+Z)"><Icon d={icons.undo} /></button>
                    <button style={S.iconBtn()} onClick={redo} title="Redo"><Icon d={icons.redo} /></button>
                    <button style={S.iconBtn()} onClick={deleteSelected} title="Delete selected (Del)"><Icon d={icons.trash} /></button>
                    <button style={S.iconBtn()} onClick={duplicateSelected} title="Duplicate (Ctrl+D)"><Icon d={icons.copy} /></button>
                    <div style={S.sep} />
                    <button style={S.iconBtn()} onClick={zoomOut}><Icon d={icons.zoomOut} /></button>
                    <button style={{ ...S.iconBtn(), width: 'auto', padding: '0 8px', fontSize: 11, color: '#555', cursor: 'pointer' }} onClick={resetZoom}>{Math.round(zoom * 100)}%</button>
                    <button style={S.iconBtn()} onClick={zoomIn}><Icon d={icons.zoomIn} /></button>
                    <button style={{ ...S.iconBtn(), fontSize: 10, width: 'auto', padding: '0 6px' }} onClick={fitToScreen}>Fit</button>
                    <div style={S.sep} />
                    <button style={{ ...S.iconBtn(), width: 'auto', padding: '0 8px', fontSize: 11, color: '#4f46e5', fontWeight: 600 }} onClick={exportPNG}>
                        <Icon d={icons.download} />&nbsp;Export
                    </button>
                    <button style={{ ...S.iconBtn(), width: 'auto', padding: '0 8px', fontSize: 11 }} onClick={clearAll}>Clear</button>
                    <div style={S.sep} />

                    <button
                        style={{
                            ...S.iconBtn(showWCPicker),
                            width: 'auto', padding: '0 10px', fontSize: 11,
                            color: showWCPicker ? '#FF6B6B' : '#71717a',
                            fontWeight: showWCPicker ? 700 : 500,
                            border: showWCPicker ? '1.5px solid #FF6B6B' : '1px solid #e8e8e4',
                            background: showWCPicker ? '#FFF0F0' : '#ffffff',
                            fontFamily: "'Kalam', cursive",
                        }}
                        title="Whimsical Components"
                        onClick={() => { setShowWCPicker(v => !v); if (pendingWC) setPendingWC(null) }}
                    >
                        ✦ Components
                    </button>
                </div>
            )}

            <div ref={wrapRef} style={S.canvasWrap}>
                <canvas
                    ref={canvasRef}
                    style={{ position: 'absolute', top: 0, left: 0, cursor: cursorFor(tool), touchAction: 'none' }}
                    onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
                    onDoubleClick={onDblClick}
                />

                {showWCPicker && (
                    <WhimsicalComponentPicker
                        onPick={(id) => { setPendingWC(id); setShowWCPicker(false) }}
                        onClose={() => setShowWCPicker(false)}
                    />
                )}

                {pendingWC && (
                    <div style={{
                        position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
                        background: '#2D3436', color: '#FFFDF7', borderRadius: 10, padding: '8px 18px',
                        fontSize: 13, fontFamily: "'Kalam', cursive", zIndex: 50, pointerEvents: 'none',
                        boxShadow: '3px 3px 0 #FF6B6B', border: '1.5px solid #FF6B6B',
                        display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                        <span style={{ fontSize: 16 }}>{WHIMSICAL_COMPONENTS.find(c => c.id === pendingWC)?.icon}</span>
                        Click anywhere to place {WHIMSICAL_COMPONENTS.find(c => c.id === pendingWC)?.label}
                        <span style={{ opacity: 0.6, fontSize: 11 }}>(Esc to cancel)</span>
                    </div>
                )}

                {hasSelection && inlineToolbarPos && (
                    <div style={{ position: 'absolute', left: inlineToolbarPos.left, top: inlineToolbarPos.top, transform: 'translateX(-50%)', zIndex: 40, display: 'flex', alignItems: 'center', gap: 2, background: '#18181b', borderRadius: 10, padding: '5px 6px', boxShadow: '0 4px 20px rgba(0,0,0,0.22)', pointerEvents: 'auto', userSelect: 'none' }}>
                        <span style={{ fontSize: 10, color: '#a1a1aa', fontWeight: 500, padding: '0 6px', letterSpacing: '.04em' }}>
                            {selectionCount > 1 ? `${selectionCount} selected` : (selectedEl?.tool || 'element')}
                        </span>
                        <div style={{ width: 1, height: 16, background: '#3f3f46', margin: '0 2px' }} />
                        <button className="sel-toolbar-btn" title="Duplicate (Ctrl+D)" onClick={duplicateSelected} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', cursor: 'pointer', color: '#d4d4d8', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontFamily: "'DM Sans', sans-serif", transition: 'background 0.12s' }}>
                            <Icon d={icons.copy} size={13} /><span>Copy</span>
                        </button>
                        <div style={{ width: 1, height: 16, background: '#3f3f46', margin: '0 2px' }} />
                        {selectionCount >= 2 && (
                            <button className="sel-toolbar-btn" title="Group (Ctrl+G)" onClick={groupSelected}
                                style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', cursor: 'pointer', color: '#d4d4d8', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontFamily: "'DM Sans', sans-serif", transition: 'background 0.12s' }}>
                                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="8" height="8" rx="1" /><rect x="14" y="2" width="8" height="8" rx="1" /><rect x="2" y="14" width="8" height="8" rx="1" /><rect x="14" y="14" width="8" height="8" rx="1" /><path d="M10 6h4M6 10v4M18 10v4M10 18h4" /></svg>
                                <span>Group</span>
                            </button>
                        )}
                        {selectionCount >= 1 && stateRef.current.groups.some(g => [...g].some(id => stateRef.current.selectedIds.has(id))) && (
                            <button className="sel-toolbar-btn" title="Ungroup (Ctrl+Shift+G)" onClick={ungroupSelected}
                                style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', cursor: 'pointer', color: '#a78bfa', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontFamily: "'DM Sans', sans-serif", transition: 'background 0.12s' }}>
                                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="8" height="8" rx="1" /><rect x="14" y="2" width="8" height="8" rx="1" /><rect x="2" y="14" width="8" height="8" rx="1" /><rect x="14" y="14" width="8" height="8" rx="1" /></svg>
                                <span>Ungroup</span>
                            </button>
                        )}
                        <div style={{ width: 1, height: 16, background: '#3f3f46', margin: '0 2px' }} />
                        <button className="sel-toolbar-btn sel-toolbar-btn-del" title="Delete (Del)" onClick={deleteSelected}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', cursor: 'pointer', color: '#f87171', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontFamily: "'DM Sans', sans-serif", transition: 'background 0.12s' }}>
                            <Icon d={icons.trash} size={13} /><span>Delete{selectionCount > 1 ? ` (${selectionCount})` : ''}</span>
                        </button>
                        <div style={{ position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #18181b' }} />
                    </div>
                )}

                {/* ── Floating text / label input — constrained to box width ── */}
                {textInput && (
                    <textarea ref={textareaRef}
                        defaultValue={textInput.initVal || ''}
                        style={{
                            position: 'absolute',
                            left: textInput.x,
                            top: textInput.y,
                            width: textInput.boxW ? Math.max(60, textInput.boxW) : 'auto',
                            minWidth: textInput.boxW ? undefined : 120,
                            maxWidth: textInput.boxW ? Math.max(60, textInput.boxW) : 600,
                            height: textInput.boxH ? Math.max(30, textInput.boxH) : 'auto',
                            minHeight: textInput.boxH ? undefined : 'auto',
                            border: 'none',
                            outline: 'none',
                            background: 'transparent',
                            padding: 0,
                            margin: 0,
                            resize: 'none',
                            borderRadius: 0,
                            zIndex: 50,
                            fontFamily: textInput.font,
                            fontSize: textInput.fontSize,
                            color: textInput.color || '#1a1a2e',
                            lineHeight: 1.35,
                            textAlign: textInput.isLabel ? 'center' : 'left',
                            boxSizing: 'border-box',
                            overflow: 'hidden',
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap',
                            caretColor: '#6366f1',
                            boxShadow: 'none',
                        }}
                        rows={1}
                        onBlur={commitText}
                        onFocus={e => {
                            if (!textInput.boxH) {
                                e.target.style.height = 'auto'
                                e.target.style.height = e.target.scrollHeight + 'px'
                                const lines = e.target.value.split('\n')
                                const longestLine = lines.reduce((a, b) => a.length > b.length ? a : b, '')
                                const approxW = Math.max(120, longestLine.length * (textInput.fontSize * 0.6) + 20)
                                e.target.style.width = approxW + 'px'
                            }
                        }}
                        onKeyDown={e => {
                            if (e.key === 'Escape') {
                                editingIdRef.current = null
                                editingIsLabelRef.current = false
                                setTextInput(null)
                                textInputRef.current = null
                                if (textareaRef.current) textareaRef.current.value = ''
                                redraw()
                            }
                            if (e.key === 'Enter' && !e.shiftKey && textInput.isLabel) {
                                e.preventDefault(); commitText()
                            }
                        }}
                        onInput={e => {
                            if (!textInput.boxH) {
                                e.target.style.height = 'auto'
                                e.target.style.height = (e.target.scrollHeight) + 'px'
                                e.target.style.width = 'auto'
                                const lines = e.target.value.split('\n')
                                const longestLine = lines.reduce((a, b) => a.length > b.length ? a : b, '')
                                const approxW = Math.max(120, longestLine.length * (textInput.fontSize * 0.6) + 20)
                                e.target.style.width = approxW + 'px'
                            }
                        }}
                    />
                )}

                {labelMode && (
                    <input autoFocus value={labelMode.val}
                        onChange={e => setLabelMode(m => ({ ...m, val: e.target.value }))}
                        style={{ position: 'absolute', left: labelMode.x - 60, top: labelMode.y - 14, width: 120, border: '1.5px solid #6366f1', borderRadius: 6, background: 'rgba(255,255,255,0.95)', outline: 'none', padding: '2px 8px', fontSize: 13, fontFamily: "'DM Sans',sans-serif", textAlign: 'center', zIndex: 50 }}
                        onBlur={commitLabel}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') commitLabel() }}
                    />
                )}

                {selectedEl && !mob && selectionCount === 1 && (
                    <div style={S.propPanel} className="sketchpad-scroll">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ ...S.sidebarLabel, color: '#6366f1' }}>Properties</span>
                            <button style={{ ...S.iconBtn(), width: 20, height: 20 }} onClick={() => { stateRef.current.selectedIds = new Set(); setSelectedEl(null); setSelectionCount(0); redraw() }}><Icon d={icons.close} size={12} /></button>
                        </div>
                        <div style={S.sidebarSection}>
                            <span style={S.sidebarLabel}>Color</span>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {COLORS.map(c => (
                                    <div key={c} style={S.colorDot(c, selectedEl.color === c)} onClick={() => { const s = stateRef.current; const el = s.elements.find(x => s.selectedIds.has(x.id)); if (el) { el.color = c; setSelectedEl({ ...el, color: c }) }; redraw() }} />
                                ))}
                            </div>
                        </div>
                        {selectedEl.tool === 'text' && (
                            <div style={S.sidebarSection}>
                                <span style={S.sidebarLabel}>Font size</span>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    {[10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48].map(fs => (
                                        <button key={fs}
                                            style={{ padding: '2px 6px', fontSize: 10, borderRadius: 4, border: selectedEl.fontSize === fs ? '1.5px solid #6366f1' : '1px solid #e0e0e0', background: selectedEl.fontSize === fs ? '#eef2ff' : '#fff', cursor: 'pointer', color: selectedEl.fontSize === fs ? '#4f46e5' : '#555' }}
                                            onClick={() => {
                                                const s = stateRef.current
                                                const el = s.elements.find(x => s.selectedIds.has(x.id))
                                                if (el) { el.fontSize = fs; setSelectedEl({ ...el, fontSize: fs }) }
                                                redraw()
                                            }}
                                        >{fs}</button>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                                    {FONTS.map((f, fi) => (
                                        <button key={fi}
                                            style={{ flex: 1, padding: '2px 4px', fontSize: 10, borderRadius: 4, border: selectedEl.font === f ? '1.5px solid #6366f1' : '1px solid #e0e0e0', background: selectedEl.font === f ? '#eef2ff' : '#fff', cursor: 'pointer', fontFamily: f, color: selectedEl.font === f ? '#4f46e5' : '#555' }}
                                            onClick={() => {
                                                const s = stateRef.current
                                                const el = s.elements.find(x => s.selectedIds.has(x.id))
                                                if (el) { el.font = f; setSelectedEl({ ...el, font: f }) }
                                                redraw()
                                            }}
                                        >{FONT_LABELS[fi]}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {selectedEl.tool === 'sticky' && (
                            <div style={S.sidebarSection}>
                                <span style={S.sidebarLabel}>Sticky color</span>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    {STICKY_COLORS.map(c => (<div key={c} style={{ ...S.colorDot(c, selectedEl.bgColor === c), width: 18, height: 18 }} onClick={() => { const s = stateRef.current; const el = s.elements.find(x => s.selectedIds.has(x.id)); if (el) { el.bgColor = c; setSelectedEl({ ...el, bgColor: c }) }; redraw() }} />))}
                                </div>
                            </div>
                        )}
                        {WC_TOOLS.includes(selectedEl.tool) && (
                            <div style={S.sidebarSection}>
                                <span style={S.sidebarLabel}>Component</span>
                                <div style={{ fontSize: 11, color: '#71717a', lineHeight: 1.5 }}>
                                    Double-click to edit data (JSON editor)
                                </div>
                                {selectedEl.tool === 'wc-progress' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <span style={S.sidebarLabel}>Progress %</span>
                                        <input type="range" min="0" max="100"
                                            value={selectedEl.data?.value ?? 65}
                                            style={{ accentColor: '#4ECDC4' }}
                                            onChange={e => {
                                                const s = stateRef.current
                                                const el = s.elements.find(x => s.selectedIds.has(x.id))
                                                if (el) { el.data = { ...(el.data || {}), value: Number(e.target.value) }; setSelectedEl({ ...el }) }
                                                redraw()
                                            }}
                                        />
                                    </div>
                                )}
                                {selectedEl.tool === 'wc-radio' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <span style={S.sidebarLabel}>Selected option</span>
                                        <select
                                            value={selectedEl.data?.selected ?? 0}
                                            style={{ height: 26, borderRadius: 6, border: '1px solid #e0e0e0', fontSize: 11 }}
                                            onChange={e => {
                                                const s = stateRef.current
                                                const el = s.elements.find(x => s.selectedIds.has(x.id))
                                                if (el) { el.data = { ...(el.data || {}), selected: Number(e.target.value) }; setSelectedEl({ ...el }) }
                                                redraw()
                                            }}
                                        >
                                            {(selectedEl.data?.options || []).map((opt, i) => <option key={i} value={i}>{opt}</option>)}
                                        </select>
                                    </div>
                                )}
                                {selectedEl.tool === 'wc-toggle' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={S.sidebarLabel}>On</span>
                                        <input type="checkbox" checked={!!selectedEl.data?.on}
                                            onChange={e => {
                                                const s = stateRef.current
                                                const el = s.elements.find(x => s.selectedIds.has(x.id))
                                                if (el) { el.data = { ...(el.data || {}), on: e.target.checked }; setSelectedEl({ ...el }) }
                                                redraw()
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                        <div style={S.sidebarSection}>
                            <span style={S.sidebarLabel}>Stroke size</span>
                            <input type="range" min="1" max="20" value={selectedEl.size || 2} style={{ accentColor: '#6366f1' }}
                                onChange={e => { const s = stateRef.current; const el = s.elements.find(x => s.selectedIds.has(x.id)); if (el) { el.size = Number(e.target.value); setSelectedEl({ ...el, size: Number(e.target.value) }) }; redraw() }} />
                        </div>
                        {CONNECTABLE_TOOLS.includes(selectedEl.tool) && (<div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>Double-click to edit label</div>)}
                    </div>
                )}

                <div style={{ position: 'absolute', bottom: mob ? 72 : 12, right: 12, display: 'flex', gap: 4, alignItems: 'center', zIndex: 15 }}>
                    <button style={S.iconBtn()} onClick={zoomOut}><Icon d={icons.zoomOut} /></button>
                    <button style={{ ...S.iconBtn(), width: 52, fontSize: 11, color: '#555' }} onClick={resetZoom}>{Math.round(zoom * 100)}%</button>
                    <button style={S.iconBtn()} onClick={zoomIn}><Icon d={icons.zoomIn} /></button>
                    <button style={{ ...S.iconBtn(), fontSize: 10, width: 'auto', padding: '0 6px' }} onClick={fitToScreen}>Fit</button>
                </div>

                {!mob && (
                    <div style={{ position: 'absolute', bottom: 12, left: 12, fontSize: 10, color: '#bbb', pointerEvents: 'none' }}>
                        <span style={S.kbd}>V</span> Select &nbsp;
                        <span style={S.kbd}>C</span> Connector &nbsp;
                        <span style={S.kbd}>✦ Components</span> Whimsical UI &nbsp;
                        <span style={S.kbd}>Dbl-click</span> Edit &nbsp;
                        <span style={S.kbd}>Del</span> Delete &nbsp;
                        <span style={S.kbd}>Ctrl+D</span> Duplicate &nbsp;
                        <span style={S.kbd}>Scroll</span> Zoom
                    </div>
                )}
            </div>

            {mob && (
                <div style={{ ...S.mobileBottom, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'space-around' }}>
                        {['draw', 'color', 'bg', 'actions'].map(tab => (
                            <button key={tab} style={{ flex: 1, height: 30, border: 'none', borderRadius: 6, background: mobileTab === tab ? '#eef2ff' : 'transparent', color: mobileTab === tab ? '#4f46e5' : '#71717a', fontSize: 10, fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase' }} onClick={() => setMobileTab(tab)}>{tab}</button>
                        ))}
                    </div>
                    {mobileTab === 'draw' && (<div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>{MOBILE_TOOLS.map(t => (<button key={t.id} style={S.toolBtn(tool === t.id)} onClick={() => setTool(t.id)}><Icon d={icons[t.icon]} /></button>))}</div>)}
                    {mobileTab === 'color' && (<div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>{COLORS.map(c => <div key={c} style={S.colorDot(c, color === c)} onClick={() => setColor(c)} />)}<input type="range" min="1" max="16" value={strokeSize} onChange={e => setStrokeSize(Number(e.target.value))} style={{ width: 80, accentColor: '#6366f1' }} /></div>)}
                    {mobileTab === 'bg' && (<div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>{BG_OPTIONS.map(b => (<button key={b.id} style={{ ...S.toolBtn(bg === b.id), width: 'auto', padding: '0 8px', fontSize: 10 }} onClick={() => setBg(b.id)}>{b.label}</button>))}</div>)}
                    {mobileTab === 'actions' && (<div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <button style={S.iconBtn()} onClick={undo}><Icon d={icons.undo} /></button>
                        <button style={S.iconBtn()} onClick={redo}><Icon d={icons.redo} /></button>
                        <button style={S.iconBtn()} onClick={deleteSelected}><Icon d={icons.trash} /></button>
                        <button style={S.iconBtn()} onClick={zoomOut}><Icon d={icons.zoomOut} /></button>
                        <button style={S.iconBtn()} onClick={zoomIn}><Icon d={icons.zoomIn} /></button>
                        <button style={{ ...S.iconBtn(), width: 'auto', padding: '0 8px', fontSize: 11, color: '#4f46e5', fontWeight: 600 }} onClick={exportPNG}>Export</button>
                        <button style={{ ...S.iconBtn(), width: 'auto', padding: '0 8px', fontSize: 11 }} onClick={clearAll}>Clear</button>
                        <button style={{ ...S.iconBtn(), width: 'auto', padding: '0 8px', fontSize: 10, color: '#FF6B6B', fontFamily: "'Kalam', cursive" }} onClick={() => setShowWCPicker(v => !v)}>✦</button>
                    </div>)}
                </div>
            )}

            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
        </div>
    )
}