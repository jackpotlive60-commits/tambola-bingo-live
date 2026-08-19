import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const numbers = Array.from({ length: 90 }, (_, i) => i + 1);

function App() {
  return (
    <main className="app">
      <header className="topbar">
        <div className="logo">
          <span className="crown">♛</span>
          <div>
            <strong>TAMBOLA</strong>
            <small>BINGO LIVE</small>
          </div>
        </div>

        <div className="online">
          <span>●</span> 812 Players Online
        </div>

        <button className="menu">☰</button>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="live-badge">● LIVE GAME PLATFORM</span>

          <h1>
            India's Most Trusted
            <br />
            <strong>Live Tambola</strong>
            <br />
            <em>Game Platform</em>
          </h1>

          <p>
            Create a game, invite players, approve bookings,
            and run your live Tambola game from one place.
          </p>

          <div className="features">
            <span>🛡 Secure & Fair</span>
            <span>⚡ Real-time Sync</span>
            <span>🏆 Auto Win Detection</span>
          </div>
        </div>

        <div className="cage">
          <div className="ball ball-one">45</div>
          <div className="ball ball-two">29</div>
          <div className="bingo-cage">◎</div>
          <div className="ball ball-three">7</div>
          <div className="live-now">🔴 LIVE NOW<br />Game #TB7842</div>
        </div>
      </section>

      <section className="action-grid">
        <button className="game-card create">
          <span className="game-icon">🎮</span>
          <div>
            <h2>Create Game</h2>
            <p>Create a new Tambola game and invite players</p>
          </div>
          <strong>Create Game →</strong>
        </button>

        <button className="game-card join">
          <span className="game-icon">🎟️</span>
          <div>
            <h2>Join Game</h2>
            <p>Enter game code and join a live game</p>
          </div>
          <strong>Join Game →</strong>
        </button>
      </section>

      <section className="preview">
        <div className="section-title">
          <h2>📡 Live Game Preview</h2>
          <span>● Real-time</span>
        </div>

        <div className="number-layout">
          <div className="last-number">
            <small>LAST NUMBER</small>
            <strong>45</strong>
            <span>FORTY FIVE</span>

            <hr />

            <small>NEXT NUMBER</small>
            <b>??</b>
            <span>Stay Tuned</span>
          </div>

          <div className="board">
            {numbers.map((number) => (
              <span
                key={number}
                className={[7, 16, 29, 33, 45, 67].includes(number)
                  ? "called"
                  : ""}
              >
                {number}
              </span>
            ))}
          </div>
        </div>

        <div className="recent">
          <span>Recent Numbers</span>
          <b>45</b>
          <b>33</b>
          <b>29</b>
          <b>16</b>
          <b>7</b>
        </div>
      </section>

      <section className="prizes">
        <div className="section-title">
          <h2>🎁 Exciting Prizes to Win</h2>
          <span>View All Prizes →</span>
        </div>

        <div className="prize-grid">
          <div>FIRST FIVE<strong>₹500</strong></div>
          <div>FOUR CORNERS<strong>₹800</strong></div>
          <div>TOP LINE<strong>₹600</strong></div>
          <div>MIDDLE LINE<strong>₹600</strong></div>
          <div>BOTTOM LINE<strong>₹600</strong></div>
          <div>FULL HOUSE<strong>₹5000</strong></div>
        </div>
      </section>

      <section className="stats">
        <div>👥 <strong>12,458+</strong><small>Games Played</small></div>
        <div>👤 <strong>98,721+</strong><small>Happy Players</small></div>
        <div>🏆 <strong>₹48.6L+</strong><small>Prizes Won</small></div>
        <div>⚡ <strong>99.9%</strong><small>Uptime</small></div>
      </section>

      <footer>
        <span>🛡 100% Secure</span>
        <span>🎧 24/7 Support</span>
        <span>🇮🇳 Made in India</span>
      </footer>

      <nav className="bottom-nav">
        <span className="active">⌂<small>Home</small></span>
        <span>▦<small>My Games</small></span>
        <span className="plus">＋</span>
        <span>▣<small>Wallet</small></span>
        <span>♙<small>Profile</small></span>
      </nav>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
