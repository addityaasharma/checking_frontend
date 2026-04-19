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

const PrivateRoute = () => {
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    fetch("/v1/user/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setIsAuth(data.status))
      .catch(() => setIsAuth(false))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <h2>Loading...</h2>;
  return isAuth ? <Outlet /> : <Navigate to="/login" />;
};

const App = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Auth />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Auth guard wraps all protected routes */}
      <Route element={<PrivateRoute />}>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<ConceptExplainer />} />
          <Route path="subjects" element={<Subjects />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="saved" element={<SavedAnswers />} />
          <Route path="streak/:id" element={<UserStreak />} />
          <Route path="profile" element={<Profile />} />
          <Route path="creatives" element={<Creatives />} />
        </Route>
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default App;