import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginSignup.css";
import Header from "../Header";
import NavDrawer from "../NavDrawer";

export default function LoginSignup({ onAuthSuccess }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const logoSrc = "/images/Circle Only.svg";
  const handleMenuToggle = () => setMenuOpen((prev) => !prev);
  const handleCloseMenu = () => setMenuOpen(false);

  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState("");
  const [resetError, setResetError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const navigate = useNavigate();

  // Lowercase email on change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: name === "email" ? value.toLowerCase() : value
    });
  };

  // For forgot password email field, also lowercase
  const handleResetEmailChange = (e) => {
    setResetEmail(e.target.value.toLowerCase());
  };

  // Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (/[A-Z]/.test(form.email)) {
      setError("Please enter your email in lowercase letters only (e.g., user@example.com).");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (res.ok && data.token && data.user) {
        onAuthSuccess(data.user, data.token);
        navigate("/telerehabilitation");
      } else {
        setError(data.error || "Invalid email or password");
      }
    } catch (err) {
      setError("Could not connect to server. Please try again.",err);
    }
    setLoading(false);
  };

  // Signup
  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (/[A-Z]/.test(form.email)) {
      setError("Please enter your email in lowercase letters only (e.g., user@example.com).");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password
        }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setSignupSuccess(true);
        setIsLogin(true);
        setForm({ username: "", email: "", password: "" });
        setError("");
      } else {
        setError(data.error || "Signup failed. Please try again.");
      }
    } catch (err) {
      setError("Could not connect to server. Please try again.",err);
    }
    setLoading(false);
  };

  // Forgot password
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setResetError("");
    if (!resetEmail) {
      setResetError("Please enter your email address");
      return;
    }
    if (/[A-Z]/.test(resetEmail)) {
      setResetError("Please enter your email in lowercase letters only (e.g., user@example.com).");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetSent(true);
        setResetError("");
      } else {
        setResetError(data.error || "Could not send reset link.");
      }
    } catch (err) {
      setResetError("Could not connect to server. Please try again.",err);
    }
    setLoading(false);
  };

  const handleBackToLogin = () => {
    setIsForgot(false);
    setResetSent(false);
    setResetEmail("");
    setResetError("");
    setError("");
  };

  return (
    <>
      <Header
        logoSrc={logoSrc}
        menuOpen={menuOpen}
        onMenuToggle={handleMenuToggle}
        onNavLinkClick={handleCloseMenu}
      />
      <NavDrawer isOpen={menuOpen} onClose={handleCloseMenu} />

      <div className="auth-container" style={{ paddingTop: "72px" }}>
        <div className="auth-toggle">
          <button
            className={isLogin && !isForgot ? "active" : ""}
            onClick={() => {
              setIsLogin(true);
              setIsForgot(false);
              setError("");
              setSignupSuccess(false);
            }}
            disabled={loading}
          >
            Login
          </button>
          <button
            className={!isLogin && !isForgot ? "active" : ""}
            onClick={() => {
              setIsLogin(false);
              setIsForgot(false);
              setError("");
              setSignupSuccess(false);
            }}
            disabled={loading}
          >
            Sign Up
          </button>
        </div>
        {isForgot ? (
          <form className="forgot-form" onSubmit={handleForgotPassword}>
            <h2>Reset Password</h2>
            {resetSent ? (
              <div className="success-msg">
                If an account exists for <b>{resetEmail}</b>, a password reset link has been sent.
              </div>
            ) : (
              <>
                <input
                  type="email"
                  placeholder="Enter your email"
                  required
                  value={resetEmail}
                  onChange={handleResetEmailChange}
                  disabled={loading}
                />
                <div style={{ fontSize: "0.9rem", color: "#888", marginBottom: "0.5rem" }}>
                  Please enter your email in lowercase (e.g., user@example.com)
                </div>
                <button type="submit" disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
                {resetError && <div className="error-msg">{resetError}</div>}
              </>
            )}
            <button
              type="button"
              className="secondary-btn"
              style={{ marginTop: "1rem" }}
              onClick={handleBackToLogin}
              disabled={loading}
            >
              Back to Login
            </button>
          </form>
        ) : isLogin ? (
          <form className="login-form" onSubmit={handleLogin}>
            <h2>Login</h2>
            {signupSuccess && (
              <div className="success-msg">
                Signup successful! Please log in with your credentials.
              </div>
            )}
            <input
              type="email"
              name="email"
              placeholder="Email"
              required
              value={form.email}
              onChange={handleChange}
              disabled={loading}
            />
            <div style={{ fontSize: "0.9rem", color: "#888", marginBottom: "0.5rem" }}>
              Please enter your email in lowercase (e.g., user@example.com)
            </div>
            <input
              type="password"
              name="password"
              placeholder="Password"
              required
              value={form.password}
              onChange={handleChange}
              disabled={loading}
            />
            <button type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
            <div style={{ marginTop: "0.7rem" }}>
              <button
                type="button"
                className="link-btn"
                style={{
                  background: "none",
                  border: "none",
                  color: "#2563eb",
                  textDecoration: "underline",
                  cursor: "pointer",
                  fontSize: "0.97rem",
                  padding: 0,
                }}
                onClick={() => {
                  setIsForgot(true);
                  setError("");
                  setSignupSuccess(false);
                }}
                disabled={loading}
              >
                Forgot password?
              </button>
            </div>
            {error && <div className="error-msg">{error}</div>}
          </form>
        ) : (
          <form className="signup-form" onSubmit={handleSignup}>
            <h2>Sign Up</h2>
            <input
              type="text"
              name="username"
              placeholder="Username"
              required
              value={form.username}
              onChange={handleChange}
              disabled={loading}
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              required
              value={form.email}
              onChange={handleChange}
              disabled={loading}
            />
            <div style={{ fontSize: "0.9rem", color: "#888", marginBottom: "0.5rem" }}>
              Please enter your email in lowercase (e.g., user@example.com)
            </div>
            <input
              type="password"
              name="password"
              placeholder="Password"
              required
              value={form.password}
              onChange={handleChange}
              disabled={loading}
            />
            <button type="submit" disabled={loading}>
              {loading ? "Signing up..." : "Sign Up"}
            </button>
            {error && <div className="error-msg">{error}</div>}
          </form>
        )}
      </div>
    </>
  );
}
