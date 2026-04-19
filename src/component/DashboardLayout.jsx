import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Todo from "./Todo";

const Icon = ({ d, size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
    </svg>
);

const icons = {
    explainer: "M12 2a10 10 0 100 20A10 10 0 0012 2zm0 6v4m0 4h.01",
    subjects: "M4 6h16M4 10h16M4 14h10",
    timetable: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
    saved: "M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z",
    streak: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    logout: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
};

const navItems = [
    { label: "Concept Explainer", path: "/", icon: icons.explainer },
    { label: "Subjects", path: "/subjects", icon: icons.subjects },
    { label: "Timetable", path: "/timetable", icon: icons.timetable },
    { label: "Saved Answers", path: "/saved", icon: icons.saved },
    { label: "My Streak", path: "/streak", icon: icons.streak },
    { label: "Rough Work", path: "/creatives", icon: icons.streak },
];

const DashboardLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        fetch("/v1/user/me", { credentials: "include" })
            .then(r => r.json())
            .then(d => { if (d.status) setUser(d.user); })
            .catch(() => { });
    }, []);

    const handleLogout = async () => {
        await fetch("/v1/user/logout", { method: "POST", credentials: "include" });
        localStorage.clear();
        navigate("/login");
    };

    const currentLabel = navItems.find(n => n.path === location.pathname)?.label || "Dashboard";

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">

            {/* ── Sidebar ── */}
            <aside className={`${sidebarOpen ? "w-60" : "w-16"} shrink-0 bg-white border-r border-gray-100 flex flex-col transition-all duration-200`}>

                {/* Logo */}
                <div className="flex items-center gap-2.5 px-4 py-4.5 border-b border-gray-100">
                    <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 20 20" className="w-4 h-4 fill-white">
                            <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm-1 5a1 1 0 112 0v1h1a1 1 0 110 2h-1v3a1 1 0 11-2 0v-3H8a1 1 0 110-2h1V7z" />
                        </svg>
                    </div>
                    {sidebarOpen && (
                        <span className="text-lg font-semibold text-gray-900">
                            bo<span className="text-violet-600">bo</span>
                        </span>
                    )}
                </div>

                {/* Nav */}
                <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                    {navItems.map(({ label, path, icon }) => {
                        const active = location.pathname === path;
                        return (
                            <button
                                key={path}
                                onClick={() => navigate(path)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition
                                    ${active
                                        ? "bg-violet-50 text-violet-700"
                                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                                    }`}
                            >
                                <span className="shrink-0"><Icon d={icon} size={18} /></span>
                                {sidebarOpen && <span>{label}</span>}
                            </button>
                        );
                    })}
                </nav>

                <div className="px-2 pb-4 border-t border-gray-100 pt-3 space-y-1">
                    {sidebarOpen && (
                        <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
                            <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-xs font-semibold text-violet-700 shrink-0">
                                {user?.username?.[0]?.toUpperCase() || "U"}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-xs font-medium text-gray-800 truncate">
                                    {user?.username || "Loading..."}
                                </p>
                                <p className="text-xs text-gray-400 truncate">
                                    {user?.email || ""}
                                </p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition"
                    >
                        <span className="shrink-0"><Icon d={icons.logout} size={18} /></span>
                        {sidebarOpen && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* ── Main ── */}
            <main className="flex-1 flex flex-col overflow-hidden">

                {/* Topbar */}
                <header className="bg-white border-b border-gray-100 px-6 py-3.5 flex items-center gap-4">
                    <button
                        onClick={() => setSidebarOpen(o => !o)}
                        className="text-gray-400 hover:text-gray-700 transition"
                    >
                        <Icon d="M4 6h16M4 12h16M4 18h16" size={20} />
                    </button>
                    <h1 className="text-sm font-medium text-gray-700">{currentLabel}</h1>

                    {/* Profile — always visible, shows U until user loads */}
                    <div className="ml-auto flex items-center gap-2">
                        <button
                            onClick={() => navigate("/profile")}
                            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition"
                        >
                            <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-xs font-semibold text-violet-700 shrink-0">
                                {user?.username?.[0]?.toUpperCase() || "U"}
                            </div>
                            <div className="text-left hidden sm:block">
                                <p className="text-xs font-medium text-gray-800 leading-none">
                                    {user?.username || "Loading..."}
                                </p>
                                <p className="text-xs text-gray-400 leading-none mt-0.5">
                                    {user?.email || ""}
                                </p>
                            </div>
                        </button>

                        {/* Profile icon button */}
                        <button
                            onClick={() => navigate("/profile")}
                            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-violet-50 hover:text-violet-600 transition"
                            title="View profile"
                        >
                            <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        </button>
                    </div>
                </header>

                {/* Outlet */}
                <div className="flex-1 overflow-y-auto p-6">
                    <Outlet />
                </div>
            </main>
            <Todo />
        </div>
    );
};

export default DashboardLayout;