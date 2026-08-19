import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

function App() {
  return (
    <main className="app">
      <section className="hero">
        <div className="badge">● LIVE GAME PLATFORM</div>

        <h1>Tambola<br />Bingo Live</h1>

        <p>
          Create a game, invite players, approve bookings,
          and run your live Tambola game from one place.
        </p>

        <div className="actions">
          <button>🎮 Create Game</button>
          <button className="secondary">🎟️ Join Game</button>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
