import React from 'react';
import ReplayIcon from "@/assets/ReplayIcon";

interface ReplayScreenProps {
  open: boolean;
  score: number;
  bestScore: number;
  onRestart: () => void;
  endReason?: "time" | "grid";
}

const ReplayScreen = ({
  open,
  score,
  bestScore,
  onRestart,
  endReason = "grid",
}: ReplayScreenProps) => {
  if (!open) return null;

  const subText =
    endReason === "time"
      ? "Time's up."
      : "Your grid is full.";

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRestart();
  };

  return (
    <div
      style={{ pointerEvents: "auto" }}
      className="absolute inset-0 h-screen w-screen z-60 bg-black/50 backdrop-blur-xs flex flex-col justify-center items-center"
    >
      <div
        style={{ pointerEvents: "auto" }}
        className="bg-[#e1fcf9] border-[6px] border-[#a7fbec] rounded-[24px] px-10 py-10 shadow-2xl max-w-sm w-[90%] text-center min-h-[260px] flex flex-col justify-center"
      >
        <div
          className="text-3xl md:text-4xl font-extrabold mb-3"
          style={{
            color: "#0f766e",
            textShadow:
              "0 2px 0 rgba(0,0,0,0.25), 0 0 12px rgba(34,211,238,0.8)",
          }}
        >
          GAME OVER!
        </div>
        <p className="text-lg font-semibold text-gray-800 mb-4">
          {subText}
        </p>
        <div className="text-base md:text-lg text-gray-900 mb-6 space-y-1">
          <p>
            <span className="font-semibold">Final Score:</span>{" "}
            <span>{score ?? 0}</span>
          </p>
          <p>
            <span className="font-semibold">Best Score:</span>{" "}
            <span>{bestScore ?? 0}</span>
          </p>
        </div>
        <button
          onClick={handleClick}
          className="mt-2 w-full rounded-[999px] bg-[#f9735b] hover:bg-[#ea580c] text-white font-bold text-lg py-3 shadow-lg transition-colors flex items-center justify-center gap-2"
        >
          <span>Play Again</span>
          <span className="inline-flex">
            <ReplayIcon />
          </span>
        </button>
      </div>
    </div>
  );
};

export default ReplayScreen;

