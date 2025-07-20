import React from "react";
import "./FeatureSteps.css"; // See CSS below

const features = [
  {
    icon: "/images/Circle Only.svg", // Replace with your icon path
    title: "Fizo 360",
    subtitle: "Root Cause Identification",
    desc: "Comprehensive Assessment for better evaluation of Ortho / Neuro conditions with Advanced assessments like Posture Analysis & Muscle Imbalances detection"
  },
  {
    icon: "/images/Circle Only.svg",
    title: "Fizo IQ",
    subtitle: "AI Powered Precision",
    desc: "Clinical Decision Support System integrating Ortho-Neuro intelligence for accurate diagnosis, optimized treatment protocols, and effective outcome tracking"
  },
  {
    icon: "/images/Circle Only.svg",
    title: "Fizo Track",
    subtitle: "SMART Progress Monitoring",
    desc: "Progress tracking system utilizing SMART Goals & Milestones to objectively monitor, analyze, and optimize the patient recovery journey"
  },
  {
    icon: "/images/Circle Only.svg",
    title: "Activ PT",
    subtitle: "Your Personal Home Physio",
    desc: "Smart rehabilitation app designed for post-treatment care, providing personalized exercise programs, adherence tracking, and expert-guided recovery"
  }
];

export default function Feature() {
  return (
    <section className="feature-steps">
      <h2 className="feature-steps-title">Faster &amp; Lasting Recovery</h2>
      <div className="feature-steps-row">
        {features.map((f, i) => (
          <React.Fragment key={f.title}>
            <div className="feature-step">
              <div className="feature-step-icon">
                <img src={f.icon} alt={f.title + " icon"} />
              </div>
              <div className="feature-step-title">{f.title}</div>
              <div className="feature-step-subtitle">{f.subtitle}</div>
              <div className="feature-step-desc">{f.desc}</div>
            </div>
            {i < features.length - 1 && (
              <div className="feature-step-arrow" aria-hidden="true">
                {/* SVG dotted arrow */}
                <svg width="80" height="24" viewBox="0 0 80 24" fill="none">
                  <path
                    d="M2 12 Q40 0 78 12"
                    stroke="#3a5f55"
                    strokeWidth="2"
                    strokeDasharray="4 6"
                    fill="none"
                  />
                  <polygon
                    points="76,10 78,12 76,14"
                    fill="#3a5f55"
                  />
                </svg>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}
