import React, { useState, useRef } from "react";
import {API_BASE} from "../api";


// ── tiny logo ──────────────────────────────────────────────────────────────
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

// ── OTP input row ──────────────────────────────────────────────────────────
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

// ── step indicator ─────────────────────────────────────────────────────────
const StepDots = ({ current, total }) => (
    <div className="flex items-center justify-center gap-1.5 mb-6">
        {Array.from({ length: total }).map((_, i) => (
            <div
                key={i}
                className={`rounded-full transition-all ${i < current
                    ? "w-5 h-1.5 bg-violet-600"
                    : i === current
                        ? "w-5 h-1.5 bg-violet-600"
                        : "w-1.5 h-1.5 bg-gray-200"
                    }`}
            />
        ))}
    </div>
);

// ── main ForgotPassword component ─────────────────────────────────────────
const ForgotPassword = () => {
    // step: "email" | "verify" | "reset" | "success"
    const [step, setStep] = useState("email");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("      ");
    const [passwords, setPasswords] = useState({ password: "", confirm: "" });

    const clearError = () => setError("");

    const stepIndex = { email: 0, verify: 1, reset: 2, success: 3 };

    // ── step 1: send reset email ─────────────────────────────────────────────
    const handleSendEmail = async () => {
        if (!email) return setError("Please enter your email address.");
        setLoading(true);
        clearError();
        try {
            const res = await fetch(`${API_BASE}/v1/user/forgot-password/bobo`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (data.status) {
                setStep("verify");
            } else {
                setError(data.message || "Failed to send reset code.");
            }
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // ── step 2: verify OTP ───────────────────────────────────────────────────
    const handleVerifyOTP = async () => {
        const code = otp.trim();
        if (code.length < 6) return setError("Please enter the 6-digit code.");
        setLoading(true);
        clearError();
        try {
            const res = await fetch(`${API_BASE}/v1/user/forgot-password/bobo_verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, otp: code }),
            });
            const data = await res.json();
            if (data.status) {
                setStep("reset");
            } else {
                setError(data.message || "Invalid or expired code.");
            }
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!passwords.password) return setError("Please enter a new password.");
        if (passwords.password.length < 8) return setError("Password must be at least 8 characters.");
        if (passwords.password !== passwords.confirm) return setError("Passwords do not match.");

        setLoading(true);
        clearError();

        try {
            const res = await fetch(`${API_BASE}/v1/user/forgot-password/bobo_reset`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    otp: otp.trim(),
                    password: passwords.password
                }),
            });

            const data = await res.json();
            if (data.status) {
                setStep("success");
            } else {
                setError(data.message || "Failed to reset password.");
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

                    {/* step dots — hide on success */}
                    {step !== "success" && (
                        <StepDots current={stepIndex[step]} total={3} />
                    )}

                    {/* ── STEP 1: EMAIL ── */}
                    {step === "email" && (
                        <div>
                            <div className="text-center mb-6">
                                <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-7 h-7 text-violet-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900">Forgot password?</h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    No worries — enter your email and we'll send you a reset code.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Email address</label>
                                    <input
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSendEmail()}
                                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900 placeholder-gray-400 transition"
                                    />
                                </div>

                                {error && <p className="text-sm text-red-500">{error}</p>}

                                <button
                                    onClick={handleSendEmail}
                                    disabled={loading}
                                    className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-60"
                                >
                                    {loading ? "Sending…" : "Send reset code"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 2: OTP ── */}
                    {step === "verify" && (
                        <div>
                            <button
                                onClick={() => { setStep("email"); clearError(); }}
                                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition mb-6"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                                Back
                            </button>

                            <div className="text-center mb-6">
                                <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-7 h-7 text-violet-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900">Check your email</h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    Code sent to <span className="font-medium text-gray-700">{email}</span>
                                </p>
                            </div>

                            <OTPInput value={otp} onChange={setOtp} />

                            {error && <p className="text-sm text-red-500 text-center mt-3">{error}</p>}

                            <button
                                onClick={handleVerifyOTP}
                                disabled={loading}
                                className="mt-5 w-full py-3 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-60"
                            >
                                {loading ? "Verifying…" : "Verify code"}
                            </button>

                            <p className="text-xs text-gray-400 text-center mt-4">
                                Didn't get it?{" "}
                                <span
                                    className="text-violet-600 cursor-pointer hover:underline"
                                    onClick={handleSendEmail}
                                >
                                    Resend code
                                </span>
                            </p>
                        </div>
                    )}

                    {/* ── STEP 3: NEW PASSWORD ── */}
                    {step === "reset" && (
                        <div>
                            <button
                                onClick={() => { setStep("verify"); clearError(); }}
                                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition mb-6"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                                Back
                            </button>

                            <div className="text-center mb-6">
                                <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-7 h-7 text-violet-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900">Set new password</h2>
                                <p className="text-sm text-gray-500 mt-1">Must be at least 8 characters.</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1.5">New password</label>
                                    <input
                                        type="password"
                                        placeholder="Min. 8 characters"
                                        value={passwords.password}
                                        onChange={(e) => setPasswords({ ...passwords, password: e.target.value })}
                                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900 placeholder-gray-400 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Confirm new password</label>
                                    <input
                                        type="password"
                                        placeholder="Re-enter password"
                                        value={passwords.confirm}
                                        onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                        onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
                                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900 placeholder-gray-400 transition"
                                    />
                                </div>

                                {error && <p className="text-sm text-red-500">{error}</p>}

                                <button
                                    onClick={handleResetPassword}
                                    disabled={loading}
                                    className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-60"
                                >
                                    {loading ? "Updating…" : "Reset password"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── SUCCESS ── */}
                    {step === "success" && (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">Password updated!</h2>
                            <p className="text-sm text-gray-500 mb-6">
                                Your password has been reset successfully. You can now sign in.
                            </p>
                            <a
                                href="/login"
                                className="inline-block w-full py-3 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition text-center"
                            >
                                Back to sign in
                            </a>
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

export default ForgotPassword;