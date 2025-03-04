import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import {useEffect, useRef, useState} from "react";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";

let model, video, rafID;
let amountStraightEvents = 0;
const VIDEO_SIZE = 500;
let positionXLeftIris;
let positionYLeftIris;
let event;



const normalize = (val, max, min) =>
    Math.max(0, Math.min(1, (val - min) / (max - min)));

const isFaceRotated = (landmarks) => {
    const leftCheek = landmarks.leftCheek;
    const rightCheek = landmarks.rightCheek;
    const midwayBetweenEyes = landmarks.midwayBetweenEyes;

    const xPositionLeftCheek = video.width - leftCheek[0][0];
    const xPositionRightCheek = video.width - rightCheek[0][0];
    const xPositionMidwayBetweenEyes = video.width - midwayBetweenEyes[0][0];

    const widthLeftSideFace = xPositionMidwayBetweenEyes - xPositionLeftCheek;
    const widthRightSideFace = xPositionRightCheek - xPositionMidwayBetweenEyes;

    const difference = widthRightSideFace - widthLeftSideFace;

    if (widthLeftSideFace < widthRightSideFace && Math.abs(difference) > 5) {
        return true;
    } else if (
        widthLeftSideFace > widthRightSideFace &&
        Math.abs(difference) > 5
    ) {
        return true;
    }
    return false;
};

async function renderPrediction() {
    const predictions = await model.estimateFaces({
        input: video,
        returnTensors: false,
        flipHorizontal: false,
        predictIrises: true,
    });

    if (predictions.length > 0) {
        predictions.forEach((prediction) => {
            positionXLeftIris = prediction.annotations.leftEyeIris[0][0];
            positionYLeftIris = prediction.annotations.leftEyeIris[0][1];

            const faceBottomLeftX =
                video.width - prediction.boundingBox.bottomRight[0]; // face is flipped horizontally so bottom right is actually bottom left.
            const faceBottomLeftY = prediction.boundingBox.bottomRight[1];

            const faceTopRightX = video.width - prediction.boundingBox.topLeft[0]; // face is flipped horizontally so top left is actually top right.
            const faceTopRightY = prediction.boundingBox.topLeft[1];

            if (faceBottomLeftX > 0 && !isFaceRotated(prediction.annotations)) {
                const positionLeftIrisX = video.width - positionXLeftIris;
                const normalizedXIrisPosition = normalize(
                    positionLeftIrisX,
                    faceTopRightX,
                    faceBottomLeftX
                );


                if (normalizedXIrisPosition > 0.355) {
                    event = "RIGHT";
                } else if (normalizedXIrisPosition < 0.315) {
                    event = "LEFT";
                } else {
                    amountStraightEvents++;
                    if (amountStraightEvents > 8) {
                        event = "STRAIGHT";
                        amountStraightEvents = 0;
                    }
                }

                const normalizedYIrisPosition = normalize(
                    positionYLeftIris,
                    faceTopRightY,
                    faceBottomLeftY
                );

                if (normalizedYIrisPosition > 0.62) {
                    event = "TOP";
                }
            }
        });
    }
    return event;
}

const loadModel = async () => {
    await tf.setBackend("webgl");
    model = await faceLandmarksDetection.load(
        faceLandmarksDetection.SupportedPackages.mediapipeFacemesh,
        { maxFaces: 1 }
    );
};

const setUpCamera = async (videoElement, webcamId = undefined) => {
    video = videoElement;
    const mediaDevices = await navigator.mediaDevices.enumerateDevices();

    const defaultWebcam = mediaDevices.find(
        (device) =>
            device.kind === "videoinput" && device.label.includes("Built-in")
    );

    const cameraId = defaultWebcam ? defaultWebcam.deviceId : webcamId;

    const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
            facingMode: "user",
            deviceId: cameraId,
            width: VIDEO_SIZE,
            height: VIDEO_SIZE,
        },
    });

    video.srcObject = stream;
    video.width = 500;
    video.height = 500;

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            resolve(video);
        };
    });
};

const gaze = {
    loadModel: loadModel,
    setUpCamera: setUpCamera,
    getGazePrediction: renderPrediction,
};



const GazeDetectionComponent = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [isCameraLoaded, setIsCameraLoaded] = useState(false);
    const [gazeEvent, setGazeEvent] = useState(null);

    useEffect(() => {

        const loadGazeModel = async () => {
            await gaze.loadModel();
            setIsModelLoaded(true);
        };

        loadGazeModel();
    }, []);

    useEffect(() => {
        const loadCamera = async () => {
            const video = videoRef.current;

            await gaze.setUpCamera(video);
            setIsCameraLoaded(true);
        };

        loadCamera();
    }, []);

    useEffect(() => {
        const getGazePrediction = async () => {
            if (!isModelLoaded || !isCameraLoaded) return;

            const video = videoRef.current;
            const canvas = canvasRef.current;

            canvas.width = video.width;
            canvas.height = video.height;

            async function renderPrediction() {
                const event = await gaze.getGazePrediction();
                console.log(event);
                setGazeEvent(event);
            }

            async function animate() {
                await renderPrediction();
                rafID = requestAnimationFrame(animate);
            }

            animate();

            return () => {
                cancelAnimationFrame(rafID);
            };
        };

        getGazePrediction();
    }, [isModelLoaded, isCameraLoaded]);

    return (
        <div>
            <video
                ref={videoRef}
                width="500"
                style={{ transform: "scaleX(-1)" }}
                height="500"
                autoPlay
            />
            <canvas
                ref={canvasRef}
                style={{ transform: "scaleX(-1)" }}
                width="500"
                height="500"
            />
            <div>{gazeEvent}</div>
        </div>
    );
}

export default GazeDetectionComponent;