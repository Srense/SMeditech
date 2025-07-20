import React from "react";
import logo from "/images/Circle Only.svg"; // Adjust as needed
import { FaFacebook, FaInstagram, FaLinkedin, FaEnvelope, FaHeart } from "react-icons/fa";
import "./footer.css";

export const Footer = () => (
  <footer className="glass-footer">
    <div className="footer-main">
      <div className="footer-brand">
        <img src={logo} alt="S.MediTech Logo" className="footer-logo" />
        <div>
          <span className="footer-title">S.MediTech</span>
          
        </div>
      </div>
      <div className="footer-social">
        <a href="https://facebook.com/" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
          <FaFacebook />
        </a>
        <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
          <FaInstagram />
        </a>
        <a href="https://linkedin.com/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
          <FaLinkedin />
        </a>
        <a href="mailto:contact@physiolive.com" aria-label="Email">
          <FaEnvelope />
        </a>
      </div>
    </div>
    <div className="footer-bottom">
      <span>
        &copy; {new Date().getFullYear()} S.MediTech. All rights reserved.
      </span>
      <span className="footer-heart">
        <FaHeart className="heart-icon" /> Designed by Sohel
      </span>
    </div>
  </footer>
);
