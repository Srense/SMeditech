import React from "react";
import { Link } from "react-router-dom";

const Header = ({
  logoSrc,
  menuOpen,
  onMenuToggle,
  onNavLinkClick,
  user,
  onProfileClick,
}) => (
  <header className="main-header">
    <div className="corner-logo">
      <img src={logoSrc} alt="Logo" />
      <span className="brand-name">S.MediTech</span>
    </div>
    <nav className="main-nav">
      <Link to="/" onClick={onNavLinkClick}>Home</Link>
      <Link to="/team" onClick={onNavLinkClick}>About</Link>
      <Link to="/contact" onClick={onNavLinkClick}>Contact Us</Link>
      <Link to="/achievements" onClick={onNavLinkClick}>Achievements</Link>
      <Link to="/auth" onClick={onNavLinkClick}>Login / Signup</Link>
    </nav>
    <button
      className={`hamburger${menuOpen ? " open" : ""}`}
      onClick={onMenuToggle}
      aria-label={menuOpen ? "Close menu" : "Open menu"}
      aria-expanded={menuOpen}
      aria-controls="mobile-menu"
      aria-haspopup="true"
    >
      <span />
      <span />
      <span />
    </button>
    {user && (
      <div className="user-profile" onClick={onProfileClick} tabIndex={0} role="button" aria-label="User Profile">
        <img src={user.profilePicture || "/images/default-avatar.png"} alt="User Avatar" className="profile-avatar" />
        <span className="username">{user.username}</span>
      </div>
    )}
  </header>
);

export default Header;
