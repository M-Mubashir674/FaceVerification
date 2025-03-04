import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import * as tf from "@tensorflow/tfjs-core";
import { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import '@tensorflow/tfjs-backend-webgl';

const FaceVerificationComponent = () => {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [verificationResult, setVerificationResult] = useState(null);
    const [referenceEmbedding, setReferenceEmbedding] = useState(null);

    // Load face detection model and reference image
    useEffect(() => {
        const loadModels = async () => {
            // await tf.setBackend('webgl');  // Set WebGL backend for TensorFlow.js

            const config = {
                runtime: 'tfjs',
                returnTensors: false,
                flipHorizontal: false,
                maxFaces: 1,
            };

            const model = await faceLandmarksDetection.createDetector(faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,config);
            setIsModelLoaded(true);

            // Load the reference image and process it to extract the reference embedding
            const referenceImage = await fetch('/referenceImageMub.jpeg');
            const referenceImageBlob = await referenceImage.blob();
            const img = new Image();
            img.src = URL.createObjectURL(referenceImageBlob);
            img.onload = async () => {
                const imageTensor = tf.browser.fromPixels(img);
                const detections = await model.estimateFaces(imageTensor, config);
                if (detections.length > 0) {
                    const keypoints = detections[0].scaledMesh;
                    const embedding = extractEmbedding(keypoints);
                    setReferenceEmbedding(embedding);
                }
            };

            img.onerror = (err) => {
                console.error("Image failed to load:", err);
            };
        };

        loadModels();
    }, []);

    // Function to extract face embedding (using facial landmarks)
    const extractEmbedding = (keypoints) => {
        // For simplicity, you could use keypoints as a representation of the face
        // A more sophisticated approach would involve using a neural network to get the embeddings
        const points = keypoints.map(point => [point.x, point.y]);
        const flatEmbedding = points.flat();
        return flatEmbedding;
    };

    // Face verification function
    const verifyFace = async () => {
        if (!isModelLoaded || !referenceEmbedding) return;

        const displaySize = { width: 640, height: 480 };
        const webcam = webcamRef.current.video;
        const canvas = canvasRef.current;

        // Detect faces
        const model = await faceLandmarksDetection.load(faceLandmarksDetection.SupportedPackages.mediapipeFacemesh);
        const detections = await model.estimateFaces({ input: webcam });

        if (detections.length > 0 && canvas) {
            // Draw face box and landmarks
            const ctx = canvas.getContext('2d');
            canvas.width = displaySize.width;
            canvas.height = displaySize.height;
            ctx.clearRect(0, 0, displaySize.width, displaySize.height);

            detections.forEach(detection => {
                const keypoints = detection.scaledMesh;
                keypoints.forEach(point => {
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
                    ctx.fillStyle = 'red';
                    ctx.fill();
                });
            });

            console.log(detections)

            const keypoints = detections[0].scaledMesh;
            // Extract the embedding for the detected face
            const detectedEmbedding = extractEmbedding(keypoints);

            // Calculate similarity (Euclidean distance)
            const distance = euclideanDistance(referenceEmbedding, detectedEmbedding);

            // Set threshold for matching (you can adjust based on your needs)
            const threshold = 100;  // You can tune this threshold based on your use case
            setVerificationResult(distance < threshold);
        }
    };

    // Function to calculate Euclidean distance
    const euclideanDistance = (a, b) => {
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            sum += Math.pow(a[i] - b[i], 2);
        }
        return Math.sqrt(sum);
    };

    // Interval-based verification
    useEffect(() => {
        const interval = setInterval(() => {
            if (isModelLoaded && referenceEmbedding) {
                // verifyFace();
            }
        }, 200); // Check every 200ms

        return () => clearInterval(interval);
    }, [isModelLoaded, referenceEmbedding]);

    return (
        <div>
            <div style={{ position: 'relative' }}>
                <Webcam
                    ref={webcamRef}
                    style={{ width: '640px', height: '480px' }}
                    screenshotFormat="image/jpeg"
                />
                <canvas
                    ref={canvasRef}
                    width={640}
                    height={480}
                    style={{ position: 'absolute', top: 0, left: 0 }}
                />
            </div>

            <div>
                {verificationResult !== null && (
                    <h2>
                        {verificationResult ? 'Verified ✅' : 'Not Recognized ❌'}
                    </h2>
                )}
            </div>
        </div>
    );
};

export default FaceVerificationComponent;
