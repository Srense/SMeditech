import React, { useState, useEffect } from "react";
import Header from "./Header";
import NavDrawer from "./NavDrawer";
import Spotlight from "./SpotLight";
import Features from "./FeatureSteps";
import WhatWeTreat from "./WhatWeTreat";
import FAQ from "./FAQ";
import AppointmentForm from "./AppointmentForm";
import RequestCallbackForm from "./RequestcallbackForm";

// Splash Screen Component
const SplashScreen = ({ logoSrc }) => (
  <div className="splash-screen">
    <img src={logoSrc} alt="Logo" className="splash-logo" />
  </div>
);

export const Home = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [showCallbackForm, setShowCallbackForm] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3500);
    return () => clearTimeout(timer);
  }, []);

  const handleMenuToggle = () => setMenuOpen((prev) => !prev);
  const handleCloseMenu = () => setMenuOpen(false);

  const logoSrc = "/images/Circle Only.svg";

  const openAppointmentForm = () => setShowAppointmentForm(true);
  const closeAppointmentForm = () => setShowAppointmentForm(false);

  const openCallbackForm = () => setShowCallbackForm(true);
  const closeCallbackForm = () => setShowCallbackForm(false);

  return (
    <>
      {showSplash ? (
        <SplashScreen logoSrc={logoSrc} />
      ) : (
        <div className="homepage-bg">
          <Header
            logoSrc={logoSrc}
            menuOpen={menuOpen}
            onMenuToggle={handleMenuToggle}
            onNavLinkClick={handleCloseMenu}
          />
          <NavDrawer isOpen={menuOpen} onClose={handleCloseMenu} />
          <div className="homepage-card">
            <Spotlight>
              <h1>S.MediTech</h1>
              <p>
                Welcome to S.MediTech! Practice physiotherapy exercises with real-time detection, interactive games, and expert guidance. Start your wellness journey now.
              </p>
            </Spotlight>
            <div className="homepage-actions">
              <button className="primary-btn" onClick={openCallbackForm}>
                Request Callback
              </button>
              <button className="secondary-btn" onClick={openAppointmentForm}>
                Book Appointment
              </button>
            </div>
          </div>
        </div>
      )}
      <Features />
      <WhatWeTreat />
      <FAQ />
      {showAppointmentForm && <AppointmentForm onClose={closeAppointmentForm} />}
      {showCallbackForm && <RequestCallbackForm onClose={closeCallbackForm} />}
    </>
  );
};

// Footer Component
export const Footer = () => (
  <footer>
    <p>&copy; Sohel 2025</p>
  </footer>
);
