import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API = "/v1/user/saved";

// ── Accent palette — richer tones for white bg ────────────────────────────
const ACCENTS = [
  { bar: "#d97706", bg: "rgba(217,119,6,0.06)",   text: "#d97706" },  // amber
  { bar: "#059669", bg: "rgba(5,150,105,0.06)",    text: "#059669" },  // emerald
  { bar: "#e11d48", bg: "rgba(225,29,72,0.05)",    text: "#e11d48" },  // rose
  { bar: "#0284c7", bg: "rgba(2,132,199,0.06)",    text: "#0284c7" },  // sky
  { bar: "#7c3aed", bg: "rgba(124,58,237,0.06)",   text: "#7c3aed" },  // violet
];
const accent = (i) => ACCENTS[i % ACCENTS.length];

const fmtDate = (s) => {
  if (!s) return "";
  return new Date(s).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};
const wordCount = (s = "") => s.trim().split(/\s+/).filter(Boolean).length;

// ── Spinner ────────────────────────────────────────────────────────────────
const Spinner = ({ size = 18 }) => (
  <svg style={{ animation: "sa-spin 0.8s linear infinite" }} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle opacity={0.2} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
    <path opacity={0.9} fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

// ── Global styles ──────────────────────────────────────────────────────────
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=JetBrains+Mono:wght@400;500&family=DM+Sans:wght@400;500&display=swap');

@keyframes sa-spin    { to { transform: rotate(360deg); } }
@keyframes sa-fadeUp  { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
@keyframes sa-slideIn { from { opacity:0; transform:translateX(28px); } to { opacity:1; transform:translateX(0); } }
@keyframes sa-overlayIn { from { opacity:0; } to { opacity:1; } }

.sa-card    { animation: sa-fadeUp  0.32s ease both; }
.sa-drawer  { animation: sa-slideIn 0.28s cubic-bezier(.22,1,.36,1) both; }
.sa-overlay { animation: sa-overlayIn 0.18s ease both; }
.sa-input:focus { outline: none; }
.sa-scrollbar::-webkit-scrollbar       { width: 4px; }
.sa-scrollbar::-webkit-scrollbar-track { background: transparent; }
.sa-scrollbar::-webkit-scrollbar-thumb { background: #d0d0d8; border-radius: 4px; }
.sa-action-btn:hover { background: #f4f4f6 !important; }
`;

function injectStyles() {
  if (document.getElementById("sa-styles")) return;
  const el = document.createElement("style");
  el.id = "sa-styles";
  el.textContent = STYLES;
  document.head.appendChild(el);
}

// ── Modal ──────────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, onSave, saving, children }) => (
  <div className="sa-overlay" style={{
    position: "fixed", inset: 0, zIndex: 60,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(0,0,0,0.35)", padding: "16px",
  }}>
    <div style={{
      background: "#fff", border: "1px solid #e8e8ec",
      borderRadius: "18px", width: "100%", maxWidth: "520px",
      padding: "28px", boxShadow: "0 24px 60px rgba(0,0,0,0.12)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "17px", color: "#1a1a1c", fontWeight: 500 }}>
          {title}
        </span>
        <button onClick={onClose} disabled={saving} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "#bbb", padding: "4px", lineHeight: 0,
        }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {children}

      <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
        <button onClick={onSave} disabled={saving} style={{
          flex: 1, padding: "11px", background: "#1a1a1c", color: "#fff",
          border: "none", borderRadius: "10px", cursor: saving ? "not-allowed" : "pointer",
          fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: "13px",
          opacity: saving ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
        }}>
          {saving && <Spinner size={13} />}
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={onClose} disabled={saving} style={{
          flex: 1, padding: "11px", background: "transparent", color: "#888",
          border: "1px solid #e4e4e8", borderRadius: "10px", cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: "13px",
        }}>
          Cancel
        </button>
      </div>
    </div>
  </div>
);

// ── Detail Drawer ──────────────────────────────────────────────────────────
const DetailDrawer = ({ answer, accentIdx, onClose, onEdit, onDelete, deleting }) => {
  const ac = accent(accentIdx);
  return (
    <div className="sa-overlay" onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: "rgba(0,0,0,0.3)", display: "flex", justifyContent: "flex-end",
    }}>
      <div className="sa-drawer sa-scrollbar" onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: "460px", height: "100%",
        background: "#fff", display: "flex", flexDirection: "column",
        borderLeft: "1px solid #e8e8ec", overflowY: "auto",
        boxShadow: "-12px 0 40px rgba(0,0,0,0.08)",
      }}>
        {/* Accent top bar */}
        <div style={{ height: "3px", background: ac.bar, flexShrink: 0 }} />

        {/* Header */}
        <div style={{
          padding: "24px 28px 20px", borderBottom: "1px solid #f0f0f2",
          display: "flex", gap: "16px", alignItems: "flex-start", flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontFamily: "'Playfair Display', serif", fontSize: "20px",
              color: "#1a1a1c", fontWeight: 500, lineHeight: 1.3, wordBreak: "break-word",
            }}>{answer.name}</p>
            <div style={{ display: "flex", gap: "16px", marginTop: "8px", alignItems: "center" }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#bbb", letterSpacing: "0.08em" }}>
                {fmtDate(answer.created_at)}
              </span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#bbb" }}>
                {wordCount(answer.answer)} words
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#ccc", padding: "2px", lineHeight: 0, flexShrink: 0,
          }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="sa-scrollbar" style={{ flex: 1, padding: "24px 28px", overflowY: "auto" }}>
          <p style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: "14px",
            color: "#555", lineHeight: 1.85, whiteSpace: "pre-wrap",
          }}>{answer.answer}</p>
        </div>

        {/* Actions */}
        <div style={{
          padding: "20px 28px", borderTop: "1px solid #f0f0f2",
          display: "flex", gap: "10px", flexShrink: 0,
        }}>
          <button onClick={onEdit} style={{
            flex: 1, padding: "11px",
            background: ac.bar, color: "#fff",
            border: "none", borderRadius: "10px", cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: "13px",
          }}>
            Edit
          </button>
          <button onClick={onDelete} disabled={deleting} style={{
            flex: 1, padding: "11px",
            background: "transparent", color: "#ef4444",
            border: "1px solid #fde8e8", borderRadius: "10px",
            cursor: deleting ? "not-allowed" : "pointer",
            fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: "13px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            opacity: deleting ? 0.6 : 1,
          }}>
            {deleting && <Spinner size={13} />}
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Answer Card ────────────────────────────────────────────────────────────
const AnswerCard = ({ item, index, onClick, onEdit, onDelete, deleting }) => {
  const [hovered, setHovered] = useState(false);
  const ac = accent(index);

  return (
    <div className="sa-card" style={{ animationDelay: `${Math.min(index * 0.05, 0.3)}s` }}>
      <div
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: "relative", cursor: "pointer", overflow: "hidden",
          background: hovered ? ac.bg : "#fff",
          border: `1px solid ${hovered ? ac.bar + "44" : "#eaeaee"}`,
          borderLeft: `3px solid ${hovered ? ac.bar : "#e0e0e6"}`,
          borderRadius: "12px", padding: "20px 20px 16px",
          transition: "all 0.18s ease",
          boxShadow: hovered ? "0 4px 20px rgba(0,0,0,0.06)" : "0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        {/* Ghost index */}
        <span style={{
          position: "absolute", top: "-6px", right: "14px",
          fontFamily: "'Playfair Display', serif",
          fontSize: "64px", fontWeight: 700, lineHeight: 1,
          color: ac.bar, opacity: hovered ? 0.1 : 0.05,
          userSelect: "none", pointerEvents: "none", transition: "opacity 0.18s",
        }}>
          {String(index + 1).padStart(2, "0")}
        </span>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontFamily: "'Playfair Display', serif", fontSize: "15px",
              color: "#1a1a1c", fontWeight: 500,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              marginBottom: "6px",
            }}>{item.name}</p>
            <p style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: "12px",
              color: "#999", lineHeight: 1.6,
              display: "-webkit-box", WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>{item.answer}</p>
          </div>

          {/* Action buttons */}
          <div style={{
            display: "flex", gap: "4px", flexShrink: 0,
            opacity: hovered ? 1 : 0, transition: "opacity 0.15s",
          }}>
            <button className="sa-action-btn" onClick={e => { e.stopPropagation(); onEdit(); }}
              style={{
                width: "28px", height: "28px", borderRadius: "8px",
                border: "1px solid #eaeaee", background: "#fff",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                color: "#aaa", transition: "background 0.15s",
              }}>
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button className="sa-action-btn" onClick={e => { e.stopPropagation(); onDelete(); }}
              disabled={deleting}
              style={{
                width: "28px", height: "28px", borderRadius: "8px",
                border: "1px solid #eaeaee", background: "#fff",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                color: "#ef4444", transition: "background 0.15s",
              }}>
              {deleting
                ? <Spinner size={12} />
                : <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                  </svg>
              }
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "14px" }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#ccc", letterSpacing: "0.04em" }}>
            {fmtDate(item.created_at)}
          </span>
          <span style={{ width: "3px", height: "3px", borderRadius: "50%", background: "#ddd", flexShrink: 0 }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#ccc" }}>
            {wordCount(item.answer)}w
          </span>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────
const SavedAnswers = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => { injectStyles(); }, []);

  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [viewIdx, setViewIdx] = useState(0);

  const [formName, setFormName] = useState("");
  const [formAnswer, setFormAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);

  const fetchAnswers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API, { credentials: "include" });
      const d = await res.json();
      if (d.status) setAnswers(d.data);
      else setError(d.message);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAnswers(); }, [fetchAnswers]);

  // Deep link /saved/:id
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`${API}/${id}`, { credentials: "include" });
        const d = await res.json();
        if (d.status) { setViewItem(d.data); setViewIdx(0); }
      } catch {}
    })();
  }, [id]);

  const handleCloseDrawer = () => {
    setViewItem(null);
    if (id) navigate("/saved", { replace: true });
  };

  const handleAdd = async () => {
    if (!formName.trim() || !formAnswer.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(API, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ name: formName.trim(), answer: formAnswer.trim() }),
      });
      const d = await res.json();
      if (d.status) { setShowAdd(false); resetForm(); await fetchAnswers(); }
    } finally { setSaving(false); }
  };

  const handleEdit = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/${editItem.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ name: formName.trim(), answer: formAnswer.trim() }),
      });
      const d = await res.json();
      if (d.status) { setEditItem(null); setViewItem(null); resetForm(); await fetchAnswers(); }
    } finally { setSaving(false); }
  };

  const handleDelete = async (answerId) => {
    if (!window.confirm("Delete this saved answer?")) return;
    setDeleting(answerId);
    try {
      await fetch(`${API}/${answerId}`, { method: "DELETE", credentials: "include" });
      setViewItem(null);
      setAnswers(prev => prev.filter(a => a.id !== answerId));
      if (id) navigate("/saved", { replace: true });
    } finally { setDeleting(null); }
  };

  const resetForm = () => { setFormName(""); setFormAnswer(""); };
  const openEdit = (item) => { setEditItem(item); setFormName(item.name); setFormAnswer(item.answer); };

  const filtered = answers.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.answer.toLowerCase().includes(search.toLowerCase())
  );

  // Shared input style
  const inputStyle = {
    width: "100%", boxSizing: "border-box", padding: "10px 14px",
    background: "#f8f8fa", border: "1px solid #e8e8ec", borderRadius: "10px",
    color: "#1a1a1c", fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
  };

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      background: "#fff", color: "#1a1a1c",
      fontFamily: "'DM Sans', sans-serif",
    }}>

      {/* ── Header ── */}
      <div style={{ paddingBottom: "24px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "16px" }}>
          <div>
            <p style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: "10px",
              color: "#ccc", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "4px",
            }}>Archive</p>
            <h1 style={{
              fontFamily: "'Playfair Display', serif", fontSize: "26px",
              fontWeight: 700, color: "#1a1a1c", margin: 0, lineHeight: 1.1,
            }}>Saved Answers</h1>
            <p style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: "11px",
              color: "#ccc", marginTop: "4px",
            }}>{answers.length} {answers.length === 1 ? "entry" : "entries"}</p>
          </div>
          <button onClick={() => { resetForm(); setShowAdd(true); }}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "10px 18px", background: "#1a1a1c", color: "#fff",
              border: "none", borderRadius: "10px", cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: "13px",
              flexShrink: 0, whiteSpace: "nowrap",
            }}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Entry
          </button>
        </div>
        <div style={{ marginTop: "20px", height: "1px", background: "linear-gradient(90deg, #e8e8ec 0%, transparent 100%)" }} />
      </div>

      {/* ── Search ── */}
      <div style={{ position: "relative", marginBottom: "20px", flexShrink: 0 }}>
        <svg style={{
          position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)",
          color: searchFocused ? "#aaa" : "#ccc", pointerEvents: "none", transition: "color 0.2s",
        }} width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          className="sa-input"
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Search entries…"
          style={{
            width: "100%", boxSizing: "border-box",
            paddingLeft: "38px", paddingRight: "16px", paddingTop: "10px", paddingBottom: "10px",
            background: "#f8f8fa",
            border: `1px solid ${searchFocused ? "#c8c8d0" : "#eaeaee"}`,
            borderRadius: "10px", color: "#1a1a1c",
            fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
            transition: "border-color 0.2s",
          }}
        />
      </div>

      {/* ── States ── */}
      {loading && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
          <Spinner size={24} />
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#ccc" }}>Loading archive…</p>
        </div>
      )}
      {!loading && error && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ fontSize: "13px", color: "#ef4444" }}>{error}</p>
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px" }}>
          <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" style={{ color: "#e0e0e6" }}>
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
          </svg>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "15px", color: "#ccc", fontStyle: "italic" }}>
            {search ? "No entries found." : "Nothing saved yet."}
          </p>
        </div>
      )}

      {/* ── Grid ── */}
      {!loading && !error && filtered.length > 0 && (
        <div className="sa-scrollbar" style={{
          flex: 1, overflowY: "auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "10px", alignContent: "start", paddingRight: "4px",
        }}>
          {filtered.map((item, i) => (
            <AnswerCard
              key={item.id} item={item} index={i}
              onClick={() => { setViewItem(item); setViewIdx(i); }}
              onEdit={() => openEdit(item)}
              onDelete={() => handleDelete(item.id)}
              deleting={deleting === item.id}
            />
          ))}
        </div>
      )}

      {/* ── Add Modal ── */}
      {showAdd && (
        <Modal title="New Entry" onClose={() => setShowAdd(false)} onSave={handleAdd} saving={saving}>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input className="sa-input" autoFocus type="text" value={formName}
              onChange={e => setFormName(e.target.value)} placeholder="Title"
              style={{ ...inputStyle, fontFamily: "'Playfair Display', serif", fontSize: "14px" }} />
            <textarea className="sa-input" value={formAnswer}
              onChange={e => setFormAnswer(e.target.value)}
              placeholder="Answer content…" rows={7}
              style={{ ...inputStyle, color: "#555", lineHeight: 1.7, resize: "none" }} />
          </div>
        </Modal>
      )}

      {/* ── Edit Modal ── */}
      {editItem && (
        <Modal title="Edit Entry" onClose={() => { setEditItem(null); resetForm(); }} onSave={handleEdit} saving={saving}>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input className="sa-input" autoFocus type="text" value={formName}
              onChange={e => setFormName(e.target.value)} placeholder="Title"
              style={{ ...inputStyle, fontFamily: "'Playfair Display', serif", fontSize: "14px" }} />
            <textarea className="sa-input" value={formAnswer}
              onChange={e => setFormAnswer(e.target.value)}
              placeholder="Answer content…" rows={7}
              style={{ ...inputStyle, color: "#555", lineHeight: 1.7, resize: "none" }} />
          </div>
        </Modal>
      )}

      {/* ── Detail Drawer ── */}
      {viewItem && (
        <DetailDrawer
          answer={viewItem} accentIdx={viewIdx}
          onClose={handleCloseDrawer}
          onEdit={() => { openEdit(viewItem); setViewItem(null); }}
          onDelete={() => handleDelete(viewItem.id)}
          deleting={deleting === viewItem.id}
        />
      )}
    </div>
  );
};

export default SavedAnswers;