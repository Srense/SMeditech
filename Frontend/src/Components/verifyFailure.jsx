// src/pages/VerifyFailure.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function VerifyFailure() {
  const query = new URLSearchParams(useLocation().search);
  const reason = query.get("reason");

  let message = "Email verification failed ❌";
  if (reason === "expired") {
    message = "Your verification link has expired ⏳";
  } else if (reason === "invalid") {
    message = "Invalid verification link 🚫";
  } else if (reason === "notfound") {
    message = "User not found in the system ⚠️";
  }

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>{message}</h1>
      <p>Please try signing up again or request a new verification email.</p>
      <Link to="/">
        <button style={{
          padding: "10px 20px",
          background: "#f44336",
          color: "white",
          border: "none",
          cursor: "pointer",
          borderRadius: "5px"
        }}>
          Go to Home
        </button>
      </Link>
    </div>
  );
}
