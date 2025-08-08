import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { Home } from "./Components/homepage";
import { Footer } from "./Components/footer";
import LoginSignup from "./Components/Auth/LoginSignUp";
import Telerehabilitation from "./Components/Telerehabilitation";
import ContactUs from "./Components/ContactUs";
import Achievement from './Components/Achievement';
import Team from "./Components/Team";
import ExerciseDetail from "./Components/ExerciseDetail";
import '@fortawesome/fontawesome-free/css/all.min.css';
import FloatingGuide from "./Components/FloatingGuide"; // Import the floating guide component

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

    // Idle timeout (1 min)
    const idleTimeout = 1 * 60 * 1000;
    const resetIdleTimer = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        handleLogout("You were logged out due to inactivity.");
      }, idleTimeout);
    };
    window.onmousemove = window.onkeydown = resetIdleTimer;
    resetIdleTimer();
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
    // Don't use navigate here, as App is outside Router. Let routes handle redirect.
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
          // Optionally fetch user info from backend here using decoded.user_id
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
    // eslint-disable-next-line
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
        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {/* Floating guidance button appears on all pages */}
      <FloatingGuide />
      <Footer />
    </Router>
  );
};
