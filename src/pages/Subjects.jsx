import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const API = "/v1/user/subjectwisetopics";
const ANSWERS_API = "/v1/user/savedanswer"; // GET titles list
const ATTACH_API = "/v1/user/saved-attachment"; // POST attach/remove

const statusColors = {
  completed: "bg-green-50 text-green-700 border border-green-200",
  "in-progress": "bg-amber-50 text-amber-700 border border-amber-200",
  pending: "bg-gray-100 text-gray-500 border border-gray-200",
};

// ── Icons ──────────────────────────────────────────────────────────────────
const Icon = {
  Plus: ({ size = 12 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Edit: ({ size = 13 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Trash: ({ size = 13 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
  ),
  X: ({ size = 11 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
  ChevronDown: ({ open }) => (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"
      style={{ transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  Bookmark: ({ size = 10 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
    </svg>
  ),
  ArrowUpRight: ({ size = 10 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <path d="M7 17L17 7M7 7h10v10" />
    </svg>
  ),
  Search: () => (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
    </svg>
  ),
};

// ── Spinner ────────────────────────────────────────────────────────────────
const Spinner = ({ size = 16, color = "text-violet-600" }) => (
  <svg className={`animate-spin ${color}`} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

// ── Progress Bar ───────────────────────────────────────────────────────────
const ProgressBar = ({ value, className = "" }) => (
  <div className={`h-1.5 bg-gray-100 rounded-full overflow-hidden ${className}`}>
    <div className="h-full bg-violet-500 rounded-full transition-all duration-500" style={{ width: `${value}%` }} />
  </div>
);

// ── Modal ──────────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, onSave, saving, wide = false, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4">
    <div className={`bg-white rounded-2xl shadow-xl w-full ${wide ? "max-w-lg" : "max-w-sm"} p-6`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <button onClick={onClose} disabled={saving}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition">
          <Icon.X size={13} />
        </button>
      </div>
      {children}
      {onSave && (
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
      )}
    </div>
  </div>
);

// ── Form Fields ────────────────────────────────────────────────────────────
const ItemForm = ({ name, setName, status, setStatus, progress, setProgress, hasDesc, desc, setDesc }) => (
  <div className="space-y-3">
    <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Name"
      className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-800 placeholder-gray-400" />
    {hasDesc && (
      <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)" rows={2}
        className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-800 placeholder-gray-400 resize-none" />
    )}
    <select value={status} onChange={e => setStatus(e.target.value)}
      className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-800">
      <option value="pending">Pending</option>
      <option value="in-progress">In Progress</option>
      <option value="completed">Completed</option>
    </select>
    <div>
      <div className="flex justify-between mb-1">
        <label className="text-xs text-gray-500">Progress</label>
        <span className="text-xs font-medium text-violet-600">{progress}%</span>
      </div>
      <input type="range" min={0} max={100} step={1} value={progress}
        onChange={e => setProgress(Number(e.target.value))}
        className="w-full accent-violet-600 cursor-pointer" />
    </div>
  </div>
);

// ── Attach Answers Modal (attach / detach only) ────────────────────────────
const AttachAnswersModal = ({ refType, refId, attachedAnswers = [], onClose, onRefresh }) => {
  const [allAnswers, setAllAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [attached, setAttached] = useState(new Set(attachedAnswers.map(a => a.id)));
  const [toggling, setToggling] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const url = search.trim()
          ? `${ANSWERS_API}?search=${encodeURIComponent(search.trim())}`
          : ANSWERS_API;
        const res = await fetch(url, { credentials: "include" });
        const d = await res.json();
        if (!cancelled && d.status) setAllAnswers(d.data || []);
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [search]);

  const toggle = async (answerId) => {
    const action = attached.has(answerId) ? "remove" : "attach";
    setToggling(answerId);
    try {
      const res = await fetch(ATTACH_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ answer_id: answerId, action, type: refType, reference_id: refId }),
      });
      const d = await res.json();
      if (d.status) {
        setAttached(prev => {
          const next = new Set(prev);
          action === "attach" ? next.add(answerId) : next.delete(answerId);
          return next;
        });
        onRefresh();
      }
    } finally { setToggling(null); }
  };

  return (
    <Modal title={`Attach Answers · ${refType}`} onClose={onClose} wide>
      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          <Icon.Search />
        </span>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search saved answers…"
          className="w-full text-sm pl-8 pr-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-800 placeholder-gray-400" />
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : allAnswers.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          {search ? "No answers match your search." : "No saved answers found."}
        </p>
      ) : (
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {allAnswers.map(ans => {
            const isAttached = attached.has(ans.id);
            const isToggling = toggling === ans.id;
            return (
              <div key={ans.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition
                  ${isAttached ? "bg-violet-50 border-violet-200" : "bg-white border-gray-100 hover:border-gray-200"}`}>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${isAttached ? "bg-violet-500" : "bg-gray-200"}`} />
                <p className="flex-1 text-sm text-gray-800 truncate">{ans.name}</p>
                <button onClick={() => toggle(ans.id)} disabled={!!isToggling}
                  className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition flex items-center gap-1 disabled:opacity-50
                    ${isAttached
                      ? "bg-violet-100 text-violet-700 hover:bg-red-50 hover:text-red-600"
                      : "bg-gray-100 text-gray-600 hover:bg-violet-50 hover:text-violet-600"}`}>
                  {isToggling ? <Spinner size={11} color="text-current" /> : isAttached ? "Detach" : "Attach"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <button onClick={onClose}
        className="w-full mt-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition">
        Done
      </button>
    </Modal>
  );
};

// ── Answer Pills ───────────────────────────────────────────────────────────
// Clickable pills that navigate to /saved/:id
const AnswerPills = ({ answers = [], onAttach }) => {
  const navigate = useNavigate();
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
          <Icon.Bookmark size={10} /> Saved Answers
        </span>
        <button onClick={onAttach}
          className="flex items-center gap-1 text-xs text-violet-500 hover:text-violet-700 font-medium transition">
          <Icon.Plus size={10} /> Attach
        </button>
      </div>

      {answers.length === 0 ? (
        <p className="text-xs text-gray-300 italic pb-1">No answers attached yet.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {answers.map(ans => (
            <button key={ans.id} onClick={() => navigate(`/saved/${ans.id}`)} title={ans.name}
              className="group/pill flex items-center gap-1.5 max-w-[180px] pl-2.5 pr-2 py-1.5
                bg-white hover:bg-violet-50 border border-violet-200 hover:border-violet-400
                rounded-lg text-xs text-violet-700 font-medium transition shadow-sm">
              <Icon.Bookmark size={9} />
              <span className="truncate">{ans.name}</span>
              <span className="opacity-0 group-hover/pill:opacity-100 transition shrink-0 text-violet-400">
                <Icon.ArrowUpRight size={9} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Subtopic Row ───────────────────────────────────────────────────────────
const SubtopicRow = ({ st, onRefresh }) => {
  const [cycling, setCycling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editSt, setEditSt] = useState(false);
  const [showAttach, setShowAttach] = useState(false);

  const [name, setName] = useState(st.subtopic_name);
  const [desc, setDesc] = useState(st.subtopic_description || "");
  const [status, setStatus] = useState(st.status);
  const [progress, setProgress] = useState(st.progress);
  const [saving, setSaving] = useState(false);

  const cycleStatus = async () => {
    const next = st.status === "pending" ? "in-progress" : st.status === "in-progress" ? "completed" : "pending";
    setCycling(true);
    try {
      await fetch(`${API}/${st.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ type: "subtopic", status: next, progress: next === "completed" ? 100 : st.progress }),
      });
      await onRefresh();
    } finally { setCycling(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetch(`${API}/${st.id}`, {
        method: "DELETE", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ type: "subtopic" }),
      });
      await onRefresh();
    } finally { setDeleting(false); }
  };

  const handleEdit = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/${st.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ type: "subtopic", subtopic_name: name.trim() || st.subtopic_name, subtopic_description: desc, status, progress }),
      });
      const d = await res.json();
      if (d.status) { setEditSt(false); await onRefresh(); }
    } finally { setSaving(false); }
  };

  return (
    <>
      <div className={`rounded-xl border border-gray-100 bg-white overflow-hidden group transition
        ${deleting ? "opacity-50 pointer-events-none" : ""}`}>

        {/* Header */}
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <button onClick={cycleStatus} disabled={cycling}
            className={`text-xs font-medium px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1 transition ${statusColors[st.status] || statusColors.pending}`}>
            {cycling ? <Spinner size={9} color="text-current" /> : st.status}
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-700 truncate">{st.subtopic_name}</p>
            {st.subtopic_description && (
              <p className="text-xs text-gray-400 truncate">{st.subtopic_description}</p>
            )}
            <div className="flex items-center gap-1.5 mt-0.5">
              <ProgressBar value={st.progress} className="w-14" />
              <span className="text-xs text-gray-400">{st.progress}%</span>
              {st.answers?.length > 0 && (
                <span className="text-xs text-violet-500 flex items-center gap-0.5 ml-1">
                  <Icon.Bookmark /> {st.answers.length}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
            <button onClick={() => { setName(st.subtopic_name); setDesc(st.subtopic_description || ""); setStatus(st.status); setProgress(st.progress); setEditSt(true); }}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:bg-violet-50 hover:text-violet-600 transition">
              <Icon.Edit size={11} />
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition">
              {deleting ? <Spinner size={11} color="text-red-400" /> : <Icon.Trash size={11} />}
            </button>
          </div>

          <button onClick={() => setExpanded(p => !p)}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition shrink-0">
            <Icon.ChevronDown open={expanded} />
          </button>
        </div>

        {/* Expanded: answer pills */}
        {expanded && (
          <div className="px-3 pb-3 pt-2 border-t border-gray-100 bg-gray-50/50">
            <AnswerPills answers={st.answers || []} onAttach={() => setShowAttach(true)} />
          </div>
        )}
      </div>

      {editSt && (
        <Modal title="Edit Subtopic" onClose={() => setEditSt(false)} onSave={handleEdit} saving={saving}>
          <ItemForm name={name} setName={setName} status={status} setStatus={setStatus}
            progress={progress} setProgress={setProgress} hasDesc desc={desc} setDesc={setDesc} />
        </Modal>
      )}

      {showAttach && (
        <AttachAnswersModal refType="subtopic" refId={st.id}
          attachedAnswers={st.answers || []}
          onClose={() => setShowAttach(false)}
          onRefresh={onRefresh} />
      )}
    </>
  );
};

// ── Topic Card ─────────────────────────────────────────────────────────────
const TopicCard = ({ topic, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);
  const [cycling, setCycling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editTopic, setEditTopic] = useState(false);
  const [showAddSt, setShowAddSt] = useState(false);
  const [showAttach, setShowAttach] = useState(false);

  const [tName, setTName] = useState(topic.topic_name);
  const [tStatus, setTStatus] = useState(topic.status);
  const [tProgress, setTProgress] = useState(topic.progress);
  const [saving, setSaving] = useState(false);

  const [stName, setStName] = useState("");
  const [stDesc, setStDesc] = useState("");
  const [stSaving, setStSaving] = useState(false);

  const cycleStatus = async () => {
    const next = topic.status === "pending" ? "in-progress" : topic.status === "in-progress" ? "completed" : "pending";
    setCycling(true);
    try {
      await fetch(`${API}/${topic.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ type: "topic", status: next, progress: next === "completed" ? 100 : topic.progress }),
      });
      await onRefresh();
    } finally { setCycling(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetch(`${API}/${topic.id}`, {
        method: "DELETE", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ type: "topic" }),
      });
      await onRefresh();
    } finally { setDeleting(false); }
  };

  const handleEditTopic = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/${topic.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ type: "topic", topic_name: tName.trim() || topic.topic_name, status: tStatus, progress: tProgress }),
      });
      const d = await res.json();
      if (d.status) { setEditTopic(false); await onRefresh(); }
    } finally { setSaving(false); }
  };

  const handleAddSubtopic = async () => {
    if (!stName.trim()) return;
    setStSaving(true);
    try {
      const res = await fetch(API, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ subtopic_name: stName.trim(), subtopic_description: stDesc.trim() || undefined, topic_id: topic.id }),
      });
      const d = await res.json();
      if (d.status) { setStName(""); setStDesc(""); setShowAddSt(false); await onRefresh(); }
    } finally { setStSaving(false); }
  };

  const subtopics = topic.subtopics || [];
  const answers = topic.answers || [];

  return (
    <>
      <div className={`bg-white border border-gray-100 rounded-2xl overflow-hidden group hover:shadow-sm transition
        ${deleting ? "opacity-50 pointer-events-none" : ""}`}>

        {/* Topic header */}
        <div className="px-4 py-3.5 flex items-center gap-3">
          <button onClick={cycleStatus} disabled={cycling}
            className={`text-xs font-medium px-2 py-1 rounded-lg shrink-0 flex items-center gap-1 transition ${statusColors[topic.status] || statusColors.pending}`}>
            {cycling ? <Spinner size={10} color="text-current" /> : topic.status}
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{topic.topic_name}</p>
            <div className="flex items-center gap-2 mt-1">
              <ProgressBar value={topic.progress} className="w-24" />
              <span className="text-xs text-gray-400">{topic.progress}%</span>
              {answers.length > 0 && (
                <span className="text-xs text-violet-500 flex items-center gap-0.5">
                  <Icon.Bookmark /> {answers.length}
                </span>
              )}
              {subtopics.length > 0 && (
                <span className="text-xs text-gray-400">
                  · {subtopics.filter(s => s.status === "completed").length}/{subtopics.length} subtopics
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
            <button onClick={() => { setTName(topic.topic_name); setTStatus(topic.status); setTProgress(topic.progress); setEditTopic(true); }}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-violet-50 hover:text-violet-600 transition">
              <Icon.Edit />
            </button>
            <button onClick={handleDelete}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition">
              {deleting ? <Spinner size={13} color="text-red-400" /> : <Icon.Trash />}
            </button>
          </div>

          <button onClick={() => setExpanded(p => !p)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition shrink-0">
            <Icon.ChevronDown open={expanded} />
          </button>
        </div>

        {/* Expanded panel */}
        {expanded && (
          <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/40 space-y-4">

            {/* ① Answer pills */}
            <AnswerPills answers={answers} onAttach={() => setShowAttach(true)} />

            {/* ② Subtopics */}
            <div>
              <p className="text-xs font-medium text-gray-400 mb-2">Subtopics</p>
              <div className="space-y-1.5">
                {subtopics.length === 0 && (
                  <p className="text-xs text-gray-300 italic">No subtopics yet.</p>
                )}
                {subtopics.map(st => (
                  <SubtopicRow key={st.id} st={st} onRefresh={onRefresh} />
                ))}
              </div>
              <button onClick={() => { setStName(""); setStDesc(""); setShowAddSt(true); }}
                className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-gray-200 text-xs text-gray-400 hover:border-violet-300 hover:text-violet-500 hover:bg-violet-50/40 transition">
                <Icon.Plus /> Add Subtopic
              </button>
            </div>

          </div>
        )}
      </div>

      {editTopic && (
        <Modal title="Edit Topic" onClose={() => setEditTopic(false)} onSave={handleEditTopic} saving={saving}>
          <ItemForm name={tName} setName={setTName} status={tStatus} setStatus={setTStatus} progress={tProgress} setProgress={setTProgress} />
        </Modal>
      )}

      {showAddSt && (
        <Modal title="Add Subtopic" onClose={() => setShowAddSt(false)} onSave={handleAddSubtopic} saving={stSaving}>
          <div className="space-y-3">
            <input autoFocus type="text" value={stName} onChange={e => setStName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddSubtopic()}
              placeholder="e.g. Integration by Parts"
              className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-800 placeholder-gray-400" />
            <textarea value={stDesc} onChange={e => setStDesc(e.target.value)}
              placeholder="Description (optional)" rows={2}
              className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-800 placeholder-gray-400 resize-none" />
          </div>
        </Modal>
      )}

      {showAttach && (
        <AttachAnswersModal refType="topic" refId={topic.id}
          attachedAnswers={answers}
          onClose={() => setShowAttach(false)}
          onRefresh={onRefresh} />
      )}
    </>
  );
};

// ── Root ───────────────────────────────────────────────────────────────────
const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSubject, setActiveSubject] = useState(null);

  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [editSubject, setEditSubject] = useState(null);
  const [subjectName, setSubjectName] = useState("");
  const [topicName, setTopicName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingSubject, setDeletingSubject] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await fetch(API, { credentials: "include" });
      const d = await res.json();
      if (d.status) {
        setSubjects(d.data);
        if (d.data.length > 0)
          setActiveSubject(prev => prev ? d.data.find(s => s.id === prev.id) || d.data[0] : d.data[0]);
      } else setError(d.message);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

  const refreshAndSync = useCallback(async (keepId) => {
    setRefreshing(true);
    try {
      const res = await fetch(API, { credentials: "include" });
      const d = await res.json();
      if (d.status) {
        setSubjects(d.data);
        if (keepId) {
          const updated = d.data.find(s => s.id === keepId);
          setActiveSubject(updated || d.data[0] || null);
        }
      }
    } finally { setRefreshing(false); }
  }, []);

  const handleAddSubject = async () => {
    if (!subjectName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(API, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ subject_name: subjectName.trim() }),
      });
      const d = await res.json();
      if (d.status) { setSubjectName(""); setShowAddSubject(false); await refreshAndSync(null); }
    } finally { setSaving(false); }
  };

  const handleEditSubject = async () => {
    if (!editSubject || !subjectName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/${editSubject.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ type: "subject", subject_name: subjectName.trim() }),
      });
      const d = await res.json();
      if (d.status) { setEditSubject(null); setSubjectName(""); await refreshAndSync(editSubject.id); }
    } finally { setSaving(false); }
  };

  const handleDeleteSubject = async (id) => {
    if (!window.confirm("Delete this subject and all its topics?")) return;
    setDeletingSubject(id);
    try {
      await fetch(`${API}/${id}`, {
        method: "DELETE", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ type: "subject" }),
      });
      const remaining = subjects.filter(s => s.id !== id);
      setSubjects(remaining);
      setActiveSubject(remaining[0] || null);
    } finally { setDeletingSubject(null); }
  };

  const handleAddTopic = async () => {
    if (!topicName.trim() || !activeSubject) return;
    setSaving(true);
    try {
      const res = await fetch(API, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ topic_name: topicName.trim(), subject_id: activeSubject.id }),
      });
      const d = await res.json();
      if (d.status) { setTopicName(""); setShowAddTopic(false); await refreshAndSync(activeSubject.id); }
    } finally { setSaving(false); }
  };

  const topicRefresh = useCallback(() => refreshAndSync(activeSubject?.id), [refreshAndSync, activeSubject?.id]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Spinner size={28} /><p className="text-sm text-gray-400">Loading subjects...</p>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-sm text-red-400">{error}</p>
    </div>
  );

  return (
    <div className="flex gap-5 h-full">

      {/* ── Subject list ── */}
      <div className="w-56 shrink-0 flex flex-col gap-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-700">Subjects</h2>
            {refreshing && <Spinner size={12} color="text-gray-400" />}
          </div>
          <button onClick={() => { setSubjectName(""); setShowAddSubject(true); }}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-violet-50 hover:text-violet-600 transition">
            <Icon.Plus />
          </button>
        </div>

        {subjects.length === 0 && <p className="text-xs text-gray-400 text-center py-8">No subjects yet.</p>}

        {subjects.map(sub => (
          <div key={sub.id} onClick={() => setActiveSubject(sub)}
            className={`group relative cursor-pointer px-3 py-3 rounded-xl border transition
              ${activeSubject?.id === sub.id ? "bg-violet-50 border-violet-200" : "bg-white border-gray-100 hover:border-violet-100"}
              ${deletingSubject === sub.id ? "opacity-50 pointer-events-none" : ""}`}>
            <div className="flex items-center justify-between">
              <p className={`text-sm font-medium truncate pr-10 ${activeSubject?.id === sub.id ? "text-violet-700" : "text-gray-800"}`}>
                {sub.subject_name}
              </p>
              {deletingSubject === sub.id && <Spinner size={12} color="text-red-400" />}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <ProgressBar value={sub.progress} className="flex-1" />
              <span className="text-xs text-gray-400">{sub.progress}%</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{sub.completed_topics}/{sub.total_topics} topics</p>
            <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
              <button onClick={e => { e.stopPropagation(); setEditSubject(sub); setSubjectName(sub.subject_name); }}
                className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-violet-600 hover:bg-white transition">
                <Icon.Edit size={11} />
              </button>
              <button onClick={e => { e.stopPropagation(); handleDeleteSubject(sub.id); }}
                className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-white transition">
                <Icon.X />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Topics panel ── */}
      <div className="flex-1 min-w-0">
        {!activeSubject ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-400">Select a subject to see topics.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-900">{activeSubject.subject_name}</h2>
                  {refreshing && <Spinner size={14} color="text-gray-400" />}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {activeSubject.completed_topics} of {activeSubject.total_topics} completed · {activeSubject.progress}%
                </p>
              </div>
              <button onClick={() => { setTopicName(""); setShowAddTopic(true); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium rounded-xl transition">
                <Icon.Plus /> Add Topic
              </button>
            </div>

            <ProgressBar value={activeSubject.progress} className="mb-5" />

            {activeSubject.topics.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-12">No topics yet. Add one!</p>
            )}

            <div className="space-y-2">
              {activeSubject.topics.map(topic => (
                <TopicCard key={topic.id} topic={topic} onRefresh={topicRefresh} />
              ))}
            </div>
          </>
        )}
      </div>

      {showAddSubject && (
        <Modal title="Add Subject" onClose={() => setShowAddSubject(false)} onSave={handleAddSubject} saving={saving}>
          <input autoFocus type="text" value={subjectName} onChange={e => setSubjectName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAddSubject()}
            placeholder="e.g. Mathematics"
            className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-800 placeholder-gray-400" />
        </Modal>
      )}

      {editSubject && (
        <Modal title="Edit Subject" onClose={() => setEditSubject(null)} onSave={handleEditSubject} saving={saving}>
          <input autoFocus type="text" value={subjectName} onChange={e => setSubjectName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleEditSubject()}
            className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-800" />
        </Modal>
      )}

      {showAddTopic && (
        <Modal title="Add Topic" onClose={() => setShowAddTopic(false)} onSave={handleAddTopic} saving={saving}>
          <input autoFocus type="text" value={topicName} onChange={e => setTopicName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAddTopic()}
            placeholder="e.g. Quadratic Equations"
            className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-800 placeholder-gray-400" />
        </Modal>
      )}
    </div>
  );
};

export default Subjects;