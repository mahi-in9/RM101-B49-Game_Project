// App.jsx
import React from "react";
import CarRacingGame from "./components/CarGame/CarRacingGame";

function App() {
  return (
    <div className="App">
      {/* The game component is self-contained and handles 
        its own full-screen dimensions.
      */}
      <CarRacingGame />
    </div>
  );
}

export default App;
