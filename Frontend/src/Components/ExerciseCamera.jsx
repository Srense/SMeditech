import React, { useRef, useEffect, useState } from "react";
import { Pose } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";

const ExerciseCamera = ({ exercise }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [reps, setReps] = useState(0);
  const [stage, setStage] = useState(null);
  const [feedback, setFeedback] = useState("");
  const waitForNext = useRef(false);  // debounce flag

  // Angle helper between three landmarks
  const calculateAngle = (a, b, c) => {
    const radians =
      Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180) / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
  };

  useEffect(() => {
    if (!videoRef.current) return;

    const onResults = (results) => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      // Draw pose landmarks in red
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

      // Draw hand landmarks in blue
      if (results.multiHandLandmarks) {
        for (const handLandmarks of results.multiHandLandmarks) {
          for (const lm of handLandmarks.landmark) {
            const x = lm.x * canvas.width;
            const y = lm.y * canvas.height;
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = "blue";
            ctx.fill();
          }
        }
      }
      ctx.restore();

      if (waitForNext.current) return; // debounce ongoing

      // Exercise detection logic
      if (exercise === "Squats" && results.poseLandmarks) {
        const lm = results.poseLandmarks;
        const leftHip = lm[23], leftKnee = lm[25], leftAnkle = lm[27];
        const kneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);

        if (kneeAngle > 160 && stage !== "up") {
          setStage("up");
          setFeedback("Stand straight");
          waitForNext.current = true;
          setTimeout(() => (waitForNext.current = false), 450);
        } else if (kneeAngle < 90 && stage === "up") {
          setStage("down");
          setReps(prev => prev + 1);
          setFeedback("Good squat!");
          waitForNext.current = true;
          setTimeout(() => (waitForNext.current = false), 450);
        }
      } 
      else if (exercise === "Push-ups" && results.poseLandmarks) {
        const lm = results.poseLandmarks;
        const rightShoulder = lm[12], rightElbow = lm[14], rightWrist = lm[16];
        const elbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);

        if (elbowAngle > 160 && stage !== "up") {
          setStage("up");
          setFeedback("Ready for push-up");
          waitForNext.current = true;
          setTimeout(() => (waitForNext.current = false), 450);
        } else if (elbowAngle < 90 && stage === "up") {
          setStage("down");
          setReps(prev => prev + 1);
          setFeedback("Good push-up!");
          waitForNext.current = true;
          setTimeout(() => (waitForNext.current = false), 450);
        }
      } 
      else if (exercise === "Arm Raises" && results.poseLandmarks) {
        const lm = results.poseLandmarks;
        const rightShoulder = lm[12], rightElbow = lm[14], rightWrist = lm[16];
        const angle = calculateAngle(rightShoulder, rightElbow, rightWrist);

        if (angle > 160 && stage !== "up") {
          setStage("up");
          setFeedback("Arm raised");
          waitForNext.current = true;
          setTimeout(() => (waitForNext.current = false), 450);
        } else if (angle < 110 && stage === "up") {
          setStage("down");
          setReps(prev => prev + 1);
          setFeedback("Arm lowered");
          waitForNext.current = true;
          setTimeout(() => (waitForNext.current = false), 450);
        }
      }
      else if (exercise === "Finger Twirling" && results.multiHandLandmarks) {
        for (const hand of results.multiHandLandmarks) {
          const thumbTip = hand.landmark[4];
          const indexTip = hand.landmark[8];
          const dist = Math.sqrt(
            (thumbTip.x - indexTip.x) ** 2 + (thumbTip.y - indexTip.y) ** 2
          );
          if (dist < 0.03 && stage !== "closed") {
            setStage("closed");
            setFeedback("Hand closed");
            waitForNext.current = true;
            setTimeout(() => (waitForNext.current = false), 450);
          } else if (dist > 0.06 && stage === "closed") {
            setStage("open");
            setReps(prev => prev + 1);
            setFeedback("Hand opened");
            waitForNext.current = true;
            setTimeout(() => (waitForNext.current = false), 450);
          }
        }
      }
      else if (exercise === "Wrist Rotations" && results.multiHandLandmarks) {
        setFeedback("Rotate your wrists");
        // Placeholder for wrist rotation detection logic
      }
      else {
        setFeedback("Exercise not supported yet");
      }
    };

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
      <div style={{ marginTop: "12px", fontSize: "1.2rem", fontWeight: "bold" }}>
        Exercise: {exercise}
      </div>
      <div style={{ fontSize: "1rem", marginTop: "6px" }}>
        Reps: {reps} | Stage: {stage || "-"} | {feedback}
      </div>
    </div>
  );
};

export default ExerciseCamera;
