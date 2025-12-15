// GameUI.jsx
import React from "react";

export const LoadingScreen = ({ progress }) => (
  <div className="fixed inset-0 bg-black text-white flex flex-col justify-center items-center text-2xl z-50 gap-4">
    <div className="text-base">Loading Game...</div>
    <div className="text-sm">{progress}%</div>
  </div>
);

export const HUD = ({ score }) => (
  <div
    className="absolute top-2 left-2 text-white text-xl z-40 pointer-events-none"
    style={{ textShadow: "1px 1px 3px black" }}
  >
    <div className="mb-1">Score: {score}</div>
  </div>
);

export const GameOverScreen = ({ onRestart }) => (
  <div className="fixed inset-0 flex flex-col justify-center items-center z-50 gap-5 bg-black bg-opacity-40">
    <div
      className="text-red-500 text-4xl font-bold text-center"
      style={{ textShadow: "2px 2px 5px black" }}
    >
      GAME OVER!
    </div>
    <button
      onClick={onRestart}
      className="bg-green-600 text-white px-5 py-3 rounded-lg text-base cursor-pointer hover:bg-green-700 active:scale-95 transition-all"
      style={{ boxShadow: "2px 2px 5px rgba(0,0,0,0.5)" }}
    >
      Restart
    </button>
  </div>
);

export const MobileControls = ({ onInput }) => {
  const btnStyle =
    "fixed bottom-5 w-20 h-20 bg-white bg-opacity-30 border-2 border-black border-opacity-50 rounded-full z-40 flex justify-center items-center text-3xl text-black text-opacity-70 cursor-pointer select-none active:bg-white active:bg-opacity-50 touch-none";

  return (
    <>
      <div
        className={`${btnStyle} left-5`}
        onPointerDown={(e) => {
          e.preventDefault();
          onInput("left", true);
        }}
        onPointerUp={(e) => {
          e.preventDefault();
          onInput("left", false);
        }}
        onPointerLeave={() => onInput("left", false)}
      >
        ◀
      </div>
      <div
        className={`${btnStyle} right-5`}
        onPointerDown={(e) => {
          e.preventDefault();
          onInput("right", true);
        }}
        onPointerUp={(e) => {
          e.preventDefault();
          onInput("right", false);
        }}
        onPointerLeave={() => onInput("right", false)}
      >
        ▶
      </div>
    </>
  );
};
