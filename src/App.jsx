import "./App.css";
import FaceVerificationComponent1 from "./FaceApi.jsx";
import FaceVerificationComponent from "./PoseDetection.jsx";

function App() {
  const pathname = window.location.pathname;

  if (pathname === "/pose-detection") {
    return <FaceVerificationComponent />;
  }

  return <FaceVerificationComponent1 />;
}

export default App;
