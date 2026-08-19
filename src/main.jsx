import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { supabase } from "./lib/supabase";
import "./styles.css";

const numbers = Array.from({ length: 90 }, (_, i) => i + 1);

const themes = [
  {
    id: "royal",
    name: "Royal Purple",
    description: "Premium palace-inspired gaming style",
    className: "theme-royal",
    icon: "👑",
  },
  {
    id: "casino",
    name: "Casino Night",
    description: "Classic casino lounge experience",
    className: "theme-casino",
    icon: "♠",
  },
  {
    id: "festival",
    name: "Festival",
    description: "Colourful Indian celebration style",
    className: "theme-festival",
    icon: "🎉",
  },
  {
    id: "luxury",
    name: "Luxury Gold",
    description: "Elegant black and gold experience",
    className: "theme-luxury",
    icon: "✨",
  },
];

const defaultPrizes = [
  { name: "First Five", amount: "", approved: false, winner: null },
  { name: "Four Corners", amount: "", approved: false, winner: null },
  { name: "Top Line", amount: "", approved: false, winner: null },
  { name: "Middle Line", amount: "", approved: false, winner: null },
  { name: "Bottom Line", amount: "", approved: false, winner: null },
  { name: "Full House", amount: "", approved: false, winner: null },
];

const STORAGE_KEY = "tambola_bingo_live_host_game";

function generateGameCode() {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < 6; i += 1) {
    code += characters[Math.floor(Math.random() * characters.length)];
  }

  return code;
}

function getTheme(themeId) {
  return themes.find((theme) => theme.id === themeId) || themes[0];
}

function saveGameSession(game) {
  if (!game) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
}

function loadGameSession() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored);

    if (!parsed?.game_code) {
      return null;
    }

    return {
      ...parsed,
      status: parsed.status || "upcoming",
      calledNumbers: Array.isArray(parsed.calledNumbers)
        ? parsed.calledNumbers
        : [],
      prizes: Array.isArray(parsed.prizes)
        ? parsed.prizes
        : defaultPrizes,
      gameStarted: Boolean(parsed.gameStarted),
    };
  } catch (error) {
    console.error(
      "Unable to restore saved game session:",
      error
    );

    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function numberName(number) {
  if (!number) {
    return "";
  }

  const names = [
    "",
    "ONE",
    "TWO",
    "THREE",
    "FOUR",
    "FIVE",
    "SIX",
    "SEVEN",
    "EIGHT",
    "NINE",
    "TEN",
    "ELEVEN",
    "TWELVE",
    "THIRTEEN",
    "FOURTEEN",
    "FIFTEEN",
    "SIXTEEN",
    "SEVENTEEN",
    "EIGHTEEN",
    "NINETEEN",
    "TWENTY",
    "TWENTY ONE",
    "TWENTY TWO",
    "TWENTY THREE",
    "TWENTY FOUR",
    "TWENTY FIVE",
    "TWENTY SIX",
    "TWENTY SEVEN",
    "TWENTY EIGHT",
    "TWENTY NINE",
    "THIRTY",
    "THIRTY ONE",
    "THIRTY TWO",
    "THIRTY THREE",
    "THIRTY FOUR",
    "THIRTY FIVE",
    "THIRTY SIX",
    "THIRTY SEVEN",
    "THIRTY EIGHT",
    "THIRTY NINE",
    "FORTY",
    "FORTY ONE",
    "FORTY TWO",
    "FORTY THREE",
    "FORTY FOUR",
    "FORTY FIVE",
    "FORTY SIX",
    "FORTY SEVEN",
    "FORTY EIGHT",
    "FORTY NINE",
    "FIFTY",
    "FIFTY ONE",
    "FIFTY TWO",
    "FIFTY THREE",
    "FIFTY FOUR",
    "FIFTY FIVE",
    "FIFTY SIX",
    "FIFTY SEVEN",
    "FIFTY EIGHT",
    "FIFTY NINE",
    "SIXTY",
    "SIXTY ONE",
    "SIXTY TWO",
    "SIXTY THREE",
    "SIXTY FOUR",
    "SIXTY FIVE",
    "SIXTY SIX",
    "SIXTY SEVEN",
    "SIXTY EIGHT",
    "SIXTY NINE",
    "SEVENTY",
    "SEVENTY ONE",
    "SEVENTY TWO",
    "SEVENTY THREE",
    "SEVENTY FOUR",
    "SEVENTY FIVE",
    "SEVENTY SIX",
    "SEVENTY SEVEN",
    "SEVENTY EIGHT",
    "SEVENTY NINE",
    "EIGHTY",
    "EIGHTY ONE",
    "EIGHTY TWO",
    "EIGHTY THREE",
    "EIGHTY FOUR",
    "EIGHTY FIVE",
    "EIGHTY SIX",
    "EIGHTY SEVEN",
    "EIGHTY EIGHT",
    "EIGHTY NINE",
    "NINETY",
  ];

  return names[number] || "";
}

function Header({ onHome, playerMode = false }) {
  return (
    <header className="topbar">
      <button
        className="brand-button"
        type="button"
        onClick={onHome}
      >
        <span className="crown">♛</span>

        <span className="logo">
          <strong>TAMBOLA</strong>
          <small>BINGO LIVE</small>
        </span>
      </button>

      <div className="online">
        <span>●</span>
        {playerMode ? "Game Invitation" : "Live Platform"}
      </div>

      <button
        className="menu-button"
        type="button"
        aria-label="Menu"
      >
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
          <span className="live-badge">
            ● LIVE TAMBOLA PLATFORM
          </span>

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
          <div className="cage-decoration">✦</div>

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

  const activeTheme = getTheme(selectedTheme);

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
        approved: false,
        winner: null,
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

      const { data: game, error: insertError } =
        await supabase
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
        status: "upcoming",
        gameStarted: false,
        calledNumbers: [],
        prizes: prizes.map((prize) => ({
          ...prize,
          approved: false,
          winner: null,
        })),
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
    <section
      className={`page-shell create-page ${activeTheme.className}`}
    >
      <div className="theme-atmosphere" />

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

        <div className="form-card theme-selection-card">
          <div className="form-card-title">
            <span>🎨</span>

            <div>
              <h2>Game Theme</h2>
              <p>
                Choose the complete visual identity players
                will eventually experience.
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
                  <div className="preview-decoration">
                    {theme.id === "casino"
                      ? "♠ ♥ ♦ ♣"
                      : theme.id === "festival"
                        ? "✦ ✧ ✦ ✧"
                        : theme.id === "luxury"
                          ? "◆"
                          : "♛"}
                  </div>

                  <div className="preview-balls">
                    <span>45</span>
                    <span>29</span>
                    <span>7</span>
                  </div>
                </div>

                <div className="theme-name-row">
                  <span className="theme-icon">
                    {theme.icon}
                  </span>

                  <strong>{theme.name}</strong>
                </div>

                <small>{theme.description}</small>

                {selectedTheme === theme.id && (
                  <b className="theme-check">✓</b>
                )}
              </button>
            ))}
          </div>

          <div className="theme-live-preview">
            <div className="theme-live-copy">
              <span>SELECTED EXPERIENCE</span>
              <strong>
                {activeTheme.icon} {activeTheme.name}
              </strong>
              <small>{activeTheme.description}</small>
            </div>

            <div
              className={`mini-game-preview ${activeTheme.className}`}
            >
              <div className="mini-top">
                <span>LIVE</span>
                <b>45</b>
              </div>

              <div className="mini-board">
                {Array.from({ length: 15 }, (_, i) => (
                  <span
                    key={i}
                    className={
                      [3, 7, 11].includes(i)
                        ? "active"
                        : ""
                    }
                  >
                    {i + 1}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="theme-info">
            🎨 <strong>Game-wide theme:</strong>{" "}
            Your selected theme is saved with this game and
            controls the visual style of the player experience.
          </div>
        </div>

        <div className="create-summary">
          <div>
            <span>THEME</span>

            <strong>
              {activeTheme.name}
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

function PlayerGame({ game }) {
  const [accepted, setAccepted] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [selectedTickets, setSelectedTickets] = useState([]);

  const selectedTheme = getTheme(game.theme);
  const prizes = Array.isArray(game.prizes)
    ? game.prizes
    : defaultPrizes;

  const ticketLimit = Math.max(
    1,
    Number(game.ticket_limit || 20)
  );

  const availableTickets = Array.from(
    { length: ticketLimit },
    (_, index) => index + 1
  );

  function toggleTicket(ticketNumber) {
    setSelectedTickets((current) => {
      if (current.includes(ticketNumber)) {
        return current.filter(
          (ticket) => ticket !== ticketNumber
        );
      }

      return [...current, ticketNumber].sort(
        (a, b) => a - b
      );
    });
  }

  function continueToBooking() {
    setAccepted(true);
  }

  function bookTickets() {
    const name = playerName.trim();

    if (!name) {
      window.alert("Please enter your name.");
      return;
    }

    if (!selectedTickets.length) {
      window.alert("Please select at least one ticket.");
      return;
    }

    const ticketText = selectedTickets
      .map((ticket) => `#${ticket}`)
      .join(" ");

    const message =
      `Hi, ${name} wants to book ticket ${ticketText} ` +
      `for ${game.game_name}. Game Code: ${game.game_code}`;

    const whatsappUrl =
      `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.location.href = whatsappUrl;
  }

  if (!accepted) {
    return (
      <section
        className={`page-shell player-page ${selectedTheme.className}`}
      >
        <div className="theme-atmosphere" />

        <div className="player-invitation-card">
          <span className="live-badge">
            🎟️ GAME INVITATION
          </span>

          <div className="player-theme-icon">
            {selectedTheme.icon}
          </div>

          <h1>{game.game_name}</h1>

          <p className="player-host">
            Hosted by <strong>{game.host_name}</strong>
          </p>

          <div className="player-game-meta">
            <span>
              📅 {game.game_date || "Date not set"}
            </span>

            <span>
              🕐 {game.game_time || "Time not set"}
            </span>

            <span>
              {selectedTheme.icon} {selectedTheme.name}
            </span>
          </div>

          <div className="player-prizes">
            <div className="player-section-heading">
              <span>🏆 PRIZES</span>
              <h2>Game Prizes</h2>
            </div>

            <div className="player-prize-list">
              {prizes.map((prize, index) => (
                <div
                  className="player-prize-row"
                  key={`${prize.name}-${index}`}
                >
                  <strong>{prize.name}</strong>

                  <span>
                    ₹{prize.amount || "0"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="player-ticket-info">
            <div>
              <span>TICKET PRICE</span>
              <strong>
                ₹{game.ticket_price || "0"}
              </strong>
            </div>

            <div>
              <span>TICKETS</span>
              <strong>
                {game.ticket_limit || "0"} Available
              </strong>
            </div>
          </div>

          <button
            type="button"
            className="player-accept-button"
            onClick={continueToBooking}
          >
            ✓ I ACCEPT
          </button>

          <small className="player-invitation-note">
            Click I ACCEPT to continue to ticket booking.
          </small>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`page-shell player-page booking-page ${selectedTheme.className}`}
    >
      <div className="theme-atmosphere" />

      <div className="player-booking-header">
        <span className="live-badge">
          🎟️ TICKET BOOKING
        </span>

        <h1>{game.game_name}</h1>

        <p>
          Select the tickets you want to book.
        </p>
      </div>

      <div className="player-name-card">
        <label>
          Player Name

          <input
            type="text"
            placeholder="Example: P1"
            value={playerName}
            onChange={(event) =>
              setPlayerName(event.target.value)
            }
          />
        </label>
      </div>

      <div className="ticket-booking-card">
        <div className="ticket-booking-heading">
          <div>
            <span>TICKET NUMBERS</span>
            <h2>Choose Your Tickets</h2>
          </div>

          <strong>
            {selectedTickets.length} Selected
          </strong>
        </div>

        <div className="ticket-number-grid">
          {availableTickets.map((ticketNumber) => {
            const selected =
              selectedTickets.includes(ticketNumber);

            return (
              <button
                type="button"
                key={ticketNumber}
                className={`ticket-number ${
                  selected ? "selected" : ""
                }`}
                onClick={() =>
                  toggleTicket(ticketNumber)
                }
              >
                #{ticketNumber}
              </button>
            );
          })}
        </div>
      </div>

      <div className="actual-ticket-card">
        <div className="actual-ticket-heading">
          <span>ACTUAL TICKET</span>

          <strong>3 × 9 TAMBOLA TICKET</strong>
        </div>

        <div className="tambola-ticket-preview">
          <div className="tambola-ticket-title">
            {playerName.trim() || "PLAYER"}
          </div>

          <div className="tambola-ticket-grid">
            {Array.from({ length: 27 }, (_, index) => (
              <div key={index}>
                {index % 4 === 0
                  ? Math.floor(
                      Math.random() * 90
                    ) + 1
                  : ""}
              </div>
            ))}
          </div>

          <small>
            Your actual 3 × 9 Tambola ticket will be
            generated after the host approves your booking.
          </small>
        </div>
      </div>

      <div className="booking-summary">
        <div>
          <span>SELECTED TICKETS</span>

          <strong>
            {selectedTickets.length
              ? selectedTickets
                  .map((ticket) => `#${ticket}`)
                  .join(" ")
              : "None selected"}
          </strong>
        </div>

        <div>
          <span>TOTAL</span>

          <strong>
            ₹
            {selectedTickets.length *
              Number(game.ticket_price || 0)}
          </strong>
        </div>
      </div>

      <button
        type="button"
        className="book-tickets-button"
        onClick={bookTickets}
      >
        📲 BOOK TICKETS
      </button>

      <div className="booking-whatsapp-note">
        <span>💬</span>

        <div>
          <strong>Send booking request to host</strong>

          <p>
            WhatsApp will open with your booking message.
            Send it to the host and wait for approval.
          </p>
        </div>
      </div>
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

function LiveGamePanel({ game, onGameChange }) {
  const [autoCalling, setAutoCalling] = useState(false);

  const calledNumbers = game.calledNumbers || [];

  const currentNumber =
    calledNumbers[calledNumbers.length - 1] || null;

  const remainingNumbers = useMemo(
    () =>
      numbers.filter(
        (number) => !calledNumbers.includes(number)
      ),
    [calledNumbers]
  );

  function persist(nextGame) {
    onGameChange(nextGame);
  }

  function callNextNumber() {
    if (!game.gameStarted) {
      return;
    }

    if (remainingNumbers.length === 0) {
      setAutoCalling(false);

      persist({
        ...game,
        status: "completed",
        gameStarted: false,
      });

      return;
    }

    const randomIndex = Math.floor(
      Math.random() * remainingNumbers.length
    );

    const nextNumber = remainingNumbers[randomIndex];

    persist({
      ...game,
      status: "live",
      calledNumbers: [
        ...calledNumbers,
        nextNumber,
      ],
    });
  }

  function startGame() {
    persist({
      ...game,
      status: "live",
      gameStarted: true,
      calledNumbers: [],
    });
  }

  function resetGame() {
    setAutoCalling(false);

    const confirmed = window.confirm(
      "Reset all called numbers and restart this game?"
    );

    if (!confirmed) {
      return;
    }

    persist({
      ...game,
      status: "upcoming",
      gameStarted: false,
      calledNumbers: [],
    });
  }

  useEffect(() => {
    if (!autoCalling || !game.gameStarted) {
      return undefined;
    }

    const interval = window.setInterval(
      callNextNumber,
      Math.max(
        1,
        Number(game.call_interval_seconds || 5)
      ) * 1000
    );

    return () => window.clearInterval(interval);
  }, [
    autoCalling,
    game.gameStarted,
    game.calledNumbers,
    game.call_interval_seconds,
  ]);

  return (
    <div className="live-game-panel">
      <div className="live-game-header">
        <div>
          <span className="live-section-label">
            LIVE GAME
          </span>

          <h2>Number Calling</h2>

          <p>
            Call numbers manually or start automatic calling.
          </p>
        </div>

        <div className="live-status">
          <span
            className={
              game.gameStarted
                ? "status-dot active"
                : "status-dot"
            }
          />

          {game.gameStarted
            ? "GAME LIVE"
            : "NOT STARTED"}
        </div>
      </div>

      <div className="current-number-card">
        <div className="current-number-copy">
          <span>CURRENT NUMBER CALLED</span>

          <strong>
            {currentNumber || "—"}
          </strong>

          <b>
            {currentNumber
              ? numberName(currentNumber)
              : "WAITING TO START"}
          </b>

          <small>
            {calledNumbers.length} of 90 numbers called
          </small>
        </div>

        <div className="current-number-ball">
          {currentNumber || "?"}
        </div>
      </div>

      <div className="game-control-buttons">
        {!game.gameStarted ? (
          <button
            type="button"
            className="start-game-button"
            onClick={startGame}
          >
            ▶ Start Game
          </button>
        ) : (
          <>
            <button
              type="button"
              className="call-number-button"
              onClick={callNextNumber}
              disabled={!remainingNumbers.length}
            >
              🔢 Call Next Number
            </button>

            <button
              type="button"
              className={
                autoCalling
                  ? "pause-game-button"
                  : "auto-call-button"
              }
              onClick={() =>
                setAutoCalling((current) => !current)
              }
            >
              {autoCalling
                ? "⏸ Pause Auto Call"
                : "⚡ Auto Call"}
            </button>

            <button
              type="button"
              className="reset-game-button"
              onClick={resetGame}
            >
              ↻ Reset
            </button>
          </>
        )}
      </div>

      <div className="called-board-section">
        <div className="board-section-heading">
          <div>
            <span>CALLED NUMBERS BOARD</span>
            <h3>1 — 90</h3>
          </div>

          <strong>
            {calledNumbers.length} CALLED
          </strong>
        </div>

        <div className="called-number-board">
          {numbers.map((number) => {
            const isCalled =
              calledNumbers.includes(number);

            const isCurrent =
              currentNumber === number;

            return (
              <div
                key={number}
                className={[
                  "called-board-number",
                  isCalled ? "called" : "",
                  isCurrent ? "current" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {number}
              </div>
            );
          })}
        </div>
      </div>

      <div className="history-section">
        <div className="board-section-heading">
          <div>
            <span>CALLED NUMBERS HISTORY</span>
            <h3>Most recent first</h3>
          </div>
        </div>

        {calledNumbers.length ? (
          <div className="history-list">
            {[...calledNumbers]
              .reverse()
              .map((number, index) => (
                <div
                  className={`history-chip ${
                    index === 0 ? "latest" : ""
                  }`}
                  key={`${number}-${index}`}
                >
                  <small>
                    {index === 0
                      ? "CURRENT"
                      : `#${calledNumbers.length - index}`}
                  </small>

                  <strong>{number}</strong>
                </div>
              ))}
          </div>
        ) : (
          <div className="history-empty">
            No numbers have been called yet.
          </div>
        )}
      </div>
    </div>
  );
}

function PrizeControlPanel({ game, onGameChange }) {
  const prizes = game.prizes || [];

  function togglePrizeApproval(index) {
    const updatedPrizes = prizes.map(
      (prize, prizeIndex) =>
        prizeIndex === index
          ? {
              ...prize,
              approved: !prize.approved,
            }
          : prize
    );

    onGameChange({
      ...game,
      prizes: updatedPrizes,
    });
  }

  function markWinner(index) {
    const winnerName = window.prompt(
      `Enter winner name for ${prizes[index].name}:`
    );

    if (!winnerName?.trim()) {
      return;
    }

    const updatedPrizes = prizes.map(
      (prize, prizeIndex) =>
        prizeIndex === index
          ? {
              ...prize,
              approved: true,
              winner: winnerName.trim(),
            }
          : prize
    );

    onGameChange({
      ...game,
      prizes: updatedPrizes,
    });
  }

  return (
    <div className="prize-control-panel">
      <div className="prize-control-heading">
        <div>
          <span>🏆 PRIZE MANAGEMENT</span>
          <h2>Prizes & Approval</h2>
          <p>
            Approve each prize before confirming its winner.
          </p>
        </div>
      </div>

      <div className="prize-control-list">
        {prizes.map((prize, index) => (
          <div
            className={`prize-control-row ${
              prize.approved ? "approved" : ""
            }`}
            key={`${prize.name}-${index}`}
          >
            <div className="prize-control-icon">
              {prize.approved ? "✓" : "🏆"}
            </div>

            <div className="prize-control-info">
              <strong>{prize.name}</strong>

              <span>
                ₹{prize.amount || "0"}
              </span>

              {prize.winner && (
                <small>
                  Winner: {prize.winner}
                </small>
              )}
            </div>

            <div className="prize-control-actions">
              <button
                type="button"
                className={
                  prize.approved
                    ? "approved-prize-button"
                    : "approve-prize-button"
                }
                onClick={() =>
                  togglePrizeApproval(index)
                }
              >
                {prize.approved
                  ? "✓ Approved"
                  : "✓ Approve Prize"}
              </button>

              <button
                type="button"
                className="winner-button"
                onClick={() => markWinner(index)}
                disabled={!prize.approved}
              >
                🏆 Confirm Winner
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HostControlCentre({
  game,
  onGameChange,
  onEndGame,
}) {
  const inviteUrl =
    `${window.location.origin}/?game=${game.game_code}`;

  const selectedTheme = getTheme(game.theme);

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
    <section
      className={`page-shell control-page ${selectedTheme.className}`}
    >
      <div className="theme-atmosphere" />

      <div className="control-top">
        <div className="control-top-left">
          <span className="host-lock">
            🔒 HOST
          </span>

          <span className="status-pill">
            ● {String(game.status || "UPCOMING").toUpperCase()}
          </span>
        </div>

        <button
          className="end-game-button"
          type="button"
          onClick={onEndGame}
        >
          ⛔ End Game
        </button>
      </div>

      <div className="control-hero">
        <div className="control-hero-pattern">
          {selectedTheme.icon}
        </div>

        <div className="control-hero-icon">
          🎮
        </div>

        <span className="live-badge">
          HOST CONTROL CENTRE
        </span>

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

          <span>
            {selectedTheme.icon} {selectedTheme.name}
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
              This is the complete visual identity selected
              for this game.
            </p>
          </div>
        </div>

        <div
          className={`selected-theme-card ${selectedTheme.className}`}
        >
          <div className="theme-preview large">
            <div className="preview-decoration">
              {selectedTheme.icon}
            </div>

            <div className="preview-balls">
              <span>45</span>
              <span>29</span>
              <span>7</span>
            </div>
          </div>

          <div className="selected-theme-info">
            <strong>
              {selectedTheme.icon} {selectedTheme.name}
            </strong>

            <span>
              {selectedTheme.description}
            </span>

            <small>
              Complete game-wide visual theme
            </small>
          </div>
        </div>
      </div>

      <div className="control-card-section">
        <div className="section-card-heading">
          <div className="section-card-icon">🎟️</div>

          <div>
            <h2>Ticket Bookings</h2>
            <p>
              Review player requests before approving tickets.
            </p>
          </div>
        </div>

        <BookingPreviewCard />
      </div>

      <div className="control-card-section live-control-section">
        <LiveGamePanel
          game={game}
          onGameChange={onGameChange}
        />
      </div>

      <div className="control-card-section">
        <PrizeControlPanel
          game={game}
          onGameChange={onGameChange}
        />
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
          <button
            type="button"
            className="control-action-card"
          >
            <span>🖼️</span>
            <strong>Generate Poster</strong>
            <small>
              Create a shareable game poster.
            </small>
          </button>

          <button
            type="button"
            className="control-action-card"
          >
            <span>👥</span>
            <strong>Players</strong>
            <small>
              View players who have joined.
            </small>
          </button>

          <button
            type="button"
            className="control-action-card"
            onClick={() =>
              document
                .querySelector(".prize-control-panel")
                ?.scrollIntoView({
                  behavior: "smooth",
                })
            }
          >
            <span>🏆</span>
            <strong>Prizes</strong>
            <small>
              View and approve game prizes.
            </small>
          </button>

          <button
            type="button"
            className="control-action-card live-action"
            onClick={() =>
              document
                .querySelector(".live-game-panel")
                ?.scrollIntoView({
                  behavior: "smooth",
                })
            }
          >
            <span>🔢</span>
            <strong>Live Game</strong>
            <small>
              Start calling Tambola numbers.
            </small>
          </button>

          <button
            type="button"
            className="control-action-card"
          >
            <span>⚙️</span>
            <strong>Game Settings</strong>
            <small>
              Manage your game settings.
            </small>
          </button>

          <button
            type="button"
            className="control-action-card"
          >
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
        className="end-game-large-button"
        type="button"
        onClick={onEndGame}
      >
        ⛔ End Game
      </button>
    </section>
  );
}

function App() {
  const [page, setPage] = useState("home");
  const [createdGame, setCreatedGame] = useState(null);

  const [playerGame, setPlayerGame] = useState(null);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [playerError, setPlayerError] = useState("");

  useEffect(() => {
    const restoredGame = loadGameSession();

    if (restoredGame) {
      setCreatedGame(restoredGame);
      setPage("control");
    }
  }, []);

  useEffect(() => {
    if (createdGame) {
      saveGameSession(createdGame);
    }
  }, [createdGame]);

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    const gameCode = params.get("game");

    if (!gameCode) {
      return;
    }

    async function loadPlayerGame() {
      setPlayerLoading(true);
      setPlayerError("");

      try {
        const { data, error } = await supabase
          .from("games")
          .select("*")
          .eq("game_code", gameCode.toUpperCase())
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          setPlayerError(
            "This game invitation could not be found."
          );
          return;
        }

        setPlayerGame({
          ...data,
          prizes: Array.isArray(data.prizes)
            ? data.prizes
            : defaultPrizes,
        });
      } catch (error) {
        console.error(
          "Unable to load player game:",
          error
        );

        setPlayerError(
          "We couldn't load this game invitation."
        );
      } finally {
        setPlayerLoading(false);
      }
    }

    loadPlayerGame();
  }, []);

  function handleGameCreated(game) {
    setCreatedGame(game);
    saveGameSession(game);
    setPage("control");
  }

  function handleGameChange(nextGame) {
    setCreatedGame(nextGame);
    saveGameSession(nextGame);
  }

  function handleEndGame() {
    const confirmed = window.confirm(
      "Are you sure you want to end this game? This will clear the saved Host Control Centre session."
    );

    if (!confirmed) {
      return;
    }

    const finishedGame = {
      ...createdGame,
      status: "ended",
      gameStarted: false,
    };

    setCreatedGame(null);
    setPage("home");
    saveGameSession(null);

    console.info(
      "Game ended:",
      finishedGame?.game_code
    );
  }

  function goHomeWithoutEndingGame() {
    setPage("home");
  }

  function exitPlayerInvitation() {
    setPlayerGame(null);
    setPlayerError("");

    window.history.replaceState(
      {},
      "",
      window.location.pathname
    );
  }

  const currentTheme =
    createdGame?.theme
      ? getTheme(createdGame.theme)
      : themes[0];

  const isPlayerMode =
    Boolean(playerGame) ||
    playerLoading ||
    Boolean(playerError);

  return (
    <main
      className={`app ${
        isPlayerMode
          ? getTheme(playerGame?.theme).className
          : currentTheme.className
      }`}
    >
      <Header
        onHome={
          isPlayerMode
            ? exitPlayerInvitation
            : goHomeWithoutEndingGame
        }
        playerMode={isPlayerMode}
      />

      {playerLoading && (
        <section className="page-shell player-loading">
          <div className="player-loading-card">
            <span>🎟️</span>
            <h2>Loading Game...</h2>
            <p>
              Please wait while we open your invitation.
            </p>
          </div>
        </section>
      )}

      {playerError && !playerLoading && (
        <section className="page-shell player-loading">
          <div className="player-loading-card">
            <span>⚠️</span>
            <h2>Game Not Found</h2>
            <p>{playerError}</p>

            <button
              type="button"
              className="player-accept-button"
              onClick={exitPlayerInvitation}
            >
              ← Back to Home
            </button>
          </div>
        </section>
      )}

      {playerGame && !playerLoading && !playerError && (
        <PlayerGame game={playerGame} />
      )}

      {!playerGame &&
        !playerLoading &&
        !playerError &&
        page === "home" && (
          <Home
            onCreateGame={() =>
              setPage("create")
            }
          />
        )}

      {!playerGame &&
        !playerLoading &&
        !playerError &&
        page === "create" && (
          <CreateGame
            onBack={() => {
              if (createdGame) {
                setPage("control");
              } else {
                setPage("home");
              }
            }}
            onCreated={handleGameCreated}
          />
        )}

      {!playerGame &&
        !playerLoading &&
        !playerError &&
        page === "control" &&
        createdGame && (
          <HostControlCentre
            game={createdGame}
            onGameChange={handleGameChange}
            onEndGame={handleEndGame}
          />
        )}

      {!isPlayerMode && (
        <>
          <footer>
            <span>🛡 Secure Platform</span>
            <span>🎧 Host Support</span>
            <span>🇮🇳 Made for India</span>
          </footer>

          <nav className="bottom-nav">
            <button
              type="button"
              className={
                page === "home"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setPage("home")
              }
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
              onClick={() =>
                setPage("create")
              }
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
        </>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
