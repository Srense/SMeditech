import React, { useRef, useEffect, useState } from "react";
import { Pose } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";

const ExerciseCamera = ({ exercise }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [reps, setReps] = useState(0);
  const [stage, setStage] = useState(null);

  useEffect(() => {
    if (!videoRef.current) return;

    // Calculate angle between three points (for pose joints)
    const calculateAngle = (a, b, c) => {
      const radians =
        Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
      let angle = Math.abs((radians * 180) / Math.PI);
      if (angle > 180) angle = 360 - angle;
      return angle;
    };

    // Called on each pose detection result
    const onResults = (results) => {
      const ctx = canvasRef.current.getContext("2d");
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;

      ctx.save();
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.drawImage(results.image, 0, 0, ctx.canvas.width, ctx.canvas.height);

      // Draw pose landmarks (red circles)
      if (results.poseLandmarks) {
        for (const landmark of results.poseLandmarks) {
          const x = landmark.x * ctx.canvas.width;
          const y = landmark.y * ctx.canvas.height;
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = "red";
          ctx.fill();
        }
      }
      ctx.restore();

      // Example: Squats rep counting based on left knee angle
      if (exercise === "Squats" && results.poseLandmarks) {
        const lm = results.poseLandmarks;

        // Landmark indices for left hip, knee, ankle in MediaPipe Pose
        const leftHip = lm[23];
        const leftKnee = lm[25];
        const leftAnkle = lm[27];

        const kneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);

        if (kneeAngle > 160 && stage !== "up") {
          setStage("up");
        } else if (kneeAngle < 90 && stage === "up") {
          setStage("down");
          setReps((prev) => prev + 1);
        }
      }
    };

    // Initialize MediaPipe Pose
    const pose = new Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    pose.onResults(onResults);

    // Initialize camera capture from user's webcam
    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        await pose.send({ image: videoRef.current });
      },
      width: 640,
      height: 480,
    });

    camera.start();

    // Cleanup on unmount
    return () => {
      camera.stop();
    };
  }, [exercise, stage]);

  return (
    <div style={{ textAlign: "center" }}>
      <video
        ref={videoRef}
        style={{ display: "none" }}
        playsInline
        muted
        width="640"
        height="480"
      />
      <canvas
        ref={canvasRef}
        style={{ width: "640px", height: "480px", marginTop: "10px" }}
      />
      <p>
        <strong>Exercise:</strong> {exercise}
      </p>
      <p>
        <strong>Reps:</strong> {reps}
      </p>
      <p>
        <strong>Stage:</strong> {stage}
      </p>
    </div>
  );
};

export default ExerciseCamera;
