import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";   // MUST be here
import { AudioProvider } from "./contexts/AudioManager";

// All images are now in public/images/ and referenced as public paths
// Set CSS custom properties with public image paths
const root = document.documentElement;
root.style.setProperty('--bg-game-stage', ''); // Remove game stage background - only full screen background needed
root.style.setProperty('--bg-full-page', `url(/images/Desktop_JustDivide_Game_2.png)`); // Full screen background only
root.style.setProperty('--img-badge', `url(/images/Levels%20and%20Score.png)`);
root.style.setProperty('--tile-blue', `url(/images/blue.png)`);
root.style.setProperty('--tile-orange', `url(/images/orange.png)`);
root.style.setProperty('--tile-pink', `url(/images/pink.png)`);
root.style.setProperty('--tile-purple', `url(/images/purple.png)`);
root.style.setProperty('--tile-red', `url(/images/red.png)`);
root.style.setProperty('--placement-box', `url(/images/Placement_Box.png)`);

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AudioProvider>
      <App />
    </AudioProvider>
  </React.StrictMode>
);

