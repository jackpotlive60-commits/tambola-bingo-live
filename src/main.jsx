import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { supabase } from "./lib/supabase";
import "./styles.css";

const numbers = Array.from({ length: 90 }, (_, i) => i + 1);

const themes = [
  {
    id: "royal",
    name: "Royal Purple",
    description: "Premium purple gaming style",
    className: "theme-royal",
  },
  {
    id: "casino",
    name: "Casino Night",
    description: "Bold casino-inspired style",
    className: "theme-casino",
  },
  {
    id: "festival",
    name: "Festival",
    description: "Bright celebration style",
    className: "theme-festival",
  },
  {
    id: "luxury",
    name: "Luxury Gold",
    description: "Elegant premium style",
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

function generateGameCode() {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < 6; i += 1) {
    code += characters[Math.floor(Math.random() * characters.length)];
  }

  return code;
}

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
        <span>●</span> Live Platform
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

function CreateGame({ onBack, onCreated }) {
  const [hostName, setHostName] = useState("");
  const [gameName, setGameName] = useState("");
  const [ticketLimit, setTicketLimit] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [gameDate, setGameDate] = useState("");
  const [gameTime, setGameTime] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("royal");
  const [prizes, setPrizes] = useState(defaultPrizes);
  const [customPrize, setCustomPrize] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  function updatePrize(index, value) {
    setPrizes((current) =>
      current.map((prize, i) =>
        i === index
          ? { ...prize, amount: value }
          : prize
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

  async function createGame(event) {
    event.preventDefault();

    setError("");
    setCreating(true);

    try {
      let gameCode = generateGameCode();

      let codeExists = true;

      while (codeExists) {
        const { data, error: checkError } = await supabase
          .from("games")
          .select("id")
          .eq("game_code", gameCode)
          .maybeSingle();

        if (checkError) {
          throw checkError;
        }

        if (!data) {
          codeExists = false;
        } else {
          gameCode = generateGameCode();
        }
      }

      const { data: game, error: insertError } = await supabase
        .from("games")
        .insert({
          host_name: hostName.trim(),
          game_name: gameName.trim(),
          status: "upcoming",
          ticket_limit: Number(ticketLimit),
          ticket_price: Number(ticketPrice),
          call_interval_seconds: 5,
          game_date: gameDate,
          game_time: gameTime,
          theme: selectedTheme,
          game_code: gameCode,
          invite_enabled: true,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      onCreated({
        ...game,
        prizes,
      });
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "We couldn't create the game. Please try again."
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="create-page">
      <button className="back-button" onClick={onBack}>
        ← Back to Home
      </button>

      <div className="create-header">
        <span className="live-badge">HOST PORTAL</span>

        <h1>
          Create Your <strong>Tambola Game</strong>
        </h1>

        <p>
          Set your game details, tickets, prizes and player theme.
        </p>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={createGame}>
        <div className="form-card">
          <div className="form-card-title">
            <span>👤</span>

            <div>
              <h2>Host Details</h2>
              <p>Tell players who is hosting this game</p>
            </div>
          </div>

          <label>
            Host Name
            <input
              type="text"
              placeholder="Your name"
              value={hostName}
              onChange={(event) => setHostName(event.target.value)}
              required
            />
          </label>
        </div>

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
                onChange={(event) =>
                  setTicketLimit(event.target.value)
                }
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
                  onChange={(event) =>
                    setTicketPrice(event.target.value)
                  }
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
                onChange={(event) =>
                  setGameDate(event.target.value)
                }
                required
              />
            </label>

            <label>
              Game Time

              <input
                type="time"
                value={gameTime}
                onChange={(event) =>
                  setGameTime(event.target.value)
                }
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
              <p>
                Set the prize amount for each winning category
              </p>
            </div>
          </div>

          <div className="prize-form-grid">
            {prizes.map((prize, index) => (
              <div
                className="prize-row"
                key={`${prize.name}-${index}`}
              >
                <div>
                  <strong>{prize.name}</strong>

                  {prize.custom && (
                    <small>Custom Prize</small>
                  )}
                </div>

                <div className="input-with-prefix">
                  <span>₹</span>

                  <input
                    type="number"
                    min="0"
                    placeholder="Amount"
                    value={prize.amount}
                    onChange={(event) =>
                      updatePrize(
                        index,
                        event.target.value
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="custom-prize">
            <input
              type="text"
              placeholder="Custom prize name"
              value={customPrize}
              onChange={(event) =>
                setCustomPrize(event.target.value)
              }
            />

            <button
              type="button"
              onClick={addCustomPrize}
            >
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
                Every player joining this game will see this theme.
              </p>
            </div>
          </div>

          <div className="theme-grid">
            {themes.map((theme) => (
              <button
                type="button"
                key={theme.id}
                className={`theme-option ${
                  selectedTheme === theme.id
                    ? "selected"
                    : ""
                } ${theme.className}`}
                onClick={() =>
                  setSelectedTheme(theme.id)
                }
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
            🎨 <strong>Game-wide theme:</strong>{" "}
            Your selected theme is saved with this game and
            will later be automatically shown to invited players.
          </div>
        </div>

        <div className="create-summary">
          <div>
            <span>THEME</span>

            <strong>
              {
                themes.find(
                  (theme) =>
                    theme.id === selectedTheme
                )?.name
              }
            </strong>
          </div>

          <div>
            <span>TICKET PRICE</span>

            <strong>
              ₹{ticketPrice || "0"}
            </strong>
          </div>

          <div>
            <span>TICKET LIMIT</span>

            <strong>
              {ticketLimit || "0"}
            </strong>
          </div>
        </div>

        <button
          className="create-game-button"
          type="submit"
          disabled={creating}
        >
          {creating
            ? "⏳ Creating Game..."
            : "🎮 Create Game"}
        </button>
      </form>
    </section>
  );
}

function HostControlCentre({ game, onHome }) {
  const inviteUrl =
    `${window.location.origin}/?game=${game.game_code}`;

  const selectedTheme =
    themes.find(
      (theme) => theme.id === game.theme
    ) || themes[0];

  function copyInviteLink() {
    navigator.clipboard.writeText(inviteUrl);
    alert("Invitation link copied!");
  }

  function shareInvite() {
    if (navigator.share) {
      navigator.share({
        title: game.game_name,
        text:
          `Join my Tambola game: ${game.game_name}`,
        url: inviteUrl,
      });
    } else {
      copyInviteLink();
    }
  }

  return (
    <section className="create-page">
      <div className="control-success">
        <div className="success-icon">✓</div>

        <span>GAME CREATED</span>

        <h1>
          Your game is <strong>ready!</strong>
        </h1>

        <p>
          Share the invitation with your players.
        </p>
      </div>

      <div className="form-card">
        <div className="game-code-card">
          <small>GAME CODE</small>

          <strong>{game.game_code}</strong>

          <span>
            Players can use this code with your invitation.
          </span>
        </div>
      </div>

      <div className="form-card">
        <div className="form-card-title">
          <span>🔗</span>

          <div>
            <h2>Player Invitation</h2>
            <p>
              Share this link with everyone who wants to play.
            </p>
          </div>
        </div>

        <div className="invite-link">
          {inviteUrl}
        </div>

        <div className="control-actions">
          <button
            className="secondary-action"
            onClick={copyInviteLink}
          >
            📋 Copy Link
          </button>

          <button
            className="primary-action"
            onClick={shareInvite}
          >
            📲 Share Invitation
          </button>
        </div>
      </div>

      <div className="form-card">
        <div className="form-card-title">
          <span>🎨</span>

          <div>
            <h2>Game Theme</h2>
            <p>The theme selected for this game.</p>
          </div>
        </div>

        <div
          className={`selected-theme-card ${selectedTheme.className}`}
        >
          <div className="theme-preview">
            <span>45</span>
            <span>29</span>
            <span>7</span>
          </div>

          <div>
            <strong>{selectedTheme.name}</strong>
            <small>{selectedTheme.description}</small>
          </div>
        </div>
      </div>

      <div className="control-grid">
        <button className="control-card">
          <span>🖼️</span>
          <strong>Generate Poster</strong>
          <small>Create a shareable game poster</small>
        </button>

        <button className="control-card">
          <span>🎟️</span>
          <strong>Ticket Bookings</strong>
          <small>View and manage player bookings</small>
        </button>

        <button className="control-card">
          <span>👥</span>
          <strong>Players</strong>
          <small>See everyone joining your game</small>
        </button>

        <button className="control-card">
          <span>🏆</span>
          <strong>Prizes</strong>
          <small>Manage prizes and winners</small>
        </button>

        <button className="control-card">
          <span>🔢</span>
          <strong>Live Game</strong>
          <small>Start calling Tambola numbers</small>
        </button>

        <button className="control-card">
          <span>⚙️</span>
          <strong>Game Settings</strong>
          <small>Manage your game controls</small>
        </button>
      </div>

      <button className="back-button" onClick={onHome}>
        ← Return Home
      </button>
    </section>
  );
}

function App() {
  const [page, setPage] = useState("home");
  const [createdGame, setCreatedGame] = useState(null);

  function handleGameCreated(game) {
    setCreatedGame(game);
    setPage("control");
  }

  return (
    <main className="app">
      <Header
        onHome={() => {
          setPage("home");
          setCreatedGame(null);
        }}
      />

      {page === "home" && (
        <Home
          onCreateGame={() => setPage("create")}
        />
      )}

      {page === "create" && (
        <CreateGame
          onBack={() => setPage("home")}
          onCreated={handleGameCreated}
        />
      )}

      {page === "control" && createdGame && (
        <HostControlCentre
          game={createdGame}
          onHome={() => {
            setPage("home");
            setCreatedGame(null);
          }}
        />
      )}

      <footer>
        <span>🛡 Secure Platform</span>
        <span>🎧 Host Support</span>
        <span>🇮🇳 Made for India</span>
      </footer>

      <nav className="bottom-nav">
        <span
          className={
            page === "home" ? "active" : ""
          }
          onClick={() => setPage("home")}
        >
          ⌂
          <small>Home</small>
        </span>

        <span>
          ℹ
          <small>How It Works</small>
        </span>

        <span
          className="plus"
          onClick={() => setPage("create")}
        >
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

createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
