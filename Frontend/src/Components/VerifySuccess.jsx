// src/pages/VerifySuccess.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function VerifySuccess() {
  const query = new URLSearchParams(useLocation().search);
  const already = query.get("already");

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      {already ? (
        <h1>Your email was already verified ✅</h1>
      ) : (
        <h1>Email Verified Successfully ✅</h1>
      )}
      <p>You can now log in to your account.</p>
      <Link to="/login">
        <button style={{
          padding: "10px 20px",
          background: "#4CAF50",
          color: "white",
          border: "none",
          cursor: "pointer",
          borderRadius: "5px"
        }}>
          Go to Login
        </button>
      </Link>
    </div>
  );
}
