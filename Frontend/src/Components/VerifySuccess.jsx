import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function VerifySuccess() {
  const query = new URLSearchParams(useLocation().search);
  const already = query.get("already");
  const verified = query.get("verified");

  // Decide message
  let heading = "Email verification result";
  if (already) {
    heading = "Your email has already been verified ✅";
  } else if (verified) {
    heading = "Email Verified Successfully ✅";
  } else {
    heading = "Email verification completed";
  }

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>{heading}</h1>
      <p>You can now log in to your account.</p>
      <Link to="/auth">
        <button
          style={{
            padding: "10px 20px",
            background: "#4CAF50",
            color: "white",
            border: "none",
            cursor: "pointer",
            borderRadius: "5px",
            marginTop: "10px",
          }}
        >
          Go to Login
        </button>
      </Link>
    </div>
  );
}
