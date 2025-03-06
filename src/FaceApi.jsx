import { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";
import Webcam from "react-webcam";

const FaceVerificationComponent1 = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [referenceDescriptor, setReferenceDescriptor] = useState(null);
  const [isFocused, setIsFocused] = useState(false);

  const determineFaceOrientation = (landmarks) => {
    const jawline = landmarks.getJawOutline();
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();

    // Calculate the midpoint of the jawline
    const jawMidpoint = {
      x: (jawline[0].x + jawline[jawline.length - 1].x) / 2,
      y: (jawline[0].y + jawline[jawline.length - 1].y) / 2,
    };

    // Calculate the midpoint of the eyes
    const eyesMidpoint = {
      x: (leftEye[0].x + rightEye[3].x) / 2,
      y: (leftEye[0].y + rightEye[3].y) / 2,
    };

    // Calculate the angle between the jaw midpoint and eyes midpoint
    const angle =
      Math.atan2(
        eyesMidpoint.y - jawMidpoint.y,
        eyesMidpoint.x - jawMidpoint.x,
      ) *
      (180 / Math.PI);
    setIsFocused(angle > -10);
  };

  // Load models and reference image
  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
      setIsModelLoaded(true);

      // Load reference image (replace with your reference image)
      const referenceImage = await faceapi.fetchImage("/referenceImage.jpg");
      const referenceDetection = await faceapi
        .detectSingleFace(referenceImage, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      setReferenceDescriptor(referenceDetection.descriptor);
    };

    loadModels();
  }, []);

  // Face verification function
  const verifyFace = async () => {
    if (!isModelLoaded || !referenceDescriptor) return;

    const displaySize = {
      width: 640,
      height: 480,
    };

    const webcam = webcamRef.current.video;
    const canvas = canvasRef.current;

    // Detect faces
    const detections = await faceapi
      .detectSingleFace(webcam, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detections && canvas) {
      // Draw face box

      faceapi.matchDimensions(canvas, displaySize);
      canvas
        .getContext("2d")
        .clearRect(0, 0, displaySize.width, displaySize.height);

      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
      determineFaceOrientation(resizedDetections.landmarks);

      // Calculate similarity
      const distance = faceapi.euclideanDistance(
        referenceDescriptor,
        detections.descriptor,
      );

      // Threshold (adjust based on your requirements)
      const threshold = 0.45;
      setVerificationResult(distance < threshold);
    }
  };

  // Interval-based verification
  useEffect(() => {
    const interval = setInterval(() => {
      if (isModelLoaded && referenceDescriptor) {
        verifyFace();
      }
    }, 200); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [isModelLoaded, referenceDescriptor]);

  return (
    <div>
      <div style={{ position: "relative" }}>
        <Webcam
          ref={webcamRef}
          style={{ width: "640px", height: "480px" }}
          screenshotFormat="image/jpeg"
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          style={{ position: "absolute", top: 0, left: 0 }}
        />
      </div>

      <div>
        {verificationResult !== null && (
          <h5>{verificationResult ? "Verified ✅" : "Not Recognized ❌"}</h5>
        )}
        <h5>{isFocused ? "Engaged ✅" : "Not Engaged ❌"}</h5>
      </div>
    </div>
  );
};

export default FaceVerificationComponent1;
