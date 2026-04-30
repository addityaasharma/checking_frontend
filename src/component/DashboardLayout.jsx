import React, { useState, useEffect, useRef } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Todo from "./Todo";
import API_BASE from "../api";

const Icon = ({ d, size = 20 }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d={d} />
    </svg>
);

const icons = {
    logout:
        "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
    lock: "M12 17v-2m0 0a2 2 0 100-4 2 2 0 000 4zM6 10V8a6 6 0 1112 0v2M5 10h14a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9a1 1 0 011-1z",
    user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z",
    newFile: "M12 5v14M5 12h14",
    share: "M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13",
};

// Rainbow colors for "Pad" part of the logo
const RAINBOW = ["#FF5500", "#8B2FC9", "#0088FF"];

// Logo component — Nunito bold, "Scratch" dark + "Pad" rainbow chars
export const ScratchPadLogo = () => (
    <span
        style={{
            fontFamily: "'Nunito', 'Poppins', sans-serif",
            fontWeight: 900,
            fontSize: "1.18rem",
            letterSpacing: "-0.02em",
            lineHeight: 1,
        }}
    >
        <span style={{ color: "#1a1a2e" }}>Scratch</span>
        {"Pad".split("").map((char, i) => (
            <span key={i} style={{ color: RAINBOW[i] }}>{char}</span>
        ))}
    </span>
);

// Locked button — shows "Coming soon!" tooltip on click
const LockedButton = ({ icon, label }) => {
    const [show, setShow] = useState(false);
    const timerRef = useRef(null);

    const handleClick = () => {
        setShow(true);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setShow(false), 2000);
    };

    return (
        <div className="relative">
            <button
                onClick={handleClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition select-none cursor-pointer"
            >
                <Icon d={icon} size={13} />
                <span className="hidden sm:inline">{label}</span>
                <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
            </button>
            {show && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 pointer-events-none">
                    <div className="bg-gray-900 text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg flex items-center gap-1">
                        🚀 Coming soon!
                    </div>
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45 rounded-sm" />
                </div>
            )}
        </div>
    );
};

const DashboardLayout = () => {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [profileModalOpen, setProfileModalOpen] = useState(false);
    const profileRef = useRef(null);

    // Inject Nunito font
    useEffect(() => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://fonts.googleapis.com/css2?family=Nunito:wght@800;900&display=swap";
        document.head.appendChild(link);
        return () => { try { document.head.removeChild(link); } catch { } };
    }, []);

    useEffect(() => {
        fetch(`${API_BASE}/user/profile`, { credentials: "include" })
            .then((r) => r.json())
            .then((d) => { if (d.status) setUser(d.data); })
            .catch(() => { });
    }, []);

    useEffect(() => {
        const handleClick = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setProfileModalOpen(false);
            }
        };
        if (profileModalOpen) document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [profileModalOpen]);

    const handleLogout = async () => {
        await fetch(`${API_BASE}/user/logout`, { method: "POST", credentials: "include" });
        localStorage.clear();
        navigate("/login");
    };

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Topbar */}
                <header className="bg-white border-b border-gray-100 px-5 py-2.5 flex items-center">

                    {/* Left — Logo */}
                    <div className="shrink-0">
                        <ScratchPadLogo />
                    </div>

                    {/* Center — locked action buttons */}
                    <div className="flex-1 flex items-center justify-center gap-2">
                        <LockedButton icon={icons.newFile} label="New" />
                        <LockedButton icon={icons.share} label="Share" />
                    </div>

                    {/* Right — Profile */}
                    <div className="shrink-0 relative" ref={profileRef}>
                        <button
                            onClick={() => setProfileModalOpen((o) => !o)}
                            className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-2xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all duration-150 shadow-sm"
                        >
                            {/* Avatar */}
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm">
                                {user?.username?.[0]?.toUpperCase() || "?"}
                            </div>
                            {/* Name only — no email, no loading */}
                            {user?.username && (
                                <span className="hidden sm:block text-xs font-semibold text-gray-700 max-w-[80px] truncate">
                                    {user.username}
                                </span>
                            )}
                            <svg
                                width={12} height={12} viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                                className={`text-gray-400 transition-transform duration-200 ${profileModalOpen ? "rotate-180" : ""}`}
                            >
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        </button>

                        {/* Dropdown */}
                        {profileModalOpen && (
                            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 z-50">
                                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100">
                                    <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center text-sm font-bold text-violet-700 shrink-0">
                                        {user?.username?.[0]?.toUpperCase() || "U"}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-xs font-semibold text-gray-800 truncate">
                                            {user?.username || "Loading..."}
                                        </p>
                                        <p className="text-[11px] text-gray-400 truncate">
                                            {user?.email || ""}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setProfileModalOpen(false); navigate("/profile"); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition"
                                >
                                    <Icon d={icons.user} size={16} />
                                    <span>View Profile</span>
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition"
                                >
                                    <Icon d={icons.logout} size={16} />
                                    <span>Logout</span>
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    <Outlet />
                </div>
            </main>

            <Todo />
        </div>
    );
};

export default DashboardLayout;