import "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.1/camera_utils.js";
import "https://cdn.jsdelivr.net/npm/@mediapipe/control_utils@0.1/control_utils.js";
import "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.2/drawing_utils.js";
import "https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.1/holistic.js";
import { useEffect, useRef } from "react";

const HolisticDetection = () => {
  const video4 = useRef(null);
  const out4 = useRef(null);
  const controlsElement4 = useRef(null);

  const fpsControl = new FPS();

  function removeElements(landmarks, elements) {
    for (const element of elements) {
      delete landmarks[element];
    }
  }

  function removeLandmarks(results) {
    if (results.poseLandmarks) {
      removeElements(
        results.poseLandmarks,
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 16, 17, 18, 19, 20, 21, 22],
      );
    }
  }

  function connect(ctx, connectors) {
    const canvas = ctx.canvas;
    for (const connector of connectors) {
      const from = connector[0];
      const to = connector[1];
      if (from && to) {
        if (
          from.visibility &&
          to.visibility &&
          (from.visibility < 0.1 || to.visibility < 0.1)
        ) {
          continue;
        }
        ctx.beginPath();
        ctx.moveTo(from.x * canvas.width, from.y * canvas.height);
        ctx.lineTo(to.x * canvas.width, to.y * canvas.height);
        ctx.stroke();
      }
    }
  }

  function onResultsHolistic(results) {
    document.body.classList.add("loaded");
    removeLandmarks(results);
    fpsControl.tick();
    const canvasCtx4 = out4.current.getContext("2d");

    canvasCtx4.save();
    canvasCtx4.clearRect(0, 0, out4.current.width, out4.current.height);
    canvasCtx4.drawImage(
      results.image,
      0,
      0,
      out4.current.width,
      out4.current.height,
    );
    canvasCtx4.lineWidth = 5;
    if (results.poseLandmarks) {
      if (results.rightHandLandmarks) {
        canvasCtx4.strokeStyle = "#00FF00";
        connect(canvasCtx4, [
          [
            results.poseLandmarks[POSE_LANDMARKS.RIGHT_ELBOW],
            results.rightHandLandmarks[0],
          ],
        ]);
      }
      if (results.leftHandLandmarks) {
        canvasCtx4.strokeStyle = "#FF0000";
        connect(canvasCtx4, [
          [
            results.poseLandmarks[POSE_LANDMARKS.LEFT_ELBOW],
            results.leftHandLandmarks[0],
          ],
        ]);
      }
    }
    drawConnectors(canvasCtx4, results.poseLandmarks, POSE_CONNECTIONS, {
      color: "#00FF00",
    });
    drawLandmarks(canvasCtx4, results.poseLandmarks, {
      color: "#00FF00",
      fillColor: "#FF0000",
    });
    drawConnectors(canvasCtx4, results.rightHandLandmarks, HAND_CONNECTIONS, {
      color: "#00CC00",
    });
    drawLandmarks(canvasCtx4, results.rightHandLandmarks, {
      color: "#00FF00",
      fillColor: "#FF0000",
      lineWidth: 2,
      radius: (data) => {
        return lerp(data.from.z, -0.15, 0.1, 10, 1);
      },
    });
    drawConnectors(canvasCtx4, results.leftHandLandmarks, HAND_CONNECTIONS, {
      color: "#CC0000",
    });
    drawLandmarks(canvasCtx4, results.leftHandLandmarks, {
      color: "#FF0000",
      fillColor: "#00FF00",
      lineWidth: 2,
      radius: (data) => {
        return lerp(data.from.z, -0.15, 0.1, 10, 1);
      },
    });
    drawConnectors(canvasCtx4, results.faceLandmarks, FACEMESH_TESSELATION, {
      color: "#C0C0C070",
      lineWidth: 1,
    });
    drawConnectors(canvasCtx4, results.faceLandmarks, FACEMESH_RIGHT_EYE, {
      color: "#FF3030",
    });
    drawConnectors(canvasCtx4, results.faceLandmarks, FACEMESH_RIGHT_EYEBROW, {
      color: "#FF3030",
    });
    drawConnectors(canvasCtx4, results.faceLandmarks, FACEMESH_LEFT_EYE, {
      color: "#30FF30",
    });
    drawConnectors(canvasCtx4, results.faceLandmarks, FACEMESH_LEFT_EYEBROW, {
      color: "#30FF30",
    });
    drawConnectors(canvasCtx4, results.faceLandmarks, FACEMESH_FACE_OVAL, {
      color: "#E0E0E0",
    });
    drawConnectors(canvasCtx4, results.faceLandmarks, FACEMESH_LIPS, {
      color: "#E0E0E0",
    });

    canvasCtx4.restore();
  }

  useEffect(() => {
    const holistic = new Holistic({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.1/${file}`;
      },
    });
    holistic.onResults(onResultsHolistic);

    const camera = new Camera(video4.current, {
      onFrame: async () => {
        await holistic.send({ image: video4.current });
      },
      width: 480,
      height: 480,
    });
    camera.start();

    new ControlPanel(controlsElement4.current, {
      selfieMode: true,
      upperBodyOnly: true,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })
      .add([
        new StaticText({ title: "MediaPipe Holistic" }),
        fpsControl,
        new Toggle({ title: "Selfie Mode", field: "selfieMode" }),
        new Toggle({ title: "Upper-body Only", field: "upperBodyOnly" }),
        new Toggle({ title: "Smooth Landmarks", field: "smoothLandmarks" }),
        new Slider({
          title: "Min Detection Confidence",
          field: "minDetectionConfidence",
          range: [0, 1],
          step: 0.01,
        }),
        new Slider({
          title: "Min Tracking Confidence",
          field: "minTrackingConfidence",
          range: [0, 1],
          step: 0.01,
        }),
      ])
      .on((options) => {
        video4.current.classList.toggle("selfie", options.selfieMode);
        holistic.setOptions(options);
      });
  }, []);

  return (
    <div className="container" style={{ marginTop: "20px" }}>
      <div className="columns">
        <div className="column">
          <article className="panel is-info">
            <p className="panel-heading">Webcam Input</p>
            <div className="panel-block">
              <video ref={video4} style={{ transform: "scaleX(-1)" }}></video>
            </div>
          </article>
        </div>

        <div className="column">
          <article className="panel is-info">
            <p className="panel-heading">
              Mediapipe Face, Hands & Pose Detection
            </p>
            <div className="panel-block">
              <canvas ref={out4} width="480px" height="480px"></canvas>
            </div>
          </article>
        </div>
      </div>
      <div style={{ visibility: "hidden" }} ref={controlsElement4} />
    </div>
  );
};

export default HolisticDetection;
