import React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import Auth from "./auth/Auth";
import DashboardLayout from "./component/DashboardLayout";
import ForgotPassword from "./auth/ForgotPassword";
import Subjects from "./pages/Subjects";
import Timetable from "./pages/Timetable";
import SavedAnswers from "./pages/SavedAnswers";
import UserStreak from "./pages/UserStreak";
import Profile from "./pages/Profile";
import Creatives from "./pages/Creatives";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Terms from "./pages/Terms";
import Render from "./component/Render";
import { UserProvider, useUser } from "./utils/UserContext";

const PrivateRoute = () => {
  const { isAuth, loading } = useUser();
  if (loading) return <Render />;
  return isAuth ? <Outlet /> : <Navigate to="/login" replace />;
};

const PublicRoute = () => {
  const { isAuth, loading } = useUser();
  if (loading) return <Render />;
  return isAuth ? <Navigate to="/creatives" replace /> : <Outlet />;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Auth />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
      </Route>

      <Route path="/creatives" element={<DashboardLayout />}>
        <Route index element={<Creatives />} />
      </Route>

      <Route element={<PrivateRoute />}>
        <Route path="/profile" element={<DashboardLayout />}>
          <Route index element={<Profile />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/creatives" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <UserProvider>
      <AppRoutes />
    </UserProvider>
  );
};

export default App;