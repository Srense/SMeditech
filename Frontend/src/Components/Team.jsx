import React, { useState } from "react";
import "./Team.css";
import Header from "./Header";
import NavDrawer from "./NavDrawer";
import Sohel from '../assets/Images/sohel.jpg'; 
import Prince from '../assets/Images/prince.png'; 
import Moinak from '../assets/Images/moinak.png';
import Saikat from '../assets/Images/saikat.png';

const teamMembers = [
  {
    name: "Prince Sarker",
    position: "Founder & CEO",
    image: Prince,
    quote: "Empathy and science together create real healing.",
  },
  {
    name: "Sohel Rizwan",
    position: "Co-Founder & CSO",
    image: Sohel,
    quote: "Innovation is the key to unlocking a healthier tomorrow.",
  },
  {
    name: "Moinak Niyogi",
    position: "Co-Founder & CTO",
    image: Moinak,
    quote: "Let’s make technology feel human.",
  },
  {
    name: "Saikat Acharjee",
    position: "CMO",
    image: Saikat,
    quote: "Design is intelligence made visible.",
  },
];

const Team = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const logoSrc = "/images/Circle Only.svg";
  const handleMenuToggle = () => setMenuOpen((prev) => !prev);
  const handleCloseMenu = () => setMenuOpen(false);

  return (
    <>
      <Header
        logoSrc={logoSrc}
        menuOpen={menuOpen}
        onMenuToggle={handleMenuToggle}
        onNavLinkClick={handleCloseMenu}
      />
      <NavDrawer isOpen={menuOpen} onClose={handleCloseMenu} />
      <section className="team-section" id="team" style={{ paddingTop: "72px" }}>
        <h2 className="team-title">Meet Our Core Team</h2>
        <div className="team-grid">
          {teamMembers.map((member) => (
            <div className="team-card" key={member.name}>
              <div className="team-img-wrapper">
                <img src={member.image} alt={member.name} className="team-img" />
                <div className="team-img-overlay"></div>
              </div>
              <div className="team-info">
                <h3 className="team-name">{member.name}</h3>
                <p className="team-role">{member.position}</p>
                <blockquote className="team-quote">
                  “{member.quote}”
                </blockquote>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
};

export default Team;
