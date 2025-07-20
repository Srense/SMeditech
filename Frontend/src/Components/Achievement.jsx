import React, { useState } from "react";
import "./Achievement.css";
import Header from './Header';
import NavDrawer from './NavDrawer';
import ideaImg from "../assets/images/idea.png";


const achievements = [
  {
    year: "2024",
    title: "Idea Inception",
    description: "Born in 2024 with a vision to revolutionize engagement through innovation.",
    image: ideaImg
  },
  {
    year: "2024",
    title: "Team Formation & R&D",
    description: "Core team assembled and research & development activities officially started.",
    image: ideaImg
  },
  {
    year: "2024",
    title: "Prototyping Phase",
    description: "Initial prototype design and iterative improvements initiated.",
    image: ideaImg
  },
  {
    year: "Feb 2025",
    title: "National Science Day – Top 5 Finalist",
    description: "Secured Top 5 position among 50+ teams. Games and features received overwhelming appreciation.",
     image: ideaImg
  },
  {
    year: "Mar 2025",
    title: "Patent & Copyright Filed",
    description: "Successfully filed for copyright and patent protection of core innovations.",
     image: ideaImg
  },
  {
    year: "Apr 2025",
    title: "Project Expo – Overall Winner",
    description: "Cleared all 3 phases and emerged as the winner in Project Expo 2025.",
    image: ideaImg
  },
  {
    year: "Apr 2025",
    title: "EEP 2025 – First Position",
    description: "Secured First Place at EEP 2025 for outstanding innovation and performance.",
    image: ideaImg
  },
];

const Achievement = () => {
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
      <section className="timeline-section" style={{ paddingTop: "72px" }}>
        <h2 className="timeline-title">Our Innovation Timeline</h2>
        <div className="timeline">
          {achievements.map((item, index) => (
            <div className="timeline-item" key={`${item.title}-${index}`}>
              <div className="timeline-dot" />
              <div className="timeline-content">
                <div className="timeline-img-wrapper">
                  <img src={item.image} alt={item.title} className="timeline-img" />
                </div>
                <div className="timeline-text">
                  <span className="timeline-year">{item.year}</span>
                  <h3 className="timeline-milestone">{item.title}</h3>
                  <p className="timeline-desc">{item.description}</p>
                </div>
              </div>
            </div>
          ))}
          <div className="timeline-end" />
        </div>
      </section>
    </>
  );
};

export default Achievement;
