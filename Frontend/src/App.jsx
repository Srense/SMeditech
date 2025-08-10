import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { Home } from "./Components/homepage";
import { Footer } from "./Components/footer";
import LoginSignup from "./Components/Auth/LoginSignUp";
import Telerehabilitation from "./Components/Telerehabilitation";
import ContactUs from "./Components/ContactUs";
import Achievement from "./Components/Achievement";
import Team from "./Components/Team";
import ExerciseDetail from "./Components/ExerciseDetail";
import "@fortawesome/fontawesome-free/css/all.min.css";
import FloatingGuide from "./Components/FloatingGuide";

// New pages for email verification
import VerifySuccess from "./Components/VerifySuccess.jsx";
import VerifyFailure from "./Components/verifyFailure.jsx";
import ResetPassword from "./Components/ResetPassword.jsx";

export const App = () => {
  const [user, setUser] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const idleTimer = useRef(null);
  const absoluteTimer = useRef(null);

  // Setup inactivity and absolute timers
  const setupSessionTimers = (token) => {
    if (absoluteTimer.current) clearTimeout(absoluteTimer.current);
    if (idleTimer.current) clearTimeout(idleTimer.current);

    let exp = null;
    try {
      exp = jwtDecode(token).exp;
    } catch {
      handleLogout("Invalid session. Please login again.");
      return;
    }
    const expiresIn = exp * 1000 - Date.now();
    absoluteTimer.current = setTimeout(() => {
      handleLogout("Session expired. Please log in again.");
    }, expiresIn);
  };

  // Logout handler
  const handleLogout = (msg) => {
    localStorage.removeItem("token");
    setUser(null);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (absoluteTimer.current) clearTimeout(absoluteTimer.current);
    window.onmousemove = null;
    window.onkeydown = null;
    if (msg) alert(msg);
  };

  // Handle successful login/signup
  const handleAuthSuccess = (userData, token) => {
    setUser(userData);
    localStorage.setItem("token", token);
    setupSessionTimers(token);
  };

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 > Date.now()) {
          setUser({ _id: decoded.user_id });
          setupSessionTimers(token);
        } else {
          localStorage.removeItem("token");
        }
      } catch {
        localStorage.removeItem("token");
      }
    }
    setLoadingSession(false);

    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (absoluteTimer.current) clearTimeout(absoluteTimer.current);
      window.onmousemove = null;
      window.onkeydown = null;
    };
  }, []);

  if (loadingSession) return null; // Or a loading spinner

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home user={user} />} />
        <Route
          path="/auth"
          element={
            user ? (
              <Navigate to="/telerehabilitation" replace />
            ) : (
              <LoginSignup onAuthSuccess={handleAuthSuccess} />
            )
          }
        />
        <Route
          path="/telerehabilitation"
          element={
            user ? (
              <Telerehabilitation user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/team" element={<Team />} />
        <Route path="/achievements" element={<Achievement />} />
        <Route
          path="/exercises/:name"
          element={
            user ? (
              <ExerciseDetail user={user} />
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />
        {/* Email Verification Success/Failure Routes */}
        <Route path="/verify-email-success" element={<VerifySuccess />} />
        <Route path="/verify-email-failure" element={<VerifyFailure />} />
        {/* Catch-all route */}
         <Route path="*" element={<Navigate to="/" replace />} /> 
        <Route path="/reset-password/:token" element={<ResetPassword />} />

      </Routes>
      <FloatingGuide />
      <Footer />
    </Router>
  );
};
