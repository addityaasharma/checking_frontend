import React, { useState, useEffect } from "react";

const API = "/v1/user/profile";

const Profile = () => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch(API, { credentials: "include" })
            .then(r => r.json())
            .then(d => {
                if (d.status) setProfile(d.data);
                else setError(d.message || "Failed to load profile.");
            })
            .catch(() => setError("Network error."))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <p className="text-sm text-gray-400">Loading profile...</p>
        </div>
    );

    if (error) return (
        <div className="flex items-center justify-center h-64">
            <p className="text-sm text-red-400">{error}</p>
        </div>
    );

    const avatar = profile.profile_picture;
    const initials = profile.username?.[0]?.toUpperCase() || "U";

    const infoItems = [
        { label: "Email", value: profile.email },
        { label: "Class", value: profile.class || "—" },
        { label: "Location", value: profile.location || "—" },
        { label: "Gender", value: profile.gender || "—" },
        { label: "Date of Birth", value: profile.dob ? new Date(profile.dob).toLocaleDateString() : "—" },
        { label: "Member Since", value: profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "—" },
    ];

    return (
        <div className="max-w-2xl mx-auto space-y-5">

            {/* ── Avatar + name ── */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex items-center gap-5">
                {avatar ? (
                    <img
                        src={avatar}
                        alt={profile.username}
                        className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                    />
                ) : (
                    <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center text-2xl font-semibold text-violet-700 flex-shrink-0">
                        {initials}
                    </div>
                )}
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">{profile.username}</h2>
                    <p className="text-sm text-gray-400">{profile.email}</p>
                </div>
            </div>

            {/* ── Streak cards ── */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "Current Streak", value: `${profile.streak.current} days` },
                    { label: "Longest Streak", value: `${profile.streak.longest} days` },
                    { label: "Last Active", value: profile.streak.last_active ? new Date(profile.streak.last_active).toLocaleDateString() : "—" },
                ].map(({ label, value }) => (
                    <div key={label} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 text-center">
                        <p className="text-xs text-gray-400 mb-1">{label}</p>
                        <p className="text-base font-semibold text-violet-600">{value}</p>
                    </div>
                ))}
            </div>

            {/* ── Info ── */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Profile Details</h3>
                <div className="space-y-3">
                    {infoItems.map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                            <span className="text-sm text-gray-400">{label}</span>
                            <span className="text-sm font-medium text-gray-800">{value}</span>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
};

export default Profile;