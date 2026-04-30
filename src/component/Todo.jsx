import React, { useState, useRef, useEffect, useCallback } from "react";
import {API_BASE} from "../api";


const Icon = ({ path, size = 15, color = "currentColor", strokeWidth = 2, fill = "none" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color}
        strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        style={{ display: "block", flexShrink: 0 }}>
        <path d={path} />
    </svg>
);

const Icons = {
    check: "M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11",
    plus: "M12 5v14M5 12h14",
    chevDown: "M6 9l6 6 6-6",
    chevUp: "M18 15l-6-6-6 6",
    trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
    search: "M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z",
    star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
};

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const MIN_W = 280, MAX_W = 480, MIN_H = 200, MAX_H = 580;

/* ── Smooth expand/collapse for todo detail ── */
function ExpandPanel({ open, children }) {
    const panelRef = useRef(null);

    useEffect(() => {
        const el = panelRef.current;
        if (!el) return;
        if (open) {
            el.style.maxHeight = "0px";
            el.style.opacity = "0";
            requestAnimationFrame(() => {
                el.style.transition = "max-height 0.13s cubic-bezier(0.4,0,0.2,1), opacity 0.1s ease";
                el.style.maxHeight = el.scrollHeight + "px";
                el.style.opacity = "1";
            });
        } else {
            el.style.transition = "max-height 0.1s cubic-bezier(0.4,0,0.2,1), opacity 0.08s ease";
            el.style.maxHeight = "0px";
            el.style.opacity = "0";
        }
    }, [open]);

    return (
        <div ref={panelRef} style={{ overflow: "hidden", maxHeight: 0, opacity: 0 }}>
            {children}
        </div>
    );
}

export default function Todo() {
    const [todos, setTodos] = useState([]);
    const [input, setInput] = useState({ name: "", task: "" });
    const [minimized, setMin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [expanded, setExpanded] = useState(null);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [starred, setStarred] = useState(new Set());
    const [isSheet, setIsSheet] = useState(false);
    const [sheetOpen, setSheet] = useState(false);
    const [editing, setEditing] = useState(null);           // id of todo being edited
    const [editInput, setEditInput] = useState({ name: "", task: "" });
    const [savingEdit, setSavingEdit] = useState(false);
    const [, tick] = useState(0);

    /* ── Focus the name input when form opens (replaces autoFocus) ── */
    const nameInputRef = useRef(null);
    useEffect(() => {
        if (showForm && nameInputRef.current) {
            nameInputRef.current.focus();
        }
    }, [showForm]);

    /* ── pos/size stored in refs so drag doesn't cause extra re-renders ── */
    const posRef = useRef({ x: 60, y: 60 });
    const sizeRef = useRef({ w: 320, h: 400 });
    const boxRef = useRef(null);
    const rafRef = useRef(null);

    const drag = useRef({ active: false, ox: 0, oy: 0 });
    const resize = useRef({ active: false, ox: 0, oy: 0, ow: 0, oh: 0 });
    const didMove = useRef(false);

    /* ── responsive ── */
    useEffect(() => {
        const check = () => {
            const mobile = window.innerWidth < 640;
            setIsSheet(mobile);
            if (!mobile) {
                posRef.current = {
                    x: clamp(window.innerWidth - 340, 8, window.innerWidth - MIN_W),
                    y: clamp(window.innerHeight - 440, 8, window.innerHeight - 60),
                };
                tick(n => n + 1);
            }
        };
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    /* ── fetch ── */
    const fetchTodos = async () => {
        try {
            const r = await fetch(`${API_BASE}/user/todo`, { credentials: "include" });
            const d = await r.json();
            if (d.status) setTodos(d.data);
        } catch { }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchTodos(); }, []);

    /* ══════════════════════════════════════════
       RAF-BASED DRAG + RESIZE (buttery smooth)
    ══════════════════════════════════════════ */
    useEffect(() => {
        const move = (cx, cy) => {
            didMove.current = true;
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => {
                if (drag.current.active) {
                    const w = boxRef.current?.offsetWidth || sizeRef.current.w;
                    const h = boxRef.current?.offsetHeight || sizeRef.current.h;
                    const x = clamp(cx - drag.current.ox, 0, window.innerWidth - w);
                    const y = clamp(cy - drag.current.oy, 0, window.innerHeight - h);
                    posRef.current = { x, y };
                    if (boxRef.current) {
                        boxRef.current.style.left = x + "px";
                        boxRef.current.style.top = y + "px";
                    }
                }
                if (resize.current.active) {
                    const { ox, oy, ow, oh } = resize.current;
                    const w = clamp(ow + (cx - ox), MIN_W, MAX_W);
                    const h = clamp(oh + (cy - oy), MIN_H, MAX_H);
                    sizeRef.current = { w, h };
                    if (boxRef.current) {
                        boxRef.current.style.width = w + "px";
                        boxRef.current.style.height = h + "px";
                    }
                }
            });
        };

        const stop = () => {
            if (drag.current.active || resize.current.active) {
                drag.current.active = false;
                resize.current.active = false;
                tick(n => n + 1);
            }
        };

        const mm = (e) => move(e.clientX, e.clientY);
        const tm = (e) => { const t = e.touches[0]; move(t.clientX, t.clientY); };

        window.addEventListener("mousemove", mm);
        window.addEventListener("mouseup", stop);
        window.addEventListener("touchmove", tm, { passive: false });
        window.addEventListener("touchend", stop);
        return () => {
            window.removeEventListener("mousemove", mm);
            window.removeEventListener("mouseup", stop);
            window.removeEventListener("touchmove", tm);
            window.removeEventListener("touchend", stop);
        };
    }, []);

    const startDrag = (cx, cy) => {
        didMove.current = false;
        drag.current = { active: true, ox: cx - posRef.current.x, oy: cy - posRef.current.y };
    };

    const startResize = (cx, cy) => {
        resize.current = { active: true, ox: cx, oy: cy, ow: sizeRef.current.w, oh: sizeRef.current.h };
    };

    /* ── CRUD ── */
    const addTodo = async () => {
        if (!input.name.trim() || !input.task.trim()) return;
        setAdding(true);
        try {
            const r = await fetch(`${API_BASE}/user/todo`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ name: input.name.trim(), task: input.task.trim() }),
            });
            const d = await r.json();
            if (d.status) { setInput({ name: "", task: "" }); setShowForm(false); fetchTodos(); }
        } catch { }
        finally { setAdding(false); }
    };

    const toggleTodo = async (todo) => {
        try {
            await fetch(`${API_BASE}/user/todo/${todo.id}`, {
                method: "PUT", headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ is_completed: !todo.is_completed }),
            });
            setTodos(p => p.map(t => t.id === todo.id ? { ...t, is_completed: !t.is_completed } : t));
        } catch { }
    };

    const deleteTodo = async (id) => {
        try {
            await fetch(`${API_BASE}/user/todo/${id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({}) });
            setTodos(p => p.filter(t => t.id !== id));
            if (expanded === id) setExpanded(null);
        } catch { }
    };

    const startEdit = (todo) => {
        setEditing(todo.id);
        setEditInput({ name: todo.name, task: todo.task });
    };

    const cancelEdit = () => {
        setEditing(null);
        setEditInput({ name: "", task: "" });
    };

    const updateTodo = async (id) => {
        if (!editInput.name.trim() || !editInput.task.trim()) return;
        setSavingEdit(true);
        try {
            const r = await fetch(`${API_BASE}/user/todo/${id}`, {
                method: "PUT", headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ name: editInput.name.trim(), task: editInput.task.trim() }),
            });
            const d = await r.json();
            if (d.status) {
                setTodos(p => p.map(t => t.id === id ? { ...t, name: editInput.name.trim(), task: editInput.task.trim() } : t));
                cancelEdit();
            }
        } catch { }
        finally { setSavingEdit(false); }
    };

    const toggleStar = (id) => setStarred(prev => {
        const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
    });

    const filtered = todos.filter(t => {
        const s = search.toLowerCase();
        return (t.name.toLowerCase().includes(s) || t.task.toLowerCase().includes(s)) &&
            (filter === "all" || (filter === "done" ? t.is_completed : !t.is_completed));
    });

    const counts = { all: todos.length, todo: todos.filter(t => !t.is_completed).length, done: todos.filter(t => t.is_completed).length };
    const pending = counts.todo;

    const Badge = ({ done }) => (
        <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, flexShrink: 0,
            background: done ? "#dcfce7" : "#ede9fe", color: done ? "#16a34a" : "#7c3aed",
        }}>{done ? "Done" : "To Do"}</span>
    );

    /* ══════════ BODY — called as a function, not <Body />, to avoid remount ══════════ */
    const renderBody = () => (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>

            {/* Search */}
            <div style={{ padding: "8px 12px 0" }}>
                <div style={{
                    display: "flex", alignItems: "center", gap: 7,
                    background: "#f5f5f7", borderRadius: 10, padding: "7px 11px",
                }}>
                    <Icon path={Icons.search} size={13} color="#9ca3af" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search tasks..."
                        style={{
                            flex: 1, border: "none", background: "transparent", outline: "none",
                            fontSize: 12, color: "#374151", fontFamily: "inherit",
                        }}
                    />
                </div>
            </div>

            {/* Filter tabs */}
            <div style={{ display: "flex", padding: "6px 12px 0", borderBottom: "1.5px solid #f0f0f0" }}>
                {["all", "todo", "done"].map(tab => {
                    const label = tab === "all" ? "All" : tab === "todo" ? "To Do" : "Done";
                    const active = filter === tab;
                    return (
                        <button key={tab} onClick={() => setFilter(tab)} style={{
                            display: "flex", alignItems: "center", gap: 5,
                            padding: "5px 10px", background: "none", border: "none", cursor: "pointer",
                            fontSize: 11, fontWeight: active ? 700 : 500,
                            color: active ? "#7c3aed" : "#9ca3af",
                            borderBottom: active ? "2px solid #7c3aed" : "2px solid transparent",
                            marginBottom: -1.5, transition: "all .14s",
                        }}>
                            {label}
                            <span style={{
                                fontSize: 10, fontWeight: 700, minWidth: 16, height: 16,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                borderRadius: 8, padding: "0 4px",
                                background: active ? "#ede9fe" : "#f3f4f6",
                                color: active ? "#7c3aed" : "#9ca3af",
                            }}>{counts[tab]}</span>
                        </button>
                    );
                })}
            </div>

            {/* Add form */}
            {showForm && (
                <div style={{ padding: "8px 12px", borderBottom: "1px solid #f0f0f0", display: "flex", flexDirection: "column", gap: 6 }}>
                    {/* ── ref-based focus instead of autoFocus ── */}
                    <input
                        ref={nameInputRef}
                        type="text"
                        value={input.name}
                        onChange={e => setInput(p => ({ ...p, name: e.target.value }))}
                        placeholder="Task title"
                        style={{
                            width: "100%", boxSizing: "border-box", fontSize: 12, padding: "7px 11px",
                            background: "#f9fafb", border: "1.5px solid #e5e7eb", borderRadius: 9,
                            outline: "none", fontFamily: "inherit", color: "#1f2937",
                        }}
                        onFocus={e => e.target.style.borderColor = "#7c3aed"}
                        onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                    />
                    <textarea rows={2} value={input.task}
                        onChange={e => setInput(p => ({ ...p, task: e.target.value }))}
                        onKeyDown={e => e.key === "Enter" && !e.shiftKey && addTodo()}
                        placeholder="Description…"
                        style={{
                            width: "100%", boxSizing: "border-box", fontSize: 12, padding: "7px 11px",
                            background: "#f9fafb", border: "1.5px solid #e5e7eb", borderRadius: 9,
                            outline: "none", fontFamily: "inherit", color: "#1f2937", resize: "none",
                        }}
                        onFocus={e => e.target.style.borderColor = "#7c3aed"}
                        onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                    />
                    <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={addTodo} disabled={adding} style={{
                            flex: 1, padding: "7px 0", background: "#7c3aed", color: "#fff",
                            border: "none", borderRadius: 9, fontSize: 12, fontWeight: 700,
                            cursor: "pointer", opacity: adding ? .6 : 1, fontFamily: "inherit",
                        }}>{adding ? "Adding…" : "Add task"}</button>
                        <button onClick={() => { setShowForm(false); setInput({ name: "", task: "" }); }} style={{
                            flex: 1, padding: "7px 0", background: "#fff", color: "#6b7280",
                            border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: 12,
                            fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                        }}>Cancel</button>
                    </div>
                </div>
            )}

            {/* List */}
            <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px" }}>
                {loading && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 0", gap: 8 }}>
                        <style>{`@keyframes _spin{to{transform:rotate(360deg)}}`}</style>
                        <div style={{
                            width: 18, height: 18, border: "2px solid #ddd8fc", borderTopColor: "#7c3aed",
                            borderRadius: "50%", animation: "_spin .7s linear infinite",
                        }} />
                        <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>Loading…</p>
                    </div>
                )}
                {!loading && filtered.length === 0 && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 0", gap: 6 }}>
                        <div style={{
                            width: 34, height: 34, borderRadius: 11, background: "#ede9fe",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <Icon path={Icons.check} size={16} color="#7c3aed" />
                        </div>
                        <p style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", margin: 0 }}>
                            {search ? "No results" : "No tasks yet"}
                        </p>
                    </div>
                )}
                {filtered.map(todo => {
                    const isExp = expanded === todo.id;
                    const isStar = starred.has(todo.id);
                    return (
                        <div key={todo.id} style={{
                            borderRadius: 10, margin: "3px 0",
                            background: isExp ? "#faf8ff" : "#fff",
                            border: `1.5px solid ${isExp ? "#ddd6fe" : "#f3f4f6"}`,
                            transition: "border-color .18s, background .18s",
                            overflow: "hidden",
                        }}>
                            <div
                                style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", cursor: "pointer" }}
                                onClick={() => setExpanded(isExp ? null : todo.id)}
                            >
                                <button onClick={e => { e.stopPropagation(); toggleTodo(todo); }} style={{
                                    width: 17, height: 17, borderRadius: 5, flexShrink: 0,
                                    border: todo.is_completed ? "none" : "2px solid #d1d5db",
                                    background: todo.is_completed ? "#7c3aed" : "transparent",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    cursor: "pointer", padding: 0, transition: "all .13s",
                                    boxShadow: todo.is_completed ? "0 2px 5px rgba(124,58,237,.28)" : "none",
                                }}>
                                    {todo.is_completed && (
                                        <svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.5} strokeLinecap="round">
                                            <path d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </button>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{
                                        margin: 0, fontSize: 12, fontWeight: 600,
                                        color: todo.is_completed ? "#9ca3af" : "#1f2937",
                                        textDecoration: todo.is_completed ? "line-through" : "none",
                                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                    }}>{todo.name}</p>
                                    {!isExp && (
                                        <p style={{
                                            margin: "1px 0 0", fontSize: 10, color: "#9ca3af",
                                            textDecoration: todo.is_completed ? "line-through" : "none",
                                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                        }}>{todo.task}</p>
                                    )}
                                </div>

                                <Badge done={todo.is_completed} />

                                <button onClick={e => { e.stopPropagation(); toggleStar(todo.id); }} style={{
                                    background: "none", border: "none", cursor: "pointer",
                                    padding: 2, display: "flex", alignItems: "center", borderRadius: 5,
                                }}>
                                    <Icon path={Icons.star} size={13}
                                        color={isStar ? "#f59e0b" : "#d1d5db"}
                                        fill={isStar ? "#f59e0b" : "none"}
                                        strokeWidth={isStar ? 0 : 2}
                                    />
                                </button>

                                {/* Animated chevron */}
                                <div style={{
                                    transition: "transform 0.13s cubic-bezier(0.4,0,0.2,1)",
                                    transform: isExp ? "rotate(180deg)" : "rotate(0deg)",
                                    display: "flex", alignItems: "center",
                                }}>
                                    <Icon path={Icons.chevDown} size={12} color="#a78bfa" />
                                </div>
                            </div>

                            {/* ── Smooth expand panel ── */}
                            <ExpandPanel open={isExp}>
                                <div style={{ padding: "0 10px 9px 10px" }}>
                                    {editing === todo.id ? (
                                        /* ── Edit form ── */
                                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                            <input
                                                value={editInput.name}
                                                onChange={e => setEditInput(p => ({ ...p, name: e.target.value }))}
                                                placeholder="Task title"
                                                style={{
                                                    width: "100%", boxSizing: "border-box", fontSize: 12,
                                                    padding: "7px 10px", background: "#f9fafb",
                                                    border: "1.5px solid #7c3aed", borderRadius: 8,
                                                    outline: "none", fontFamily: "inherit", color: "#1f2937",
                                                }}
                                                onFocus={e => e.target.style.borderColor = "#7c3aed"}
                                                onBlur={e => e.target.style.borderColor = "#ddd6fe"}
                                            />
                                            <textarea
                                                rows={3}
                                                value={editInput.task}
                                                onChange={e => setEditInput(p => ({ ...p, task: e.target.value }))}
                                                onKeyDown={e => e.key === "Enter" && e.ctrlKey && updateTodo(todo.id)}
                                                placeholder="Description…"
                                                style={{
                                                    width: "100%", boxSizing: "border-box", fontSize: 11,
                                                    padding: "7px 10px", background: "#f9fafb",
                                                    border: "1.5px solid #ddd6fe", borderRadius: 8,
                                                    outline: "none", fontFamily: "inherit", color: "#1f2937",
                                                    resize: "vertical", lineHeight: 1.6,
                                                }}
                                                onFocus={e => e.target.style.borderColor = "#7c3aed"}
                                                onBlur={e => e.target.style.borderColor = "#ddd6fe"}
                                            />
                                            <div style={{ display: "flex", gap: 5 }}>
                                                <button
                                                    onClick={e => { e.stopPropagation(); updateTodo(todo.id); }}
                                                    disabled={savingEdit}
                                                    style={{
                                                        flex: 1, padding: "6px 0", background: "#7c3aed", color: "#fff",
                                                        border: "none", borderRadius: 7, fontSize: 11, fontWeight: 700,
                                                        cursor: "pointer", opacity: savingEdit ? .6 : 1, fontFamily: "inherit",
                                                    }}
                                                >{savingEdit ? "Saving…" : "Save"}</button>
                                                <button
                                                    onClick={e => { e.stopPropagation(); cancelEdit(); }}
                                                    style={{
                                                        flex: 1, padding: "6px 0", background: "#fff", color: "#6b7280",
                                                        border: "1.5px solid #e5e7eb", borderRadius: 7, fontSize: 11,
                                                        fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                                                    }}
                                                >Cancel</button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* ── Read view ── */
                                        <>
                                            <div style={{
                                                background: "#fff", border: "1px solid #ede9fe", borderRadius: 8,
                                                padding: "7px 10px", marginBottom: 6,
                                            }}>
                                                <p style={{ margin: 0, fontSize: 11, color: "#4b5563", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                                                    {todo.task}
                                                </p>
                                            </div>
                                            <div style={{ display: "flex", gap: 5 }}>
                                                <button
                                                    onClick={e => { e.stopPropagation(); startEdit(todo); }}
                                                    style={{
                                                        display: "flex", alignItems: "center", gap: 4,
                                                        background: "none", border: "1px solid #ddd6fe", borderRadius: 6,
                                                        color: "#7c3aed", fontSize: 11, fontWeight: 600, cursor: "pointer",
                                                        padding: "4px 9px", fontFamily: "inherit",
                                                    }}
                                                >
                                                    <Icon path={Icons.edit} size={11} color="#7c3aed" />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={e => { e.stopPropagation(); deleteTodo(todo.id); }}
                                                    style={{
                                                        display: "flex", alignItems: "center", gap: 4,
                                                        background: "none", border: "1px solid #fee2e2", borderRadius: 6,
                                                        color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer",
                                                        padding: "4px 9px", fontFamily: "inherit",
                                                    }}
                                                >
                                                    <Icon path={Icons.trash} size={11} color="#ef4444" />
                                                    Delete
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </ExpandPanel>
                        </div>
                    );
                })}
            </div>

            {/* Add new task */}
            <div style={{ padding: "7px 12px 10px", borderTop: "1.5px solid #f5f5f7" }}>
                <button
                    onClick={() => { setShowForm(f => !f); if (minimized) setMin(false); }}
                    style={{
                        display: "flex", alignItems: "center", gap: 5, background: "none",
                        border: "none", cursor: "pointer", color: "#7c3aed",
                        fontSize: 12, fontWeight: 700, padding: 0, fontFamily: "inherit",
                    }}
                >
                    <Icon path={Icons.plus} size={14} color="#7c3aed" strokeWidth={2.5} />
                    Add new task
                </button>
            </div>
        </div>
    );

    /* ══════════ HEADER — also called as a function ══════════ */
    const renderHeader = ({ draggable }) => (
        <div
            onMouseDown={draggable ? onHeaderMouseDown : undefined}
            onMouseUp={draggable ? onHeaderMouseUp : undefined}
            onTouchStart={draggable ? onHeaderTouchStart : undefined}
            style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "9px 11px 8px",
                borderBottom: minimized ? "none" : "1.5px solid #f5f5f7",
                background: "#fff",
                cursor: draggable ? "grab" : "default",
                flexShrink: 0, userSelect: "none",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 7, pointerEvents: "none" }}>
                <div style={{
                    width: 26, height: 26, borderRadius: 7, background: "#7c3aed",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 2px 8px rgba(124,58,237,.28)",
                }}>
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round">
                        <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                    </svg>
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#1f2937", letterSpacing: "-0.2px" }}>
                    Tasks
                </span>
                <span style={{
                    fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 8,
                    background: pending > 0 ? "#ede9fe" : "#f3f4f6",
                    color: pending > 0 ? "#7c3aed" : "#9ca3af",
                }}>{pending}</span>
            </div>

            {!isSheet ? (
                <button
                    onClick={() => { setShowForm(f => !f); if (minimized) setMin(false); }}
                    title="Add task"
                    style={{
                        width: 26, height: 26, borderRadius: 7, border: "none",
                        background: showForm ? "#ede9fe" : "transparent",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#ede9fe"}
                    onMouseLeave={e => e.currentTarget.style.background = showForm ? "#ede9fe" : "transparent"}
                >
                    <Icon path={Icons.plus} size={15} color="#7c3aed" strokeWidth={2.5} />
                </button>
            ) : (
                <button onClick={() => setSheet(false)} style={{
                    width: 26, height: 26, borderRadius: 7, border: "none",
                    background: "transparent", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                    <Icon path={Icons.chevDown} size={14} color="#9ca3af" strokeWidth={2.5} />
                </button>
            )}
        </div>
    );

    /* ── Header event handlers (must be defined before renderHeader is called) ── */
    const onHeaderMouseDown = (e) => {
        if (e.button !== 0) return;
        if (e.target.closest("button")) return;
        e.preventDefault();
        startDrag(e.clientX, e.clientY);
    };
    const onHeaderMouseUp = (e) => {
        if (e.target.closest("button")) return;
        if (!didMove.current) setMin(m => !m);
    };
    const onHeaderTouchStart = (e) => {
        if (e.target.closest("button")) return;
        const t = e.touches[0];
        startDrag(t.clientX, t.clientY);
    };

    /* ══════════ MOBILE SHEET ══════════ */
    if (isSheet) return (
        <>
            {!sheetOpen && (
                <button onClick={() => setSheet(true)} style={{
                    position: "fixed", right: 18, bottom: 22, zIndex: 9999,
                    width: 48, height: 48, background: "#7c3aed", border: "none",
                    borderRadius: 15, boxShadow: "0 6px 18px rgba(124,58,237,.38)",
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                }}>
                    <Icon path={Icons.check} size={20} color="#fff" strokeWidth={2.5} />
                    {pending > 0 && (
                        <span style={{
                            position: "absolute", top: -3, right: -3, width: 15, height: 15,
                            background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 800,
                            borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                            border: "2px solid #fff",
                        }}>{pending > 9 ? "9+" : pending}</span>
                    )}
                </button>
            )}
            {sheetOpen && (
                <div
                    style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,.18)", backdropFilter: "blur(2px)" }}
                    onClick={() => setSheet(false)}
                />
            )}
            <div style={{
                position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 9999,
                transform: sheetOpen ? "translateY(0)" : "translateY(100%)",
                transition: "transform .28s cubic-bezier(.32,.72,0,1)",
                maxHeight: "80vh", borderRadius: "18px 18px 0 0",
                background: "#fff", display: "flex", flexDirection: "column",
                boxShadow: "0 -6px 28px rgba(0,0,0,.1)",
            }}>
                <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 3px" }}>
                    <div style={{ width: 34, height: 3.5, background: "#e5e7eb", borderRadius: 4 }} />
                </div>
                {renderHeader({ draggable: false })}
                {renderBody()}
            </div>
        </>
    );

    /* ══════════ DESKTOP WIDGET ══════════ */
    // Use a fixed pixel height for minimized so CSS transition works
    // (CSS can't transition to/from "auto")
    const HEADER_H = 44;
    const targetH = minimized ? HEADER_H : sizeRef.current.h;
    const targetW = minimized ? 230 : sizeRef.current.w;

    return (
        <div ref={boxRef} style={{
            position: "fixed",
            left: posRef.current.x,
            top: posRef.current.y,
            width: targetW,
            height: targetH,
            zIndex: 9999,
            userSelect: "none",
            display: "flex", flexDirection: "column",
            background: "#fff",
            border: "1.5px solid #e8e4fd",
            borderRadius: 14,
            boxShadow: "0 6px 28px rgba(124,58,237,.09), 0 1.5px 5px rgba(0,0,0,.05)",
            overflow: "hidden",
            // Animate height/width on minimize toggle; skip during drag/resize
            transition: resize.current.active || drag.current.active
                ? "none"
                : "height 0.26s cubic-bezier(0.4,0,0.2,1), width 0.22s cubic-bezier(0.4,0,0.2,1)",
        }}>
            {renderHeader({ draggable: true })}

            {/* Body always stays in DOM — container height clips it during minimize */}
            <div style={{
                display: "flex", flexDirection: "column", flex: 1, minHeight: 0,
                opacity: minimized ? 0 : 1,
                transition: minimized
                    ? "opacity 0.1s ease"          // fade out fast
                    : "opacity 0.18s ease 0.1s",   // fade in after box opens
                pointerEvents: minimized ? "none" : "auto",
            }}>
                {renderBody()}
            </div>

            {/* Resize handle */}
            {!minimized && (
                <div
                    onMouseDown={e => { e.preventDefault(); e.stopPropagation(); startResize(e.clientX, e.clientY); }}
                    onTouchStart={e => { e.stopPropagation(); const t = e.touches[0]; startResize(t.clientX, t.clientY); }}
                    style={{
                        position: "absolute", right: 0, bottom: 0,
                        width: 18, height: 18, cursor: "se-resize",
                        display: "flex", alignItems: "flex-end", justifyContent: "flex-end",
                        padding: 4,
                    }}
                >
                    <svg width={9} height={9} viewBox="0 0 9 9">
                        <circle cx={7.5} cy={7.5} r={1.1} fill="#c4b5fd" />
                        <circle cx={4.5} cy={7.5} r={1.1} fill="#c4b5fd" />
                        <circle cx={7.5} cy={4.5} r={1.1} fill="#c4b5fd" />
                    </svg>
                </div>
            )}
        </div>
    );
}