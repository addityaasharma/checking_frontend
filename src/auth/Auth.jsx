import React, { useState, useRef } from "react";

const API_BASE = "/v1/user";

const BoboBrand = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
        <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shadow-sm">
            <svg viewBox="0 0 20 20" className="w-5 h-5 fill-white">
                <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm-1 5a1 1 0 112 0v1h1a1 1 0 110 2h-1v3a1 1 0 11-2 0v-3H8a1 1 0 110-2h1V7z" />
            </svg>
        </div>
        <span className="text-2xl font-semibold tracking-tight text-gray-900">
            bo<span className="text-violet-600">bo</span>
        </span>
    </div>
);

const OTPInput = ({ value, onChange }) => {
    const refs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];
    const digits = (value || "      ").split("");

    const handle = (i, e) => {
        const v = e.target.value.replace(/\D/g, "").slice(-1);
        const next = [...digits];
        next[i] = v || " ";
        onChange(next.join(""));
        if (v && i < 5) refs[i + 1].current?.focus();
    };

    const onKey = (i, e) => {
        if (e.key === "Backspace" && !digits[i].trim() && i > 0)
            refs[i - 1].current?.focus();
    };

    return (
        <div className="flex gap-2 justify-center">
            {refs.map((ref, i) => (
                <input
                    key={i}
                    ref={ref}
                    maxLength={1}
                    value={digits[i]?.trim() || ""}
                    onChange={(e) => handle(i, e)}
                    onKeyDown={(e) => onKey(i, e)}
                    className="w-11 h-12 text-center text-lg font-semibold border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900 bg-white transition"
                />
            ))}
        </div>
    );
};

const Auth = () => {
    const [tab, setTab] = useState("login");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [otp, setOtp] = useState("      ");

    const [loginData, setLoginData] = useState({ email: "", password: "" });
    const [signupData, setSignupData] = useState({
        username: "",
        email: "",
        password: "",
        confirm: "",
    });
    const [signupEmail, setSignupEmail] = useState("");

    const clearError = () => setError("");

    const switchTab = (t) => { setTab(t); clearError(); };

    const handleLogin = async () => {
        if (!loginData.email || !loginData.password)
            return setError("Please fill in all fields.");
        setLoading(true);
        clearError();
        try {
            const res = await fetch(`${API_BASE}/login/bobo`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email: loginData.email, password: loginData.password }),
            });
            const data = await res.json();
            if (!data.status) {
                setError(data.message || "Login failed.");
            } else {
                window.location.href = "/";
            }
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleArcLogin = () => {
        setLoading(true);
        clearError();

        const popup = window.open(
            `/v1/user/login/arc?redirect=${encodeURIComponent(window.location.origin + "/arc-callback")}`,
            "arcLogin",
            "width=500,height=600"
        );

        const handleMessage = (event) => {
            if (event.origin !== window.location.origin) return;
            if (event.data?.type === "ARC_LOGIN_SUCCESS") {
                localStorage.setItem("bobo_token", event.data.token);
                window.removeEventListener("message", handleMessage);
                popup.close();
                window.location.href = "/";
            }
            if (event.data?.type === "ARC_LOGIN_ERROR") {
                setError(event.data.message || "Arc login failed.");
                setLoading(false);
                window.removeEventListener("message", handleMessage);
                popup.close();
            }
        };

        window.addEventListener("message", handleMessage);

        const timer = setInterval(() => {
            if (popup.closed) {
                clearInterval(timer);
                setLoading(false);
                window.removeEventListener("message", handleMessage);
            }
        }, 500);
    };

    const handleSignup = async () => {
        if (!signupData.username || !signupData.email || !signupData.password)
            return setError("Please fill in all fields.");
        if (signupData.password !== signupData.confirm)
            return setError("Passwords do not match.");
        setLoading(true);
        clearError();
        try {
            const res = await fetch(`${API_BASE}/signup/bobo`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: signupData.username,
                    email: signupData.email,
                    password: signupData.password,
                }),
            });
            const data = await res.json();
            if (data.status) {
                setSignupEmail(signupData.email);
                setTab("verify");
            } else {
                setError(data.message || "Signup failed.");
            }
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        const code = otp.trim();
        if (code.length < 6) return setError("Please enter the 6-digit code.");
        setLoading(true);
        clearError();
        try {
            const res = await fetch(`${API_BASE}/signup/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email: signupEmail, otp: code }),
            });
            const data = await res.json();
            if (!data.status) {
                setError(data.message || "Verification failed.");
            } else {
                window.location.href = "/";
            }
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                <BoboBrand />

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">

                    {/* ── VERIFY SCREEN ── */}
                    {tab === "verify" && (
                        <div>
                            <div
                                className="flex items-center gap-2 mb-6 cursor-pointer"
                                onClick={() => { setTab("signup"); clearError(); }}
                            >
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                                <span className="text-sm text-gray-400 hover:text-gray-600 transition">Back</span>
                            </div>

                            <div className="text-center mb-6">
                                <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-7 h-7 text-violet-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900">Check your email</h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    We sent a 6-digit code to{" "}
                                    <span className="font-medium text-gray-700">{signupEmail}</span>
                                </p>
                            </div>

                            <OTPInput value={otp} onChange={setOtp} />

                            {error && <p className="text-sm text-red-500 text-center mt-3">{error}</p>}

                            <button
                                onClick={handleVerify}
                                disabled={loading}
                                className="mt-5 w-full py-3 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-60"
                            >
                                {loading ? "Verifying…" : "Verify account"}
                            </button>

                            <p className="text-xs text-gray-400 text-center mt-4">
                                Didn't receive the code?{" "}
                                <span className="text-violet-600 cursor-pointer hover:underline">Resend</span>
                            </p>
                        </div>
                    )}

                    {/* ── LOGIN FORM ── */}
                    {tab === "login" && (
                        <div className="space-y-4">
                            <div className="mb-6">
                                <h2 className="text-xl font-semibold text-gray-900">Welcome back</h2>
                                <p className="text-sm text-gray-500 mt-1">Sign in to your Bobo account</p>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Email address</label>
                                <input
                                    type="email"
                                    placeholder="you@example.com"
                                    value={loginData.email}
                                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900 placeholder-gray-400 transition"
                                />
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-xs font-medium text-gray-600">Password</label>
                                    <a href="/forgot-password" className="text-xs text-violet-600 hover:underline">
                                        Forgot password?
                                    </a>
                                </div>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={loginData.password}
                                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900 placeholder-gray-400 transition"
                                />
                            </div>

                            {error && <p className="text-sm text-red-500">{error}</p>}

                            <button
                                onClick={handleLogin}
                                disabled={loading}
                                className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-60"
                            >
                                {loading ? "Signing in…" : "Sign in"}
                            </button>

                            <div className="flex items-center gap-3 text-xs text-gray-400">
                                <div className="flex-1 h-px bg-gray-100" />
                                or continue with
                                <div className="flex-1 h-px bg-gray-100" />
                            </div>

                            {/* <button
                                onClick={handleArcLogin}
                                disabled={loading}
                                className="w-full py-2.5 border border-gray-200 rounded-xl flex items-center justify-center gap-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                            >
                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 via-pink-500 to-violet-500" />
                                Continue with Arc
                            </button> */}

                            <p className="text-sm text-gray-500 text-center pt-1">
                                Don't have an account?{" "}
                                <span
                                    onClick={() => switchTab("signup")}
                                    className="text-violet-600 font-medium cursor-pointer hover:underline"
                                >
                                    Sign up
                                </span>
                            </p>
                        </div>
                    )}

                    {/* ── SIGNUP FORM ── */}
                    {tab === "signup" && (
                        <div className="space-y-4">
                            <div className="mb-6">
                                <h2 className="text-xl font-semibold text-gray-900">Create an account</h2>
                                <p className="text-sm text-gray-500 mt-1">Start learning smarter with Bobo</p>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Full name</label>
                                <input
                                    type="text"
                                    placeholder="Aarav Shah"
                                    value={signupData.username}
                                    onChange={(e) => setSignupData({ ...signupData, username: e.target.value })}
                                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900 placeholder-gray-400 transition"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Email address</label>
                                <input
                                    type="email"
                                    placeholder="you@example.com"
                                    value={signupData.email}
                                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900 placeholder-gray-400 transition"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
                                <input
                                    type="password"
                                    placeholder="Min. 8 characters"
                                    value={signupData.password}
                                    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900 placeholder-gray-400 transition"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Confirm password</label>
                                <input
                                    type="password"
                                    placeholder="Re-enter password"
                                    value={signupData.confirm}
                                    onChange={(e) => setSignupData({ ...signupData, confirm: e.target.value })}
                                    onKeyDown={(e) => e.key === "Enter" && handleSignup()}
                                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900 placeholder-gray-400 transition"
                                />
                            </div>

                            {error && <p className="text-sm text-red-500">{error}</p>}

                            <button
                                onClick={handleSignup}
                                disabled={loading}
                                className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-60"
                            >
                                {loading ? "Creating account…" : "Create account"}
                            </button>

                            <div className="flex items-center gap-3 text-xs text-gray-400">
                                <div className="flex-1 h-px bg-gray-100" />
                                or continue with
                                <div className="flex-1 h-px bg-gray-100" />
                            </div>

                            {/* <button
                                onClick={handleArcLogin}
                                disabled={loading}
                                className="w-full py-2.5 border border-gray-200 rounded-xl flex items-center justify-center gap-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                            >
                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 via-pink-500 to-violet-500" />
                                Continue with Arc
                            </button> */}

                            <p className="text-xs text-gray-400 text-center leading-relaxed">
                                By signing up, you agree to our{" "}
                                <a href="/terms" className="text-violet-600 hover:underline">Terms</a> and{" "}
                                <a href="/privacy" className="text-violet-600 hover:underline">Privacy Policy</a>.
                            </p>

                            <p className="text-sm text-gray-500 text-center pt-1">
                                Already have an account?{" "}
                                <span
                                    onClick={() => switchTab("login")}
                                    className="text-violet-600 font-medium cursor-pointer hover:underline"
                                >
                                    Sign in
                                </span>
                            </p>
                        </div>
                    )}
                </div>

                <p className="text-center text-xs text-gray-400 mt-6">
                    Study smarter with AI-powered learning © {new Date().getFullYear()} Bobo
                </p>
            </div>
        </div>
    );
};

export default Auth;