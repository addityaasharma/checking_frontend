import React, { useState, useEffect, useCallback } from "react";

const API = "/v1/user/timetable";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DEFAULT_SLOTS = [
  "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM",
  "4:00 PM", "5:00 PM", "6:00 PM",
];

const COLORS = [
  "bg-violet-50 text-violet-700 border-violet-200",
  "bg-blue-50 text-blue-700 border-blue-200",
  "bg-green-50 text-green-700 border-green-200",
  "bg-amber-50 text-amber-700 border-amber-200",
  "bg-pink-50 text-pink-700 border-pink-200",
  "bg-teal-50 text-teal-700 border-teal-200",
  "bg-orange-50 text-orange-700 border-orange-200",
];

// auto assign color per subject name
const subjectColor = (name) => {
  if (!name) return "";
  let hash = 0;
  for (let c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
};

// ── Spinner ────────────────────────────────────────────────────────────────
const Spinner = ({ size = 16, color = "text-violet-600" }) => (
  <svg className={`animate-spin ${color}`} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

// ── Modal ──────────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, onSave, saving, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
    <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm mx-4 p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
      <div className="flex gap-2 mt-4">
        <button onClick={onSave} disabled={saving}
          className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-60 flex items-center justify-center gap-2">
          {saving && <Spinner size={14} color="text-white" />}
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={onClose} disabled={saving}
          className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition disabled:opacity-50">
          Cancel
        </button>
      </div>
    </div>
  </div>
);

// ── Cell editor popup ──────────────────────────────────────────────────────
const CellEditor = ({ value, onSave, onClose }) => {
  const [val, setVal] = useState(value || "");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div className="bg-white rounded-2xl shadow-lg w-72 p-5">
        <p className="text-sm font-semibold text-gray-800 mb-3">Set Subject</p>
        <input
          autoFocus
          type="text"
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") onSave(val); if (e.key === "Escape") onClose(); }}
          placeholder="e.g. Mathematics"
          className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-800 placeholder-gray-400"
        />
        <div className="flex gap-2 mt-3">
          <button onClick={() => onSave(val)}
            className="flex-1 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition">
            Set
          </button>
          <button onClick={() => onSave("")}
            className="py-2 px-3 border border-gray-200 text-gray-500 text-sm rounded-xl hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition">
            Clear
          </button>
          <button onClick={onClose}
            className="py-2 px-3 border border-gray-200 text-gray-500 text-sm rounded-xl hover:bg-gray-50 transition">
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

const Timetable = () => {
  const [timetables, setTimetables] = useState([]);
  const [active, setActive] = useState(null);       // active timetable object
  const [grid, setGrid] = useState({});             // local editable grid
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");

  // modals
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [editCell, setEditCell] = useState(null);   // { slot, day }
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [newSlot, setNewSlot] = useState("");
  const [renamingId, setRenamingId] = useState(null);
  const [renameTitle, setRenameTitle] = useState("");

  // ── Fetch ──────────────────────────────────────────────────────────
  const fetchTimetables = useCallback(async () => {
    try {
      const res = await fetch(API, { credentials: "include" });
      const d = await res.json();
      if (d.status) {
        setTimetables(d.data);
        if (d.data.length > 0 && !active) {
          setActive(d.data[0]);
          setGrid(d.data[0].grid || {});
        }
      } else setError(d.message);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTimetables(); }, [fetchTimetables]);

  const selectTimetable = (tt) => {
    setActive(tt);
    setGrid(tt.grid || {});
    setDirty(false);
  };

  // ── Create ─────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    const defaultGrid = {};
    DEFAULT_SLOTS.forEach(slot => {
      defaultGrid[slot] = {};
      DAYS.forEach(day => { defaultGrid[slot][day] = ""; });
    });
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: newTitle.trim(), grid: defaultGrid }),
      });
      const d = await res.json();
      if (d.status) {
        setNewTitle("");
        setShowCreate(false);
        const res2 = await fetch(API, { credentials: "include" });
        const d2 = await res2.json();
        if (d2.status) {
          setTimetables(d2.data);
          const newest = d2.data[0];
          setActive(newest);
          setGrid(newest.grid || {});
        }
      }
    } finally { setSaving(false); }
  };

  // ── Save grid ──────────────────────────────────────────────────────
  const saveGrid = async () => {
    if (!active) return;
    setSaving(true);
    try {
      await fetch(`${API}/${active.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: active.title, grid }),
      });
      setDirty(false);
      const res = await fetch(API, { credentials: "include" });
      const d = await res.json();
      if (d.status) {
        setTimetables(d.data);
        const updated = d.data.find(t => t.id === active.id);
        if (updated) setActive(updated);
      }
    } finally { setSaving(false); }
  };

  // ── Rename ─────────────────────────────────────────────────────────
  const handleRename = async () => {
    if (!renameTitle.trim() || !renamingId) return;
    setSaving(true);
    try {
      const tt = timetables.find(t => t.id === renamingId);
      await fetch(`${API}/${renamingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: renameTitle.trim(), grid: tt.grid }),
      });
      setRenamingId(null);
      const res = await fetch(API, { credentials: "include" });
      const d = await res.json();
      if (d.status) {
        setTimetables(d.data);
        if (active?.id === renamingId)
          setActive(d.data.find(t => t.id === renamingId) || d.data[0]);
      }
    } finally { setSaving(false); }
  };

  // ── Delete ─────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this timetable?")) return;
    setDeleting(id);
    try {
      await fetch(`${API}/${id}`, { method: "DELETE", credentials: "include" });
      const remaining = timetables.filter(t => t.id !== id);
      setTimetables(remaining);
      if (active?.id === id) {
        const next = remaining[0] || null;
        setActive(next);
        setGrid(next?.grid || {});
      }
    } finally { setDeleting(null); }
  };

  // ── Cell edit ──────────────────────────────────────────────────────
  const handleCellSave = (val) => {
    const { slot, day } = editCell;
    const updated = {
      ...grid,
      [slot]: { ...(grid[slot] || {}), [day]: val },
    };
    setGrid(updated);
    setDirty(true);
    setEditCell(null);
  };

  // ── Add time slot ──────────────────────────────────────────────────
  const handleAddSlot = () => {
    if (!newSlot.trim() || grid[newSlot.trim()]) return;
    const updated = { ...grid, [newSlot.trim()]: {} };
    DAYS.forEach(d => { updated[newSlot.trim()][d] = ""; });
    setGrid(updated);
    setDirty(true);
    setNewSlot("");
    setShowAddSlot(false);
  };

  // ── Remove slot ────────────────────────────────────────────────────
  const removeSlot = (slot) => {
    const updated = { ...grid };
    delete updated[slot];
    setGrid(updated);
    setDirty(true);
  };

  const slots = Object.keys(grid);

  // ── Loading ────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Spinner size={28} />
      <p className="text-sm text-gray-400">Loading timetables...</p>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-sm text-red-400">{error}</p>
    </div>
  );

  return (
    <div className="flex gap-5 h-full min-h-0">

      {/* ── Sidebar: timetable list ── */}
      <div className="w-52 shrink-0 flex flex-col gap-2">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-gray-700">Timetables</h2>
          <button onClick={() => { setNewTitle(""); setShowCreate(true); }}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-violet-50 hover:text-violet-600 transition">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        </div>

        {timetables.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-8">No timetables yet.</p>
        )}

        {timetables.map(tt => (
          <div key={tt.id}
            onClick={() => selectTimetable(tt)}
            className={`group relative cursor-pointer px-3 py-3 rounded-xl border transition
                            ${active?.id === tt.id ? "bg-violet-50 border-violet-200" : "bg-white border-gray-100 hover:border-violet-100"}
                            ${deleting === tt.id ? "opacity-50 pointer-events-none" : ""}`}
          >
            <div className="flex items-center justify-between gap-1">
              <p className={`text-sm font-medium truncate ${active?.id === tt.id ? "text-violet-700" : "text-gray-800"}`}>
                {tt.title}
              </p>
              {deleting === tt.id && <Spinner size={12} color="text-red-400" />}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {Object.keys(tt.grid || {}).length} slots
            </p>
            <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
              <button onClick={e => { e.stopPropagation(); setRenamingId(tt.id); setRenameTitle(tt.title); }}
                className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-violet-600 hover:bg-white transition">
                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              </button>
              <button onClick={e => { e.stopPropagation(); handleDelete(tt.id); }}
                className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-white transition">
                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Grid area ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-3">
        {!active ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-400">Create a timetable to get started.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{active.title}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{slots.length} time slots · click any cell to edit</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowAddSlot(true)}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 text-xs font-medium rounded-xl hover:bg-gray-50 transition">
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                  Add Slot
                </button>
                <button onClick={saveGrid} disabled={saving || !dirty}
                  className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-medium rounded-xl transition">
                  {saving ? <Spinner size={12} color="text-white" /> : (
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8" /></svg>
                  )}
                  {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
                </button>
              </div>
            </div>

            {/* Unsaved banner */}
            {dirty && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium">
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                You have unsaved changes
              </div>
            )}

            {/* Grid */}
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-white w-24 text-left px-3 py-2.5 text-xs font-semibold text-gray-400 border-b border-gray-100">Time</th>
                    {DAYS.map(day => (
                      <th key={day} className="px-3 py-2.5 text-xs font-semibold text-gray-600 border-b border-gray-100 text-center min-w-25">
                        {day}
                      </th>
                    ))}
                    <th className="w-8 border-b border-gray-100" />
                  </tr>
                </thead>
                <tbody>
                  {slots.length === 0 && (
                    <tr>
                      <td colSpan={DAYS.length + 2} className="text-center py-12 text-sm text-gray-400">
                        No time slots yet. Click "Add Slot" to begin.
                      </td>
                    </tr>
                  )}
                  {slots.map((slot, i) => (
                    <tr key={slot} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                      <td className="sticky left-0 z-10 bg-inherit px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap border-b border-gray-50">
                        {slot}
                      </td>
                      {DAYS.map(day => {
                        const val = grid[slot]?.[day] || "";
                        return (
                          <td key={day} className="px-1.5 py-1.5 border-b border-gray-50 text-center">
                            <button
                              onClick={() => setEditCell({ slot, day })}
                              className={`w-full min-h-9 px-2 py-1.5 rounded-lg text-xs font-medium border transition hover:shadow-sm
                                                                ${val
                                  ? `${subjectColor(val)}`
                                  : "border-dashed border-gray-200 text-gray-300 hover:border-violet-300 hover:text-violet-400 bg-transparent"
                                }`}
                            >
                              {val || "+"}
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-1 py-1.5 border-b border-gray-50">
                        <button onClick={() => removeSlot(slot)}
                          className="w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-red-400 hover:bg-red-50 transition">
                          <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── Create modal ── */}
      {showCreate && (
        <Modal title="New Timetable" onClose={() => setShowCreate(false)} onSave={handleCreate} saving={saving}>
          <input autoFocus type="text" value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            placeholder="e.g. Class 11 Schedule"
            className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-800 placeholder-gray-400"
          />
        </Modal>
      )}

      {/* ── Rename modal ── */}
      {renamingId && (
        <Modal title="Rename Timetable" onClose={() => setRenamingId(null)} onSave={handleRename} saving={saving}>
          <input autoFocus type="text" value={renameTitle}
            onChange={e => setRenameTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleRename()}
            className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-800"
          />
        </Modal>
      )}

      {/* ── Add slot modal ── */}
      {showAddSlot && (
        <Modal title="Add Time Slot" onClose={() => setShowAddSlot(false)} onSave={handleAddSlot} saving={false}>
          <div className="space-y-2">
            <input autoFocus type="text" value={newSlot}
              onChange={e => setNewSlot(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddSlot()}
              placeholder="e.g. 7:00 AM"
              className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-800 placeholder-gray-400"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {DEFAULT_SLOTS.filter(s => !grid[s]).map(s => (
                <button key={s} onClick={() => setNewSlot(s)}
                  className="text-xs px-2 py-1 bg-gray-50 text-gray-500 rounded-lg hover:bg-violet-50 hover:text-violet-600 transition border border-gray-100">
                  {s}
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* ── Cell editor ── */}
      {editCell && (
        <CellEditor
          value={grid[editCell.slot]?.[editCell.day] || ""}
          onSave={handleCellSave}
          onClose={() => setEditCell(null)}
        />
      )}
    </div>
  );
};

export default Timetable;