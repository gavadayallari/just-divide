import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";   // MUST be here
import { AudioProvider } from "./contexts/AudioManager";


ReactDOM.createRoot(document.getElementById("root")).render(
 <React.StrictMode>
    <AudioProvider>
      <App />
    </AudioProvider>
  </React.StrictMode>
);
