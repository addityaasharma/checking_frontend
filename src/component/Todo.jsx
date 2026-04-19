import React, { useState, useRef, useEffect } from "react";

const API = "/v1/user/todo";

const Todo = () => {
    const [todos, setTodos] = useState([]);
    const [input, setInput] = useState({ name: "", task: "" });
    const [minimized, setMinimized] = useState(false);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [pos, setPos] = useState({ x: window.innerWidth - 340, y: window.innerHeight - 520 });
    const [dragging, setDragging] = useState(false);
    const offset = useRef({ x: 0, y: 0 });

    const fetchTodos = async () => {
        try {
            const res = await fetch(API, { credentials: "include" });
            const data = await res.json();
            if (data.status) setTodos(data.data);
        } catch { console.log("False") }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchTodos(); }, []);

    const onMouseDown = (e) => {
        setDragging(true);
        offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    };

    useEffect(() => {
        const onMove = (e) => {
            if (!dragging) return;
            setPos({
                x: Math.min(Math.max(0, e.clientX - offset.current.x), window.innerWidth - 320),
                y: Math.min(Math.max(0, e.clientY - offset.current.y), window.innerHeight - 60),
            });
        };
        const onUp = () => setDragging(false);
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    }, [dragging]);

    const addTodo = async () => {
        if (!input.name.trim() || !input.task.trim()) return;
        setAdding(true);
        try {
            const res = await fetch(API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ name: input.name.trim(), task: input.task.trim() }),
            });
            const data = await res.json();
            if (data.status) {
                setInput({ name: "", task: "" });
                setShowForm(false);
                fetchTodos();
            }
        } catch { console.log("False") }
        finally { setAdding(false); }
    };

    const toggleTodo = async (todo) => {
        try {
            await fetch(`${API}/${todo.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ is_completed: !todo.is_completed }),
            });
            setTodos(todos.map(t => t.id === todo.id ? { ...t, is_completed: !t.is_completed } : t));
        } catch { console.log("False") }
    };

    const deleteTodo = async (id) => {
        try {
            await fetch(`${API}/${id}`, { method: "DELETE", credentials: "include" });
            setTodos(todos.filter(t => t.id !== id));
        } catch { console.log("False") }
    };

    const clearCompleted = async () => {
        const completed = todos.filter(t => t.is_completed);
        await Promise.all(completed.map(t =>
            fetch(`${API}/${t.id}`, { method: "DELETE", credentials: "include" })
        ));
        setTodos(todos.filter(t => !t.is_completed));
    };

    const pending = todos.filter(t => !t.is_completed).length;

    return (
        <div
            style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 9999, width: 300, userSelect: "none" }}
            className="bg-white border border-gray-100 rounded-2xl shadow-lg overflow-hidden"
        >
            <div
                onMouseDown={onMouseDown}
                className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 cursor-grab active:cursor-grabbing"
            >
                <div className="flex items-center gap-2">
                    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-violet-600">
                        <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-800">Todo</span>
                    <span className="text-xs bg-violet-50 text-violet-600 font-medium px-1.5 py-0.5 rounded-lg">
                        {pending}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onMouseDown={e => e.stopPropagation()}
                        onClick={() => { setShowForm(f => !f); setMinimized(false); }}
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-violet-600 transition"
                        title="Add task"
                    >
                        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                    </button>
                    <button
                        onMouseDown={e => e.stopPropagation()}
                        onClick={() => setMinimized(m => !m)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition"
                        title={minimized ? "Expand" : "Minimize"}
                    >
                        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                            <path d={minimized ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
                        </svg>
                    </button>
                </div>
            </div>

            {!minimized && (
                <div className="p-3">

                    {/* Add form */}
                    {showForm && (
                        <div className="mb-3 space-y-2">
                            <input
                                type="text"
                                value={input.name}
                                onChange={e => setInput({ ...input, name: e.target.value })}
                                placeholder="Title"
                                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent placeholder-gray-400 text-gray-800"
                            />
                            <input
                                type="text"
                                value={input.task}
                                onChange={e => setInput({ ...input, task: e.target.value })}
                                onKeyDown={e => e.key === "Enter" && addTodo()}
                                placeholder="Task description"
                                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent placeholder-gray-400 text-gray-800"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={addTodo}
                                    disabled={adding}
                                    className="flex-1 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium rounded-xl transition disabled:opacity-60"
                                >
                                    {adding ? "Adding…" : "Add task"}
                                </button>
                                <button
                                    onClick={() => { setShowForm(false); setInput({ name: "", task: "" }); }}
                                    className="flex-1 py-2 border border-gray-200 text-gray-500 text-xs font-medium rounded-xl hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-1 max-h-64 overflow-y-auto">
                        {loading && (
                            <p className="text-xs text-gray-400 text-center py-4">Loading...</p>
                        )}
                        {!loading && todos.length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-4">No tasks yet. Hit + to add one!</p>
                        )}
                        {todos.map(todo => (
                            <div key={todo.id} className="flex items-start gap-2.5 px-2 py-2 rounded-xl hover:bg-gray-50 group transition">
                                <button
                                    onClick={() => toggleTodo(todo)}
                                    className={`mt-0.5 w-4 h-4 rounded-md border flex-shrink-0 flex items-center justify-center transition
                                        ${todo.is_completed ? "bg-violet-600 border-violet-600" : "border-gray-300 hover:border-violet-400"}`}
                                >
                                    {todo.is_completed && (
                                        <svg width={10} height={10} viewBox="0 0 24 24" fill="none"
                                            stroke="white" strokeWidth={3} strokeLinecap="round">
                                            <path d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </button>
                                <div className="flex-1 overflow-hidden">
                                    <p className={`text-sm font-medium truncate ${todo.is_completed ? "line-through text-gray-400" : "text-gray-800"}`}>
                                        {todo.name}
                                    </p>
                                    <p className={`text-xs truncate ${todo.is_completed ? "line-through text-gray-300" : "text-gray-400"}`}>
                                        {todo.task}
                                    </p>
                                </div>
                                <button
                                    onClick={() => deleteTodo(todo.id)}
                                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition mt-0.5 flex-shrink-0"
                                >
                                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                                        <path d="M18 6L6 18M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>

                    {todos.some(t => t.is_completed) && (
                        <button
                            onClick={clearCompleted}
                            className="mt-2 w-full text-xs text-gray-400 hover:text-red-400 transition py-1"
                        >
                            Clear completed
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default Todo;