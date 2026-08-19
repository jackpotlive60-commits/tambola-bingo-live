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

        <span className="logo">
          <strong>TAMBOLA</strong>
          <small>BINGO LIVE</small>
        </span>
      </button>

      <div className="online">
        <span>●</span>
        Live Platform
      </div>

      <button className="menu-button" type="button">
        ☰
      </button>
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
            A professional live Tambola platform for hosts and
            players. Create games, invite players, manage tickets,
            and run your game from one place.
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
          <button
            className="entry-card host"
            type="button"
            onClick={onCreateGame}
          >
            <div className="entry-icon">🎮</div>

            <div className="entry-content">
              <span className="role">HOST</span>
              <h2>Host a Game</h2>
              <p>
                Create and manage your Tambola game,
                set tickets and prizes, and invite players.
              </p>
            </div>

            <div className="entry-arrow">→</div>
          </button>

          <div className="entry-card player">
            <div className="entry-icon">🎟️</div>

            <div className="entry-content">
              <span className="role">PLAYER</span>
              <h2>Join an Invitation</h2>
              <p>
                Open the invitation link received from your host
                to continue to the game.
              </p>
            </div>

            <div className="entry-arrow">→</div>
          </div>
        </div>

        <div className="invitation-note">
          🔗 Players with a host invitation link will be taken
          directly to their specific game invitation.
        </div>
      </section>

      <section className="preview">
        <div className="section-title">
          <div>
            <h2>📡 Live Game Preview</h2>
            <span>Real-time gameplay</span>
          </div>
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
                className={
                  [7, 16, 29, 33, 45, 67].includes(number)
                    ? "called"
                    : ""
                }
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

    if (!name) {
      return;
    }

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
    <section className="page-shell create-page">
      <button
        className="back-button"
        type="button"
        onClick={onBack}
      >
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
              <p>Tell players who is hosting this game.</p>
            </div>
          </div>

          <label>
            Host Name

            <input
              type="text"
              placeholder="Your name"
              value={hostName}
              onChange={(event) =>
                setHostName(event.target.value)
              }
              required
            />
          </label>
        </div>

        <div className="form-card">
          <div className="form-card-title">
            <span>🎮</span>

            <div>
              <h2>Game Details</h2>
              <p>Basic information about your game.</p>
            </div>
          </div>

          <label>
            Game Name

            <input
              type="text"
              placeholder="Example: Friday Night Tambola"
              value={gameName}
              onChange={(event) =>
                setGameName(event.target.value)
              }
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

              <small>Maximum tickets available.</small>
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

              <small>Price per ticket.</small>
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
                Set the prize amount for each winning category.
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
                Players joining this game will eventually see
                this same theme.
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
            Your selected theme is saved with this game.
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
            <strong>₹{ticketPrice || "0"}</strong>
          </div>

          <div>
            <span>TICKET LIMIT</span>
            <strong>{ticketLimit || "0"}</strong>
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

function BookingPreviewCard() {
  return (
    <div className="booking-preview">
      <div className="booking-preview-top">
        <div>
          <span className="booking-status">PENDING</span>
          <h3>Ticket booking requests</h3>
          <p>
            Approved and rejected actions will be connected
            to your ticket booking database next.
          </p>
        </div>

        <div className="pending-count">0</div>
      </div>

      <div className="booking-empty">
        <div className="empty-icon">🎟️</div>

        <strong>No pending bookings yet</strong>

        <p>
          When players request tickets, their name,
          requested tickets and booking details will appear here.
        </p>
      </div>

      <div className="approval-preview">
        <div className="approval-preview-label">
          APPROVAL CONTROLS
        </div>

        <div className="approval-buttons">
          <button
            type="button"
            className="approve-button"
            disabled
          >
            ✓ Approve
          </button>

          <button
            type="button"
            className="reject-button"
            disabled
          >
            ✕ Reject
          </button>
        </div>

        <small>
          These controls are ready for the booking workflow.
        </small>
      </div>
    </div>
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
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteUrl);
      alert("Invitation link copied!");
    }
  }

  async function shareInvite() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: game.game_name,
          text:
            `Join my Tambola game: ${game.game_name}`,
          url: inviteUrl,
        });
      } catch {
        // User closed the share sheet.
      }
    } else {
      copyInviteLink();
    }
  }

  return (
    <section className="page-shell control-page">
      <div className="control-top">
        <button
          className="back-button"
          type="button"
          onClick={onHome}
        >
          ← Home
        </button>

        <span className="status-pill">
          ● {game.status || "UPCOMING"}
        </span>
      </div>

      <div className="control-hero">
        <div className="control-hero-icon">🎮</div>

        <span className="live-badge">HOST CONTROL CENTRE</span>

        <h1>{game.game_name}</h1>

        <p>
          Hosted by <strong>{game.host_name}</strong>
        </p>

        <div className="game-meta">
          <span>
            📅 {game.game_date || "Date not set"}
          </span>

          <span>
            🕐 {game.game_time || "Time not set"}
          </span>
        </div>
      </div>

      <div className="code-card">
        <div className="code-label">GAME CODE</div>

        <div className="game-code">
          {game.game_code}
        </div>

        <p>
          Share this code or the invitation link with players.
        </p>
      </div>

      <div className="control-card-section">
        <div className="section-card-heading">
          <div className="section-card-icon">🔗</div>

          <div>
            <h2>Player Invitation</h2>
            <p>
              Send this invitation to the players you want
              to join.
            </p>
          </div>
        </div>

        <div className="invite-link-box">
          <span>{inviteUrl}</span>
        </div>

        <div className="invite-actions">
          <button
            type="button"
            className="secondary-action"
            onClick={copyInviteLink}
          >
            📋 Copy Link
          </button>

          <button
            type="button"
            className="primary-action"
            onClick={shareInvite}
          >
            📲 Share
          </button>
        </div>
      </div>

      <div className="control-card-section">
        <div className="section-card-heading">
          <div className="section-card-icon">🎨</div>

          <div>
            <h2>Game Theme</h2>
            <p>
              This is the theme selected for this game.
            </p>
          </div>
        </div>

        <div
          className={`selected-theme-card ${selectedTheme.className}`}
        >
          <div className="theme-preview large">
            <span>45</span>
            <span>29</span>
            <span>7</span>
          </div>

          <div className="selected-theme-info">
            <strong>{selectedTheme.name}</strong>
            <span>{selectedTheme.description}</span>
          </div>
        </div>
      </div>

      <div className="control-card-section bookings-section">
        <div className="section-card-heading">
          <div className="section-card-icon">🎟️</div>

          <div>
            <div className="heading-with-badge">
              <h2>Ticket Bookings</h2>
              <span className="pending-badge">PENDING</span>
            </div>

            <p>
              Review player requests before approving tickets.
            </p>
          </div>
        </div>

        <BookingPreviewCard />
      </div>

      <div className="control-card-section">
        <div className="section-card-heading">
          <div className="section-card-icon">⚡</div>

          <div>
            <h2>Game Controls</h2>
            <p>
              Everything you need to run your live game.
            </p>
          </div>
        </div>

        <div className="control-grid">
          <button type="button" className="control-action-card">
            <span>🖼️</span>
            <strong>Generate Poster</strong>
            <small>
              Create a shareable game poster.
            </small>
          </button>

          <button type="button" className="control-action-card">
            <span>👥</span>
            <strong>Players</strong>
            <small>
              View players who have joined.
            </small>
          </button>

          <button type="button" className="control-action-card">
            <span>🏆</span>
            <strong>Prizes</strong>
            <small>
              View and manage game prizes.
            </small>
          </button>

          <button type="button" className="control-action-card live-action">
            <span>🔢</span>
            <strong>Live Game</strong>
            <small>
              Start calling Tambola numbers.
            </small>
          </button>

          <button type="button" className="control-action-card">
            <span>⚙️</span>
            <strong>Game Settings</strong>
            <small>
              Manage your game settings.
            </small>
          </button>

          <button type="button" className="control-action-card">
            <span>📊</span>
            <strong>Game Summary</strong>
            <small>
              View tickets, players and results.
            </small>
          </button>
        </div>
      </div>

      <div className="control-footer-note">
        <span>🛡</span>

        <div>
          <strong>Host controls are private</strong>
          <p>
            Players will only see the invitation and player
            experience, not this control centre.
          </p>
        </div>
      </div>

      <button
        className="return-home-button"
        type="button"
        onClick={onHome}
      >
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
        <button
          type="button"
          className={page === "home" ? "active" : ""}
          onClick={() => setPage("home")}
        >
          <span>⌂</span>
          <small>Home</small>
        </button>

        <button type="button">
          <span>ℹ</span>
          <small>How It Works</small>
        </button>

        <button
          type="button"
          className="plus"
          onClick={() => setPage("create")}
        >
          ＋
        </button>

        <button type="button">
          <span>🎟</span>
          <small>Invitations</small>
        </button>

        <button type="button">
          <span>♙</span>
          <small>Account</small>
        </button>
      </nav>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
