import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const numbers = Array.from({ length: 90 }, (_, i) => i + 1);

const themes = [
  {
    id: "royal",
    name: "Royal Purple",
    description: "Premium purple and gold gaming style",
    className: "theme-royal",
  },
  {
    id: "casino",
    name: "Casino Night",
    description: "Bold casino-inspired live game",
    className: "theme-casino",
  },
  {
    id: "festival",
    name: "Festival",
    description: "Bright and colourful celebration style",
    className: "theme-festival",
  },
  {
    id: "luxury",
    name: "Luxury Gold",
    description: "Elegant premium game experience",
    className: "theme-luxury",
  },
];

const defaultPrizes = [
  { name: "First Five", amount: "" },
  { name: "Four Corners", amount: "" },
  { name: "Top Line", amount: "" },
  { name: "Middle Line", amount: "" },
  { name: "Bottom Line", amount: "" },
  { name: "Full House", amount: "" },
];

function Header({ onHome }) {
  return (
    <header className="topbar">
      <button className="brand-button" onClick={onHome}>
        <span className="crown">♛</span>
        <div className="logo">
          <strong>TAMBOLA</strong>
          <small>BINGO LIVE</small>
        </div>
      </button>

      <div className="online">
        <span>●</span> Host Portal
      </div>

      <button className="menu">☰</button>
    </header>
  );
}

function Home({ onCreateGame }) {
  return (
    <>
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
          <button className="entry-card host" onClick={onCreateGame}>
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
      </section>
    </>
  );
}

function CreateGame({ onBack }) {
  const [gameName, setGameName] = useState("");
  const [ticketLimit, setTicketLimit] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [gameDate, setGameDate] = useState("");
  const [gameTime, setGameTime] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("royal");
  const [prizes, setPrizes] = useState(defaultPrizes);
  const [customPrize, setCustomPrize] = useState("");

  function updatePrize(index, value) {
    setPrizes((current) =>
      current.map((prize, i) =>
        i === index ? { ...prize, amount: value } : prize
      )
    );
  }

  function addCustomPrize() {
    const name = customPrize.trim();

    if (!name) return;

    setPrizes((current) => [
      ...current,
      {
        name,
        amount: "",
        custom: true,
      },
    ]);

    setCustomPrize("");
  }

  function handleCreateGame(event) {
    event.preventDefault();

    alert(
      "Create Game UI is ready. Supabase game creation will be connected in the next step."
    );
  }

  return (
    <section className="create-page">
      <button className="back-button" onClick={onBack}>
        ← Back to Home
      </button>

      <div className="create-header">
        <span className="live-badge">HOST PORTAL</span>
        <h1>Create Your <strong>Tambola Game</strong></h1>
        <p>
          Set your game rules, tickets, prizes, date, time and player theme.
        </p>
      </div>

      <form onSubmit={handleCreateGame}>
        <div className="form-card">
          <div className="form-card-title">
            <span>🎮</span>
            <div>
              <h2>Game Details</h2>
              <p>Basic information about your game</p>
            </div>
          </div>

          <label>
            Game Name
            <input
              type="text"
              placeholder="Example: Friday Night Tambola"
              value={gameName}
              onChange={(event) => setGameName(event.target.value)}
              required
            />
          </label>

          <div className="two-column">
            <label>
              Ticket Limit
              <input
                type="number"
                min="1"
                placeholder="100"
                value={ticketLimit}
                onChange={(event) => setTicketLimit(event.target.value)}
                required
              />
              <small>Maximum tickets available</small>
            </label>

            <label>
              Ticket Price
              <div className="input-with-prefix">
                <span>₹</span>
                <input
                  type="number"
                  min="0"
                  placeholder="50"
                  value={ticketPrice}
                  onChange={(event) => setTicketPrice(event.target.value)}
                  required
                />
              </div>
              <small>Price per ticket</small>
            </label>
          </div>

          <div className="two-column">
            <label>
              Game Date
              <input
                type="date"
                value={gameDate}
                onChange={(event) => setGameDate(event.target.value)}
                required
              />
            </label>

            <label>
              Game Time
              <input
                type="time"
                value={gameTime}
                onChange={(event) => setGameTime(event.target.value)}
                required
              />
            </label>
          </div>
        </div>

        <div className="form-card">
          <div className="form-card-title">
            <span>🏆</span>
            <div>
              <h2>Game Prizes</h2>
              <p>Set the prize amount for each winning category</p>
            </div>
          </div>

          <div className="prize-form-grid">
            {prizes.map((prize, index) => (
              <div className="prize-row" key={`${prize.name}-${index}`}>
                <div>
                  <strong>{prize.name}</strong>
                  {prize.custom && <small>Custom Prize</small>}
                </div>

                <div className="input-with-prefix">
                  <span>₹</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Amount"
                    value={prize.amount}
                    onChange={(event) =>
                      updatePrize(index, event.target.value)
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="custom-prize">
            <input
              type="text"
              placeholder="Custom prize name, e.g. Early Bird"
              value={customPrize}
              onChange={(event) => setCustomPrize(event.target.value)}
            />

            <button type="button" onClick={addCustomPrize}>
              + Add Custom Prize
            </button>
          </div>
        </div>

        <div className="form-card">
          <div className="form-card-title">
            <span>🎨</span>
            <div>
              <h2>Game Theme</h2>
              <p>
                Players will automatically see the theme you choose for
                this game.
              </p>
            </div>
          </div>

          <div className="theme-grid">
            {themes.map((theme) => (
              <button
                type="button"
                key={theme.id}
                className={`theme-option ${
                  selectedTheme === theme.id ? "selected" : ""
                } ${theme.className}`}
                onClick={() => setSelectedTheme(theme.id)}
              >
                <div className="theme-preview">
                  <span>45</span>
                  <span>29</span>
                  <span>7</span>
                </div>

                <strong>{theme.name}</strong>
                <small>{theme.description}</small>

                {selectedTheme === theme.id && (
                  <b className="theme-check">✓</b>
                )}
              </button>
            ))}
          </div>

          <div className="theme-info">
            🎨 <strong>Game-wide theme:</strong> Once selected, this theme
            will be used by both the host and all players who join this game.
          </div>
        </div>

        <div className="create-summary">
          <div>
            <span>SELECTED THEME</span>
            <strong>
              {themes.find((theme) => theme.id === selectedTheme)?.name}
            </strong>
          </div>

          <div>
            <span>TICKET PRICE</span>
            <strong>₹{ticketPrice || "0"}</strong>
          </div>

          <div>
            <span>TICKET LIMIT</span>
            <strong>{ticketLimit || "0"}</strong>
          </div>
        </div>

        <button className="create-game-button" type="submit">
          🎮 Create Game
        </button>
      </form>
    </section>
  );
}

function App() {
  const [page, setPage] = useState("home");

  return (
    <main className="app">
      <Header onHome={() => setPage("home")} />

      {page === "home" && (
        <Home onCreateGame={() => setPage("create")} />
      )}

      {page === "create" && (
        <CreateGame onBack={() => setPage("home")} />
      )}

      <footer>
        <span>🛡 Secure Platform</span>
        <span>🎧 Host Support</span>
        <span>🇮🇳 Made for India</span>
      </footer>

      <nav className="bottom-nav">
        <span
          className={page === "home" ? "active" : ""}
          onClick={() => setPage("home")}
        >
          ⌂
          <small>Home</small>
        </span>

        <span>
          ℹ
          <small>How It Works</small>
        </span>

        <span className="plus" onClick={() => setPage("create")}>
          ＋
        </span>

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
