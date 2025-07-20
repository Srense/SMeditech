import React, { useRef, useState } from "react";
import "./SpotLight.css";

const Spotlight = ({ children }) => {
  const containerRef = useRef(null);
  const [spot, setSpot] = useState({ x: -100, y: -100, visible: false });

  const handleMouseMove = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    setSpot({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      visible: true,
    });
  };

  const handleMouseLeave = () => {
    setSpot({ ...spot, visible: false });
  };

  return (
    <div
      className="spotlight-text-container"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        "--spot-x": `${spot.x}px`,
        "--spot-y": `${spot.y}px`,
        "--spot-visible": spot.visible ? 1 : 0,
      }}
    >
      <span className="spotlight-text">{children}</span>
      <div className="spotlight-mask" />
    </div>
  );
};

export default Spotlight;
