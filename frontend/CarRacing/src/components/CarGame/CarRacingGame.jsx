import React, { useEffect } from "react";
import { useCarGameEngine } from "./useCarGameEngine";
import { LoadingScreen, HUD, GameOverScreen, MobileControls } from "./GameUI";

const CarRacingGame = () => {
  const {
    mountRef,
    score,
    gameOver,
    isLoading,
    loadingProgress,
    handleInput,
    handleRestart,
  } = useCarGameEngine();

  // Keyboard binding logic kept in component or moved to hook.
  // For clarity, we can bridge it here or put inside hook.
  // Let's bridge it to demonstrate usage of handleInput.
  useEffect(() => {
    const onDown = (e) => {
      const key = e.key.toLowerCase();
      if (key === "arrowleft" || key === "a") handleInput("left", true);
      if (key === "arrowright" || key === "d") handleInput("right", true);
    };
    const onUp = (e) => {
      const key = e.key.toLowerCase();
      if (key === "arrowleft" || key === "a") handleInput("left", false);
      if (key === "arrowright" || key === "d") handleInput("right", false);
    };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [handleInput]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-blue-300">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        * { font-family: 'Press Start 2P', cursive, sans-serif; }
        body { margin: 0; overflow: hidden; overscroll-behavior: none; touch-action: none; }
      `}</style>

      {/* 3D Scene Container */}
      <div ref={mountRef} className="w-full h-full" />

      {/* UI Overlays */}
      {isLoading && <LoadingScreen progress={loadingProgress} />}
      {!isLoading && <HUD score={score} />}
      {!isLoading && gameOver && <GameOverScreen onRestart={handleRestart} />}
      {!isLoading && !gameOver && <MobileControls onInput={handleInput} />}
    </div>
  );
};

export default CarRacingGame;
