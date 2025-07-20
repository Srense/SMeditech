import React, { useState } from "react";
import "./ContactUs.css";
import Header from "./Header";
import NavDrawer from "./NavDrawer";

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  // Header/NavDrawer state and handlers
  const [menuOpen, setMenuOpen] = useState(false);
  const logoSrc = "/images/Circle Only.svg";
  const handleMenuToggle = () => setMenuOpen((prev) => !prev);
  const handleCloseMenu = () => setMenuOpen(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
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

      <div className="contactus-main-bg" style={{ paddingTop: "72px" }}>
        {/* <header className="contactus-header">
          <h1 className="contactus-title">
            <i className="fas fa-envelope-open-text"></i> Contact Us
          </h1>
          <p className="contactus-subtitle">
            We’d love to hear from you! Please fill out the form below.
          </p>
        </header> */}

        <div className="contactus-content">
          {submitted ? (
            <div className="contactus-thankyou" role="alert" aria-live="polite">
              <h2>
                <i
                  className="fas fa-circle-check"
                  style={{ color: "#16a34a", marginRight: "8px" }}
                ></i>
                Thank you for reaching out!
              </h2>
              <p>We will get back to you shortly.</p>
              <button
                className="primary-btn reset-btn"
                onClick={() => {
                  setFormData({
                    name: "",
                    email: "",
                    subject: "",
                    message: "",
                  });
                  setSubmitted(false);
                }}
              >
                <i className="fas fa-paper-plane"></i> Send Another Message
              </button>
            </div>
          ) : (
            <form className="contactus-form" onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="name">
                  <i className="fas fa-user"></i> Name
                </label>
                <span className="input-icon">
                  <i className="fas fa-user"></i>
                </span>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  required
                  autoComplete="name"
                  style={{ paddingLeft: "38px" }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">
                  <i className="fas fa-envelope"></i> Email
                </label>
                <span className="input-icon">
                  <i className="fas fa-envelope"></i>
                </span>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  style={{ paddingLeft: "38px" }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="subject">
                  <i className="fas fa-heading"></i> Subject
                </label>
                <span className="input-icon">
                  <i className="fas fa-heading"></i>
                </span>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="Subject of your message"
                  required
                  style={{ paddingLeft: "38px" }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="message">
                  <i className="fas fa-comment-dots"></i> Message
                </label>
                <span className="input-icon" style={{ top: "22px" }}>
                  <i className="fas fa-comment-dots"></i>
                </span>
                <textarea
                  id="message"
                  name="message"
                  rows="5"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Write your message here..."
                  required
                  style={{ paddingLeft: "38px" }}
                />
              </div>

              <button type="submit" className="primary-btn">
                <i className="fas fa-paper-plane"></i> Send Message
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default ContactUs;
