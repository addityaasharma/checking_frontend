import React, { useEffect, useRef, useCallback, useState } from 'react'

const COLORS = ['#1e1e1e', '#e03131', '#2f9e44', '#1971c2', '#e67700', '#6741d9']
const TOOLS = [
    { id: 'pencil', label: '✏️', title: 'Pencil (P)' },
    { id: 'line', title: 'Line (L)', icon: 'line' },
    { id: 'rect', title: 'Rectangle (R)', icon: 'rect' },
    { id: 'circle', title: 'Circle (C)', icon: 'circle' },
    { id: 'arrow', title: 'Arrow (A)', icon: 'arrow' },
    { id: 'text', label: 'T', title: 'Text (T)' },
    { id: 'eraser', title: 'Eraser (E)', icon: 'eraser' },
]

const ROUGHNESS = 0.7

/* ── SVG Icons ── */
function IconLine() {
    return <svg width="16" height="16" viewBox="0 0 16 16"><line x1="2" y1="14" x2="14" y2="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
}
function IconRect() {
    return <svg width="16" height="16" viewBox="0 0 16 16"><rect x="2" y="4" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
}
function IconCircle() {
    return <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
}
function IconArrow() {
    return <svg width="16" height="16" viewBox="0 0 16 16"><line x1="2" y1="14" x2="13" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M13 3 L9 4 L12 7z" fill="currentColor" /></svg>
}
function IconEraser() {
    return <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="9" width="9" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" transform="rotate(-30 5 11)" /><line x1="6" y1="14" x2="15" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
}
function IconSelect() {
    return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 2l10 5.5-5 1.5-2 5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
}
function IconPan() {
    return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v2M8 12v2M2 8h2M12 8h2M4.9 4.9l1.4 1.4M9.7 9.7l1.4 1.4M4.9 11.1l1.4-1.4M9.7 6.3l1.4-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" /></svg>
}
function IconUndo() {
    return <svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 6h7a4 4 0 0 1 0 8H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /><path d="M5 3L2 6l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
}
function IconRedo() {
    return <svg width="16" height="16" viewBox="0 0 16 16"><path d="M14 6H7a4 4 0 0 0 0 8h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /><path d="M11 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
}

function getToolIcon(id) {
    switch (id) {
        case 'line': return <IconLine />
        case 'rect': return <IconRect />
        case 'circle': return <IconCircle />
        case 'arrow': return <IconArrow />
        case 'eraser': return <IconEraser />
        default: return null
    }
}

/* ── Drawing helpers ── */
function roughPoint(x, y, size) {
    return [x + (Math.random() - 0.5) * ROUGHNESS * size * 0.5, y + (Math.random() - 0.5) * ROUGHNESS * size * 0.5]
}

function drawRoughRect(ctx, x1, y1, x2, y2) {
    const j = () => (Math.random() - 0.5) * ROUGHNESS * 3
    for (let pass = 0; pass < 2; pass++) {
        const s = pass === 0 ? 1 : 0.5
        ctx.beginPath()
        ctx.moveTo(x1 + j() * s, y1 + j() * s)
        ctx.lineTo(x2 + j() * s, y1 + j() * s)
        ctx.lineTo(x2 + j() * s, y2 + j() * s)
        ctx.lineTo(x1 + j() * s, y2 + j() * s)
        ctx.lineTo(x1 + j() * s, y1 + j() * s)
        ctx.stroke()
    }
}

function drawRoughCircle(ctx, cx, cy, rx, ry) {
    const steps = 36
    const j = () => (Math.random() - 0.5) * ROUGHNESS * 2
    for (let pass = 0; pass < 2; pass++) {
        ctx.beginPath()
        for (let i = 0; i <= steps; i++) {
            const a = (i / steps) * Math.PI * 2
            const x = cx + rx * Math.cos(a) + j()
            const y = cy + ry * Math.sin(a) + j()
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.stroke()
    }
}

function drawPath(ctx, p) {
    ctx.save()
    ctx.strokeStyle = p.color
    ctx.lineWidth = p.size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = p.tool === 'eraser' ? 1 : 0.92

    if (p.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out'
        ctx.strokeStyle = 'rgba(0,0,0,1)'
    }

    if (p.tool === 'pencil' || p.tool === 'eraser') {
        if (p.points.length < 2) { ctx.restore(); return }
        ctx.beginPath()
        ctx.moveTo(p.points[0][0], p.points[0][1])
        for (let i = 1; i < p.points.length; i++) ctx.lineTo(p.points[i][0], p.points[i][1])
        ctx.stroke()
    } else if (p.tool === 'line') {
        const [x1, y1] = roughPoint(p.x1, p.y1, p.size)
        const [x2, y2] = roughPoint(p.x2, p.y2, p.size)
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
    } else if (p.tool === 'rect') {
        drawRoughRect(ctx, p.x1, p.y1, p.x2, p.y2)
    } else if (p.tool === 'circle') {
        const cx = (p.x1 + p.x2) / 2, cy = (p.y1 + p.y2) / 2
        const rx = Math.abs(p.x2 - p.x1) / 2, ry = Math.abs(p.y2 - p.y1) / 2
        drawRoughCircle(ctx, cx, cy, rx, ry)
    } else if (p.tool === 'arrow') {
        const dx = p.x2 - p.x1, dy = p.y2 - p.y1
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len < 2) { ctx.restore(); return }
        const nx = dx / len, ny = dy / len
        const hs = Math.min(16, len * 0.35)
        ctx.beginPath()
        ctx.moveTo(p.x1, p.y1)
        ctx.lineTo(p.x2, p.y2)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(p.x2, p.y2)
        ctx.lineTo(p.x2 - nx * hs + ny * hs * 0.4, p.y2 - ny * hs - nx * hs * 0.4)
        ctx.lineTo(p.x2 - nx * hs - ny * hs * 0.4, p.y2 - ny * hs + nx * hs * 0.4)
        ctx.closePath()
        ctx.fillStyle = p.color
        ctx.fill()
    } else if (p.tool === 'text') {
        ctx.font = `${p.size * 5 + 14}px 'Caveat', cursive`
        ctx.fillStyle = p.color
        ctx.globalAlpha = 1
        const lines = p.text.split('\n')
        lines.forEach((line, i) => ctx.fillText(line, p.x1, p.y1 + i * (p.size * 5 + 14) * 1.2))
    }

    if (p.selected) {
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = 0.5
        ctx.strokeStyle = '#6366f1'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 3])
        const b = getBounds(p)
        ctx.strokeRect(b.x - 6, b.y - 6, b.w + 12, b.h + 12)
        ctx.setLineDash([])
    }

    ctx.restore()
}

function getBounds(p) {
    if (p.tool === 'pencil' || p.tool === 'eraser') {
        const xs = p.points.map(pt => pt[0]), ys = p.points.map(pt => pt[1])
        const x = Math.min(...xs), y = Math.min(...ys)
        return { x, y, w: Math.max(Math.max(...xs) - x, 1), h: Math.max(Math.max(...ys) - y, 1) }
    }
    if (p.tool === 'text') return { x: p.x1, y: p.y1 - 20, w: 120, h: 30 }
    const x = Math.min(p.x1, p.x2), y = Math.min(p.y1, p.y2)
    return { x, y, w: Math.abs(p.x2 - p.x1) || 1, h: Math.abs(p.y2 - p.y1) || 1 }
}

/* ── Styles ── */
const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        minHeight: 600,
        background: '#ffffff',
        borderRadius: 12,
        border: '0.5px solid #e5e5e5',
        overflow: 'hidden',
        fontFamily: 'system-ui, sans-serif',
    },
    toolbar: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '8px 12px',
        background: '#f9f9f8',
        borderBottom: '0.5px solid #e5e5e5',
        flexWrap: 'wrap',
    },
    toolGroup: { display: 'flex', gap: 2, alignItems: 'center' },
    sep: { width: 0.5, height: 28, background: '#d0d0d0', margin: '0 4px' },
    toolBtn: (active) => ({
        width: 32,
        height: 32,
        border: active ? '0.5px solid #c0c0c0' : '0.5px solid transparent',
        borderRadius: 6,
        background: active ? '#ffffff' : 'transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 15,
        color: active ? '#111' : '#666',
        boxShadow: active ? '0 0 0 2px #6366f130' : 'none',
        transition: 'all 0.1s',
    }),
    colorSwatch: (active, bg) => ({
        width: 20,
        height: 20,
        borderRadius: '50%',
        border: active ? '2px solid #111' : '2px solid transparent',
        background: bg,
        cursor: 'pointer',
        transform: active ? 'scale(1.2)' : 'scale(1)',
        transition: 'all 0.1s',
    }),
    sizeSlider: { width: 60, accentColor: '#6366f1' },
    canvasWrap: { flex: 1, position: 'relative', overflow: 'hidden' },
    canvas: (tool) => ({
        position: 'absolute',
        top: 0,
        left: 0,
        cursor: tool === 'pan' ? 'grab' : tool === 'text' ? 'text' : tool === 'select' ? 'default' : 'crosshair',
        touchAction: 'none',
    }),
    textArea: {
        position: 'absolute',
        border: '1.5px dashed #6366f1',
        background: 'transparent',
        outline: 'none',
        fontFamily: "'Caveat', cursive",
        padding: '4px 8px',
        minWidth: 80,
        minHeight: 32,
        resize: 'none',
        borderRadius: 4,
    },
    status: {
        fontSize: 11,
        color: '#999',
        padding: '4px 12px',
        borderTop: '0.5px solid #e5e5e5',
        background: '#f9f9f8',
        display: 'flex',
        justifyContent: 'space-between',
    },
    kbd: {
        background: '#fff',
        border: '0.5px solid #d0d0d0',
        borderRadius: 3,
        padding: '1px 5px',
        fontSize: 10,
        marginRight: 4,
    },
}

/* ── Component ── */
const Creatives = () => {
    const canvasRef = useRef(null)
    const wrapRef = useRef(null)
    const textRef = useRef(null)
    const stateRef = useRef({
        paths: [],
        redoStack: [],
        currentPath: null,
        drawing: false,
        panOffset: { x: 0, y: 0 },
        panStart: null,
        zoom: 1,
        selectedIdx: -1,
    })

    const [activeTool, setActiveTool] = useState('pencil')
    const [activeColor, setActiveColor] = useState('#1e1e1e')
    const [strokeSize, setStrokeSize] = useState(3)
    const [zoom, setZoom] = useState(1)
    const [textPos, setTextPos] = useState(null)
    const [textColor, setTextColor] = useState('#1e1e1e')
    const [textFontSize, setTextFontSize] = useState(29)

    const toolRef = useRef('pencil')
    const colorRef = useRef('#1e1e1e')
    const sizeRef = useRef(3)

    useEffect(() => { toolRef.current = activeTool }, [activeTool])
    useEffect(() => { colorRef.current = activeColor }, [activeColor])
    useEffect(() => { sizeRef.current = strokeSize }, [strokeSize])

    const redraw = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        const s = stateRef.current
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.save()
        ctx.translate(s.panOffset.x, s.panOffset.y)
        ctx.scale(s.zoom, s.zoom)
        s.paths.forEach(p => drawPath(ctx, p))
        if (s.currentPath) drawPath(ctx, s.currentPath)
        ctx.restore()
    }, [])

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
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;600&display=swap'
        document.head.appendChild(link)
        return () => document.head.removeChild(link)
    }, [])

    useEffect(() => {
        resize()
        const ro = new ResizeObserver(resize)
        if (wrapRef.current) ro.observe(wrapRef.current)
        return () => ro.disconnect()
    }, [resize])

    const getPos = useCallback((e) => {
        const canvas = canvasRef.current
        if (!canvas) return { x: 0, y: 0 }
        const r = canvas.getBoundingClientRect()
        const s = stateRef.current
        const clientX = e.touches ? e.touches[0].clientX : e.clientX
        const clientY = e.touches ? e.touches[0].clientY : e.clientY
        return {
            x: (clientX - r.left - s.panOffset.x) / s.zoom,
            y: (clientY - r.top - s.panOffset.y) / s.zoom,
        }
    }, [])

    const handleSelect = useCallback((pos) => {
        const s = stateRef.current
        s.paths.forEach(p => (p.selected = false))
        for (let i = s.paths.length - 1; i >= 0; i--) {
            const b = getBounds(s.paths[i])
            if (pos.x >= b.x - 8 && pos.x <= b.x + b.w + 8 && pos.y >= b.y - 8 && pos.y <= b.y + b.h + 8) {
                s.paths[i].selected = true
                s.selectedIdx = i
                redraw()
                return
            }
        }
        s.selectedIdx = -1
        redraw()
    }, [redraw])

    const onDown = useCallback((e) => {
        const pos = getPos(e)
        const s = stateRef.current
        const tool = toolRef.current
        if (tool === 'pan') {
            s.panStart = { x: e.clientX - s.panOffset.x, y: e.clientY - s.panOffset.y }
            s.drawing = true
            return
        }
        if (tool === 'text') {
            const canvas = canvasRef.current
            const r = canvas.getBoundingClientRect()
            const tx = pos.x * s.zoom + s.panOffset.x
            const ty = pos.y * s.zoom + s.panOffset.y
            setTextPos({ left: tx, top: ty, sx: pos.x, sy: pos.y + 20 })
            setTextColor(colorRef.current)
            setTextFontSize(sizeRef.current * 5 + 14)
            setTimeout(() => textRef.current?.focus(), 0)
            return
        }
        if (tool === 'select') { handleSelect(pos); return }
        s.drawing = true
        s.redoStack = []
        if (tool === 'pencil' || tool === 'eraser') {
            s.currentPath = { tool, color: colorRef.current, size: sizeRef.current, points: [[pos.x, pos.y]] }
        } else {
            s.currentPath = { tool, color: colorRef.current, size: sizeRef.current, x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y }
        }
    }, [getPos, handleSelect])

    const onMove = useCallback((e) => {
        const s = stateRef.current
        if (!s.drawing) return
        const pos = getPos(e)
        const tool = toolRef.current
        if (tool === 'pan' && s.panStart) {
            s.panOffset = { x: e.clientX - s.panStart.x, y: e.clientY - s.panStart.y }
            redraw()
            return
        }
        if (tool === 'pencil' || tool === 'eraser') {
            s.currentPath?.points.push([pos.x, pos.y])
        } else if (s.currentPath) {
            s.currentPath.x2 = pos.x
            s.currentPath.y2 = pos.y
        }
        redraw()
    }, [getPos, redraw])

    const onUp = useCallback(() => {
        const s = stateRef.current
        if (!s.drawing) return
        s.drawing = false
        if (toolRef.current === 'pan') { s.panStart = null; return }
        if (s.currentPath) {
            const p = s.currentPath
            const valid = (p.tool === 'pencil' || p.tool === 'eraser')
                ? p.points.length > 1
                : Math.abs((p.x2 ?? 0) - (p.x1 ?? 0)) > 2 || Math.abs((p.y2 ?? 0) - (p.y1 ?? 0)) > 2
            if (valid) s.paths.push(p)
            s.currentPath = null
            redraw()
        }
    }, [redraw])

    const onWheel = useCallback((e) => {
        e.preventDefault()
        const s = stateRef.current
        const delta = e.deltaY > 0 ? 0.9 : 1.1
        s.zoom = Math.min(4, Math.max(0.25, s.zoom * delta))
        setZoom(s.zoom)
        redraw()
    }, [redraw])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        canvas.addEventListener('wheel', onWheel, { passive: false })
        return () => canvas.removeEventListener('wheel', onWheel)
    }, [onWheel])

    const onTextBlur = useCallback(() => {
        const txt = textRef.current?.value?.trim()
        if (txt && textPos) {
            stateRef.current.paths.push({
                tool: 'text', color: colorRef.current, size: sizeRef.current,
                x1: textPos.sx, y1: textPos.sy, text: txt,
            })
            redraw()
        }
        setTextPos(null)
        if (textRef.current) textRef.current.value = ''
    }, [textPos, redraw])

    const undo = useCallback(() => {
        const s = stateRef.current
        if (s.paths.length) { s.redoStack.push(s.paths.pop()); redraw() }
    }, [redraw])

    const redo = useCallback(() => {
        const s = stateRef.current
        if (s.redoStack.length) { s.paths.push(s.redoStack.pop()); redraw() }
    }, [redraw])

    const clearCanvas = useCallback(() => {
        if (window.confirm('Clear canvas?')) {
            stateRef.current.paths = []
            stateRef.current.redoStack = []
            redraw()
        }
    }, [redraw])

    const exportPNG = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const a = document.createElement('a')
        a.download = 'creatives.png'
        a.href = canvas.toDataURL('image/png')
        a.click()
    }, [])

    useEffect(() => {
        const handler = (e) => {
            if (e.target === textRef.current) return
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') { e.preventDefault(); undo() }
                if (e.key === 'y' || e.key === 'Y') { e.preventDefault(); redo() }
                return
            }
            if (e.key === 'Delete' && stateRef.current.selectedIdx >= 0) {
                stateRef.current.paths.splice(stateRef.current.selectedIdx, 1)
                stateRef.current.selectedIdx = -1
                redraw()
            }
            const map = { p: 'pencil', r: 'rect', c: 'circle', l: 'line', a: 'arrow', t: 'text', e: 'eraser', v: 'select', h: 'pan' }
            if (map[e.key]) setActiveTool(map[e.key])
        }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [undo, redo, redraw])

    return (
        <div style={styles.container}>
            {/* Toolbar */}
            <div style={styles.toolbar}>
                {/* Nav tools */}
                <div style={styles.toolGroup}>
                    {[{ id: 'select', icon: <IconSelect /> }, { id: 'pan', icon: <IconPan /> }].map(t => (
                        <button key={t.id} style={styles.toolBtn(activeTool === t.id)} onClick={() => setActiveTool(t.id)} title={t.id}>
                            {t.icon}
                        </button>
                    ))}
                </div>
                <div style={styles.sep} />

                {/* Draw tools */}
                <div style={styles.toolGroup}>
                    {TOOLS.map(t => (
                        <button key={t.id} style={styles.toolBtn(activeTool === t.id)} onClick={() => setActiveTool(t.id)} title={t.title}>
                            {t.label || getToolIcon(t.id)}
                        </button>
                    ))}
                </div>
                <div style={styles.sep} />

                {/* Colors */}
                <div style={styles.toolGroup}>
                    {COLORS.map(c => (
                        <div key={c} style={styles.colorSwatch(activeColor === c, c)} onClick={() => setActiveColor(c)} />
                    ))}
                </div>
                <div style={styles.sep} />

                {/* Size */}
                <input type="range" min="1" max="20" value={strokeSize} style={styles.sizeSlider}
                    onChange={e => setStrokeSize(Number(e.target.value))} title="Stroke size" />
                <div style={styles.sep} />

                {/* Actions */}
                <div style={styles.toolGroup}>
                    <button style={styles.toolBtn(false)} onClick={undo} title="Undo (Ctrl+Z)"><IconUndo /></button>
                    <button style={styles.toolBtn(false)} onClick={redo} title="Redo (Ctrl+Y)"><IconRedo /></button>
                    <button style={styles.toolBtn(false)} onClick={clearCanvas} title="Clear">🗑️</button>
                </div>
                <div style={styles.sep} />
                <button style={{ ...styles.toolBtn(false), width: 'auto', padding: '0 8px', fontSize: 12 }} onClick={exportPNG}>
                    Export
                </button>
            </div>

            {/* Canvas area */}
            <div ref={wrapRef} style={styles.canvasWrap}>
                <canvas
                    ref={canvasRef}
                    style={styles.canvas(activeTool)}
                    onMouseDown={onDown}
                    onMouseMove={onMove}
                    onMouseUp={onUp}
                    onMouseLeave={onUp}
                    onTouchStart={e => { e.preventDefault(); onDown(e) }}
                    onTouchMove={e => { e.preventDefault(); onMove(e) }}
                    onTouchEnd={e => { e.preventDefault(); onUp(e) }}
                />
                {textPos && (
                    <textarea
                        ref={textRef}
                        style={{
                            ...styles.textArea,
                            left: textPos.left,
                            top: textPos.top,
                            fontSize: textFontSize,
                            color: textColor,
                        }}
                        rows={1}
                        onBlur={onTextBlur}
                        onKeyDown={e => { if (e.key === 'Escape') { if (textRef.current) textRef.current.value = ''; textRef.current?.blur() } }}
                        onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                    />
                )}
            </div>

            {/* Status bar */}
            <div style={styles.status}>
                <span>
                    {['P Pencil', 'R Rect', 'C Circle', 'L Line', 'A Arrow', 'T Text', 'E Eraser', 'V Select', 'H Pan'].map(k => (
                        <span key={k}><kbd style={styles.kbd}>{k.split(' ')[0]}</kbd>{k.split(' ')[1]}&nbsp;&nbsp;</span>
                    ))}
                </span>
                <span>{Math.round(zoom * 100)}%</span>
            </div>
        </div>
    )
}

export default Creatives