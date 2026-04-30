import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import Auth from "./auth/Auth";
import DashboardLayout from "./component/DashboardLayout";
import ForgotPassword from "./auth/ForgotPassword";
import ConceptExplainer from "./pages/ConceptExplainer";
import Subjects from "./pages/Subjects";
import Timetable from "./pages/Timetable";
import SavedAnswers from "./pages/SavedAnswers";
import UserStreak from "./pages/UserStreak";
import Profile from "./pages/Profile";
import Creatives from "./pages/Creatives";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Terms from "./pages/Terms";
import {API_BASE} from "../src/api"

const PrivateRoute = () => {
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/v1/user/me`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setIsAuth(data.status))
      .catch(() => setIsAuth(false))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#fafaf9',
      fontFamily: "'Nunito', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@900&display=swap');
        @keyframes sp-char {
          0% { opacity: 0; transform: translateY(20px) scale(0.8); }
          60% { opacity: 1; transform: translateY(-4px) scale(1.05); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes sp-dot {
          0%, 80%, 100% { transform: scale(0.5); opacity: 0.2; }
          40% { transform: scale(1.2); opacity: 1; }
        }
        .sp-char { display: inline-block; animation: sp-char 0.5s cubic-bezier(.34,1.56,.64,1) both; }
        .sp-dot  { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin: 0 4px; animation: sp-dot 1.2s infinite ease-in-out; }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
        {/* Animated logo */}
        <div style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1 }}>
          {'Scratch'.split('').map((c, i) => (
            <span key={i} className="sp-char" style={{ color: '#1a1a2e', animationDelay: `${i * 0.055}s` }}>{c}</span>
          ))}
          {[['P', '#FF5500'], ['a', '#8B2FC9'], ['d', '#0088FF']].map(([c, col], i) => (
            <span key={i} className="sp-char" style={{ color: col, animationDelay: `${(7 + i) * 0.055}s` }}>{c}</span>
          ))}
        </div>

        {/* Bouncing dots loader */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className="sp-dot" style={{ background: '#FF5500', animationDelay: '0s' }} />
          <span className="sp-dot" style={{ background: '#8B2FC9', animationDelay: '0.2s' }} />
          <span className="sp-dot" style={{ background: '#0088FF', animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  );
  return isAuth ? <Outlet /> : <Navigate to="/login" />;
};

const PublicRoute = () => {
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/v1/user/me`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setIsAuth(data.status))
      .catch(() => setIsAuth(false))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#fafaf9',
      fontFamily: "'Nunito', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@900&display=swap');
        @keyframes sp-char {
          0% { opacity: 0; transform: translateY(20px) scale(0.8); }
          60% { opacity: 1; transform: translateY(-4px) scale(1.05); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes sp-dot {
          0%, 80%, 100% { transform: scale(0.5); opacity: 0.2; }
          40% { transform: scale(1.2); opacity: 1; }
        }
        .sp-char { display: inline-block; animation: sp-char 0.5s cubic-bezier(.34,1.56,.64,1) both; }
        .sp-dot  { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin: 0 4px; animation: sp-dot 1.2s infinite ease-in-out; }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
        {/* Animated logo */}
        <div style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1 }}>
          {'Scratch'.split('').map((c, i) => (
            <span key={i} className="sp-char" style={{ color: '#1a1a2e', animationDelay: `${i * 0.055}s` }}>{c}</span>
          ))}
          {[['P', '#FF5500'], ['a', '#8B2FC9'], ['d', '#0088FF']].map(([c, col], i) => (
            <span key={i} className="sp-char" style={{ color: col, animationDelay: `${(7 + i) * 0.055}s` }}>{c}</span>
          ))}
        </div>

        {/* Bouncing dots loader */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className="sp-dot" style={{ background: '#FF5500', animationDelay: '0s' }} />
          <span className="sp-dot" style={{ background: '#8B2FC9', animationDelay: '0.2s' }} />
          <span className="sp-dot" style={{ background: '#0088FF', animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  );
  return isAuth ? <Navigate to="/creatives" replace /> : <Outlet />;
};

const App = () => {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Auth />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
      </Route>

      <Route element={<PrivateRoute />}>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/creatives" replace />} />
          <Route path="subjects" element={<Subjects />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="saved" element={<SavedAnswers />} />
          <Route path="saved/:id" element={<SavedAnswers />} />
          <Route path="streak" element={<UserStreak />} />
          <Route path="profile" element={<Profile />} />
          <Route path="creatives" element={<Creatives />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default App;