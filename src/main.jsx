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
          <span>●</span> Live Platform
        </div>

        <button className="menu">☰</button>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="live-badge">● LIVE TAMBOLA PLATFORM</span>

          <h1>
            Play Tambola.
            <br />
            <strong>Play Live.</strong>
            <br />
            <em>Win Together.</em>
          </h1>

          <p>
            A professional live Tambola platform for hosts and players.
            Create exciting games, invite players, manage tickets,
            and enjoy real-time gameplay.
          </p>

          <div className="features">
            <span>🛡 Secure & Fair</span>
            <span>⚡ Real-time Games</span>
            <span>🏆 Automatic Winners</span>
          </div>
        </div>

        <div className="cage">
          <div className="ball ball-one">45</div>
          <div className="ball ball-two">29</div>
          <div className="bingo-cage">◎</div>
          <div className="ball ball-three">7</div>

          <div className="live-now">
            🔴 LIVE PLATFORM
            <br />
            Ready for your game
          </div>
        </div>
      </section>

      <section className="entry-section">
        <div className="section-heading">
          <span>GET STARTED</span>
          <h2>How are you joining?</h2>
          <p>Choose the option that matches your role.</p>
        </div>

        <div className="entry-grid">
          <button className="entry-card host">
            <div className="entry-icon">🎮</div>

            <div className="entry-content">
              <span className="role">HOST</span>
              <h2>Host a Game</h2>
              <p>
                Create and manage your own Tambola game,
                set tickets and prizes, and invite players.
              </p>
            </div>

            <div className="entry-arrow">→</div>
          </button>

          <button className="entry-card player">
            <div className="entry-icon">🎟️</div>

            <div className="entry-content">
              <span className="role">PLAYER</span>
              <h2>Join an Invitation</h2>
              <p>
                Already received a game invitation?
                Open your invitation and continue to ticket booking.
              </p>
            </div>

            <div className="entry-arrow">→</div>
          </button>
        </div>

        <div className="invitation-note">
          🔗 Players with a host invitation link will be taken directly
          to their specific game invitation page.
        </div>
      </section>

      <section className="preview">
        <div className="section-title">
          <h2>📡 Live Game Preview</h2>
          <span>Real-time gameplay</span>
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
          <h2>🎁 Popular Prize Types</h2>
          <span>Host configurable</span>
        </div>

        <div className="prize-grid">
          <div>
            FIRST FIVE
            <strong>Custom</strong>
          </div>

          <div>
            FOUR CORNERS
            <strong>Custom</strong>
          </div>

          <div>
            TOP LINE
            <strong>Custom</strong>
          </div>

          <div>
            MIDDLE LINE
            <strong>Custom</strong>
          </div>

          <div>
            BOTTOM LINE
            <strong>Custom</strong>
          </div>

          <div>
            FULL HOUSE
            <strong>Custom</strong>
          </div>
        </div>
      </section>

      <section className="stats">
        <div>
          👥
          <strong>Live</strong>
          <small>Player Experience</small>
        </div>

        <div>
          🎟️
          <strong>Smart</strong>
          <small>Ticket Management</small>
        </div>

        <div>
          🏆
          <strong>Auto</strong>
          <small>Winner Detection</small>
        </div>

        <div>
>📱
          <strong>WhatsApp</strong>
          <small>Booking Requests</small>
        </div>
      </section>

      <footer>
        <span>🛡 Secure Platform</span>
        <span>🎧 Host Support</span>
        <span>🇮🇳 Made for India</span>
      </footer>

      <nav className="bottom-nav">
        <span className="active">
          ⌂
          <small>Home</small>
        </span>

        <span>
          ℹ
          <small>How It Works</small>
        </span>

        <span className="plus">＋</span>

        <span>
          🎟
          <small>Invitations</small>
        </span>

        <span>
          ♙
          <small>Account</small>
        </span>
      </nav>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
