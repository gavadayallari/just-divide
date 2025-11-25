import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";   // MUST be here
import { AudioProvider } from "./contexts/AudioManager";

// Import all images used in CSS
import bgGameStage from "./assets/Desktop_JustDivide_Game_2.png";
import imgBadge from "./assets/Levels and Score.png";
import tileBlue from "./assets/blue.png";
import tileOrange from "./assets/orange.png";
import tilePink from "./assets/pink.png";
import tilePurple from "./assets/purple.png";
import tileRed from "./assets/red.png";
import placementBox from "./assets/Placement_Box.png";

// Set CSS custom properties with imported images
const root = document.documentElement;
root.style.setProperty('--bg-game-stage', `url(${bgGameStage})`);
root.style.setProperty('--img-badge', `url(${imgBadge})`);
root.style.setProperty('--tile-blue', `url(${tileBlue})`);
root.style.setProperty('--tile-orange', `url(${tileOrange})`);
root.style.setProperty('--tile-pink', `url(${tilePink})`);
root.style.setProperty('--tile-purple', `url(${tilePurple})`);
root.style.setProperty('--tile-red', `url(${tileRed})`);
root.style.setProperty('--placement-box', `url(${placementBox})`);

ReactDOM.createRoot(document.getElementById("root")).render(
 <React.StrictMode>
    <AudioProvider>
      <App />
    </AudioProvider>
  </React.StrictMode>
);
