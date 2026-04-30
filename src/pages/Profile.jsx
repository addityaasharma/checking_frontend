import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {API_BASE} from "../api";


const Icon = ({ d, size = 16, strokeWidth = 1.8 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
    </svg>
);

const icons = {
    edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
    save: "M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v14a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8",
    cancel: "M18 6L6 18M6 6l12 12",
    camera: "M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a4 4 0 100-8 4 4 0 000 8z",
    mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
    user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z",
    map: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z",
    calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
    zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    award: "M12 15a7 7 0 100-14 7 7 0 000 14zM8.21 13.89L7 23l5-3 5 3-1.21-9.12",
    clock: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2",
    book: "M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 004 22h16V2H6.5A2.5 2.5 0 004 4.5v15z",
    gender: "M12 15a6 6 0 100-12 6 6 0 000 12zM12 15v7M9 19h6",
};

const FIELD_CONFIG = [
    { key: "email", label: "Email", icon: icons.mail, type: "email", editable: false },
    { key: "class", label: "Class / Grade", icon: icons.book, type: "text", editable: true, placeholder: "e.g. 10th, 12th, College" },
    { key: "location", label: "Location", icon: icons.map, type: "text", editable: true, placeholder: "City, Country" },
    { key: "gender", label: "Gender", icon: icons.gender, type: "select", editable: true, options: ["Male", "Female", "Non-binary", "Prefer not to say"] },
    { key: "dob", label: "Date of Birth", icon: icons.calendar, type: "date", editable: true },
];

const Profile = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState("");
    // ✅ FIX 2: track local image preview URL
    const [previewUrl, setPreviewUrl] = useState(null);
    const fileRef = useRef(null);

    useEffect(() => {
        fetch(`${API_BASE}/user/profile`, { credentials: "include" })
            .then(r => r.json())
            .then(d => {
                if (d.status) { setProfile(d.data); setForm(d.data); }
                else setError(d.message || "Failed to load profile.");
            })
            .catch(() => setError("Network error."))
            .finally(() => setLoading(false));
    }, []);

    // ✅ FIX 2: generate preview as soon as a file is picked
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveMsg("");

        try {
            const formData = new FormData();
            formData.append("class", form.class || "");
            formData.append("location", form.location || "");
            formData.append("gender", form.gender || "");
            formData.append("dob", form.dob || "");

            if (fileRef.current?.files[0]) {
                formData.append("profile", fileRef.current.files[0]);
            }

            const res = await fetch(`${API_BASE}/user/profile`, {
                method: "PUT",
                credentials: "include",
                body: formData,
            });

            const d = await res.json();

            if (d.status) {
                // ✅ FIX 1: merge server response into existing profile instead of replacing.
                // This guards against the server returning a partial object that wipes
                // fields like `streak`, causing downstream .streak.current crashes → blank page.
                const updated = { ...profile, ...(d.data || {}) };
                setProfile(updated);
                setForm(updated);
                // ✅ FIX 2: if server returned a new picture URL use it, otherwise keep preview
                if (d.data?.profile_picture) {
                    setPreviewUrl(null); // server URL will be used via updated profile
                }
                setEditing(false);
                setSaveMsg("Saved!");
                setTimeout(() => setSaveMsg(""), 2500);
            } else {
                setSaveMsg(d.message || "Failed to save.");
            }

        } catch {
            setSaveMsg("Network error.");
        }

        setSaving(false);
    };

    const handleCancel = () => {
        setForm(profile);
        // ✅ FIX 2: discard unsaved preview on cancel
        setPreviewUrl(null);
        if (fileRef.current) fileRef.current.value = "";
        setEditing(false);
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-violet-200 border-t-violet-500 animate-spin" />
                <p className="text-xs text-gray-400 font-medium">Loading profile...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="flex items-center justify-center h-64">
            <p className="text-sm text-red-400">{error}</p>
        </div>
    );

    // ✅ FIX 1: guard against profile being null after save (belt-and-suspenders)
    if (!profile) return null;

    const initials = profile.username?.[0]?.toUpperCase() || "?";
    const memberDate = profile.created_at
        ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        : "—";

    // ✅ FIX 2: previewUrl wins while editing, then fall back to server picture
    const avatarSrc = previewUrl || profile.profile_picture;

    return (
        <>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap');
            .profile-root * { font-family: 'Nunito', sans-serif; }
            .avatar-ring { background: conic-gradient(from 0deg, #FF5500, #8B2FC9, #0088FF, #00CC44, #FF5500); }
            .stat-card { transition: transform 0.18s, box-shadow 0.18s; }
            .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(139,47,201,0.10); }
            .field-row { transition: background 0.12s; }
            .field-row:hover { background: #fafafa; }
            input[type=date]::-webkit-calendar-picker-indicator { opacity: 0.5; cursor: pointer; }
            `}</style>

            <div className="profile-root min-h-full bg-gray-50 pb-12">

                {/* Hero banner */}
                <div className="relative h-28 sm:h-36 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 overflow-hidden">
                    <button
                        onClick={() => navigate("/creatives")}
                        className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold backdrop-blur-sm transition"
                    >
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 5l-7 7 7 7" />
                        </svg>
                        <span>Back to Canvas</span>
                    </button>
                    <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
                    <div className="absolute -bottom-12 left-1/3 w-56 h-56 rounded-full bg-white/5" />
                    <div className="absolute top-4 left-1/4 w-20 h-20 rounded-full bg-white/10" />
                </div>

                <div className="max-w-2xl mx-auto px-4 sm:px-6">

                    {/* Avatar + name card */}
                    <div className="relative bg-white rounded-2xl shadow-sm border border-gray-100 px-5 pt-4 pb-5 -mt-10 sm:-mt-12 mb-4">
                        <div className="flex items-end gap-4">

                            {/* Avatar */}
                            <div className="relative shrink-0 -mt-10 sm:-mt-14">
                                <div className="avatar-ring p-[2.5px] rounded-full">
                                    <div className="bg-white p-0.5 rounded-full">
                                        {/* ✅ FIX 2: show preview or server picture */}
                                        {avatarSrc ? (
                                            <img
                                                src={avatarSrc}
                                                alt={profile.username}
                                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-2xl sm:text-3xl font-black text-white">
                                                {initials}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {editing && (
                                    <button
                                        onClick={() => fileRef.current?.click()}
                                        className="absolute bottom-0 right-0 w-7 h-7 bg-violet-600 rounded-full flex items-center justify-center shadow-lg hover:bg-violet-700 transition"
                                    >
                                        <Icon d={icons.camera} size={13} strokeWidth={2} />
                                    </button>
                                )}
                                {/* ✅ FIX 2: onChange triggers preview */}
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                            </div>

                            {/* Name + meta */}
                            <div className="flex-1 min-w-0 pb-1">
                                <h1 className="text-lg sm:text-xl font-black text-gray-900 truncate">{profile.username}</h1>
                                <p className="text-xs text-gray-400 truncate">{profile.email}</p>
                                <p className="text-[11px] text-gray-300 mt-0.5">Member since {memberDate}</p>
                            </div>

                            {/* Edit / Save / Cancel */}
                            <div className="shrink-0 flex gap-2 pb-1">
                                {!editing ? (
                                    <button onClick={() => setEditing(true)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-bold transition">
                                        <Icon d={icons.edit} size={13} strokeWidth={2} />
                                        <span className="hidden sm:inline">Edit</span>
                                    </button>
                                ) : (
                                    <>
                                        <button onClick={handleCancel}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold transition">
                                            <Icon d={icons.cancel} size={13} strokeWidth={2.5} />
                                            <span className="hidden sm:inline">Cancel</span>
                                        </button>
                                        <button onClick={handleSave} disabled={saving}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-xs font-bold transition">
                                            {saving
                                                ? <div className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                                : <Icon d={icons.save} size={13} strokeWidth={2} />
                                            }
                                            <span className="hidden sm:inline">{saving ? "Saving..." : "Save"}</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {saveMsg && (
                            <p className={`text-xs mt-2 font-semibold ${saveMsg === "Saved!" ? "text-green-500" : "text-red-400"}`}>
                                {saveMsg}
                            </p>
                        )}
                    </div>

                    {/* Streak stats */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        {[
                            { label: "Current Streak", value: profile.streak?.current ?? "—", unit: profile.streak?.current != null ? "days" : "", icon: icons.zap, color: "from-orange-400 to-amber-400" },
                            { label: "Longest Streak", value: profile.streak?.longest ?? "—", unit: profile.streak?.longest != null ? "days" : "", icon: icons.award, color: "from-violet-400 to-purple-500" },
                            { label: "Last Active", value: profile.streak?.last_active ? new Date(profile.streak.last_active).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—", unit: "", icon: icons.clock, color: "from-teal-400 to-cyan-400" },
                        ].map(({ label, value, unit, icon, color }) => (
                            <div key={label} className="stat-card bg-white rounded-2xl border border-gray-100 shadow-sm p-3 sm:p-4 flex flex-col items-center text-center gap-1">
                                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-1`}>
                                    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                                        <path d={icon} />
                                    </svg>
                                </div>
                                <p className="text-base sm:text-lg font-black text-gray-800 leading-none">
                                    {value}{unit && <span className="text-[10px] font-semibold text-gray-400 ml-0.5">{unit}</span>}
                                </p>
                                <p className="text-[10px] text-gray-400 font-semibold leading-tight">{label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Profile details */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
                            <h3 className="text-sm font-black text-gray-800">Profile Details</h3>
                            {editing && <span className="text-[11px] text-violet-500 font-semibold">Editing — tap a field to update</span>}
                        </div>

                        <div className="divide-y divide-gray-50">
                            {FIELD_CONFIG.map(({ key, label, icon, type, editable, placeholder, options }) => {
                                const value = profile[key];
                                const displayValue = type === "date" && value
                                    ? new Date(value).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                                    : value || "—";

                                return (
                                    <div key={key} className="field-row flex items-center gap-3 px-5 py-3.5">
                                        <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                                            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                                <path d={icon} />
                                            </svg>
                                        </div>
                                        <span className="text-xs font-semibold text-gray-400 w-28 shrink-0">{label}</span>
                                        <div className="flex-1 flex justify-end">
                                            {editing && editable ? (
                                                type === "select" ? (
                                                    <select
                                                        value={form[key] || ""}
                                                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                                        className="text-xs font-semibold text-gray-800 border border-violet-200 rounded-lg px-2.5 py-1.5 bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-300 cursor-pointer"
                                                    >
                                                        <option value="">Select...</option>
                                                        {options.map(o => <option key={o} value={o}>{o}</option>)}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type={type}
                                                        value={form[key] || ""}
                                                        placeholder={placeholder}
                                                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                                        className="text-xs font-semibold text-gray-800 border border-violet-200 rounded-lg px-2.5 py-1.5 bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-300 w-full max-w-[180px] sm:max-w-[220px]"
                                                    />
                                                )
                                            ) : (
                                                <span className={`text-xs font-semibold ${value ? "text-gray-800" : "text-gray-300"}`}>
                                                    {displayValue}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Profile;