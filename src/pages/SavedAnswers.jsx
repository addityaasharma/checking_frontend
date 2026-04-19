import React, { useState, useEffect, useCallback } from "react";

const API = "/v1/user/saved"; // adjust to your actual route prefix

// ── Spinner ────────────────────────────────────────────────────────────────
const Spinner = ({ size = 16, color = "text-violet-600" }) => (
  <svg className={`animate-spin ${color}`} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

// ── Modal ──────────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, onSave, saving, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
      <div className="flex gap-2 mt-5">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving && <Spinner size={14} color="text-white" />}
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={onClose}
          disabled={saving}
          className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
);

// ── Detail Drawer ──────────────────────────────────────────────────────────
const DetailDrawer = ({ answer, onClose, onEdit, onDelete, deleting }) => (
  <div className="fixed inset-0 z-40 flex justify-end bg-black/20" onClick={onClose}>
    <div
      className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 truncate pr-4">{answer.name}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition shrink-0">
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{answer.answer}</p>
      </div>

      <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="flex-1 py-2.5 border border-red-200 text-red-500 hover:bg-red-50 text-sm font-medium rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {deleting ? <Spinner size={14} color="text-red-400" /> : null}
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────
const SavedAnswers = () => {
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);   // answer object being edited
  const [viewItem, setViewItem] = useState(null);   // answer object in drawer

  const [formName, setFormName] = useState("");
  const [formAnswer, setFormAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);   // id being deleted

  // ── Fetch all ────────────────────────────────────────────────────────────
  const fetchAnswers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API, { credentials: "include" });
      const d = await res.json();
      if (d.status) setAnswers(d.data);
      else setError(d.message);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnswers(); }, [fetchAnswers]);

  // ── Create ────────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!formName.trim() || !formAnswer.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: formName.trim(), answer: formAnswer.trim() }),
      });
      const d = await res.json();
      if (d.status) {
        setShowAdd(false);
        resetForm();
        await fetchAnswers();
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Update ────────────────────────────────────────────────────────────────
  const handleEdit = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/${editItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: formName.trim(), answer: formAnswer.trim() }),
      });
      const d = await res.json();
      if (d.status) {
        setEditItem(null);
        setViewItem(null);
        resetForm();
        await fetchAnswers();
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this saved answer?")) return;
    setDeleting(id);
    try {
      await fetch(`${API}/${id}`, { method: "DELETE", credentials: "include" });
      setViewItem(null);
      setAnswers(prev => prev.filter(a => a.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  const resetForm = () => { setFormName(""); setFormAnswer(""); };

  const openEdit = (item) => {
    setEditItem(item);
    setFormName(item.name);
    setFormAnswer(item.answer);
  };

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = answers.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.answer.toLowerCase().includes(search.toLowerCase())
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Saved Answers</h2>
          <p className="text-xs text-gray-400 mt-0.5">{answers.length} saved</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAdd(true); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium rounded-xl transition"
        >
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Answer
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search answers…"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-800 placeholder-gray-400 bg-white"
        />
      </div>

      {/* States */}
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Spinner size={24} />
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center py-16">
          <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="text-gray-300">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v14a2 2 0 01-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          <p className="text-sm text-gray-400">{search ? "No results found." : "No saved answers yet."}</p>
        </div>
      )}

      {/* List */}
      {!loading && !error && filtered.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
          {filtered.map(item => (
            <div
              key={item.id}
              onClick={() => setViewItem(item)}
              className="group bg-white border border-gray-100 rounded-2xl px-4 py-3.5 cursor-pointer hover:shadow-sm hover:border-violet-100 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{item.answer}</p>
                </div>
                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition mt-0.5">
                  <button
                    onClick={e => { e.stopPropagation(); openEdit(item); }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-violet-50 hover:text-violet-600 transition"
                  >
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(item.id); }}
                    disabled={deleting === item.id}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
                  >
                    {deleting === item.id
                      ? <Spinner size={13} color="text-red-400" />
                      : <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                      </svg>
                    }
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-300 mt-2">
                {item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : ""}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Modal ── */}
      {showAdd && (
        <Modal title="Save New Answer" onClose={() => setShowAdd(false)} onSave={handleAdd} saving={saving}>
          <div className="space-y-3">
            <input
              autoFocus
              type="text"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="Title / name"
              className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-800 placeholder-gray-400"
            />
            <textarea
              value={formAnswer}
              onChange={e => setFormAnswer(e.target.value)}
              placeholder="Answer content…"
              rows={6}
              className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-800 placeholder-gray-400 resize-none"
            />
          </div>
        </Modal>
      )}

      {/* ── Edit Modal ── */}
      {editItem && (
        <Modal title="Edit Answer" onClose={() => { setEditItem(null); resetForm(); }} onSave={handleEdit} saving={saving}>
          <div className="space-y-3">
            <input
              autoFocus
              type="text"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="Title / name"
              className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-800 placeholder-gray-400"
            />
            <textarea
              value={formAnswer}
              onChange={e => setFormAnswer(e.target.value)}
              placeholder="Answer content…"
              rows={6}
              className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-800 placeholder-gray-400 resize-none"
            />
          </div>
        </Modal>
      )}

      {/* ── Detail Drawer ── */}
      {viewItem && (
        <DetailDrawer
          answer={viewItem}
          onClose={() => setViewItem(null)}
          onEdit={() => { openEdit(viewItem); setViewItem(null); }}
          onDelete={() => handleDelete(viewItem.id)}
          deleting={deleting === viewItem.id}
        />
      )}
    </div>
  );
};

export default SavedAnswers;