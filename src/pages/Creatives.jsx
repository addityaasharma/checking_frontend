import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react'

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

const isMobile = () => window.innerWidth < 640

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

function drawElement(ctx, el, selected, panX, panY, zoom) {
    ctx.save()
    ctx.translate(panX, panY)
    ctx.scale(zoom, zoom)

    const { tool, color, size } = el
    ctx.strokeStyle = color || '#1a1a2e'
    ctx.lineWidth = size || 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = 0.93

    if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out'
        ctx.strokeStyle = 'rgba(0,0,0,1)'
        ctx.globalAlpha = 1
    }

    if (tool === 'vanish') {
        const age = el._alpha ?? 1
        if (age <= 0) { ctx.restore(); return }
        ctx.save()
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = age * 0.92
        ctx.lineWidth = (size || 3) * 1.4
        ctx.strokeStyle = '#ff2d55'
        ctx.shadowColor = '#ff2d55'
        ctx.shadowBlur = 10 * age
        const pts = el.points || []
        if (pts.length < 2) { ctx.restore(); ctx.restore(); return }
        ctx.beginPath()
        ctx.moveTo(pts[0][0], pts[0][1])
        for (let i = 1; i < pts.length - 1; i++) {
            const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2
            ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my)
        }
        ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1])
        ctx.stroke()
        ctx.globalAlpha = age * 0.6
        ctx.lineWidth = (size || 3) * 0.5
        ctx.strokeStyle = '#ffffff'
        ctx.shadowBlur = 4
        ctx.stroke()
        ctx.restore()
        ctx.restore()
        return
    }

    if (tool === 'pencil' || tool === 'eraser' || tool === 'pen' || tool === 'highlighter') {
        if (tool === 'highlighter') {
            ctx.globalAlpha = 0.35
            ctx.lineWidth = (size || 3) * 6
        }
        const pts = el.points || []
        if (pts.length < 2) { ctx.restore(); return }
        ctx.beginPath()
        ctx.moveTo(pts[0][0], pts[0][1])
        if (pts.length === 2) {
            ctx.lineTo(pts[1][0], pts[1][1])
        } else {
            for (let i = 1; i < pts.length - 1; i++) {
                const mx = (pts[i][0] + pts[i + 1][0]) / 2
                const my = (pts[i][1] + pts[i + 1][1]) / 2
                ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my)
            }
            ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1])
        }
        ctx.stroke()
    } else if (tool === 'line' || tool === 'arrow' || tool === 'dashed-arrow' || tool === 'double-arrow') {
        const dashStyle = el.arrowStyle === 'dashed' ? [8, 5] : el.arrowStyle === 'dotted' ? [2, 5] : []
        ctx.setLineDash(dashStyle)
        ctx.beginPath()
        ctx.moveTo(el.x1, el.y1)
        ctx.lineTo(el.x2, el.y2)
        ctx.stroke()
        ctx.setLineDash([])
        const drawHead = (x2, y2, x1, y1) => {
            const dx = x2 - x1, dy = y2 - y1
            const len = Math.sqrt(dx * dx + dy * dy)
            if (len < 4) return
            const nx = dx / len, ny = dy / len
            const hs = Math.max(12, size * 4)
            if (el.arrowEnd === 'circle') {
                ctx.beginPath()
                ctx.arc(x2, y2, hs * 0.4, 0, Math.PI * 2)
                ctx.fillStyle = color || '#1a1a2e'
                ctx.fill()
            } else if (el.arrowEnd !== 'none') {
                ctx.beginPath()
                ctx.moveTo(x2, y2)
                ctx.lineTo(x2 - nx * hs + ny * hs * 0.4, y2 - ny * hs - nx * hs * 0.4)
                ctx.lineTo(x2 - nx * hs - ny * hs * 0.4, y2 - ny * hs + nx * hs * 0.4)
                ctx.closePath()
                if (el.arrowEnd === 'filled') { ctx.fillStyle = color || '#1a1a2e'; ctx.fill() }
                else ctx.stroke()
            }
        }
        if (tool === 'arrow' || tool === 'dashed-arrow') drawHead(el.x2, el.y2, el.x1, el.y1)
        if (tool === 'double-arrow') { drawHead(el.x2, el.y2, el.x1, el.y1); drawHead(el.x1, el.y1, el.x2, el.y2) }
    } else if (tool === 'rect') {
        ctx.beginPath()
        const r = el.radius || 0
        const x = Math.min(el.x1, el.x2), y = Math.min(el.y1, el.y2)
        const w = Math.abs(el.x2 - el.x1), h = Math.abs(el.y2 - el.y1)
        if (r > 0 && ctx.roundRect) ctx.roundRect(x, y, w, h, r)
        else ctx.rect(x, y, w, h)
        if (el.fill) { ctx.fillStyle = el.fill; ctx.fill() }
        ctx.stroke()
    } else if (tool === 'circle') {
        const cx = (el.x1 + el.x2) / 2, cy = (el.y1 + el.y2) / 2
        const rx = Math.abs(el.x2 - el.x1) / 2, ry = Math.abs(el.y2 - el.y1) / 2
        ctx.beginPath()
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
        if (el.fill) { ctx.fillStyle = el.fill; ctx.fill() }
        ctx.stroke()
    } else if (tool === 'shape') {
        const x = Math.min(el.x1, el.x2), y = Math.min(el.y1, el.y2)
        const w = Math.abs(el.x2 - el.x1) || 80, h = Math.abs(el.y2 - el.y1) || 60
        const p = shapePath(el.shapeType, x, y, w, h)
        if (p) {
            const path2d = new Path2D(p)
            if (el.fill) { ctx.fillStyle = el.fill; ctx.fill(path2d) }
            ctx.stroke(path2d)
        } else if (el.shapeType === 'rect') {
            if (el.fill) { ctx.fillStyle = el.fill; ctx.fillRect(x, y, w, h) }
            ctx.strokeRect(x, y, w, h)
        } else if (el.shapeType === 'circle') {
            ctx.beginPath()
            ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
            if (el.fill) { ctx.fillStyle = el.fill; ctx.fill() }
            ctx.stroke()
        }
        if (el.label) {
            ctx.font = `${el.labelSize || 14}px ${el.labelFont || "'DM Sans', sans-serif"}`
            ctx.fillStyle = el.labelColor || color || '#1a1a2e'
            ctx.globalAlpha = 1
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            const lx = x + w / 2, ly = y + h / 2
            const lines = el.label.split('\n')
            lines.forEach((ln, i) => {
                ctx.fillText(ln, lx, ly + (i - (lines.length - 1) / 2) * (el.labelSize || 14) * 1.3)
            })
            ctx.textAlign = 'left'
            ctx.textBaseline = 'alphabetic'
        }
    } else if (tool === 'text' || tool === 'sticky') {
        const fs = el.fontSize || 18
        const font = el.font || "'Kalam', cursive"
        ctx.font = `${fs}px ${font}`
        ctx.fillStyle = el.tool === 'sticky' ? '#1a1a2e' : (color || '#1a1a2e')
        ctx.globalAlpha = 1
        if (el.tool === 'sticky') {
            const pad = 12, lh = fs * 1.35
            const lines = (el.text || '').split('\n')
            const bw = el.width || 200, bh = Math.max(80, lines.length * lh + pad * 2 + 24)
            ctx.fillStyle = el.bgColor || '#fef08a'
            ctx.fillRect(el.x1, el.y1, bw, bh)
            ctx.fillStyle = 'rgba(0,0,0,0.08)'
            ctx.fillRect(el.x1, el.y1, bw, 24)
            ctx.fillStyle = '#1a1a2e'
            ctx.font = `${fs}px ${font}`
            lines.forEach((ln, i) => ctx.fillText(ln, el.x1 + pad, el.y1 + 24 + pad + i * lh))
            ctx.strokeStyle = 'rgba(0,0,0,0.12)'
            ctx.lineWidth = 1
            ctx.strokeRect(el.x1, el.y1, bw, bh)
        } else {
            const lines = (el.text || '').split('\n')
            lines.forEach((ln, i) => ctx.fillText(ln, el.x1, el.y1 + i * fs * 1.35))
        }
    } else if (tool === 'image' && el.img) {
        const x = Math.min(el.x1, el.x2), y = Math.min(el.y1, el.y2)
        const w = Math.abs(el.x2 - el.x1) || el.img.naturalWidth || 200
        const h = Math.abs(el.y2 - el.y1) || el.img.naturalHeight || 150
        ctx.drawImage(el.img, x, y, w, h)
    }

    if (selected) {
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = 1
        ctx.strokeStyle = '#6366f1'
        ctx.lineWidth = 1.5 / zoom
        ctx.setLineDash([5 / zoom, 3 / zoom])
        const b = getElementBounds(el)
        ctx.strokeRect(b.x - 8, b.y - 8, b.w + 16, b.h + 16)
        ctx.setLineDash([])
        const handles = getHandles(b)
        ctx.fillStyle = '#ffffff'
        handles.forEach(([hx, hy]) => {
            ctx.beginPath()
            ctx.arc(hx, hy, 5 / zoom, 0, Math.PI * 2)
            ctx.fill()
            ctx.strokeStyle = '#6366f1'
            ctx.lineWidth = 1.5 / zoom
            ctx.stroke()
        })
    }

    ctx.restore()
}

function getHandles(b) {
    return [
        [b.x, b.y], [b.x + b.w / 2, b.y], [b.x + b.w, b.y],
        [b.x + b.w, b.y + b.h / 2], [b.x + b.w, b.y + b.h],
        [b.x + b.w / 2, b.y + b.h], [b.x, b.y + b.h], [b.x, b.y + b.h / 2]
    ]
}

function getElementBounds(el) {
    if (el.points) {
        const xs = el.points.map(p => p[0]), ys = el.points.map(p => p[1])
        const x = Math.min(...xs), y = Math.min(...ys)
        return { x, y, w: Math.max(1, Math.max(...xs) - x), h: Math.max(1, Math.max(...ys) - y) }
    }
    if (el.tool === 'text') return { x: el.x1, y: el.y1 - 20, w: 180, h: el.fontSize || 18 }
    if (el.tool === 'sticky') return { x: el.x1, y: el.y1, w: el.width || 200, h: el.height || 100 }
    const x = Math.min(el.x1 || 0, el.x2 || 0), y = Math.min(el.y1 || 0, el.y2 || 0)
    return { x, y, w: Math.max(1, Math.abs((el.x2 || 0) - (el.x1 || 0))), h: Math.max(1, Math.abs((el.y2 || 0) - (el.y1 || 0))) }
}

function hitTest(el, px, py) {
    const b = getElementBounds(el)
    return px >= b.x - 10 && px <= b.x + b.w + 10 && py >= b.y - 10 && py <= b.y + b.h + 10
}

// Check if an element's bounds are fully or partially inside a marquee rect
function marqueeHitTest(el, mx, my, mw, mh) {
    const b = getElementBounds(el)
    const rx1 = Math.min(mx, mx + mw), ry1 = Math.min(my, my + mh)
    const rx2 = Math.max(mx, mx + mw), ry2 = Math.max(my, my + mh)
    // Intersect — element overlaps with selection rect
    return !(b.x + b.w < rx1 || b.x > rx2 || b.y + b.h < ry1 || b.y > ry2)
}

// Draw the marching-ants marquee selection rectangle
function drawMarquee(ctx, sx, sy, sw, sh, panX, panY, zoom) {
    ctx.save()
    ctx.translate(panX, panY)
    ctx.scale(zoom, zoom)
    ctx.strokeStyle = '#6366f1'
    ctx.lineWidth = 1.5 / zoom
    ctx.setLineDash([6 / zoom, 3 / zoom])
    ctx.globalAlpha = 0.85
    ctx.strokeRect(sx, sy, sw, sh)
    ctx.fillStyle = 'rgba(99,102,241,0.06)'
    ctx.fillRect(sx, sy, sw, sh)
    ctx.setLineDash([])
    ctx.restore()
}

const Icon = ({ d, size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>

const icons = {
    pencil: 'M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z',
    pen: 'M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',
    highlight: 'M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18',
    eraser: 'M20 20H7L3 16l13.3-13.3a1 1 0 0 1 1.4 0l4.3 4.3a1 1 0 0 1 0 1.4L9.4 17',
    line: 'M5 19L19 5',
    arrow: 'M5 12h14M12 5l7 7-7 7',
    rect: 'M3 3h18v18H3z',
    circle: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0',
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
    grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
    lock: 'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4',
    copy: 'M20 9H11a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2zM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
    close: 'M18 6L6 18M6 6l12 12',
    menu: 'M3 12h18M3 6h18M3 18h18',
    frame: 'M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3',
    vanish: 'M3 12c0-1 .5-2 1.5-2.5S7 9 8 10s1 3 2 4 2.5 1.5 4 1c1.5-.5 2.5-2 2-3.5S14 9 13 8.5',
}

export default function Sketchpad() {
    const canvasRef = useRef(null)
    const wrapRef = useRef(null)
    const textareaRef = useRef(null)
    const fileRef = useRef(null)

    const stateRef = useRef({
        elements: [],
        redo: [],
        current: null,
        drawing: false,
        panOffset: { x: 0, y: 0 },
        panStart: null,
        zoom: 1,
        selectedIds: new Set(),
        dragStart: null,
        dragEls: null,
        resizeHandle: null,
        idCounter: 0,
        // Marquee selection state
        marquee: null, // { x, y, w, h } in world coords
        isMarquee: false,
    })

    const [tool, setTool] = useState('pencil')
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

    const toolRef = useRef('pencil')
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

    const newId = () => { stateRef.current.idCounter++; return stateRef.current.idCounter }

    const STORAGE_KEY = 'sketchpad_elements'
    const saveToStorage = useCallback(() => {
        try {
            const s = stateRef.current
            const serializable = s.elements.filter(el => el.tool !== 'image').map(el => {
                const { img, ...rest } = el
                return rest
            })
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ elements: serializable, idCounter: s.idCounter }))
        } catch { }
    }, [])

    const loadFromStorage = useCallback(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY)
            if (!raw) return
            const { elements, idCounter } = JSON.parse(raw)
            const s = stateRef.current
            s.elements = elements || []
            s.idCounter = idCounter || 0
        } catch { }
    }, [])

    useEffect(() => { loadFromStorage(); redraw() }, []) // eslint-disable-line

    const drawBackground = useCallback((ctx, w, h, bgStyle, panX, panY, z) => {
        if (bgStyle === '#1a1a2e') {
            ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, w, h)
        } else if (bgStyle === '#ffffff') {
            ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h)
        } else {
            ctx.fillStyle = '#fafaf9'; ctx.fillRect(0, 0, w, h)
        }
        const spacing = 24 * z
        const ox = (panX % spacing + spacing) % spacing
        const oy = (panY % spacing + spacing) % spacing
        ctx.save()
        if (bgStyle === 'dot') {
            ctx.fillStyle = '#d4d4d0'
            for (let x = ox - spacing; x < w + spacing; x += spacing)
                for (let y = oy - spacing; y < h + spacing; y += spacing) {
                    ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill()
                }
        } else if (bgStyle === 'grid') {
            ctx.strokeStyle = '#e4e4e0'; ctx.lineWidth = 0.5
            for (let x = ox - spacing; x < w + spacing; x += spacing) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
            }
            for (let y = oy - spacing; y < h + spacing; y += spacing) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
            }
        } else if (bgStyle === 'line') {
            ctx.strokeStyle = '#e0e0dc'; ctx.lineWidth = 0.6
            for (let y = oy - spacing; y < h + spacing; y += spacing) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
            }
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
            drawElement(ctx, el, s.selectedIds.has(el.id), s.panOffset.x, s.panOffset.y, s.zoom)
        })
        if (s.current) drawElement(ctx, s.current, false, s.panOffset.x, s.panOffset.y, s.zoom)
        // Draw marquee selection rectangle if active
        if (s.marquee && s.isMarquee) {
            drawMarquee(ctx, s.marquee.x, s.marquee.y, s.marquee.w, s.marquee.h, s.panOffset.x, s.panOffset.y, s.zoom)
        }
        saveToStorage()
    }, [bg, drawBackground, saveToStorage])

    const resize = useCallback(() => {
        const canvas = canvasRef.current
        const wrap = wrapRef.current
        if (!canvas || !wrap) return
        const r = wrap.getBoundingClientRect()
        canvas.width = r.width
        canvas.height = r.height
        redraw()
    }, [redraw])

    useEffect(() => {
        const fonts = document.createElement('link')
        fonts.rel = 'stylesheet'
        fonts.href = 'https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&family=Space+Mono:wght@400;700&family=DM+Sans:wght@400;500;700&display=swap'
        document.head.appendChild(fonts)
        return () => { try { document.head.removeChild(fonts) } catch { } }
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
        return () => { try { document.head.removeChild(style) } catch { } }
    }, [])

    useEffect(() => {
        resize()
        const ro = new ResizeObserver(resize)
        if (wrapRef.current) ro.observe(wrapRef.current)
        return () => ro.disconnect()
    }, [resize])

    useEffect(() => { redraw() }, [redraw, bg])

    const getPos = useCallback((e) => {
        const canvas = canvasRef.current
        if (!canvas) return { x: 0, y: 0 }
        const r = canvas.getBoundingClientRect()
        const s = stateRef.current
        const ce = e.touches ? e.touches[0] : e
        return {
            x: (ce.clientX - r.left - s.panOffset.x) / s.zoom,
            y: (ce.clientY - r.top - s.panOffset.y) / s.zoom,
        }
    }, [])

    const vanishRedraw = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        const s = stateRef.current
        const now = Date.now()
        const bgOpt = BG_OPTIONS.find(b => b.id === bg) || BG_OPTIONS[0]
        vanishStrokesRef.current.forEach(vs => {
            if (!vs.createdAt) { vs._alpha = 1; return }
            const age = now - vs.createdAt
            if (age < VANISH_DURATION) { vs._alpha = 1 }
            else {
                const fade = age - VANISH_DURATION
                vs._alpha = Math.max(0, 1 - fade / VANISH_FADE)
            }
        })
        vanishStrokesRef.current = vanishStrokesRef.current.filter(vs => !vs.createdAt || vs._alpha > 0)
        const hasVanish = vanishStrokesRef.current.length > 0 || (s.drawing && toolRef.current === 'vanish')
        if (hasVanish || s.drawing) {
            drawBackground(ctx, canvas.width, canvas.height, bgOpt.style, s.panOffset.x, s.panOffset.y, s.zoom)
            s.elements.forEach(el => drawElement(ctx, el, s.selectedIds.has(el.id), s.panOffset.x, s.panOffset.y, s.zoom))
            if (s.current) drawElement(ctx, s.current, false, s.panOffset.x, s.panOffset.y, s.zoom)
            vanishStrokesRef.current.forEach(vs => drawElement(ctx, vs, false, s.panOffset.x, s.panOffset.y, s.zoom))
        }
        if (hasVanish) {
            animFrameRef.current = requestAnimationFrame(vanishRedraw)
        } else {
            animFrameRef.current = null
            redraw()
        }
    }, [bg, redraw, drawBackground])

    const startVanishLoop = useCallback(() => {
        if (animFrameRef.current) return
        animFrameRef.current = requestAnimationFrame(vanishRedraw)
    }, [vanishRedraw])

    const onDown = useCallback((e) => {
        if (e.target !== canvasRef.current) return
        e.preventDefault()
        const pos = getPos(e)
        const s = stateRef.current
        const t = toolRef.current

        if (t === 'pan') {
            const ce = e.touches ? e.touches[0] : e
            s.panStart = { x: ce.clientX - s.panOffset.x, y: ce.clientY - s.panOffset.y }
            s.drawing = true; return
        }

        if (t === 'select') {
            // Check resize handles first
            if (s.selectedIds.size === 1) {
                const selEl = s.elements.find(el => s.selectedIds.has(el.id))
                if (selEl) {
                    const b = getElementBounds(selEl)
                    const handles = getHandles(b)
                    for (let i = 0; i < handles.length; i++) {
                        const [hx, hy] = handles[i]
                        const dist = Math.sqrt((pos.x - hx) ** 2 + (pos.y - hy) ** 2)
                        if (dist < 10 / s.zoom) {
                            s.resizeHandle = { idx: i, el: selEl, origBounds: { ...b } }
                            s.drawing = true; return
                        }
                    }
                }
            }

            // Check if clicking on an existing element
            let found = null
            for (let i = s.elements.length - 1; i >= 0; i--) {
                if (hitTest(s.elements[i], pos.x, pos.y)) { found = s.elements[i]; break }
            }

            if (found) {
                // Clicked on an element — normal selection / drag
                if (!(e.shiftKey || e.ctrlKey || e.metaKey)) {
                    if (!s.selectedIds.has(found.id)) s.selectedIds = new Set([found.id])
                } else {
                    const ns = new Set(s.selectedIds)
                    if (ns.has(found.id)) ns.delete(found.id); else ns.add(found.id)
                    s.selectedIds = ns
                }
                const newSel = s.elements.find(el => s.selectedIds.has(el.id)) || null
                setSelectedEl(newSel)
                setSelectionCount(s.selectedIds.size)
                s.dragStart = { x: pos.x, y: pos.y }
                s.dragEls = s.elements.filter(el => s.selectedIds.has(el.id)).map(el => JSON.parse(JSON.stringify(el)))
                s.drawing = true
                s.isMarquee = false
            } else {
                // Clicked on empty space — start marquee selection
                s.selectedIds = new Set()
                setSelectedEl(null)
                setSelectionCount(0)
                s.marquee = { x: pos.x, y: pos.y, w: 0, h: 0 }
                s.isMarquee = true
                s.drawing = true
            }
            redraw(); return
        }

        if (t === 'text') {
            const canvas = canvasRef.current
            const r = canvas.getBoundingClientRect()
            const ce = e.touches ? e.touches[0] : e
            setTextInput({
                x: ce.clientX - r.left,
                y: ce.clientY - r.top,
                sx: pos.x, sy: pos.y + (fontSizeRef.current || 18),
                color: colorRef.current,
                font: FONTS[fontRef.current],
                fontSize: fontSizeRef.current
            })
            setTimeout(() => textareaRef.current?.focus(), 50)
            return
        }

        if (t === 'sticky') {
            const id = newId()
            const el = { id, tool: 'sticky', x1: pos.x, y1: pos.y, text: 'Note', bgColor: stickyColorRef.current, width: 200, height: 100 }
            stateRef.current.elements.push(el)
            stateRef.current.redo = []
            redraw()
            const canvas = canvasRef.current
            const r2 = canvas.getBoundingClientRect()
            const ce = e.touches ? e.touches[0] : e
            setTextInput({ x: ce.clientX - r2.left, y: ce.clientY - r2.top, sx: pos.x, sy: pos.y + 30, color: '#1a1a2e', font: FONTS[0], fontSize: 14, stickyId: id })
            setTimeout(() => textareaRef.current?.focus(), 50)
            return
        }

        if (t === 'image') { fileRef.current?.click(); return }

        stateRef.current.drawing = true
        stateRef.current.redo = []
        const id = newId()
        if (t === 'vanish') {
            const stroke = { id, tool: 'vanish', size: sizeRef.current, points: [[pos.x, pos.y]], createdAt: null, _alpha: 1 }
            vanishStrokesRef.current.push(stroke)
            stateRef.current.current = stroke
            startVanishLoop()
        } else if (t === 'pencil' || t === 'pen' || t === 'eraser' || t === 'highlighter') {
            stateRef.current.current = { id, tool: t, color: colorRef.current, size: sizeRef.current, points: [[pos.x, pos.y]] }
        } else if (t === 'shape') {
            stateRef.current.current = { id, tool: 'shape', shapeType: shapeRef.current, color: colorRef.current, fill: fillRef.current === 'none' ? null : fillRef.current, size: sizeRef.current, x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y }
        } else {
            stateRef.current.current = { id, tool: t, color: colorRef.current, fill: fillRef.current === 'none' ? null : fillRef.current, size: sizeRef.current, arrowStyle: arrowStyleRef.current, arrowEnd: arrowEndRef.current, x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y }
        }
    }, [getPos, redraw])

    const onMove = useCallback((e) => {
        const s = stateRef.current
        if (!s.drawing) return
        e.preventDefault()
        const pos = getPos(e)
        const t = toolRef.current

        if (t === 'pan' && s.panStart) {
            const ce = e.touches ? e.touches[0] : e
            s.panOffset = { x: ce.clientX - s.panStart.x, y: ce.clientY - s.panStart.y }
            redraw(); return
        }

        if (t === 'select') {
            // Marquee drag
            if (s.isMarquee && s.marquee) {
                s.marquee.w = pos.x - s.marquee.x
                s.marquee.h = pos.y - s.marquee.y
                // Live-preview: highlight elements inside the marquee
                const inside = new Set()
                s.elements.forEach(el => {
                    if (marqueeHitTest(el, s.marquee.x, s.marquee.y, s.marquee.w, s.marquee.h)) {
                        inside.add(el.id)
                    }
                })
                s.selectedIds = inside
                redraw(); return
            }
            // Resize handle drag
            if (s.resizeHandle && s.resizeHandle.el) {
                const el = s.elements.find(x => x.id === s.resizeHandle.el.id)
                if (el && el.x1 !== undefined) {
                    const hi = s.resizeHandle.idx
                    if (hi === 0 || hi === 6 || hi === 7) el.x1 = pos.x
                    if (hi === 0 || hi === 1 || hi === 2) el.y1 = pos.y
                    if (hi === 2 || hi === 3 || hi === 4) el.x2 = pos.x
                    if (hi === 4 || hi === 5 || hi === 6) el.y2 = pos.y
                    redraw()
                }
                return
            }
            // Normal element drag
            if (s.dragStart && s.dragEls) {
                const dx = pos.x - s.dragStart.x, dy = pos.y - s.dragStart.y
                s.elements.forEach(el => {
                    if (!s.selectedIds.has(el.id)) return
                    const orig = s.dragEls.find(o => o.id === el.id)
                    if (!orig) return
                    if (orig.points) el.points = orig.points.map(([px, py]) => [px + dx, py + dy])
                    else {
                        if (orig.x1 !== undefined) el.x1 = orig.x1 + dx
                        if (orig.y1 !== undefined) el.y1 = orig.y1 + dy
                        if (orig.x2 !== undefined) el.x2 = orig.x2 + dx
                        if (orig.y2 !== undefined) el.y2 = orig.y2 + dy
                    }
                })
                redraw(); return
            }
        }

        if (t === 'pencil' || t === 'pen' || t === 'eraser' || t === 'highlighter' || t === 'vanish') {
            s.current?.points.push([pos.x, pos.y])
        } else if (s.current) {
            s.current.x2 = pos.x; s.current.y2 = pos.y
        }
        redraw()
    }, [getPos, redraw])

    const onUp = useCallback(() => {
        const s = stateRef.current
        if (!s.drawing) return
        s.drawing = false

        if (toolRef.current === 'pan') {
            s.panStart = null
            setViewVersion(v => v + 1)
            return
        }

        if (toolRef.current === 'select') {
            if (s.isMarquee) {
                // Finalize marquee — select all elements that intersect the rect
                if (s.marquee) {
                    const inside = new Set()
                    s.elements.forEach(el => {
                        if (marqueeHitTest(el, s.marquee.x, s.marquee.y, s.marquee.w, s.marquee.h)) {
                            inside.add(el.id)
                        }
                    })
                    s.selectedIds = inside
                    setSelectionCount(inside.size)
                    const firstSel = s.elements.find(el => inside.has(el.id)) || null
                    setSelectedEl(firstSel ? { ...firstSel } : null)
                }
                s.marquee = null
                s.isMarquee = false
                setViewVersion(v => v + 1)
                redraw()
                return
            }
            s.dragStart = null; s.dragEls = null; s.resizeHandle = null
            const freshEl = s.elements.find(el => s.selectedIds.has(el.id)) || null
            setSelectedEl(freshEl ? { ...freshEl } : null)
            setSelectionCount(s.selectedIds.size)
            setViewVersion(v => v + 1)
            return
        }

        if (toolRef.current === 'vanish') {
            if (s.current) s.current.createdAt = Date.now()
            s.current = null
            startVanishLoop()
            return
        }

        if (s.current) {
            const p = s.current
            const ok = (p.points?.length > 1) || Math.abs((p.x2 || 0) - (p.x1 || 0)) > 3 || Math.abs((p.y2 || 0) - (p.y1 || 0)) > 3
            if (ok) s.elements.push(p)
            s.current = null; redraw()
        }
    }, [redraw, startVanishLoop])

    const onWheel = useCallback((e) => {
        e.preventDefault()
        const s = stateRef.current
        const canvas = canvasRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const cx = e.clientX - rect.left
        const cy = e.clientY - rect.top
        const wx = (cx - s.panOffset.x) / s.zoom
        const wy = (cy - s.panOffset.y) / s.zoom
        const factor = e.deltaY > 0 ? 0.9 : 1.1
        const newZoom = Math.min(5, Math.max(0.1, s.zoom * factor))
        s.panOffset = { x: cx - wx * newZoom, y: cy - wy * newZoom }
        s.zoom = newZoom
        setZoom(Math.round(newZoom * 100) / 100)
        setViewVersion(v => v + 1)
        redraw()
    }, [redraw])

    const onDblClick = useCallback((e) => {
        const pos = getPos(e)
        const s = stateRef.current
        for (let i = s.elements.length - 1; i >= 0; i--) {
            const el = s.elements[i]
            if ((el.tool === 'shape' || el.tool === 'rect' || el.tool === 'circle') && hitTest(el, pos.x, pos.y)) {
                const canvas = canvasRef.current
                const r = canvas.getBoundingClientRect()
                setLabelMode({ id: el.id, x: e.clientX - r.left, y: e.clientY - r.top, val: el.label || '' })
                return
            }
        }
    }, [getPos])

    useEffect(() => {
        const c = canvasRef.current
        if (!c) return
        c.addEventListener('wheel', onWheel, { passive: false })
        const onTS = e => { e.preventDefault(); onDown(e) }
        const onTM = e => { e.preventDefault(); onMove(e) }
        const onTE = e => { e.preventDefault(); onUp(e) }
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
    }, [onWheel, onDown, onMove, onUp])

    const commitText = useCallback(() => {
        const txt = textareaRef.current?.value?.trim()
        const s = stateRef.current
        if (txt && textInput) {
            if (textInput.stickyId) {
                const el = s.elements.find(x => x.id === textInput.stickyId)
                if (el) { el.text = txt; el.width = Math.max(200, txt.length * 8 + 24) }
            } else {
                s.elements.push({ id: newId(), tool: 'text', x1: textInput.sx, y1: textInput.sy, text: txt, color: textInput.color, fontSize: textInput.fontSize, font: textInput.font })
            }
            s.redo = []; redraw()
        }
        setTextInput(null)
        if (textareaRef.current) textareaRef.current.value = ''
    }, [textInput, redraw])

    const commitLabel = useCallback(() => {
        if (!labelMode) return
        const s = stateRef.current
        const el = s.elements.find(x => x.id === labelMode.id)
        if (el) { el.label = labelMode.val; el.labelSize = 14; el.labelColor = colorRef.current }
        s.redo = []; redraw()
        setLabelMode(null)
    }, [labelMode, redraw])

    const undo = useCallback(() => {
        const s = stateRef.current
        if (s.elements.length) { s.redo.push(s.elements.pop()); redraw() }
    }, [redraw])

    const redo = useCallback(() => {
        const s = stateRef.current
        if (s.redo.length) { s.elements.push(s.redo.pop()); redraw() }
    }, [redraw])

    const clearAll = useCallback(() => {
        if (window.confirm('Clear everything?')) {
            stateRef.current.elements = []; stateRef.current.redo = []; stateRef.current.selectedIds = new Set()
            setSelectedEl(null); setSelectionCount(0); redraw()
        }
    }, [redraw])

    const deleteSelected = useCallback(() => {
        const s = stateRef.current
        if (s.selectedIds.size === 0) return
        s.elements = s.elements.filter(el => !s.selectedIds.has(el.id))
        s.selectedIds = new Set(); setSelectedEl(null); setSelectionCount(0); s.redo = []; redraw()
    }, [redraw])

    const duplicateSelected = useCallback(() => {
        const s = stateRef.current
        const newEls = s.elements.filter(el => s.selectedIds.has(el.id)).map(el => {
            const copy = JSON.parse(JSON.stringify(el))
            copy.id = newId()
            if (copy.points) copy.points = copy.points.map(([px, py]) => [px + 20, py + 20])
            else { copy.x1 = (copy.x1 || 0) + 20; copy.y1 = (copy.y1 || 0) + 20; if (copy.x2 !== undefined) copy.x2 += 20; if (copy.y2 !== undefined) copy.y2 += 20 }
            return copy
        })
        s.elements.push(...newEls)
        s.selectedIds = new Set(newEls.map(e => e.id))
        setSelectedEl(newEls[0] || null); setSelectionCount(newEls.length); redraw()
    }, [redraw])

    const exportPNG = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const a = document.createElement('a')
        a.download = 'sketchpad.png'
        a.href = canvas.toDataURL('image/png')
        a.click()
    }, [])

    const handleImageUpload = useCallback((e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => {
            const img = new Image()
            img.onload = () => {
                const s = stateRef.current
                const cx = (canvasRef.current?.width || 600) / 2 / s.zoom - s.panOffset.x / s.zoom
                const cy = (canvasRef.current?.height || 400) / 2 / s.zoom - s.panOffset.y / s.zoom
                const w = Math.min(img.naturalWidth, 400), h = img.naturalHeight * (w / img.naturalWidth)
                s.elements.push({ id: newId(), tool: 'image', img, x1: cx - w / 2, y1: cy - h / 2, x2: cx + w / 2, y2: cy + h / 2 })
                s.redo = []; redraw()
            }
            img.src = ev.target.result
        }
        reader.readAsDataURL(file)
        e.target.value = ''
    }, [redraw])

    const zoomIn = () => {
        const s = stateRef.current; s.zoom = Math.min(5, s.zoom * 1.2)
        setZoom(Math.round(s.zoom * 100) / 100); setViewVersion(v => v + 1); redraw()
    }
    const zoomOut = () => {
        const s = stateRef.current; s.zoom = Math.max(0.1, s.zoom / 1.2)
        setZoom(Math.round(s.zoom * 100) / 100); setViewVersion(v => v + 1); redraw()
    }
    const resetZoom = () => {
        const s = stateRef.current; s.zoom = 1; s.panOffset = { x: 0, y: 0 }
        setZoom(1); setViewVersion(v => v + 1); redraw()
    }

    const fitToScreen = useCallback(() => {
        const s = stateRef.current
        if (!s.elements.length) return
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        s.elements.forEach(el => {
            const b = getElementBounds(el)
            minX = Math.min(minX, b.x); minY = Math.min(minY, b.y)
            maxX = Math.max(maxX, b.x + b.w); maxY = Math.max(maxY, b.y + b.h)
        })
        const canvas = canvasRef.current
        if (!canvas) return
        const pad = 60, fw = canvas.width - pad * 2, fh = canvas.height - pad * 2
        const cw = maxX - minX || 1, ch = maxY - minY || 1
        const nz = Math.min(fw / cw, fh / ch, 2)
        s.zoom = nz
        s.panOffset = { x: pad - minX * nz, y: pad - minY * nz }
        setZoom(Math.round(nz * 100) / 100)
        setViewVersion(v => v + 1)
        redraw()
    }, [redraw])

    useEffect(() => {
        const kd = (e) => {
            if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') return
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); return }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); redo(); return }
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); duplicateSelected(); return }
            if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected()
            if (e.key === 'Escape') {
                stateRef.current.selectedIds = new Set()
                stateRef.current.marquee = null
                stateRef.current.isMarquee = false
                setSelectedEl(null); setSelectionCount(0); redraw()
            }
            const map = { p: 'pencil', b: 'pen', h: 'highlighter', e: 'eraser', l: 'line', a: 'arrow', r: 'rect', c: 'circle', s: 'shape', t: 'text', n: 'sticky', v: 'select', m: 'pan', i: 'image' }
            if (map[e.key]) setTool(map[e.key])
        }
        document.addEventListener('keydown', kd)
        return () => document.removeEventListener('keydown', kd)
    }, [undo, redo, deleteSelected, duplicateSelected, redraw])

    // Compute inline toolbar position — shown for any selection (single or multi)
    const inlineToolbarPos = useMemo(() => {
        const s = stateRef.current
        if (s.selectedIds.size === 0) return null
        // Compute bounding box of all selected elements
        let minX = Infinity, minY = Infinity, maxX = -Infinity
        s.elements.forEach(el => {
            if (!s.selectedIds.has(el.id)) return
            const b = getElementBounds(el)
            minX = Math.min(minX, b.x); minY = Math.min(minY, b.y)
            maxX = Math.max(maxX, b.x + b.w)
        })
        if (!isFinite(minX)) return null
        const midWorldX = (minX + maxX) / 2
        const screenX = midWorldX * s.zoom + s.panOffset.x
        const screenY = minY * s.zoom + s.panOffset.y
        return { left: screenX, top: Math.max(8, screenY - 48) }
    }, [selectedEl, selectionCount, viewVersion]) // eslint-disable-line

    const S = useMemo(() => ({
        root: {
            display: 'flex', flexDirection: 'column', width: '100%', height: '100%', minHeight: 500,
            fontFamily: "'DM Sans', sans-serif", background: '#f5f5f0', overflow: 'hidden', position: 'relative'
        },
        topbar: {
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
            background: '#ffffff', borderBottom: '1px solid #e8e8e4',
            flexWrap: 'nowrap', overflowX: 'auto', minHeight: 48,
            userSelect: 'none', flexShrink: 0
        },
        toolBtn: (active, tid) => ({
            width: 34, height: 34,
            border: tid === 'vanish' && active ? '1.5px solid #ff2d55' : active ? '1.5px solid #6366f1' : '1px solid transparent',
            borderRadius: 8,
            background: tid === 'vanish' && active ? '#fff0f3' : active ? '#eef2ff' : 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: tid === 'vanish' && active ? '#ff2d55' : active ? '#4f46e5' : '#52525b',
            transition: 'all 0.12s', flexShrink: 0,
        }),
        iconBtn: (active = false) => ({
            width: 32, height: 32, border: `1px solid ${active ? '#e0e0ff' : '#e8e8e4'}`,
            borderRadius: 7, background: active ? '#f0f0ff' : '#ffffff',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: active ? '#4f46e5' : '#71717a', transition: 'all 0.12s', flexShrink: 0
        }),
        sep: { width: 1, height: 28, background: '#e8e8e4', flexShrink: 0, margin: '0 2px' },
        label: { fontSize: 11, color: '#9ca3af', userSelect: 'none', whiteSpace: 'nowrap' },
        canvasWrap: { flex: 1, position: 'relative', overflow: 'hidden' },
        propPanel: {
            position: 'absolute', right: 8, top: 8, width: 180, background: '#ffffff',
            borderRadius: 12, border: '1px solid #e8e8e4', padding: 12,
            display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10,
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
        },
        sidebarSection: { display: 'flex', flexDirection: 'column', gap: 6 },
        sidebarLabel: { fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: '.06em', textTransform: 'uppercase' },
        colorDot: (c, active) => ({
            width: 20, height: 20, borderRadius: '50%', background: c,
            border: active ? '2.5px solid #6366f1' : '2px solid transparent',
            cursor: 'pointer', transform: active ? 'scale(1.2)' : 'scale(1)',
            transition: 'all 0.1s', flexShrink: 0,
            boxShadow: '0 0 0 1px rgba(0,0,0,0.1)'
        }),
        mobileBottom: {
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: '#ffffff', borderTop: '1px solid #e8e8e4',
            padding: '8px 12px', zIndex: 30
        },
        kbd: {
            display: 'inline-block', background: '#f4f4f2', border: '1px solid #ddd',
            borderRadius: 3, padding: '0 4px', fontSize: 10, color: '#666'
        },
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
        { id: 'double-arrow', icon: 'arrow', key: null, label: '↔ Arrow' },
        null,
        { id: 'rect', icon: 'rect', key: 'R', label: 'Rect' },
        { id: 'circle', icon: 'circle', key: 'C', label: 'Circle' },
        { id: 'shape', icon: 'shape', key: 'S', label: 'Shape' },
        null,
        { id: 'text', icon: 'text', key: 'T', label: 'Text' },
        { id: 'sticky', icon: 'sticky', key: 'N', label: 'Sticky' },
        { id: 'image', icon: 'image', key: 'I', label: 'Image' },
    ]

    const MOBILE_TOOLS = [
        { id: 'pencil', icon: 'pencil' }, { id: 'eraser', icon: 'eraser' }, { id: 'arrow', icon: 'arrow' },
        { id: 'rect', icon: 'rect' }, { id: 'text', icon: 'text' }, { id: 'sticky', icon: 'sticky' },
        { id: 'select', icon: 'select' }, { id: 'pan', icon: 'pan' }
    ]

    const cursorFor = (t) => {
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
                            <button key={t.id} style={S.toolBtn(tool === t.id, t.id)} title={`${t.label}${t.key ? ' (' + t.key + ')' : ''}`}
                                onClick={() => setTool(t.id)}>
                                {t.id === 'vanish'
                                    ? <span style={{ fontSize: 13, color: tool === 'vanish' ? '#ff2d55' : '#999' }}>✦</span>
                                    : icons[t.icon]
                                        ? <Icon d={icons[t.icon]} />
                                        : <span style={{ fontSize: 13 }}>{t.label}</span>}
                            </button>
                        )
                    )}
                    <div style={S.sep} />

                    {tool === 'shape' && (
                        <>
                            {SHAPES.map(sh => (
                                <button key={sh} style={S.toolBtn(shapeType === sh)} title={sh} onClick={() => setShapeType(sh)}>
                                    <span style={{ fontSize: 14 }}>{SHAPE_ICONS[sh]}</span>
                                </button>
                            ))}
                            <div style={S.sep} />
                        </>
                    )}

                    {(tool === 'arrow' || tool === 'dashed-arrow') && (
                        <>
                            <select value={arrowStyle} onChange={e => setArrowStyle(e.target.value)}
                                style={{ height: 28, borderRadius: 6, border: '1px solid #e0e0e0', fontSize: 11, padding: '0 6px', color: '#555' }}>
                                {ARROW_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select value={arrowEnd} onChange={e => setArrowEnd(e.target.value)}
                                style={{ height: 28, borderRadius: 6, border: '1px solid #e0e0e0', fontSize: 11, padding: '0 6px', color: '#555' }}>
                                {ARROW_ENDS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <div style={S.sep} />
                        </>
                    )}

                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        {COLORS.map(c => (
                            <div key={c} style={S.colorDot(c, color === c)} onClick={() => setColor(c)} title={c} />
                        ))}
                        <input type="color" value={color} onChange={e => setColor(e.target.value)}
                            style={{ width: 20, height: 20, border: 'none', borderRadius: '50%', cursor: 'pointer', padding: 0 }} />
                    </div>
                    <div style={S.sep} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={S.label}>Fill</span>
                        <div style={{ ...S.colorDot('transparent', fill === 'none'), border: '1.5px dashed #ccc', position: 'relative' }}
                            onClick={() => setFill('none')}>
                            {fill === 'none' && <span style={{ position: 'absolute', color: '#e55', fontSize: 12, top: -2, left: 2 }}>×</span>}
                        </div>
                        {COLORS.slice(0, 6).map(c => (
                            <div key={c} style={S.colorDot(c, fill === c)} onClick={() => setFill(c)} />
                        ))}
                    </div>
                    <div style={S.sep} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={S.label}>Size</span>
                        <input type="range" min="1" max="24" value={strokeSize}
                            onChange={e => setStrokeSize(Number(e.target.value))}
                            style={{ width: 64, accentColor: '#6366f1' }} />
                        <span style={{ ...S.label, minWidth: 16 }}>{strokeSize}</span>
                    </div>
                    <div style={S.sep} />

                    {(tool === 'text' || tool === 'sticky') && (
                        <>
                            <select value={fontSize} onChange={e => setFontSize(Number(e.target.value))}
                                style={{ height: 28, borderRadius: 6, border: '1px solid #e0e0e0', fontSize: 11, padding: '0 4px', color: '#555' }}>
                                {FONT_SIZES.map(f => <option key={f} value={f}>{f}px</option>)}
                            </select>
                            {FONT_LABELS.map((fl, fi) => (
                                <button key={fi} style={S.toolBtn(fontIdx === fi)} onClick={() => setFontIdx(fi)}>
                                    <span style={{ fontSize: 12, fontFamily: FONTS[fi] }}>{fl[0]}</span>
                                </button>
                            ))}
                            <div style={S.sep} />
                        </>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={S.label}>BG</span>
                        {BG_OPTIONS.map(b => (
                            <button key={b.id} style={{ ...S.toolBtn(bg === b.id), width: 'auto', padding: '0 6px', fontSize: 10 }}
                                onClick={() => setBg(b.id)}>{b.label}</button>
                        ))}
                    </div>
                    <div style={S.sep} />

                    <button style={S.iconBtn()} onClick={undo} title="Undo (Ctrl+Z)"><Icon d={icons.undo} /></button>
                    <button style={S.iconBtn()} onClick={redo} title="Redo"><Icon d={icons.redo} /></button>
                    <button style={S.iconBtn()} onClick={deleteSelected} title="Delete selected (Del)"><Icon d={icons.trash} /></button>
                    <button style={S.iconBtn()} onClick={duplicateSelected} title="Duplicate (Ctrl+D)"><Icon d={icons.copy} /></button>
                    <div style={S.sep} />
                    <button style={S.iconBtn()} onClick={zoomOut}><Icon d={icons.zoomOut} /></button>
                    <button style={{ ...S.iconBtn(), width: 'auto', padding: '0 8px', fontSize: 11, color: '#555', cursor: 'pointer' }}
                        onClick={resetZoom}>{Math.round(zoom * 100)}%</button>
                    <button style={S.iconBtn()} onClick={zoomIn}><Icon d={icons.zoomIn} /></button>
                    <button style={{ ...S.iconBtn(), width: 'auto', padding: '0 6px', fontSize: 10 }} onClick={fitToScreen}>Fit</button>
                    <div style={S.sep} />
                    <button style={{ ...S.iconBtn(), width: 'auto', padding: '0 8px', fontSize: 11, color: '#4f46e5', fontWeight: 600 }} onClick={exportPNG}>
                        <Icon d={icons.download} />&nbsp;Export
                    </button>
                    <button style={{ ...S.iconBtn(), width: 'auto', padding: '0 8px', fontSize: 11 }} onClick={clearAll}>Clear</button>
                </div>
            )}

            <div ref={wrapRef} style={S.canvasWrap}>
                <canvas
                    ref={canvasRef}
                    style={{ position: 'absolute', top: 0, left: 0, cursor: cursorFor(tool), touchAction: 'none' }}
                    onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
                    onDoubleClick={onDblClick}
                />

                {/* ── Inline selection toolbar — appears above selection ── */}
                {hasSelection && inlineToolbarPos && (
                    <div style={{
                        position: 'absolute',
                        left: inlineToolbarPos.left,
                        top: inlineToolbarPos.top,
                        transform: 'translateX(-50%)',
                        zIndex: 40,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        background: '#18181b',
                        borderRadius: 10,
                        padding: '5px 6px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
                        pointerEvents: 'auto',
                        userSelect: 'none',
                    }}>
                        {/* Selection count badge */}
                        <span style={{
                            fontSize: 10, color: '#a1a1aa', fontWeight: 500,
                            padding: '0 6px', letterSpacing: '.04em',
                        }}>
                            {selectionCount > 1 ? `${selectionCount} selected` : (selectedEl?.tool || 'element')}
                        </span>

                        <div style={{ width: 1, height: 16, background: '#3f3f46', margin: '0 2px' }} />

                        {/* Duplicate */}
                        <button className="sel-toolbar-btn" title="Duplicate (Ctrl+D)" onClick={duplicateSelected}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                color: '#d4d4d8', padding: '3px 8px', borderRadius: 6,
                                fontSize: 12, fontFamily: "'DM Sans', sans-serif",
                                transition: 'background 0.12s',
                            }}>
                            <Icon d={icons.copy} size={13} />
                            <span>Copy</span>
                        </button>

                        <div style={{ width: 1, height: 16, background: '#3f3f46', margin: '0 2px' }} />

                        {/* Delete */}
                        <button className="sel-toolbar-btn sel-toolbar-btn-del" title="Delete (Del)" onClick={deleteSelected}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                color: '#f87171', padding: '3px 8px', borderRadius: 6,
                                fontSize: 12, fontFamily: "'DM Sans', sans-serif",
                                transition: 'background 0.12s',
                            }}>
                            <Icon d={icons.trash} size={13} />
                            <span>Delete{selectionCount > 1 ? ` (${selectionCount})` : ''}</span>
                        </button>

                        {/* Down caret */}
                        <div style={{
                            position: 'absolute', bottom: -5, left: '50%',
                            transform: 'translateX(-50%)',
                            width: 0, height: 0,
                            borderLeft: '5px solid transparent',
                            borderRight: '5px solid transparent',
                            borderTop: '5px solid #18181b',
                        }} />
                    </div>
                )}

                {/* Floating text input */}
                {textInput && (
                    <textarea ref={textareaRef} defaultValue=""
                        style={{
                            position: 'absolute', left: textInput.x, top: textInput.y,
                            border: '1.5px dashed #6366f1', background: 'rgba(255,255,255,0.9)',
                            outline: 'none', padding: '4px 8px', minWidth: 120, minHeight: 36,
                            resize: 'none', borderRadius: 6, zIndex: 50,
                            fontFamily: textInput.font, fontSize: textInput.fontSize,
                            color: textInput.color, lineHeight: 1.4
                        }}
                        rows={2}
                        onBlur={commitText}
                        onKeyDown={e => {
                            if (e.key === 'Escape') { setTextInput(null); if (textareaRef.current) textareaRef.current.value = '' }
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitText() }
                        }}
                        onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                    />
                )}

                {/* Floating label input */}
                {labelMode && (
                    <input autoFocus value={labelMode.val}
                        onChange={e => setLabelMode(m => ({ ...m, val: e.target.value }))}
                        style={{
                            position: 'absolute', left: labelMode.x - 60, top: labelMode.y - 14,
                            width: 120, border: '1.5px solid #6366f1', borderRadius: 6,
                            background: 'rgba(255,255,255,0.95)', outline: 'none',
                            padding: '2px 8px', fontSize: 13, fontFamily: "'DM Sans',sans-serif",
                            textAlign: 'center', zIndex: 50
                        }}
                        onBlur={commitLabel}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') commitLabel() }}
                    />
                )}

                {/* Properties panel */}
                {selectedEl && !mob && selectionCount === 1 && (
                    <div style={S.propPanel} className="sketchpad-scroll">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ ...S.sidebarLabel, color: '#6366f1' }}>Properties</span>
                            <button style={{ ...S.iconBtn(), width: 20, height: 20 }}
                                onClick={() => { stateRef.current.selectedIds = new Set(); setSelectedEl(null); setSelectionCount(0); redraw() }}>
                                <Icon d={icons.close} size={12} />
                            </button>
                        </div>
                        <div style={S.sidebarSection}>
                            <span style={S.sidebarLabel}>Color</span>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {COLORS.map(c => (
                                    <div key={c} style={S.colorDot(c, selectedEl.color === c)}
                                        onClick={() => {
                                            const s = stateRef.current
                                            const el = s.elements.find(x => s.selectedIds.has(x.id))
                                            if (el) { el.color = c; setSelectedEl({ ...el, color: c }) }
                                            redraw()
                                        }} />
                                ))}
                            </div>
                        </div>
                        {selectedEl.tool === 'sticky' && (
                            <div style={S.sidebarSection}>
                                <span style={S.sidebarLabel}>Sticky color</span>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    {STICKY_COLORS.map(c => (
                                        <div key={c} style={{ ...S.colorDot(c, selectedEl.bgColor === c), width: 18, height: 18 }}
                                            onClick={() => {
                                                const s = stateRef.current
                                                const el = s.elements.find(x => s.selectedIds.has(x.id))
                                                if (el) { el.bgColor = c; setSelectedEl({ ...el, bgColor: c }) }
                                                redraw()
                                            }} />
                                    ))}
                                </div>
                            </div>
                        )}
                        <div style={S.sidebarSection}>
                            <span style={S.sidebarLabel}>Stroke size</span>
                            <input type="range" min="1" max="20" value={selectedEl.size || 2}
                                style={{ accentColor: '#6366f1' }}
                                onChange={e => {
                                    const s = stateRef.current
                                    const el = s.elements.find(x => s.selectedIds.has(x.id))
                                    if (el) { el.size = Number(e.target.value); setSelectedEl({ ...el, size: Number(e.target.value) }) }
                                    redraw()
                                }} />
                        </div>
                    </div>
                )}

                {/* Zoom controls */}
                <div style={{ position: 'absolute', bottom: mob ? 72 : 12, right: 12, display: 'flex', gap: 4, alignItems: 'center', zIndex: 15 }}>
                    <button style={S.iconBtn()} onClick={zoomOut}><Icon d={icons.zoomOut} /></button>
                    <button style={{ ...S.iconBtn(), width: 52, fontSize: 11, color: '#555' }} onClick={resetZoom}>{Math.round(zoom * 100)}%</button>
                    <button style={S.iconBtn()} onClick={zoomIn}><Icon d={icons.zoomIn} /></button>
                    <button style={{ ...S.iconBtn(), fontSize: 10, width: 'auto', padding: '0 6px' }} onClick={fitToScreen}>Fit</button>
                </div>

                {!mob && (
                    <div style={{ position: 'absolute', bottom: 12, left: 12, fontSize: 10, color: '#bbb', pointerEvents: 'none' }}>
                        <span style={S.kbd}>V</span> Select &nbsp;
                        <span style={S.kbd}>drag</span> Marquee select &nbsp;
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
                            <button key={tab} style={{
                                flex: 1, height: 30, border: 'none', borderRadius: 6,
                                background: mobileTab === tab ? '#eef2ff' : 'transparent',
                                color: mobileTab === tab ? '#4f46e5' : '#71717a',
                                fontSize: 10, fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase'
                            }} onClick={() => setMobileTab(tab)}>{tab}</button>
                        ))}
                    </div>
                    {mobileTab === 'draw' && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                            {MOBILE_TOOLS.map(t => (
                                <button key={t.id} style={S.toolBtn(tool === t.id)} onClick={() => setTool(t.id)}>
                                    <Icon d={icons[t.icon]} />
                                </button>
                            ))}
                        </div>
                    )}
                    {mobileTab === 'color' && (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                            {COLORS.map(c => <div key={c} style={S.colorDot(c, color === c)} onClick={() => setColor(c)} />)}
                            <input type="range" min="1" max="16" value={strokeSize} onChange={e => setStrokeSize(Number(e.target.value))} style={{ width: 80, accentColor: '#6366f1' }} />
                        </div>
                    )}
                    {mobileTab === 'bg' && (
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                            {BG_OPTIONS.map(b => (
                                <button key={b.id} style={{ ...S.toolBtn(bg === b.id), width: 'auto', padding: '0 8px', fontSize: 10 }} onClick={() => setBg(b.id)}>{b.label}</button>
                            ))}
                        </div>
                    )}
                    {mobileTab === 'actions' && (
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                            <button style={S.iconBtn()} onClick={undo}><Icon d={icons.undo} /></button>
                            <button style={S.iconBtn()} onClick={redo}><Icon d={icons.redo} /></button>
                            <button style={S.iconBtn()} onClick={deleteSelected}><Icon d={icons.trash} /></button>
                            <button style={S.iconBtn()} onClick={zoomOut}><Icon d={icons.zoomOut} /></button>
                            <button style={S.iconBtn()} onClick={zoomIn}><Icon d={icons.zoomIn} /></button>
                            <button style={{ ...S.iconBtn(), width: 'auto', padding: '0 8px', fontSize: 11, color: '#4f46e5', fontWeight: 600 }} onClick={exportPNG}>Export</button>
                            <button style={{ ...S.iconBtn(), width: 'auto', padding: '0 8px', fontSize: 11 }} onClick={clearAll}>Clear</button>
                        </div>
                    )}
                </div>
            )}

            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
        </div>
    )
}