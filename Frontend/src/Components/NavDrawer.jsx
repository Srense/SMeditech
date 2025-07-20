import React from "react";
import { Link } from "react-router-dom";

const NavDrawer = ({ isOpen, onClose }) => (
  <>
    {isOpen && <div className="nav-drawer-overlay" onClick={onClose} />}
    <div className={`nav-drawer${isOpen ? " show" : ""}`} id="mobile-menu">
      <button className="nav-drawer-close" onClick={onClose} aria-label="Close menu">
        &#10005;
      </button>
      <Link to="/" onClick={onClose}>Home</Link>
      <Link to="/team" onClick={onClose}>About</Link>
      <Link to="/contact" onClick={onClose}>Contact Us</Link>
      <Link to="/achievements" onClick={onClose}>Achievements</Link>
      <Link to="/auth" onClick={onClose}>Login / Signup</Link>
    </div>
  </>
);

export default NavDrawer;
