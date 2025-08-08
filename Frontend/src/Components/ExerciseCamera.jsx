import React, { useRef, useEffect, useState } from "react";
import { Pose } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";

const ExerciseCamera = ({ exercise }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [reps, setReps] = useState(0);
  const [stage, setStage] = useState(null);
  const [feedback, setFeedback] = useState("");

  // Calculate the angle between three landmarks
  const calculateAngle = (a, b, c) => {
    const radians =
      Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180) / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
  };

  useEffect(() => {
    if (!videoRef.current) return;

    let waitForNext = false;

    const onResults = (results) => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      if (results.poseLandmarks) {
        for (const lm of results.poseLandmarks) {
          const x = lm.x * canvas.width;
          const y = lm.y * canvas.height;
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = "red";
          ctx.fill();
        }
      }
      ctx.restore();

      if (!results.poseLandmarks) return;

      const lm = results.poseLandmarks;

      if (!waitForNext) {
        switch (exercise) {
          case "Squats": {
            const leftHip = lm[23];
            const leftKnee = lm[25];
            const leftAnkle = lm[27];
            const kneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);

            if (kneeAngle > 160 && stage !== "up") {
              setStage("up");
              setFeedback("Stand straight");
              waitForNext = true;
              setTimeout(() => (waitForNext = false), 300);
            } else if (kneeAngle < 90 && stage === "up") {
              setStage("down");
              setReps((prev) => prev + 1);
              setFeedback("Good squat!");
              waitForNext = true;
              setTimeout(() => (waitForNext = false), 300);
            }
            break;
          }
          case "Push-ups": {
            // Use right shoulder (12), right elbow (14), right wrist (16) for elbow angle
            const rightShoulder = lm[12];
            const rightElbow = lm[14];
            const rightWrist = lm[16];

            const elbowAngle = calculateAngle(
              rightShoulder,
              rightElbow,
              rightWrist
            );

            if (elbowAngle > 160 && stage !== "up") {
              setStage("up");
              setFeedback("Ready for push-up");
              waitForNext = true;
              setTimeout(() => (waitForNext = false), 300);
            } else if (elbowAngle < 90 && stage === "up") {
              setStage("down");
              setReps((prev) => prev + 1);
              setFeedback("Good push-up!");
              waitForNext = true;
              setTimeout(() => (waitForNext = false), 300);
            }
            break;
          }
          case "Arm Raises": {
            // Use right shoulder (12), right elbow (14), right wrist (16) for raising arm
            // Here, track vertical angle between shoulder-elbow-wrist
            const rightShoulder = lm[12];
            const rightElbow = lm[14];
            const rightWrist = lm[16];

            const angle = calculateAngle(
              rightShoulder,
              rightElbow,
              rightWrist
            );

            // Example logic: angle near 180 means arm raised, near 90 means lowered
            if (angle > 160 && stage !== "up") {
              setStage("up");
              setFeedback("Arm raised");
              waitForNext = true;
              setTimeout(() => (waitForNext = false), 300);
            } else if (angle < 110 && stage === "up") {
              setStage("down");
              setReps((prev) => prev + 1);
              setFeedback("Arm lowered");
              waitForNext = true;
              setTimeout(() => (waitForNext = false), 300);
            }
            break;
          }
          case "Wrist Rotations": {
            // Could use relative movement of wrist, e.g., distance between wrist landmarks
            // For simplicity, count full rotations - placeholder logic:
            setFeedback("Please rotate your wrists");
            break;
          }
          default: {
            setFeedback("Exercise not supported yet");
            break;
          }
        }
      }
    };

    const pose = new Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 2,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    pose.onResults(onResults);

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        await pose.send({ image: videoRef.current });
      },
      width: 640,
      height: 480,
    });

    camera.start();

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
        style={{
          width: "640px",
          height: "480px",
          marginTop: "10px",
          borderRadius: "8px",
          boxShadow: "0 0 10px rgba(0,0,0,0.2)",
        }}
      />
      <div
        style={{ marginTop: "12px", fontSize: "1.2rem", fontWeight: "bold" }}
      >
        Exercise: {exercise}
      </div>
      <div style={{ fontSize: "1rem", marginTop: "6px" }}>
        Reps: {reps} | Stage: {stage || "-"} | {feedback}
      </div>
    </div>
  );
};

export default ExerciseCamera;
