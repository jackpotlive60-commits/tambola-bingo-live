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
  {
    name: "First Five",
    amount: "",
    approved: false,
    winner: null,
  },
  {
    name: "Four Corners",
    amount: "",
    approved: false,
    winner: null,
  },
  {
    name: "Top Line",
    amount: "",
    approved: false,
    winner: null,
  },
  {
    name: "Middle Line",
    amount: "",
    approved: false,
    winner: null,
  },
  {
    name: "Bottom Line",
    amount: "",
    approved: false,
    winner: null,
  },
  {
    name: "Full House",
    amount: "",
    approved: false,
    winner: null,
  },
];

const STORAGE_KEY = "tambola_bingo_live_host_game";
const PLAYER_SESSION_KEY = "tambola_bingo_live_player_session";

function savePlayerSession(gameCode, page = "player-booking") {
  if (!gameCode) return;
  localStorage.setItem(
    PLAYER_SESSION_KEY,
    JSON.stringify({
      gameCode: String(gameCode).toUpperCase(),
      page,
    })
  );
}

function loadPlayerSession() {
  try {
    const stored = localStorage.getItem(PLAYER_SESSION_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (!parsed?.gameCode) return null;
    return parsed;
  } catch {
    localStorage.removeItem(PLAYER_SESSION_KEY);
    return null;
  }
}

function clearPlayerSession() {
  localStorage.removeItem(PLAYER_SESSION_KEY);
}

function generateGameCode() {
  const characters =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  for (let i = 0; i < 6; i += 1) {
    code +=
      characters[
        Math.floor(
          Math.random() * characters.length
        )
      ];
  }

  return code;
}

function getTheme(themeId) {
  return (
    themes.find((theme) => theme.id === themeId) ||
    themes[0]
  );
}

function saveGameSession(game) {
  if (!game) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(game)
  );
}

function loadGameSession() {
  try {
    const stored =
      localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored);

    if (!parsed?.game_code) {
      return null;
    }

    return {
      ...parsed,
      status:
        parsed.status || "upcoming",

      calledNumbers:
        Array.isArray(parsed.calledNumbers)
          ? parsed.calledNumbers
          : [],

      prizes:
        Array.isArray(parsed.prizes)
          ? parsed.prizes
          : defaultPrizes,

      gameStarted:
        Boolean(parsed.gameStarted),

      bookingRequests:
        Array.isArray(parsed.bookingRequests)
          ? parsed.bookingRequests
          : [],
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

function getGameCodeFromUrl() {
  const params =
    new URLSearchParams(window.location.search);

  return params.get("game");
}

function Header({
  onHome,
  playerMode = false,
}) {
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

        {playerMode
          ? "Game Invitation"
          : "Live Platform"}
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
            A professional live Tambola platform
            for hosts and players. Create games,
            invite players, manage tickets, and run
            your game from one place.
          </p>

          <div className="features">
            <span>🛡 Secure & Fair</span>
            <span>⚡ Real-time Games</span>
            <span>🏆 Automatic Winners</span>
          </div>
        </div>

        <div className="cage">
          <div className="cage-decoration">
            ✦
          </div>

          <div className="ball ball-one">
            45
          </div>

          <div className="ball ball-two">
            29
          </div>

          <div className="bingo-cage">
            ◎
          </div>

          <div className="ball ball-three">
            7
          </div>

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

          <h2>
            How are you joining?
          </h2>

          <p>
            Choose the option that matches your role.
          </p>
        </div>

        <div className="entry-grid">
          <button
            className="entry-card host"
            type="button"
            onClick={onCreateGame}
          >
            <div className="entry-icon">
              🎮
            </div>

            <div className="entry-content">
              <span className="role">
                HOST
              </span>

              <h2>
                Host a Game
              </h2>

              <p>
                Create and manage your Tambola
                game, set tickets and prizes,
                and invite players.
              </p>
            </div>

            <div className="entry-arrow">
              →
            </div>
          </button>

          <div className="entry-card player">
            <div className="entry-icon">
              🎟️
            </div>

            <div className="entry-content">
              <span className="role">
                PLAYER
              </span>

              <h2>
                Join an Invitation
              </h2>

              <p>
                Open the invitation link received
                from your host to continue to the
                game.
              </p>
            </div>

            <div className="entry-arrow">
              →
            </div>
          </div>
        </div>

        <div className="invitation-note">
          🔗 Players with a host invitation link
          will be taken directly to their specific
          game invitation.
        </div>
      </section>

      <section className="preview">
        <div className="section-title">
          <div>
            <h2>
              📡 Live Game Preview
            </h2>

            <span>
              Real-time gameplay
            </span>
          </div>
        </div>

        <div className="number-layout">
          <div className="last-number">
            <small>
              LAST NUMBER
            </small>

            <strong>
              45
            </strong>

            <span>
              FORTY FIVE
            </span>

            <hr />

            <small>
              NEXT NUMBER
            </small>

            <b>
              ??
            </b>

            <span>
              Stay Tuned
            </span>
          </div>

          <div className="board">
            {numbers.map((number) => (
              <span
                key={number}
                className={
                  [
                    7,
                    16,
                    29,
                    33,
                    45,
                    67,
                  ].includes(number)
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

function CreateGame({
  onBack,
  onCreated,
}) {
  const [hostName, setHostName] =
    useState("");

  const [gameName, setGameName] =
    useState("");

  const [ticketLimit, setTicketLimit] =
    useState("");

  const [ticketPrice, setTicketPrice] =
    useState("");

  const [gameDate, setGameDate] =
    useState("");

  const [gameTime, setGameTime] =
    useState("");

  const [selectedTheme, setSelectedTheme] =
    useState("royal");

  const [prizes, setPrizes] =
    useState(defaultPrizes);

  const [customPrize, setCustomPrize] =
    useState("");

  const [creating, setCreating] =
    useState(false);

  const [error, setError] =
    useState("");

  const activeTheme =
    getTheme(selectedTheme);

  function updatePrize(index, value) {
    setPrizes((current) =>
      current.map((prize, i) =>
        i === index
          ? {
              ...prize,
              amount: value,
            }
          : prize
      )
    );
  }

  function addCustomPrize() {
    const name =
      customPrize.trim();

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
      let gameCode =
        generateGameCode();

      let codeExists = true;

      while (codeExists) {
        const {
          data,
          error: checkError,
        } = await supabase
          .from("games")
          .select("id")
          .eq(
            "game_code",
            gameCode
          )
          .maybeSingle();

        if (checkError) {
          throw checkError;
        }

        if (!data) {
          codeExists = false;
        } else {
          gameCode =
            generateGameCode();
        }
      }

      const {
        data: game,
        error: insertError,
      } = await supabase
        .from("games")
        .insert({
          host_name:
            hostName.trim(),

          game_name:
            gameName.trim(),

          status:
            "upcoming",

          ticket_limit:
            Number(ticketLimit),

          ticket_price:
            Number(ticketPrice),

          call_interval_seconds:
            5,

          game_date:
            gameDate,

          game_time:
            gameTime,

          theme:
            selectedTheme,

          game_code:
            gameCode,

          invite_enabled:
            true,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      onCreated({
        ...game,

        status:
          "upcoming",

        gameStarted:
          false,

        calledNumbers:
          [],

        prizes:
          prizes.map((prize) => ({
            ...prize,
            approved: false,
            winner: null,
          })),

        bookingRequests:
          [],
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
        <span className="live-badge">
          HOST PORTAL
        </span>

        <h1>
          Create Your{" "}
          <strong>
            Tambola Game
          </strong>
        </h1>

        <p>
          Set your game details, tickets,
          prizes and player theme.
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
              <h2>
                Host Details
              </h2>

              <p>
                Tell players who is hosting
                this game.
              </p>
            </div>
          </div>

          <label>
            Host Name

            <input
              type="text"
              placeholder="Your name"
              value={hostName}
              onChange={(event) =>
                setHostName(
                  event.target.value
                )
              }
              required
            />
          </label>
        </div>

        <div className="form-card">
          <div className="form-card-title">
            <span>🎮</span>

            <div>
              <h2>
                Game Details
              </h2>

              <p>
                Basic information about
                your game.
              </p>
            </div>
          </div>

          <label>
            Game Name

            <input
              type="text"
              placeholder="Example: Friday Night Tambola"
              value={gameName}
              onChange={(event) =>
                setGameName(
                  event.target.value
                )
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
                  setTicketLimit(
                    event.target.value
                  )
                }
                required
              />

              <small>
                Maximum tickets available.
              </small>
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
                    setTicketPrice(
                      event.target.value
                    )
                  }
                  required
                />
              </div>

              <small>
                Price per ticket.
              </small>
            </label>
          </div>

          <div className="two-column">
            <label>
              Game Date

              <input
                type="date"
                value={gameDate}
                onChange={(event) =>
                  setGameDate(
                    event.target.value
                  )
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
                  setGameTime(
                    event.target.value
                  )
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
              <h2>
                Game Prizes
              </h2>

              <p>
                Set the prize amount for
                each winning category.
              </p>
            </div>
          </div>

          <div className="prize-form-grid">
            {prizes.map(
              (prize, index) => (
                <div
                  className="prize-row"
                  key={`${prize.name}-${index}`}
                >
                  <div>
                    <strong>
                      {prize.name}
                    </strong>

                    {prize.custom && (
                      <small>
                        Custom Prize
                      </small>
                    )}
                  </div>

                  <div className="input-with-prefix">
                    <span>₹</span>

                    <input
                      type="number"
                      min="0"
                      placeholder="Amount"
                      value={
                        prize.amount
                      }
                      onChange={(event) =>
                        updatePrize(
                          index,
                          event.target.value
                        )
                      }
                    />
                  </div>
                </div>
              )
            )}
          </div>

          <div className="custom-prize">
            <input
              type="text"
              placeholder="Custom prize name"
              value={customPrize}
              onChange={(event) =>
                setCustomPrize(
                  event.target.value
                )
              }
            />

            <button
              type="button"
              onClick={
                addCustomPrize
              }
            >
              + Add Custom Prize
            </button>
          </div>
        </div>

        <div className="form-card theme-selection-card">
          <div className="form-card-title">
            <span>🎨</span>

            <div>
              <h2>
                Game Theme
              </h2>

              <p>
                Choose the complete visual
                identity players will
                experience.
              </p>
            </div>
          </div>

          <div className="theme-grid">
            {themes.map((theme) => (
              <button
                type="button"
                key={theme.id}
                className={`theme-option ${
                  selectedTheme ===
                  theme.id
                    ? "selected"
                    : ""
                } ${
                  theme.className
                }`}
                onClick={() =>
                  setSelectedTheme(
                    theme.id
                  )
                }
              >
                <div className="theme-preview">
                  <div className="preview-decoration">
                    {theme.id ===
                    "casino"
                      ? "♠ ♥ ♦ ♣"
                      : theme.id ===
                        "festival"
                        ? "✦ ✧ ✦ ✧"
                        : theme.id ===
                          "luxury"
                          ? "◆"
                          : "♛"}
                  </div>

                  <div className="preview-balls">
                    <span>
                      45
                    </span>

                    <span>
                      29
                    </span>

                    <span>
                      7
                    </span>
                  </div>
                </div>

                <div className="theme-name-row">
                  <span className="theme-icon">
                    {theme.icon}
                  </span>

                  <strong>
                    {theme.name}
                  </strong>
                </div>

                <small>
                  {theme.description}
                </small>

                {selectedTheme ===
                  theme.id && (
                  <b className="theme-check">
                    ✓
                  </b>
                )}
              </button>
            ))}
          </div>

          <div className="theme-live-preview">
            <div className="theme-live-copy">
              <span>
                SELECTED EXPERIENCE
              </span>

              <strong>
                {activeTheme.icon}{" "}
                {activeTheme.name}
              </strong>

              <small>
                {
                  activeTheme.description
                }
              </small>
            </div>

            <div
              className={`mini-game-preview ${activeTheme.className}`}
            >
              <div className="mini-top">
                <span>
                  LIVE
                </span>

                <b>
                  45
                </b>
              </div>

              <div className="mini-board">
                {Array.from(
                  {
                    length: 15,
                  },
                  (_, i) => (
                    <span
                      key={i}
                      className={
                        [3, 7, 11].includes(
                          i
                        )
                          ? "active"
                          : ""
                      }
                    >
                      {i + 1}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>

          <div className="theme-info">
            🎨{" "}
            <strong>
              Game-wide theme:
            </strong>{" "}
            Your selected theme is saved
            with this game and controls
            the visual style of the player
            experience.
          </div>
        </div>

        <div className="create-summary">
          <div>
            <span>
              THEME
            </span>

            <strong>
              {activeTheme.name}
            </strong>
          </div>

          <div>
            <span>
              TICKET PRICE
            </span>

            <strong>
              ₹{ticketPrice || "0"}
            </strong>
          </div>

          <div>
            <span>
              TICKET LIMIT
            </span>

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

function BookingPreviewCard({
  game,
  onGameChange,
}) {
  const requests =
    game.bookingRequests || [];

  const pendingRequests =
    requests.filter(
      (request) =>
        request.status ===
        "pending"
    );

  async function updateRequest(
    requestId,
    status
  ) {
    const updatedRequests =
      requests.map(
        (request) =>
          request.id === requestId
            ? {
                ...request,
                status,
              }
            : request
      );

    const { error } = await supabase
      .from("games")
      .update({
        bookingRequests: updatedRequests,
      })
      .eq("game_code", String(game?.game_code || "").toUpperCase());

    if (error) {
      console.error("Unable to update booking request:", error);
      alert(`Could not update booking request: ${error.message}`);
      return;
    }

    onGameChange({
      ...game,
      bookingRequests:
        updatedRequests,
    });
  }

  if (!requests.length) {
    return (
      <div className="booking-preview">
        <div className="booking-preview-top">
          <div>
            <span className="booking-status">
              PENDING
            </span>

            <h3>
              Ticket booking requests
            </h3>

            <p>
              Players will send booking
              requests through WhatsApp.
              Their requests appear here
              for your approval.
            </p>
          </div>

          <div className="pending-count">
            0
          </div>
        </div>

        <div className="booking-empty">
          <div className="empty-icon">
            🎟️
          </div>

          <strong>
            No pending bookings yet
          </strong>

          <p>
            When a player sends a booking
            request, add their request here
            and approve or reject the tickets.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-preview">
      <div className="booking-preview-top">
        <div>
          <span className="booking-status">
            PENDING REQUESTS
          </span>

          <h3>
            Ticket booking requests
          </h3>

          <p>
            Review each player's requested
            tickets.
          </p>
        </div>

        <div className="pending-count">
          {pendingRequests.length}
        </div>
      </div>

      <div className="booking-request-list">
        {requests.map(
          (request) => (
            <div
              className={`booking-request ${
                request.status
              }`}
              key={request.id}
            >
              <div className="booking-request-main">
                <div className="booking-request-avatar">
                  {request.playerName
                    ?.charAt(0)
                    ?.toUpperCase() ||
                    "P"}
                </div>

                <div>
                  <strong>
                    {request.playerName}
                  </strong>

                  <span>
                    Wants tickets{" "}
                    {request.ticketNumbers
                      .map(
                        (number) =>
                          `#${number}`
                      )
                      .join(", ")}
                  </span>

                  <small>
                    {request.status ===
                    "approved"
                      ? "✓ Approved"
                      : request.status ===
                        "rejected"
                        ? "✕ Rejected"
                        : "Waiting for approval"}
                  </small>
                </div>
              </div>

              {request.status ===
                "pending" && (
                <div className="approval-buttons">
                  <button
                    type="button"
                    className="approve-button"
                    onClick={() =>
                      updateRequest(
                        request.id,
                        "approved"
                      )
                    }
                  >
                    ✓ Approve
                  </button>

                  <button
                    type="button"
                    className="reject-button"
                    onClick={() =>
                      updateRequest(
                        request.id,
                        "rejected"
                      )
                    }
                  >
                    ✕ Reject
                  </button>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function LiveGamePanel({
  game,
  onGameChange,
}) {
  const [
    autoCalling,
    setAutoCalling,
  ] = useState(false);

  const calledNumbers =
    game.calledNumbers || [];

  const currentNumber =
    calledNumbers[
      calledNumbers.length - 1
    ] || null;

  const remainingNumbers =
    useMemo(
      () =>
        numbers.filter(
          (number) =>
            !calledNumbers.includes(
              number
            )
        ),
      [calledNumbers]
    );

  function callNextNumber() {
    if (!game.gameStarted) {
      return;
    }

    if (!remainingNumbers.length) {
      setAutoCalling(false);

      onGameChange({
        ...game,
        status: "completed",
        gameStarted: false,
      });

      return;
    }

    const randomIndex =
      Math.floor(
        Math.random() *
          remainingNumbers.length
      );

    const nextNumber =
      remainingNumbers[
        randomIndex
      ];

    onGameChange({
      ...game,
      status: "live",
      calledNumbers: [
        ...calledNumbers,
        nextNumber,
      ],
    });
  }

  function startGame() {
    onGameChange({
      ...game,
      status: "live",
      gameStarted: true,
      calledNumbers: [],
    });
  }

  function resetGame() {
    setAutoCalling(false);

    const confirmed =
      window.confirm(
        "Reset all called numbers and restart this game?"
      );

    if (!confirmed) {
      return;
    }

    onGameChange({
      ...game,
      status: "upcoming",
      gameStarted: false,
      calledNumbers: [],
    });
  }

  useEffect(() => {
    if (
      !autoCalling ||
      !game.gameStarted
    ) {
      return undefined;
    }

    const interval =
      window.setInterval(
        callNextNumber,
        Math.max(
          1,
          Number(
            game.call_interval_seconds ||
              5
          )
        ) * 1000
      );

    return () =>
      window.clearInterval(
        interval
      );
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

          <h2>
            Number Calling
          </h2>

          <p>
            Call numbers manually or start
            automatic calling.
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
          <span>
            CURRENT NUMBER CALLED
          </span>

          <strong>
            {currentNumber || "—"}
          </strong>

          <b>
            {currentNumber
              ? numberName(
                  currentNumber
                )
              : "WAITING TO START"}
          </b>

          <small>
            {calledNumbers.length} of 90
            numbers called
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
              onClick={
                callNextNumber
              }
              disabled={
                !remainingNumbers.length
              }
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
                setAutoCalling(
                  (current) =>
                    !current
                )
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
            <span>
              CALLED NUMBERS BOARD
            </span>

            <h3>
              1 — 90
            </h3>
          </div>

          <strong>
            {calledNumbers.length}
            {" "}
            CALLED
          </strong>
        </div>

        <div className="called-number-board">
          {numbers.map(
            (number) => {
              const isCalled =
                calledNumbers.includes(
                  number
                );

              const isCurrent =
                currentNumber ===
                number;

              return (
                <div
                  key={number}
                  className={[
                    "called-board-number",
                    isCalled
                      ? "called"
                      : "",
                    isCurrent
                      ? "current"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {number}
                </div>
              );
            }
          )}
        </div>
      </div>

      <div className="history-section">
        <div className="board-section-heading">
          <div>
            <span>
              CALLED NUMBERS HISTORY
            </span>

            <h3>
              Most recent first
            </h3>
          </div>
        </div>

        {calledNumbers.length ? (
          <div className="history-list">
            {[
              ...calledNumbers,
            ]
              .reverse()
              .map(
                (
                  number,
                  index
                ) => (
                  <div
                    className={`history-chip ${
                      index === 0
                        ? "latest"
                        : ""
                    }`}
                    key={`${number}-${index}`}
                  >
                    <small>
                      {index === 0
                        ? "CURRENT"
                        : `#${
                            calledNumbers.length -
                            index
                          }`}
                    </small>

                    <strong>
                      {number}
                    </strong>
                  </div>
                )
              )}
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

function PrizeControlPanel({
  game,
  onGameChange,
}) {
  const prizes =
    game.prizes || [];

  function togglePrizeApproval(
    index
  ) {
    const updatedPrizes =
      prizes.map(
        (
          prize,
          prizeIndex
        ) =>
          prizeIndex === index
            ? {
                ...prize,
                approved:
                  !prize.approved,
              }
            : prize
      );

    onGameChange({
      ...game,
      prizes:
        updatedPrizes,
    });
  }

  function markWinner(index) {
    const winnerName =
      window.prompt(
        `Enter winner name for ${prizes[index].name}:`
      );

    if (!winnerName?.trim()) {
      return;
    }

    const updatedPrizes =
      prizes.map(
        (
          prize,
          prizeIndex
        ) =>
          prizeIndex === index
            ? {
                ...prize,
                approved:
                  true,
                winner:
                  winnerName.trim(),
              }
            : prize
      );

    onGameChange({
      ...game,
      prizes:
        updatedPrizes,
    });
  }

  return (
    <div className="prize-control-panel">
      <div className="prize-control-heading">
        <div>
          <span>
            🏆 PRIZE MANAGEMENT
          </span>

          <h2>
            Prizes & Approval
          </h2>

          <p>
            Approve each prize before
            confirming its winner.
          </p>
        </div>
      </div>

      <div className="prize-control-list">
        {prizes.map(
          (prize, index) => (
            <div
              className={`prize-control-row ${
                prize.approved
                  ? "approved"
                  : ""
              }`}
              key={`${prize.name}-${index}`}
            >
              <div className="prize-control-icon">
                {prize.approved
                  ? "✓"
                  : "🏆"}
              </div>

              <div className="prize-control-info">
                <strong>
                  {prize.name}
                </strong>

                <span>
                  ₹
                  {prize.amount ||
                    "0"}
                </span>

                {prize.winner && (
                  <small>
                    Winner:{" "}
                    {
                      prize.winner
                    }
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
                    togglePrizeApproval(
                      index
                    )
                  }
                >
                  {prize.approved
                    ? "✓ Approved"
                    : "✓ Approve Prize"}
                </button>

                <button
                  type="button"
                  className="winner-button"
                  onClick={() =>
                    markWinner(
                      index
                    )
                  }
                  disabled={
                    !prize.approved
                  }
                >
                  🏆 Confirm Winner
                </button>
              </div>
            </div>
          )
        )}
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

  const selectedTheme =
    getTheme(game.theme);

  function copyInviteLink() {
    if (
      navigator.clipboard
    ) {
      navigator.clipboard.writeText(
        inviteUrl
      );

      alert(
        "Invitation link copied!"
      );
    }
  }

  async function shareInvite() {
    if (
      navigator.share
    ) {
      try {
        await navigator.share({
          title:
            game.game_name,

          text:
            `Join my Tambola game: ${game.game_name}`,

          url:
            inviteUrl,
        });
      } catch {
        // User closed share sheet.
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
            ●{" "}
            {String(
              game.status ||
                "UPCOMING"
            ).toUpperCase()}
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
          {
            selectedTheme.icon
          }
        </div>

        <div className="control-hero-icon">
          🎮
        </div>

        <span className="live-badge">
          HOST CONTROL CENTRE
        </span>

        <h1>
          {game.game_name}
        </h1>

        <p>
          Hosted by{" "}
          <strong>
            {game.host_name}
          </strong>
        </p>

        <div className="game-meta">
          <span>
            📅{" "}
            {game.game_date ||
              "Date not set"}
          </span>

          <span>
            🕐{" "}
            {game.game_time ||
              "Time not set"}
          </span>

          <span>
            {
              selectedTheme.icon
            }{" "}
            {
              selectedTheme.name
            }
          </span>
        </div>
      </div>

      <div className="code-card">
        <div className="code-label">
          GAME CODE
        </div>

        <div className="game-code">
          {game.game_code}
        </div>

        <p>
          Share this code or the
          invitation link with players.
        </p>
      </div>

      <div className="control-card-section">
        <div className="section-card-heading">
          <div className="section-card-icon">
            🔗
          </div>

          <div>
            <h2>
              Player Invitation
            </h2>

            <p>
              Send this invitation to
              the players you want to join.
            </p>
          </div>
        </div>

        <div className="invite-link-box">
          <span>
            {inviteUrl}
          </span>
        </div>

        <div className="invite-actions">
          <button
            type="button"
            className="secondary-action"
            onClick={
              copyInviteLink
            }
          >
            📋 Copy Link
          </button>

          <button
            type="button"
            className="primary-action"
            onClick={
              shareInvite
            }
          >
            📲 Share
          </button>
        </div>
      </div>

      <div className="control-card-section">
        <div className="section-card-heading">
          <div className="section-card-icon">
            🎨
          </div>

          <div>
            <h2>
              Game Theme
            </h2>

            <p>
              This is the complete
              visual identity selected
              for this game.
            </p>
          </div>
        </div>

        <div
          className={`selected-theme-card ${selectedTheme.className}`}
        >
          <div className="theme-preview large">
            <div className="preview-decoration">
              {
                selectedTheme.icon
              }
            </div>

            <div className="preview-balls">
              <span>
                45
              </span>

              <span>
                29
              </span>

              <span>
                7
              </span>
            </div>
          </div>

          <div className="selected-theme-info">
            <strong>
              {
                selectedTheme.icon
              }{" "}
              {
                selectedTheme.name
              }
            </strong>

            <span>
              {
                selectedTheme.description
              }
            </span>

            <small>
              Complete game-wide
              visual theme
            </small>
          </div>
        </div>
      </div>

      <div className="control-card-section">
        <div className="section-card-heading">
          <div className="section-card-icon">
            🎟️
          </div>

          <div>
            <h2>
              Ticket Bookings
            </h2>

            <p>
              Review WhatsApp ticket
              requests before approving.
            </p>
          </div>
        </div>

        <BookingPreviewCard
          game={game}
          onGameChange={
            onGameChange
          }
        />
      </div>

      <div className="control-card-section live-control-section">
        <LiveGamePanel
          game={game}
          onGameChange={
            onGameChange
          }
        />
      </div>

      <div className="control-card-section">
        <PrizeControlPanel
          game={game}
          onGameChange={
            onGameChange
          }
        />
      </div>

      <div className="control-card-section">
        <div className="section-card-heading">
          <div className="section-card-icon">
            ⚡
          </div>

          <div>
            <h2>
              Game Controls
            </h2>

            <p>
              Everything you need to
              run your live game.
            </p>
          </div>
        </div>

        <div className="control-grid">
          <button
            type="button"
            className="control-action-card"
          >
            <span>
              🖼️
            </span>

            <strong>
              Generate Poster
            </strong>

            <small>
              Create a shareable game poster.
            </small>
          </button>

          <button
            type="button"
            className="control-action-card"
          >
            <span>
              👥
            </span>

            <strong>
              Players
            </strong>

            <small>
              View players who have joined.
            </small>
          </button>

          <button
            type="button"
            className="control-action-card"
            onClick={() =>
              document
                .querySelector(
                  ".prize-control-panel"
                )
                ?.scrollIntoView({
                  behavior:
                    "smooth",
                })
            }
          >
            <span>
              🏆
            </span>

            <strong>
              Prizes
            </strong>

            <small>
              View and approve game prizes.
            </small>
          </button>

          <button
            type="button"
            className="control-action-card live-action"
            onClick={() =>
              document
                .querySelector(
                  ".live-game-panel"
                )
                ?.scrollIntoView({
                  behavior:
                    "smooth",
                })
            }
          >
            <span>
              🔢
            </span>

            <strong>
              Live Game
            </strong>

            <small>
              Start calling Tambola numbers.
            </small>
          </button>

          <button
            type="button"
            className="control-action-card"
          >
            <span>
              ⚙️
            </span>

            <strong>
              Game Settings
            </strong>

            <small>
              Manage your game settings.
            </small>
          </button>

          <button
            type="button"
            className="control-action-card"
          >
            <span>
              📊
            </span>

            <strong>
              Game Summary
            </strong>

            <small>
              View tickets, players and results.
            </small>
          </button>
        </div>
      </div>

      <div className="control-footer-note">
        <span>
          🛡
        </span>

        <div>
          <strong>
            Host controls are private
          </strong>

          <p>
            Players will only see the
            invitation and player
            experience, not this control
            centre.
          </p>
        </div>
      </div>

      <button
        className="end-game-large-button"
        type="button"
        onClick={
          onEndGame
        }
      >
        ⛔ End Game
      </button>
    </section>
  );
}

/* ============================================================
   PLAYER INVITATION PAGE
   ============================================================ */

function getBookedTicketNumbers(game) {
  const requests = Array.isArray(game?.bookingRequests)
    ? game.bookingRequests
    : [];
  const booked = new Set();

  requests.forEach((request) => {
    if (request?.status === "rejected") return;
    const tickets = Array.isArray(request?.ticketNumbers)
      ? request.ticketNumbers
      : [];
    tickets.forEach((ticket) => booked.add(Number(ticket)));
  });

  return booked;
}

function PlayerInvitationPage({
  game,
  onAccept,
  onBack,
}) {
  const selectedTheme = getTheme(game?.theme);
  const prizes = Array.isArray(game?.prizes) ? game.prizes : [];
  const ticketLimit = Math.max(1, Number(game?.ticket_limit || 0));
  const bookedTickets = getBookedTicketNumbers(game);
  const availableTickets = Math.max(0, ticketLimit - bookedTickets.size);
  const status = String(game?.status || "upcoming").replace(/_/g, " ").toUpperCase();

  return (
    <main className={`player-invitation-page ${selectedTheme.className}`}>
      <div className="player-invitation-glow" />

      <button type="button" className="player-back-button" onClick={onBack}>
        ←
      </button>

      <div className="player-invitation-brand">
        <span>♛</span>
        <div>
          <strong>TAMBOLA</strong>
          <small>BINGO LIVE</small>
        </div>
      </div>

      <div className="player-invitation-card">
        <span className="player-invitation-pill">● GAME INVITATION</span>

        <h1>{game?.game_name || "Tambola Game"}</h1>
        <p>Game details</p>

        <div className="player-host-card">
          <span>HOST</span>
          <strong>{game?.host_name || "Game Host"}</strong>
        </div>

        <div className="player-game-details">
          <div>
            <span>DATE</span>
            <strong>{game?.game_date || "Not set"}</strong>
          </div>
          <div>
            <span>TIME</span>
            <strong>{game?.game_time || "Not set"}</strong>
          </div>
          <div>
            <span>STATUS</span>
            <strong>{status}</strong>
          </div>
          <div>
            <span>AVAILABLE TICKETS</span>
            <strong>{availableTickets} / {ticketLimit}</strong>
          </div>
          <div>
            <span>PRICE / TICKET</span>
            <strong>₹{game?.ticket_price || 0}</strong>
          </div>
        </div>

        <div className="player-prize-preview">
          <div className="player-prize-preview-heading">
            <span>🏆</span>
            <div>
              <strong>PRIZE LIST</strong>
              <small>Game prizes</small>
            </div>
          </div>
          <div className="player-prize-preview-list">
            {prizes.map((prize, index) => (
              <div key={`${prize.name}-${index}`}>
                <span>{prize.name}</span>
                <strong>₹{prize.amount || 0}</strong>
              </div>
            ))}
          </div>
        </div>

        <button type="button" className="player-accept-button" onClick={onAccept}>
          <span>✓</span>
          I ACCEPT
        </button>
      </div>
    </main>
  );
}

/* ============================================================
   REAL TAMBOLA TICKET
   ============================================================ */

function createTicketRows(ticketNumber) {
  /*
   * Deterministic, real 3 × 9 Tambola ticket.
   * Every ticket has exactly 15 numbers: 5 per row.
   * Every column belongs to its normal Tambola number range.
   */
  const seedBase = Math.max(1, Number(ticketNumber) || 1);
  const masks = [
    [1, 0, 1, 0, 1, 0, 1, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 1, 1],
    [1, 0, 1, 0, 1, 1, 0, 0, 1],
  ];

  const rows = masks.map((mask) => [...mask]);
  const valuesByColumn = Array.from({ length: 9 }, (_, column) => {
    const min = column === 0 ? 1 : column * 10;
    const max = column === 8 ? 90 : column * 10 + 9;
    const values = [];

    for (let value = min; value <= max; value += 1) {
      values.push(value);
    }

    const shift = (seedBase * (column + 3) + column * 7) % values.length;
    return values.slice(shift).concat(values.slice(0, shift));
  });

  const rowsWithNumbers = rows.map((row) => [...row]);

  for (let column = 0; column < 9; column += 1) {
    const activeRows = rowsWithNumbers
      .map((row, rowIndex) => (row[column] ? rowIndex : -1))
      .filter((rowIndex) => rowIndex >= 0);

    activeRows.forEach((rowIndex, position) => {
      const values = valuesByColumn[column];
      const index = (seedBase + column * 3 + position * 5) % values.length;
      rowsWithNumbers[rowIndex][column] = values[index];
    });
  }

  return rowsWithNumbers;
}

function TambolaTicket({
  ticketNumber,
  playerName,
  preview = false,
}) {
  const rows = createTicketRows(ticketNumber);

  return (
    <div className={`real-tambola-ticket ${preview ? "ticket-preview" : ""}`}>
      <div className="real-ticket-header">
        <div>
          <span>TAMBOLA</span>
          <strong>BINGO LIVE</strong>
        </div>

        <div className="real-ticket-number">
          #{ticketNumber}
        </div>
      </div>

      <div className="real-ticket-player">
        <span>PLAYER</span>
        <strong>{playerName || "YOUR NAME"}</strong>
      </div>

      <div className="real-ticket-grid" aria-label={`Tambola ticket ${ticketNumber}`}>
        {rows.map((row, rowIndex) =>
          row.map((value, columnIndex) => (
            <div
              key={`${rowIndex}-${columnIndex}`}
              className={
                value
                  ? "real-ticket-cell filled"
                  : "real-ticket-cell blank"
              }
            >
              {value || ""}
            </div>
          ))
        )}
      </div>

      <div className="real-ticket-footer">
        <span>3 ROWS</span>
        <span>9 COLUMNS</span>
        <span>15 NUMBERS</span>
      </div>
    </div>
  );
}

/* ============================================================
   PLAYER TICKET BOOKING PAGE
   ============================================================ */

function PlayerBookingPage({
  game,
  onBack,
}) {
  const [search, setSearch] = useState("");
  const [selectedTickets, setSelectedTickets] = useState([]);
  const [bookingSent, setBookingSent] = useState(false);

  const selectedTheme = getTheme(game?.theme);
  const ticketLimit = Math.max(1, Number(game?.ticket_limit || 100));
  const ticketPrice = Number(game?.ticket_price || 0);
  const bookedTickets = getBookedTicketNumbers(game);
  const availableTicketNumbers = Array.from({ length: ticketLimit }, (_, i) => i + 1)
    .filter((number) => !bookedTickets.has(number));
  const filteredTickets = availableTicketNumbers.filter((number) =>
    String(number).includes(search.trim())
  );
  const sortedTickets = [...selectedTickets].sort((a, b) => a - b);
  const total = sortedTickets.length * ticketPrice;

  function toggleTicket(ticketNumber) {
    if (bookingSent || bookedTickets.has(ticketNumber)) return;
    setSelectedTickets((current) =>
      current.includes(ticketNumber)
        ? current.filter((number) => number !== ticketNumber)
        : [...current, ticketNumber]
    );
  }

  function searchTickets() {
    // Filtering happens immediately as the search value changes.
    // This button simply gives the player a clear search action on mobile.
    document.getElementById("available-ticket-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function sendBookingRequest() {
    if (!selectedTickets.length) {
      alert("Please select at least one ticket.");
      return;
    }

    const gameCode = String(game?.game_code || "").toUpperCase();

    if (!gameCode) {
      alert("This game link is missing its game code. Please reopen the invitation link.");
      return;
    }

    const existingRequests = Array.isArray(game?.bookingRequests)
      ? game.bookingRequests
      : [];

    const request = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      playerName: "Player",
      ticketNumbers: sortedTickets,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    const updatedRequests = [...existingRequests, request];

    // Store the booking in Supabase. WhatsApp is only a notification.
    const { error } = await supabase
      .from("games")
      .update({
        bookingRequests: updatedRequests,
      })
      .eq("game_code", gameCode);

    if (error) {
      console.error("Unable to save booking request:", error);
      alert(`Booking request could not be sent: ${error.message}`);
      return;
    }

    const ticketText = sortedTickets.map((number) => `#${number}`).join(", ");
    const message =
      `Hi ${game?.host_name || "Host"}, I want to book ticket(s) ${ticketText} ` +
      `for ${game?.game_name || "the Tambola game"}. ` +
      `Total: ₹${total}. Please approve my booking.`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    setBookingSent(true);
    window.location.href = whatsappUrl;
  }

  if (bookingSent) {
    return (
      <>
        <PlayerBookingPremiumStyles />
        <main className={`player-booking-page premium-booking-page ${selectedTheme.className}`}>
          <div className="premium-booking-bg" />
          <div className="premium-booking-shell">
            <header className="premium-booking-hero compact">
              <div className="premium-brand-line">
                <div className="premium-brand-mark">♛</div>
                <div><strong>TAMBOLA</strong><small>BINGO LIVE</small></div>
              </div>
              <span className="premium-eyebrow success">BOOKING SENT</span>
              <h1>Request Sent</h1>
              <p>Your booking request has been prepared for the host.</p>
            </header>
            <section className="premium-card pending-state-card">
              <div className="pending-state-icon">🎟️</div>
              <div>
                <span>SELECTED TICKETS</span>
                <h2>{sortedTickets.map((n) => `#${n}`).join(", ")}</h2>
                <p>Total: ₹{total}. Wait for the host to approve your booking.</p>
              </div>
            </section>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <PlayerBookingPremiumStyles />
      <main className={`player-booking-page premium-booking-page ${selectedTheme.className}`}>
        <div className="premium-booking-bg" />
        <div className="premium-booking-shell">
          <button type="button" onClick={onBack} className="premium-back-button" aria-label="Back">←</button>

          <header className="premium-booking-hero">
            <div className="premium-brand-line">
              <div className="premium-brand-mark">♛</div>
              <div><strong>TAMBOLA</strong><small>BINGO LIVE</small></div>
            </div>
            <div className="premium-invite-badge">● TICKET BOOKING</div>
            <h1>{game?.game_name || "Tambola Game"}</h1>
            <p>Choose your ticket by number or by tapping the actual 3 × 9 ticket.</p>

            <div className="premium-game-meta">
              <div><span>DATE</span><strong>{game?.game_date || "Not set"}</strong></div>
              <div><span>TIME</span><strong>{game?.game_time || "Not set"}</strong></div>
              <div><span>AVAILABLE</span><strong>{availableTicketNumbers.length}</strong></div>
              <div><span>PRICE / TICKET</span><strong>₹{ticketPrice}</strong></div>
            </div>
          </header>

          <section className="premium-card player-details-card">
            <div className="premium-section-heading">
              <div className="section-number">⌕</div>
              <div>
                <span>SEARCH TICKETS</span>
                <h2>Find a ticket</h2>
              </div>
            </div>
            <div className="ticket-search-row">
              <input
                type="search"
                inputMode="numeric"
                placeholder="Search ticket number"
                value={search}
                onChange={(event) => setSearch(event.target.value.replace(/\D/g, ""))}
              />
              <button type="button" onClick={searchTickets}>SEARCH</button>
            </div>
          </section>

          <section className="premium-card ticket-choice-card">
            <div className="premium-section-heading">
              <div className="section-number">01</div>
              <div>
                <span>TICKET NUMBERS</span>
                <h2>Select ticket numbers</h2>
              </div>
              <div className="selection-counter">
                <strong>{selectedTickets.length}</strong>
                <span>selected</span>
              </div>
            </div>

            <div className="ticket-number-strip">
              {filteredTickets.map((number) => (
                <button
                  type="button"
                  key={number}
                  className={selectedTickets.includes(number) ? "selected" : ""}
                  onClick={() => toggleTicket(number)}
                >
                  #{number}
                </button>
              ))}
            </div>
          </section>

          <section className="premium-card ticket-choice-card" id="available-ticket-results">
            <div className="premium-section-heading">
              <div className="section-number">02</div>
              <div>
                <span>ACTUAL TAMBOLA TICKETS</span>
                <h2>Choose your 3 × 9 ticket</h2>
                <p>Tap anywhere on a ticket to select or remove it.</p>
              </div>
            </div>

            <div className="all-real-tickets">
              {filteredTickets.map((number) => {
                const selected = selectedTickets.includes(number);
                return (
                  <button
                    type="button"
                    key={number}
                    className={`real-ticket-select ${selected ? "selected" : ""}`}
                    onClick={() => toggleTicket(number)}
                  >
                    <div className="real-ticket-select-header">
                      <strong>#{number}</strong>
                      <span>{selected ? "✓ SELECTED" : "AVAILABLE"}</span>
                    </div>
                    <TambolaTicket ticketNumber={number} preview={false} />
                  </button>
                );
              })}
              {!filteredTickets.length && (
                <div className="chosen-empty-state">
                  <strong>No available ticket found.</strong>
                </div>
              )}
            </div>
          </section>

          <section className="premium-booking-bar">
            <div className="booking-total-block">
              <span>SELECTED TICKETS</span>
              <strong>{sortedTickets.length ? sortedTickets.map((n) => `#${n}`).join("  ") : "None selected"}</strong>
            </div>
            <div className="booking-total-price">
              <span>TOTAL</span>
              <strong>₹{total}</strong>
            </div>
          </section>

          <section className="premium-submit-card">
            <button
              type="button"
              className="premium-book-button"
              onClick={sendBookingRequest}
              disabled={!selectedTickets.length}
            >
              <span className="whatsapp-icon">◉</span>
              <div>
                <strong>BOOK {selectedTickets.length || ""} TICKET{selectedTickets.length === 1 ? "" : "S"}</strong>
                <small>Send booking request to the host</small>
              </div>
              <b>→</b>
            </button>
          </section>
        </div>
      </main>
    </>
  );
}

/* ============================================================
   PLAYER BOOKING PREMIUM UI
   Kept here so the booking page is visually complete even when
   an older styles.css is still deployed.
   ============================================================ */
function PlayerBookingPremiumStyles() {
  return (
    <style>{`
      .ticket-search-row{display:flex;gap:10px}.ticket-search-row input{flex:1;min-width:0;border:1px solid rgba(255,255,255,.12);background:#0d0a13;color:#fff;border-radius:14px;padding:14px 15px;font-size:15px;outline:none}.ticket-search-row button{border:0;border-radius:14px;padding:0 18px;background:#d8ad54;color:#171009;font-weight:900;cursor:pointer}.ticket-number-strip{display:flex;flex-wrap:wrap;gap:8px}.ticket-number-strip button{border:1px solid rgba(255,255,255,.12);background:#0d0a13;color:#f4eef9;border-radius:11px;padding:10px 12px;font-weight:900;cursor:pointer}.ticket-number-strip button.selected{background:#d8ad54;color:#171009;border-color:#d8ad54}.all-real-tickets{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.real-ticket-select{border:1px solid rgba(255,255,255,.1);background:#0b0910;color:#fff;border-radius:18px;padding:12px;cursor:pointer;text-align:left}.real-ticket-select.selected{border-color:#d8ad54;box-shadow:0 0 0 2px rgba(216,173,84,.18)}.real-ticket-select-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding:0 3px}.real-ticket-select-header strong{font-size:16px;color:#d8ad54}.real-ticket-select-header span{font-size:9px;font-weight:900;letter-spacing:1px;color:#968d9f}.real-ticket-select.selected .real-ticket-select-header span{color:#d8ad54}@media(max-width:700px){.all-real-tickets{grid-template-columns:1fr}.ticket-search-row button{padding:0 14px}}
      .premium-booking-page{min-height:100vh;position:relative;overflow:hidden;background:#090710;color:#f8f4ff;padding:0 16px 120px;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .premium-booking-bg{position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle at 50% -10%,rgba(126,61,194,.38),transparent 40%),radial-gradient(circle at 10% 45%,rgba(43,25,76,.35),transparent 35%),radial-gradient(circle at 90% 75%,rgba(174,116,33,.12),transparent 32%)}
      .premium-booking-shell{position:relative;z-index:1;width:min(1180px,100%);margin:0 auto;padding-top:24px}
      .premium-back-button{width:44px;height:44px;border:1px solid rgba(255,255,255,.13);border-radius:14px;background:rgba(255,255,255,.055);color:#fff;font-size:22px;cursor:pointer;backdrop-filter:blur(12px);margin-bottom:22px}
      .premium-back-button:hover{background:rgba(255,255,255,.1)}
      .premium-booking-hero{text-align:center;padding:12px 0 28px}
      .premium-booking-hero.compact{text-align:left;display:flex;align-items:center;gap:18px}
      .premium-brand-line{display:inline-flex;align-items:center;gap:10px;margin-bottom:18px}
      .premium-brand-mark{display:grid;place-items:center;width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,#d8a83d,#8e5bd4);box-shadow:0 8px 28px rgba(173,120,39,.25);font-size:25px;color:#fff}
      .premium-brand-line strong{display:block;letter-spacing:2px;font-size:15px;text-align:left}
      .premium-brand-line small{display:block;color:#bdb3c9;font-size:9px;letter-spacing:4px;text-align:left;margin-top:2px}
      .premium-invite-badge,.premium-eyebrow{display:inline-flex;align-items:center;gap:7px;color:#d8b15a;font-size:11px;font-weight:800;letter-spacing:2px}
      .premium-invite-badge:before{content:"";width:7px;height:7px;border-radius:50%;background:#54dc8b;box-shadow:0 0 10px #54dc8b}
      .premium-eyebrow.success{color:#66e49a}
      .premium-booking-hero h1{font-size:clamp(30px,5vw,58px);line-height:1.02;margin:12px 0 10px;letter-spacing:-1.8px}
      .premium-booking-hero p{max-width:670px;margin:0 auto;color:#aaa0b6;font-size:15px;line-height:1.65}
      .premium-game-meta{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;max-width:860px;margin:28px auto 0;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.08);border-radius:18px;overflow:hidden}
      .premium-game-meta>div{padding:15px 12px;background:rgba(18,14,26,.88)}
      .premium-game-meta span,.booking-total-block span,.booking-total-price span,.pending-details span{display:block;color:#8f8798;font-size:9px;font-weight:800;letter-spacing:1.6px;margin-bottom:5px}
      .premium-game-meta strong{font-size:13px;color:#f4eef9}
      .premium-card{position:relative;background:linear-gradient(145deg,rgba(29,23,40,.95),rgba(15,12,22,.96));border:1px solid rgba(255,255,255,.1);border-radius:24px;box-shadow:0 18px 60px rgba(0,0,0,.28);margin-top:18px;padding:24px}
      .premium-section-heading{display:flex;align-items:center;gap:14px;margin-bottom:24px}
      .section-number{flex:none;width:36px;height:36px;display:grid;place-items:center;border-radius:12px;background:rgba(194,145,57,.13);color:#dcb15a;font-size:11px;font-weight:900;letter-spacing:1px}
      .premium-section-heading>div:nth-child(2){flex:1}
      .premium-section-heading span,.accept-card>div:nth-child(2)>span{display:block;color:#9d94a7;font-size:9px;font-weight:900;letter-spacing:1.8px;margin-bottom:5px}
      .premium-section-heading h2{margin:0;color:#fff;font-size:22px;letter-spacing:-.4px}
      .premium-section-heading p{margin:5px 0 0;color:#968d9f;font-size:12px;line-height:1.5}
      .selection-counter{flex:none!important;text-align:right}.selection-counter strong{display:block;font-size:26px;color:#d8ad54;line-height:1}.selection-counter span{margin:4px 0 0!important}
      .premium-name-field{display:block}.premium-name-field>span{display:block;color:#b1a7b9;font-size:10px;font-weight:800;letter-spacing:1.5px;margin-bottom:8px}.premium-name-field input{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.11);background:#0d0a13;color:#fff;border-radius:14px;padding:15px 16px;font-size:16px;outline:none}.premium-name-field input:focus{border-color:rgba(216,173,84,.7);box-shadow:0 0 0 3px rgba(216,173,84,.08)}
      .ticket-picker-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
      .ticket-picker-card{position:relative;text-align:left;padding:12px;border:1px solid rgba(255,255,255,.1);border-radius:18px;background:#0d0a13;color:#fff;cursor:pointer;transition:.18s ease;min-width:0}.ticket-picker-card:hover{transform:translateY(-2px);border-color:rgba(216,173,84,.45);background:#110d18}.ticket-picker-card.selected{border-color:#d8ad54;background:linear-gradient(145deg,rgba(85,59,22,.25),rgba(32,23,13,.45));box-shadow:0 0 0 1px rgba(216,173,84,.16),0 14px 34px rgba(0,0,0,.25)}.ticket-picker-card:disabled{opacity:.75;cursor:not-allowed;transform:none}
      .ticket-picker-topline{display:flex;align-items:center;gap:7px;margin-bottom:9px}.ticket-picker-topline span{font-size:8px;letter-spacing:1.6px;color:#8d8495;font-weight:900}.ticket-picker-topline strong{font-size:13px}.ticket-picker-topline b{margin-left:auto;width:22px;height:22px;display:grid;place-items:center;border-radius:50%;background:#d8ad54;color:#17100a;font-size:12px}
      .real-tambola-ticket{width:100%;box-sizing:border-box;border-radius:13px;overflow:hidden;background:#fff;color:#161219;border:3px solid #b98a32;box-shadow:0 10px 25px rgba(0,0,0,.25);padding:0}.ticket-preview{transform:none}
      .real-ticket-header{display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,#29143d,#5d2d75);color:#fff;padding:7px 9px}.real-ticket-header span{display:block;font-size:9px;font-weight:900;letter-spacing:1.4px}.real-ticket-header strong{display:block;font-size:7px;letter-spacing:2.2px;color:#e7d0a0}.real-ticket-number{font-weight:900;font-size:11px;color:#f0cf79}
      .real-ticket-player{display:flex;justify-content:space-between;gap:8px;padding:5px 8px;background:#faf7ef;border-bottom:1px solid #d7c49c}.real-ticket-player span{font-size:7px;color:#8b7b61;font-weight:900;letter-spacing:1px}.real-ticket-player strong{font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:70%;text-transform:uppercase}
      .real-ticket-grid{display:grid;grid-template-columns:repeat(9,1fr);border-left:1px solid #b8a47e;border-top:1px solid #b8a47e;background:#efe5cd}.real-ticket-cell{aspect-ratio:1.28;min-width:0;display:grid;place-items:center;border-right:1px solid #b8a47e;border-bottom:1px solid #b8a47e;font-weight:900;font-size:clamp(11px,1.8vw,18px)}.real-ticket-cell.filled{background:#fffdf8;color:#271a31}.real-ticket-cell.blank{background:#e8ddc3}.real-ticket-footer{display:flex;justify-content:space-between;padding:5px 7px;background:#fff;color:#806e53;font-size:6px;font-weight:900;letter-spacing:.8px}
      .ticket-picker-action{text-align:center;color:#9e95a7;font-size:9px;font-weight:800;padding:8px 0 1px}.ticket-picker-card.selected .ticket-picker-action{color:#d8ad54}
      .ticket-format-badge{flex:none!important;padding:8px 10px!important;border:1px solid rgba(216,173,84,.28);border-radius:10px;background:rgba(216,173,84,.08);color:#d8ad54!important;font-size:9px!important;margin:0!important}
      .chosen-ticket-stage{background:radial-gradient(circle at 50% 0,rgba(216,173,84,.09),transparent 42%),#0a0810;border:1px solid rgba(255,255,255,.07);border-radius:18px;padding:20px;min-height:210px}.chosen-ticket-item{max-width:680px;margin:0 auto 18px}.chosen-ticket-item:last-child{margin-bottom:0}.chosen-ticket-item .real-tambola-ticket{border-width:4px}.chosen-empty-state{display:flex;align-items:center;gap:22px;max-width:720px;margin:0 auto}.chosen-empty-ticket{width:360px;max-width:52%}.chosen-empty-state>div:last-child{flex:1}.chosen-empty-state span{display:block;color:#d8ad54;font-size:9px;font-weight:900;letter-spacing:1.6px;margin-bottom:7px}.chosen-empty-state strong{font-size:18px}.chosen-empty-state p{color:#93899d;font-size:12px;line-height:1.55;margin:7px 0 0}
      .premium-booking-bar{display:flex;align-items:center;gap:20px;margin-top:18px;padding:18px 20px;border-radius:18px;background:rgba(20,15,27,.94);border:1px solid rgba(255,255,255,.1)}.booking-total-block{flex:1;min-width:0}.booking-total-block strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px}.booking-total-price{text-align:right}.booking-total-price strong{font-size:27px;color:#d8ad54}
      .premium-submit-card{margin-top:18px}.premium-book-button{width:100%;border:0;border-radius:18px;padding:17px 18px;display:flex;align-items:center;gap:13px;background:linear-gradient(135deg,#d8ad54,#a97623);color:#171009;cursor:pointer;box-shadow:0 14px 35px rgba(177,124,36,.2);text-align:left}.premium-book-button:disabled{opacity:.42;cursor:not-allowed;box-shadow:none}.whatsapp-icon{width:40px;height:40px;border-radius:13px;display:grid;place-items:center;background:rgba(255,255,255,.18);font-size:20px}.premium-book-button div{flex:1}.premium-book-button strong{display:block;font-size:15px;letter-spacing:.7px}.premium-book-button small{display:block;margin-top:3px;font-size:10px;opacity:.75}.premium-book-button>b{font-size:24px}.premium-submit-note{text-align:center;color:#807689;font-size:10px;line-height:1.5;margin:10px auto 0;max-width:620px}.premium-submit-note strong{color:#aaa0b0}
      .pending-state-card{display:flex;align-items:center;gap:16px}.pending-state-icon{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;background:rgba(216,173,84,.1);font-size:22px}.pending-state-card>div:nth-child(2){flex:1}.pending-state-card span{font-size:9px;font-weight:900;letter-spacing:1.5px;color:#d8ad54}.pending-state-card h2{margin:5px 0 3px;font-size:20px}.pending-state-card p{margin:0;color:#91889b;font-size:12px}.pending-details{text-align:right}.pending-details strong{font-size:13px;color:#f4eef9}
      .premium-booking-footer{display:flex;justify-content:center;gap:24px;flex-wrap:wrap;color:#746b7c;font-size:9px;letter-spacing:.5px;padding:26px 0 10px}
      .accept-card{display:flex;align-items:center;gap:15px}.accept-icon{font-size:25px}.accept-card>div:nth-child(2){flex:1}.accept-card strong{display:block;font-size:16px}.accept-card p{margin:4px 0 0;color:#8f8797;font-size:11px}.accept-card button{border:0;border-radius:12px;padding:11px 16px;background:#d8ad54;color:#171009;font-weight:900;cursor:pointer}
      .approved-player-row{display:flex;align-items:center;gap:12px}.approved-avatar{width:48px;height:48px;display:grid;place-items:center;border-radius:50%;background:linear-gradient(135deg,#d8ad54,#7c4aa2);font-weight:900;font-size:20px}.approved-player-row span{display:block;color:#8f8798;font-size:8px;font-weight:900;letter-spacing:1.5px}.approved-player-row strong{display:block;font-size:17px;margin-top:3px}.approved-ticket-pills{display:flex;gap:7px;flex-wrap:wrap;margin:18px 0}.approved-ticket-pills span{padding:7px 10px;border-radius:9px;background:rgba(216,173,84,.1);color:#d8ad54;font-size:10px;font-weight:900}.approved-ticket-list{display:grid;gap:16px}.premium-next-step{display:flex;gap:14px;align-items:flex-start;margin-top:20px;padding:16px;border:1px solid rgba(255,255,255,.07);border-radius:16px;background:#0d0a13}.next-step-icon{font-size:24px}.premium-next-step span{display:block;color:#d8ad54;font-size:8px;font-weight:900;letter-spacing:1.5px}.premium-next-step strong{display:block;font-size:14px;margin-top:4px}.premium-next-step p{margin:4px 0 0;color:#8e8596;font-size:11px;line-height:1.5}
      @media(max-width:900px){.ticket-picker-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.premium-game-meta{grid-template-columns:repeat(2,1fr)}}
      @media(max-width:600px){.premium-booking-page{padding:0 10px 100px}.premium-booking-shell{padding-top:14px}.premium-card{padding:16px;border-radius:19px}.premium-booking-hero h1{font-size:34px}.premium-booking-hero p{font-size:13px}.premium-game-meta{grid-template-columns:repeat(2,1fr);border-radius:14px}.premium-game-meta strong{font-size:11px}.ticket-picker-grid{grid-template-columns:1fr;gap:10px}.ticket-picker-card{padding:10px}.ticket-picker-card .real-tambola-ticket{max-width:420px;margin:0 auto}.chosen-empty-state{display:block}.chosen-empty-ticket{width:100%;max-width:420px;margin:0 auto 16px}.premium-booking-bar{padding:14px;gap:10px}.booking-total-block strong{font-size:11px}.booking-total-price strong{font-size:23px}.pending-state-card{display:block;text-align:center}.pending-state-icon{margin:0 auto 12px}.pending-details{text-align:center;margin-top:14px}.premium-booking-hero.compact{align-items:flex-start}.premium-brand-line{margin-bottom:12px}.premium-section-heading{align-items:flex-start}.selection-counter{margin-left:auto}.real-ticket-cell{font-size:13px}.real-ticket-player strong{max-width:66%}}
    `}</style>
  );
}

/* ============================================================
   APP
   ============================================================ */

function App() {
  const [
    page,
    setPage,
  ] = useState("home");

  const [
    createdGame,
    setCreatedGame,
  ] = useState(null);

  const [
    playerGame,
    setPlayerGame,
  ] = useState(null);

  const [
    playerAccepted,
    setPlayerAccepted,
  ] = useState(false);

  const [
    playerLoading,
    setPlayerLoading,
  ] = useState(false);

  const [
    playerError,
    setPlayerError,
  ] = useState("");

  useEffect(() => {
    const restoredGame = loadGameSession();

    if (restoredGame) {
      setCreatedGame(restoredGame);
      setPage("control");
    }

    const urlGameCode = getGameCodeFromUrl();
    const playerSession = loadPlayerSession();
    const params = new URLSearchParams(window.location.search);
    const urlPage = params.get("page");
    const gameCode = urlGameCode?.trim() || playerSession?.gameCode;

    if (gameCode) {
      loadPlayerGame(
        gameCode,
        urlPage === "booking" ||
          Boolean(playerSession && !urlGameCode)
      );
    }
  }, []);

  useEffect(() => {
    if (createdGame) {
      saveGameSession(
        createdGame
      );
    }
  }, [createdGame]);

  // Keep the Host Control Centre synchronized with the shared Supabase game.
  useEffect(() => {
    const gameCode = createdGame?.game_code;

    if (!gameCode || page !== "control") {
      return undefined;
    }

    let cancelled = false;

    async function refreshHostBookings() {
      try {
        const { data, error } = await supabase
          .from("games")
          .select("bookingRequests")
          .eq("game_code", String(gameCode).toUpperCase())
          .maybeSingle();

        if (error) throw error;

        if (!cancelled && data) {
          const requests = Array.isArray(data.bookingRequests)
            ? data.bookingRequests
            : [];

          setCreatedGame((current) =>
            current
              ? { ...current, bookingRequests: requests }
              : current
          );
        }
      } catch (error) {
        console.error("Unable to refresh host booking requests:", error);
      }
    }

    refreshHostBookings();
    const intervalId = window.setInterval(refreshHostBookings, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [createdGame?.game_code, page]);

  async function loadPlayerGame(
    gameCode,
    restoreBooking = false
  ) {
    setPlayerLoading(true);
    setPlayerError("");

    try {
      const {
        data,
        error,
      } = await supabase
        .from("games")
        .select("*")
        .eq(
          "game_code",
          gameCode.toUpperCase()
        )
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

      const normalizedGame = {
        ...data,

        prizes:
          Array.isArray(
            data.prizes
          )
            ? data.prizes
            : defaultPrizes,

        calledNumbers:
          Array.isArray(
            data.calledNumbers
          )
            ? data.calledNumbers
            : [],

        bookingRequests:
          Array.isArray(
            data.bookingRequests
          )
            ? data.bookingRequests
            : [],
      };

      setPlayerGame(
        normalizedGame
      );

      const savedPlayerSession = loadPlayerSession();
      const currentUrlParams = new URLSearchParams(
        window.location.search
      );
      const urlRequestsBooking =
        currentUrlParams.get("page") === "booking";
      const savedGameCode =
        String(savedPlayerSession?.gameCode || "").toUpperCase();
      const loadedGameCode =
        String(normalizedGame.game_code || "").toUpperCase();

      const shouldRestoreBooking =
        restoreBooking ||
        urlRequestsBooking ||
        (
          savedGameCode === loadedGameCode &&
          savedPlayerSession?.page === "player-booking"
        );

      setPlayerAccepted(shouldRestoreBooking);
      setPage(
        shouldRestoreBooking
          ? "player-booking"
          : "player-invitation"
      );
    } catch (error) {
      console.error(
        "Unable to load player game:",
        error
      );

      setPlayerError(
        error?.message ||
          "Unable to load this game invitation."
      );
    } finally {
      setPlayerLoading(false);
    }
  }

  function handleGameCreated(
    game
  ) {
    const normalizedGame = {
      ...game,

      bookingRequests:
        Array.isArray(
          game.bookingRequests
        )
          ? game.bookingRequests
          : [],
    };

    setCreatedGame(
      normalizedGame
    );

    saveGameSession(
      normalizedGame
    );

    setPage(
      "control"
    );
  }

  function handleGameChange(
    nextGame
  ) {
    const normalizedGame = {
      ...nextGame,

      bookingRequests:
        Array.isArray(
          nextGame.bookingRequests
        )
          ? nextGame.bookingRequests
          : [],
    };

    setCreatedGame(
      normalizedGame
    );

    saveGameSession(
      normalizedGame
    );
  }

  function handleEndGame() {
    const confirmed =
      window.confirm(
        "Are you sure you want to end this game? This will clear the saved Host Control Centre session."
      );

    if (!confirmed) {
      return;
    }

    const finishedGame = {
      ...createdGame,

      status:
        "ended",

      gameStarted:
        false,
    };

    console.info(
      "Game ended:",
      finishedGame?.game_code
    );

    setCreatedGame(
      null
    );

    saveGameSession(
      null
    );

    setPage(
      "home"
    );
  }

  function goHomeWithoutEndingGame() {
    setPage(
      "home"
    );
  }

  function openCreateGame() {
    setPage(
      "create"
    );
  }

  function acceptPlayerInvitation() {
    setPlayerAccepted(true);
    savePlayerSession(playerGame?.game_code, "player-booking");

    const params = new URLSearchParams(window.location.search);
    params.set("page", "booking");

    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}?${params.toString()}`
    );

    setPage("player-booking");
  }

  function returnToPlayerInvitation() {
    clearPlayerSession();
    setPlayerAccepted(false);

    const params = new URLSearchParams(window.location.search);
    params.delete("page");

    const query = params.toString();

    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`
    );

    setPage("player-invitation");
  }

  const currentTheme =
    createdGame?.theme
      ? getTheme(
          createdGame.theme
        )
      : themes[0];

  const isPlayerPage =
    page ===
      "player-invitation" ||
    page ===
      "player-booking";

  if (
    playerLoading
  ) {
    return (
      <main className="app">
        <div className="player-loading">
          <div className="player-loading-logo">
            👑
          </div>

          <h1>
            Loading Game
          </h1>

          <p>
            Please wait while we
            load your Tambola
            invitation.
          </p>

          <div className="player-loading-spinner" />
        </div>
      </main>
    );
  }

  if (
    getGameCodeFromUrl() &&
    playerError
  ) {
    return (
      <main className="app">
        <div className="player-loading">
          <div className="player-error-icon">
            ⚠️
          </div>

          <h1>
            Game Not Found
          </h1>

          <p>
            {playerError}
          </p>

          <button
            type="button"
            className="primary-action"
            onClick={() => {
              window.history.replaceState(
                {},
                "",
                window.location.pathname
              );

              setPage(
                "home"
              );

              setPlayerError(
                ""
              );
            }}
          >
            ← Back to Home
          </button>
        </div>
      </main>
    );
  }

  if (
    isPlayerPage &&
    playerGame
  ) {
    return (
      <main
        className={`app ${getTheme(
          playerGame.theme
        ).className}`}
      >
        <Header
          playerMode
          onHome={() => {
            setPage(
              "player-invitation"
            );
          }}
        />

        {page ===
          "player-invitation" && (
          <PlayerInvitationPage
            game={
              playerGame
            }
            onAccept={
              acceptPlayerInvitation
            }
            onBack={() => {
              clearPlayerSession();
              setPlayerAccepted(false);

              const params = new URLSearchParams(
                window.location.search
              );
              params.delete("page");

              const query = params.toString();

              window.history.replaceState(
                {},
                "",
                `${window.location.pathname}${query ? `?${query}` : ""}`
              );

              setPlayerGame(
                null
              );

              setPage(
                "home"
              );
            }}
          />
        )}

        {page ===
          "player-booking" && (
          <PlayerBookingPage
            game={
              playerGame
            }
            onBack={
              returnToPlayerInvitation
            }
          />
        )}
      </main>
    );
  }

  return (
    <main
      className={`app ${currentTheme.className}`}
    >
      <Header
        onHome={
          goHomeWithoutEndingGame
        }
      />

      {page === "home" && (
        <Home
          onCreateGame={
            openCreateGame
          }
        />
      )}

      {page === "create" && (
        <CreateGame
          onBack={() => {
            if (createdGame) {
              setPage(
                "control"
              );
            } else {
              setPage(
                "home"
              );
            }
          }}
          onCreated={
            handleGameCreated
          }
        />
      )}

      {page ===
        "control" &&
        createdGame && (
          <HostControlCentre
            game={
              createdGame
            }
            onGameChange={
              handleGameChange
            }
            onEndGame={
              handleEndGame
            }
          />
        )}

      <footer>
        <span>
          🛡 Secure Platform
        </span>

        <span>
          🎧 Host Support
        </span>

        <span>
          🇮🇳 Made for India
        </span>
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
            setPage(
              "home"
            )
          }
        >
          <span>
            ⌂
          </span>

          <small>
            Home
          </small>
        </button>

        <button
          type="button"
        >
          <span>
            ℹ
          </span>

          <small>
            How It Works
          </small>
        </button>

        <button
          type="button"
          className="plus"
          onClick={
            openCreateGame
          }
        >
          ＋
        </button>

        <button
          type="button"
        >
          <span>
            🎟
          </span>

          <small>
            Invitations
          </small>
        </button>

        <button
          type="button"
        >
          <span>
            ♙
          </span>

          <small>
            Account
          </small>
        </button>
      </nav>
    </main>
  );
}

createRoot(
  document.getElementById(
    "root"
  )
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
