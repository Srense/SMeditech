import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE_URL = "https://s-meditech.onrender.com"; // Change this to your backend URL

export default function ResetPassword() {
  const { token } = useParams(); // Extract reset token from URL
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!password || !confirmPassword) {
      setError("Please enter both password fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg("Password reset successful! Redirecting to login...");
        setTimeout(() => {
          navigate("/login"); // Redirect user to login page
        }, 3000);
      } else {
        setError(data.error || "Failed to reset password.");
      }
    } catch {
      setError("Unable to connect to server. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 400, margin: "2rem auto", padding: "1rem", border: "1px solid #ccc", borderRadius: 4 }}>
      <h2>Reset Password</h2>
      <form onSubmit={handleSubmit}>
        <label>
          New Password:
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            disabled={loading}
            style={{ width: "100%", margin: "0.5rem 0" }}
          />
        </label>
        <label>
          Confirm New Password:
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            disabled={loading}
            style={{ width: "100%", margin: "0.5rem 0" }}
          />
        </label>
        {error && <div style={{ color: "red", marginBottom: "1rem" }}>{error}</div>}
        {successMsg && <div style={{ color: "green", marginBottom: "1rem" }}>{successMsg}</div>}
        <button type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Reset Password"}
        </button>
      </form>
    </div>
  );
}
