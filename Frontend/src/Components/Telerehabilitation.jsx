import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Telerehab.css";

// Exercise Data
const upperBodyExercises = [
  { name: "Shoulder Circles", path: "/exercises/shoulder-circles" },
  { name: "Arm Raises", path: "/exercises/arm-raises" },
  { name: "Wall Push-ups", path: "/exercises/wall-pushups" },
  { name: "Elbow Flexion", path: "/exercises/elbow-flexion" },
  { name: "Wrist Rotations", path: "/exercises/wrist-rotations" },
  { name: "Squats", path: "/exercises/squats" },
  { name: "Finger Twirling", path: "/exercises/finger-twirling" },
  { name: "Head Rotation", path: "/exercises/head-rotation" },
  { name: "Fist Rotation", path: "/exercises/fist-rotation" }
];

const lowerBodyExercises = [
  { name: "Knee Extensions", path: "/exercises/knee-extensions" },
  { name: "Heel Slides", path: "/exercises/heel-slides" },
  { name: "Ankle Pumps", path: "/exercises/ankle-pumps" },
  { name: "Glute Bridges", path: "/exercises/glute-bridges" },
  { name: "Standing Marches", path: "/exercises/standing-marches" },
];

// Exercise Navigation Pills
const ExerciseNav = ({ exercises }) => (
  <div className="exercise-nav-list">
    {exercises.map((ex, idx) => (
      <Link
        key={ex.name}
        to={ex.path}
        className="exercise-nav-pill"
        style={{ animationDelay: `${idx * 0.07}s` }}
      >
        <span className="exercise-icon">{String.fromCodePoint(0x1F4AA + idx)}</span>
        {ex.name}
      </Link>
    ))}
  </div>
);

// Profile Modal Component with Logout Button
const ProfileModal = ({ user, onClose, onSave, onLogout }) => {
  const [editData, setEditData] = useState({
    bio: user.bio || "",
    profilePicture: user.profilePicture || "",
  });
  const [saveMsg, setSaveMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEditData({
      bio: user.bio || "",
      profilePicture: user.profilePicture || "",
    });
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditData(prev => ({ ...prev, profilePicture: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSaveMsg("");
    const token = localStorage.getItem("token");
    const res = await fetch("http://localhost:5000/api/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(editData),
    });
    const data = await res.json();
    if (data.user) {
      onSave(data.user);
      setSaveMsg("Profile updated!");
    } else if (data.error) {
      setSaveMsg(data.error);
    }
    setLoading(false);
    onClose();
  };

  return (
    <div className="tr-modal-overlay" onClick={onClose}>
      <div className="tr-modal-content" onClick={e => e.stopPropagation()}>
        <h2>Edit Profile</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ textAlign: "center" }}>
            <label htmlFor="profile-pic-input" style={{ cursor: "pointer" }}>
              <img
                src={editData.profilePicture || "/images/default-avatar.png"}
                alt="Profile"
                className="tr-profile-modal-avatar"
              />
              <input
                id="profile-pic-input"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
            </label>
          </div>
          <label>
            Name:
            <input
              name="username"
              value={user.username || user.name || ""}
              disabled
              style={{ background: "#f0f0f0", color: "#888" }}
            />
          </label>
          <label>
            Email:
            <input
              name="email"
              value={user.email || ""}
              disabled
              style={{ background: "#f0f0f0", color: "#888" }}
              required
            />
          </label>
          <label>
            Bio:
            <textarea
              name="bio"
              value={editData.bio}
              onChange={handleChange}
              rows={2}
            />
          </label>
          <div className="tr-modal-actions" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <button type="submit" className="primary-btn" disabled={loading}>
                {loading ? "Saving..." : "Save"}
              </button>
              <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            </div>
            <button
              type="button"
              className="logout-btn"
              style={{
                background: "#e57373",
                color: "#fff",
                border: "none",
                padding: "0.5em 1.2em",
                borderRadius: "4px",
                marginLeft: "1em",
                cursor: "pointer",
                fontWeight: 600
              }}
              onClick={() => {
                onLogout();
                onClose();
              }}
            >
              Logout
            </button>
          </div>
          {saveMsg && <div style={{ marginTop: "1em", color: "#2563eb" }}>{saveMsg}</div>}
        </form>
      </div>
    </div>
  );
};

// Main Telerehabilitation Page
const Telerehabilitation = ({ user: initialUser, onLogout }) => {
  const [user, setUser] = useState(initialUser || {
    username: "",
    name: "",
    email: "",
    bio: "",
    profilePicture: "",
  });
  const [profileOpen, setProfileOpen] = useState(false);
  const [section, setSection] = useState("upper");
  const navigate = useNavigate();

  // Fetch full profile from backend on mount and when modal opens
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetch("http://localhost:5000/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) setUser(data.user);
        });
    }
  }, []);

  useEffect(() => {
    if (profileOpen) {
      const token = localStorage.getItem("token");
      fetch("http://localhost:5000/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) setUser(data.user);
        });
    }
  }, [profileOpen]);

  // Save profile changes
  const handleProfileSave = (updated) => setUser(updated);

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser({
      username: "",
      name: "",
      email: "",
      bio: "",
      profilePicture: "",
    });
    if (onLogout) onLogout();
    navigate("/auth");
  };

  return (
    <div className="tr-main-bg">
      {/* Header */}
      <header className="tr-header">
        {/* Animated Rehab Objects - Centered */}
        <div className="tr-header-anim-bg" aria-hidden="true">
          {/* (SVGs omitted for brevity, keep as in your original code) */}
        </div>
        <h1 className="tr-title">Telerehabilitation</h1>
        <div className="tr-profile-icon" onClick={() => setProfileOpen(true)} tabIndex={0} title="Profile">
          <img
            src={user.profilePicture || "/images/default-avatar.png"}
            alt="Profile"
            className="tr-profile-avatar"
          />
          <span className="tr-profile-name">{user.username || user.name}</span>
        </div>
      </header>

      {/* Section Tabs */}
      <div className="tr-tabs">
        <button
          className={section === "upper" ? "active" : ""}
          onClick={() => setSection("upper")}
        >
          Upper Body
        </button>
        <button
          className={section === "lower" ? "active" : ""}
          onClick={() => setSection("lower")}
        >
          Lower Body
        </button>
      </div>

      {/* Section Content */}
      <div className="tr-section-content">
        <h2>
          {section === "upper" ? "Upper Body Exercises" : "Lower Body Exercises"}
        </h2>
        <ExerciseNav exercises={section === "upper" ? upperBodyExercises : lowerBodyExercises} />
      </div>

      {/* Profile Modal */}
      {profileOpen && (
        <ProfileModal
          user={user}
          onClose={() => setProfileOpen(false)}
          onSave={handleProfileSave}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
};

export default Telerehabilitation;
