import React, { useState, useEffect, useCallback, useRef } from "react";

const API = "/v1/user/concept";

const fmtDate = (s) => {
  if (!s) return "";
  return new Date(s).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

// ── Spinner ────────────────────────────────────────────────────────────────
const Spinner = ({ size = 16, color = "#7c3aed" }) => (
  <svg style={{ animation: "ce-spin 0.75s linear infinite", display: "block" }}
    width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle opacity={0.2} cx="12" cy="12" r="10" stroke={color} strokeWidth="3" />
    <path opacity={0.85} fill={color} d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

// ── Injected styles ────────────────────────────────────────────────────────
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,500;0,600;1,500&family=Fira+Code:wght@400;500&family=Outfit:wght@400;500;600&display=swap');

@keyframes ce-spin    { to { transform: rotate(360deg); } }
@keyframes ce-fadeUp  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
@keyframes ce-pulse   { 0%,100% { opacity:.4; } 50% { opacity:1; } }
@keyframes ce-blink   { 0%,100% { opacity:1; } 50% { opacity:0; } }

.ce-thread-msg { animation: ce-fadeUp 0.3s ease both; }
.ce-list-item:hover { background: #faf8ff !important; }
.ce-send-btn:hover:not(:disabled) { background: #6d28d9 !important; }
.ce-new-btn:hover  { background: #f5f3ff !important; color: #7c3aed !important; }
.ce-textarea:focus  { outline: none; border-color: #c4b5fd !important; }
.ce-scrollbar::-webkit-scrollbar       { width: 4px; }
.ce-scrollbar::-webkit-scrollbar-track { background: transparent; }
.ce-scrollbar::-webkit-scrollbar-thumb { background: #ddd6fe; border-radius: 4px; }
.ce-typing-dot { animation: ce-pulse 1.2s ease infinite; }
.ce-typing-dot:nth-child(2) { animation-delay: 0.2s; }
.ce-typing-dot:nth-child(3) { animation-delay: 0.4s; }
`;

function injectStyles() {
  if (document.getElementById("ce-styles")) return;
  const el = document.createElement("style");
  el.id = "ce-styles";
  el.textContent = STYLES;
  document.head.appendChild(el);
}

// ── Typing indicator ───────────────────────────────────────────────────────
const TypingDots = () => (
  <div style={{ display: "flex", gap: "5px", alignItems: "center", padding: "4px 0" }}>
    {[0, 1, 2].map(i => (
      <span key={i} className="ce-typing-dot" style={{
        width: "7px", height: "7px", borderRadius: "50%", background: "#c4b5fd", display: "block",
      }} />
    ))}
  </div>
);

// ── Markdown-lite renderer (bold, code, newlines) ──────────────────────────
const RenderAnswer = ({ text }) => {
  if (!text) return null;
  // Split into lines, handle **bold**, `code`
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  const nodes = parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return <strong key={i} style={{ color: "#1e1b4b", fontWeight: 600 }}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("`") && p.endsWith("`"))
      return <code key={i} style={{
        fontFamily: "'Fira Code', monospace", fontSize: "12px",
        background: "#f0eeff", color: "#6d28d9", padding: "1px 5px", borderRadius: "4px",
      }}>{p.slice(1, -1)}</code>;
    // Preserve newlines
    return p.split("\n").map((line, j, arr) => (
      <React.Fragment key={`${i}-${j}`}>
        {line}
        {j < arr.length - 1 && <br />}
      </React.Fragment>
    ));
  });
  return <>{nodes}</>;
};

// ── Empty state ────────────────────────────────────────────────────────────
const EmptyState = ({ onNew }) => (
  <div style={{
    flex: 1, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: "16px", padding: "40px",
  }}>
    {/* Icon */}
    <div style={{
      width: "60px", height: "60px", borderRadius: "18px",
      background: "linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth={1.8} strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
      </svg>
    </div>
    <div style={{ textAlign: "center" }}>
      <p style={{ fontFamily: "'Lora', serif", fontSize: "17px", color: "#1e1b4b", fontWeight: 500, marginBottom: "6px" }}>
        Ask anything
      </p>
      <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: "13px", color: "#a78bfa", lineHeight: 1.6, maxWidth: "260px" }}>
        Start a new concept — get clear, beginner-friendly explanations with examples.
      </p>
    </div>
    <button onClick={onNew} className="ce-send-btn" style={{
      marginTop: "4px", padding: "10px 22px",
      background: "#7c3aed", color: "#fff",
      border: "none", borderRadius: "12px", cursor: "pointer",
      fontFamily: "'Outfit', sans-serif", fontWeight: 500, fontSize: "13px",
      transition: "background 0.15s",
    }}>
      New Concept
    </button>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────
const ConceptExplainer = () => {
  useEffect(() => { injectStyles(); }, []);

  const [chatList, setChatList] = useState([]);
  const [listLoading, setListLoading] = useState(true);

  const [activeThread, setActiveThread] = useState(null);  // [{id,question,answer,created_at}]
  const [activeChatId, setActiveChatId] = useState(null);  // root id
  const [threadLoading, setThreadLoading] = useState(false);

  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [limitError, setLimitError] = useState("");

  const [showNewPanel, setShowNewPanel] = useState(false); // mobile: show input area

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // ── Fetch chat list ───────────────────────────────────────────────────────
  const fetchList = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await fetch(API, { credentials: "include" });
      const d = await res.json();
      if (d.status) setChatList(d.data);
    } finally { setListLoading(false); }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  // ── Fetch thread ──────────────────────────────────────────────────────────
  const fetchThread = useCallback(async (id) => {
    setThreadLoading(true);
    setActiveThread(null);
    setActiveChatId(id);
    setLimitError("");
    try {
      const res = await fetch(`${API}/${id}`, { credentials: "include" });
      const d = await res.json();
      if (d.status) setActiveThread(d.data);
    } finally { setThreadLoading(false); }
  }, []);

  // Scroll to bottom when thread updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThread, sending]);

  // ── Send question ─────────────────────────────────────────────────────────
  const sendQuestion = async () => {
    const q = question.trim();
    if (!q || sending) return;
    setLimitError("");
    setSending(true);

    // Optimistic: append question bubble immediately
    const optimistic = { id: "__pending", question: q, answer: null, created_at: new Date().toISOString() };
    setActiveThread(prev => prev ? [...prev, optimistic] : [optimistic]);
    setQuestion("");

    try {
      const body = { question: q };
      if (activeChatId) body.chat_id = activeChatId;

      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const d = await res.json();

      if (res.status === 403) {
        setLimitError(d.message || "Daily limit reached.");
        setActiveThread(prev => prev?.filter(m => m.id !== "__pending") ?? []);
        return;
      }

      if (d.status) {
        const newEntry = d.data;
        // If new chat, set as active and reload list
        if (!activeChatId) {
          const rootId = newEntry.parent_id || newEntry.id;
          setActiveChatId(rootId);
          await fetchList();
          // Fetch the full thread now
          const res2 = await fetch(`${API}/${rootId}`, { credentials: "include" });
          const d2 = await res2.json();
          if (d2.status) setActiveThread(d2.data);
        } else {
          // Replace optimistic with real entry
          setActiveThread(prev =>
            prev?.map(m => m.id === "__pending" ? { ...newEntry, id: newEntry.id } : m) ?? []
          );
        }
      }
    } finally { setSending(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendQuestion(); }
  };

  // ── Sidebar list item ─────────────────────────────────────────────────────
  const SidebarItem = ({ item, index }) => {
    const isActive = activeChatId === item.id;
    return (
      <button onClick={() => fetchThread(item.id)}
        className="ce-list-item"
        style={{
          width: "100%", textAlign: "left", padding: "12px 14px",
          background: isActive ? "#f5f3ff" : "transparent",
          border: "none", borderRadius: "12px", cursor: "pointer",
          transition: "background 0.15s",
          animation: `ce-fadeUp 0.25s ease ${Math.min(index * 0.04, 0.2)}s both`,
        }}>
        <p style={{
          fontFamily: "'Outfit', sans-serif", fontSize: "13px",
          color: isActive ? "#6d28d9" : "#374151",
          fontWeight: isActive ? 500 : 400,
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
          lineHeight: 1.45, marginBottom: "4px",
        }}>{item.question}</p>
        <p style={{
          fontFamily: "'Fira Code', monospace", fontSize: "10px",
          color: isActive ? "#a78bfa" : "#d1d5db", letterSpacing: "0.03em",
        }}>{fmtDate(item.created_at)}</p>
        {isActive && (
          <div style={{
            position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
            width: "3px", height: "60%", background: "#7c3aed", borderRadius: "0 2px 2px 0",
          }} />
        )}
      </button>
    );
  };

  // ── Thread bubble ─────────────────────────────────────────────────────────
  const ThreadBubble = ({ msg, index }) => {
    const isPending = msg.id === "__pending";
    return (
      <div className="ce-thread-msg" style={{ animationDelay: `${Math.min(index * 0.04, 0.25)}s` }}>
        {/* Question */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
          <div style={{
            maxWidth: "75%", padding: "12px 16px",
            background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
            borderRadius: "18px 18px 4px 18px",
            boxShadow: "0 2px 12px rgba(124,58,237,0.2)",
          }}>
            <p style={{
              fontFamily: "'Outfit', sans-serif", fontSize: "13.5px",
              color: "#fff", lineHeight: 1.55, margin: 0,
            }}>{msg.question}</p>
          </div>
        </div>

        {/* Answer */}
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
          {/* Avatar */}
          <div style={{
            width: "30px", height: "30px", borderRadius: "10px", flexShrink: 0,
            background: "linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth={2} strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
            </svg>
          </div>

          <div style={{
            flex: 1, padding: "14px 16px",
            background: "#fafafa", border: "1px solid #f0eeff",
            borderRadius: "4px 18px 18px 18px",
          }}>
            {isPending || !msg.answer ? (
              <TypingDots />
            ) : (
              <p style={{
                fontFamily: "'Outfit', sans-serif", fontSize: "13.5px",
                color: "#374151", lineHeight: 1.75, margin: 0,
              }}>
                <RenderAnswer text={msg.answer} />
              </p>
            )}
          </div>
        </div>

        {/* Timestamp */}
        {!isPending && (
          <p style={{
            fontFamily: "'Fira Code', monospace", fontSize: "10px",
            color: "#d1d5db", textAlign: "right", marginTop: "6px",
          }}>{fmtDate(msg.created_at)}</p>
        )}
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      height: "100%", display: "flex", gap: "0",
      background: "#fff", fontFamily: "'Outfit', sans-serif",
      overflow: "hidden",
    }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: "240px", flexShrink: 0, display: "flex", flexDirection: "column",
        borderRight: "1px solid #f3f0ff", background: "#fdfcff",
      }}>
        {/* Sidebar header */}
        <div style={{ padding: "20px 16px 12px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{
                fontFamily: "'Fira Code', monospace", fontSize: "9px",
                color: "#c4b5fd", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "2px",
              }}>Learning</p>
              <h2 style={{
                fontFamily: "'Lora', serif", fontSize: "16px",
                color: "#1e1b4b", fontWeight: 600, margin: 0,
              }}>Concepts</h2>
            </div>
            <button
              onClick={() => { setActiveChatId(null); setActiveThread(null); setQuestion(""); setLimitError(""); }}
              className="ce-new-btn"
              title="New concept"
              style={{
                width: "30px", height: "30px", borderRadius: "10px",
                border: "1px solid #ede9fe", background: "#fff",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                color: "#a78bfa", transition: "all 0.15s",
              }}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
        </div>

        <div style={{ height: "1px", background: "#f3f0ff", flexShrink: 0 }} />

        {/* List */}
        <div className="ce-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "10px 8px" }}>
          {listLoading && (
            <div style={{ display: "flex", justifyContent: "center", padding: "24px" }}>
              <Spinner size={18} />
            </div>
          )}
          {!listLoading && chatList.length === 0 && (
            <p style={{
              fontFamily: "'Outfit', sans-serif", fontSize: "12px",
              color: "#d1d5db", textAlign: "center", padding: "24px 8px",
            }}>No concepts yet.</p>
          )}
          {!listLoading && chatList.map((item, i) => (
            <div key={item.id} style={{ position: "relative" }}>
              <SidebarItem item={item} index={i} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Main panel ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Thread header */}
        {activeThread && activeThread.length > 0 && (
          <div style={{
            padding: "16px 24px", borderBottom: "1px solid #f3f0ff",
            background: "#fdfcff", flexShrink: 0,
          }}>
            <p style={{
              fontFamily: "'Lora', serif", fontSize: "15px",
              color: "#1e1b4b", fontWeight: 500,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              margin: 0,
            }}>
              {activeThread[0]?.question}
            </p>
            <p style={{
              fontFamily: "'Fira Code', monospace", fontSize: "10px",
              color: "#c4b5fd", marginTop: "3px",
            }}>
              {activeThread.length} {activeThread.length === 1 ? "exchange" : "exchanges"}
            </p>
          </div>
        )}

        {/* Thread body */}
        <div className="ce-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {/* Loading thread */}
          {threadLoading && (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
              <Spinner size={22} />
            </div>
          )}

          {/* No active chat */}
          {!threadLoading && !activeThread && (
            <EmptyState onNew={() => { setActiveChatId(null); setActiveThread([]); textareaRef.current?.focus(); }} />
          )}

          {/* Messages */}
          {!threadLoading && activeThread && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "760px", margin: "0 auto" }}>
              {activeThread.map((msg, i) => (
                <ThreadBubble key={msg.id} msg={msg} index={i} />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* ── Limit error ── */}
        {limitError && (
          <div style={{
            margin: "0 24px 8px", padding: "10px 16px",
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: "12px", display: "flex", alignItems: "center", gap: "8px",
          }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2} strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
            </svg>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: "13px", color: "#ef4444", margin: 0 }}>
              {limitError}
            </p>
          </div>
        )}

        {/* ── Input area ── */}
        {(activeThread !== null) && (
          <div style={{
            padding: "16px 24px 20px", borderTop: "1px solid #f3f0ff",
            background: "#fdfcff", flexShrink: 0,
          }}>
            <div style={{
              display: "flex", gap: "10px", alignItems: "flex-end",
              background: "#fff", border: "1px solid #ede9fe",
              borderRadius: "16px", padding: "10px 10px 10px 16px",
              boxShadow: "0 2px 12px rgba(124,58,237,0.06)",
              transition: "border-color 0.2s",
            }}>
              <textarea
                ref={textareaRef}
                className="ce-textarea"
                value={question}
                onChange={e => { setQuestion(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
                onKeyDown={handleKeyDown}
                placeholder={activeChatId ? "Ask a follow-up question…" : "What concept would you like to understand?"}
                rows={1}
                style={{
                  flex: 1, resize: "none", border: "none", background: "transparent",
                  fontFamily: "'Outfit', sans-serif", fontSize: "13.5px",
                  color: "#1e1b4b", lineHeight: 1.55,
                  minHeight: "22px", maxHeight: "120px", overflowY: "auto",
                }}
              />
              <button
                onClick={sendQuestion}
                disabled={!question.trim() || sending}
                className="ce-send-btn"
                style={{
                  width: "36px", height: "36px", borderRadius: "12px", flexShrink: 0,
                  background: question.trim() && !sending ? "#7c3aed" : "#ede9fe",
                  border: "none", cursor: question.trim() && !sending ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.15s",
                }}>
                {sending
                  ? <Spinner size={15} color={question.trim() ? "#fff" : "#a78bfa"} />
                  : <svg width={15} height={15} viewBox="0 0 24 24" fill="none"
                    stroke={question.trim() ? "#fff" : "#a78bfa"} strokeWidth={2.5} strokeLinecap="round">
                    <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
                  </svg>
                }
              </button>
            </div>
            <p style={{
              fontFamily: "'Fira Code', monospace", fontSize: "10px",
              color: "#d1d5db", textAlign: "center", marginTop: "8px",
            }}>
              ↵ send · shift+↵ newline {activeChatId ? "· follow-up mode" : "· new concept"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConceptExplainer;