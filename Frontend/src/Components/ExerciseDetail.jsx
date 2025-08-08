import React, { useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import ExerciseCamera from "./ExerciseCamera";  // Import the new webcam pose detection component
import "./ExerciseDetail.css";

const exerciseNameMap = {
  squats: "Squats",
  "finger-twirling": "Finger Twirling",
  "head-rotation": "Head Rotation",
  "fist-rotation": "Fist Rotation",
  "shoulder-circles": "Shoulder Circles",
  "arm-raises": "Arm Raises",
  "wall-pushups": "Wall Push-ups",
  "elbow-flexion": "Elbow Flexion",
  "wrist-rotations": "Wrist Rotations",
  "knee-extensions": "Knee Extensions",
  "heel-slides": "Heel Slides",
  "ankle-pumps": "Ankle Pumps",
  "glute-bridges": "Glute Bridges",
  "standing-marches": "Standing Marches",
};

const ExerciseDetail = () => {
  const { name } = useParams();
  const navigate = useNavigate();
  const exercise = exerciseNameMap[name] || name.replace(/-/g, " ");

  // Parallax effect for animated shapes
  const bgRef = useRef(null);

  const handleMouseMove = (e) => {
    const bg = bgRef.current;
    if (!bg) return;
    const { clientX, clientY } = e;
    const w = window.innerWidth,
      h = window.innerHeight;
    const x = (clientX / w - 0.5) * 40;
    const y = (clientY / h - 0.5) * 40;
    bg.querySelectorAll(".exercise-bg-shape").forEach((shape, i) => {
      shape.style.transform = `translate(${(x * (i + 1)) / 2}px, ${
        (y * (i + 1)) / 2
      }px) scale(1)`;
    });
  };

  const handleMouseLeave = () => {
    if (bgRef.current) {
      bgRef.current.querySelectorAll(".exercise-bg-shape").forEach((shape) => {
        shape.style.transform = "translate(0,0) scale(1)";
      });
    }
  };

  // End exercise handler
  const handleEndExercise = () => {
    navigate("/telerehabilitation");
  };

  // Download report handler
  const handleDownloadReport = async () => {
    try {
      const response = await fetch(
        `/api/report?exercise=${encodeURIComponent(exercise)}`,
        { method: "GET" }
      );
      if (!response.ok) throw new Error("Failed to download report");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${exercise}_report.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert("Could not download report. Please try again later.",error);
    }
  };

  return (
    <div
      className="exercise-detail-bg interactive"
      ref={bgRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Animated Gradient Layer */}
      <div className="exercise-bg-animated-gradient"></div>
      {/* Floating Circles */}
      <div className="exercise-bg-shape shape1"></div>
      <div className="exercise-bg-shape shape2"></div>
      <div className="exercise-bg-shape shape3"></div>

      {/* Main Card */}
      <div className="exercise-detail-card">
        <h2 className="exercise-detail-title">
          Live Exercise: <span>{exercise}</span>
        </h2>

        {/* Replace backend stream with frontend webcam + pose detection */}
        <ExerciseCamera exercise={exercise} />

        <div className="exercise-detail-actions">
          <button
            className="exercise-end-btn"
            onClick={handleEndExercise}
            type="button"
          >
            End Exercise
          </button>
          <button
            className="exercise-download-btn"
            onClick={handleDownloadReport}
            type="button"
          >
            Download Report
          </button>
        </div>

        <Link to="/telerehabilitation" className="exercise-detail-back-btn">
          <i className="fas fa-arrow-left"></i> Back to Exercises
        </Link>
      </div>
    </div>
  );
};

export default ExerciseDetail;
