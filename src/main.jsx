import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { supabase } from "./lib/supabase";

/* =========================================================
   CONSTANTS
========================================================= */

const DEFAULT_GAME_NAME = "TambolaLive";
const GAME_KEY = "tambolalive_host_game";

const THEMES = [
  "Classic",
  "Royal",
  "Party",
  "Bollywood",
  "Neon",
  "Elegant"
];

const DEFAULT_PRIZES = [
  "First Five",
  "Four Corners",
  "Top Line",
  "Middle Line",
  "Bottom Line",
  "Full House"
].map((name) => ({
  name,
  amount: ""
}));

/* =========================================================
   HELPERS
========================================================= */

function generateGameCode() {
  const characters =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let result = "";

  for (let i = 0; i < 6; i++) {
    result += characters[
      Math.floor(
        Math.random() * characters.length
      )
    ];
  }

  return result;
}

function saveHostGame(game) {
  if (!game) {
    localStorage.removeItem(GAME_KEY);
    return;
  }

  localStorage.setItem(
    GAME_KEY,
    JSON.stringify(game)
  );
}

function loadHostGame() {
  try {
    const saved =
      localStorage.getItem(GAME_KEY);

    if (!saved) return null;

    const parsed = JSON.parse(saved);

    return parsed?.game_code
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function getGameCodeFromUrl() {
  return new URLSearchParams(
    window.location.search
  ).get("game");
}

/* =========================================================
   STYLES
========================================================= */

const pageStyle = {
  minHeight: "100vh",
  background: "#f5f7fb",
  padding: "20px",
  boxSizing: "border-box",
  fontFamily:
    "Arial, Helvetica, sans-serif"
};

const cardStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 20,
  marginBottom: 18,
  boxShadow:
    "0 2px 8px rgba(0,0,0,0.05)"
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  boxSizing: "border-box",
  fontSize: 15
};

const primaryButton = {
  padding: "13px 20px",
  border: "none",
  borderRadius: 8,
  background: "#2563eb",
  color: "#fff",
  fontWeight: "bold",
  fontSize: 15,
  cursor: "pointer"
};

const secondaryButton = {
  padding: "11px 16px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  background: "#fff",
  color: "#111827",
  fontWeight: "bold",
  fontSize: 14,
  cursor: "pointer"
};

/* =========================================================
   PLAYER PAGE
========================================================= */

function PlayerBookingPage({ game }) {
  const [playerName, setPlayerName] =
    useState("");

  const [selectedTickets, setSelectedTickets] =
    useState([]);

  const [booking, setBooking] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const ticketLimit =
    Number(game.ticket_limit || 0);

  const ticketPrice =
    Number(game.ticket_price || 0);

  const gameStarted =
    game.status === "started" ||
    game.status === "live" ||
    game.status === "playing";

  /*
    Create ticket numbers.

    These are temporary ticket slots for
    Step 1. Actual ticket generation and
    booking records will be connected
    next.
  */
  const tickets = Array.from(
    {
      length: ticketLimit
    },
    (_, index) => index + 1
  );

  function toggleTicket(ticketNumber) {
    setError("");

    setSelectedTickets((current) => {
      if (
        current.includes(ticketNumber)
      ) {
        return current.filter(
          (number) =>
            number !== ticketNumber
        );
      }

      return [
        ...current,
        ticketNumber
      ].sort((a, b) => a - b);
    });
  }

  function removeTicket(ticketNumber) {
    setSelectedTickets((current) =>
      current.filter(
        (number) =>
          number !== ticketNumber
      )
    );
  }

  async function bookTickets(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (gameStarted) {
      setError(
        "This game has already started. Ticket booking is closed."
      );
      return;
    }

    if (!playerName.trim()) {
      setError(
        "Please enter your name."
      );
      return;
    }

    if (
      selectedTickets.length === 0
    ) {
      setError(
        "Please select at least one ticket."
      );
      return;
    }

    /*
      Booking database connection will be
      added in the next stage.

      For now we confirm the selection
      so we can test the player interface.
    */

    setBooking(true);

    await new Promise((resolve) =>
      setTimeout(resolve, 500)
    );

    setMessage(
      `Selected ${selectedTickets.length} ticket${
        selectedTickets.length > 1
          ? "s"
          : ""
      } successfully.`
    );

    setBooking(false);
  }

  if (gameStarted) {
    return (
      <main style={pageStyle}>
        <div
          style={{
            maxWidth: 700,
            margin: "0 auto"
          }}
        >
          <div
            style={{
              textAlign: "center",
              marginBottom: 25
            }}
          >
            <h1>
              TAMBOLA LIVE
            </h1>

            <p
              style={{
                color: "#64748b"
              }}
            >
              Player Booking
            </p>
          </div>

          <section
            style={{
              ...cardStyle,
              textAlign: "center",
              border:
                "1px solid #ef4444",
              background: "#fef2f2"
            }}
          >
            <div
              style={{
                fontSize: 45
              }}
            >
              🔒
            </div>

            <h2>
              Booking Closed
            </h2>

            <p>
              This game has already
              started.
            </p>

            <p>
              New tickets cannot be
              booked now.
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto"
        }}
      >
        {/* HEADER */}

        <div
          style={{
            textAlign: "center",
            marginBottom: 22
          }}
        >
          <h1
            style={{
              marginBottom: 5
            }}
          >
            TAMBOLA LIVE
          </h1>

          <p
            style={{
              color: "#64748b",
              marginTop: 0
            }}
          >
            Player Booking
          </p>
        </div>

        {/* GAME DETAILS */}

        <section
          style={cardStyle}
        >
          <h2
            style={{
              marginTop: 0
            }}
          >
            {game.game_name ||
              DEFAULT_GAME_NAME}
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(150px,1fr))",
              gap: 10
            }}
          >
            <InfoBox
              title="Game Code"
              value={
                game.game_code
              }
            />

            <InfoBox
              title="Date"
              value={
                game.game_date ||
                "-"
              }
            />

            <InfoBox
              title="Time"
              value={
                game.game_time ||
                "-"
              }
            />

            <InfoBox
              title="Ticket Price"
              value={`₹${ticketPrice}`}
            />
          </div>
        </section>

        {/* PLAYER NAME */}

        <section
          style={cardStyle}
        >
          <h2
            style={{
              marginTop: 0
            }}
          >
            Player Details
          </h2>

          <label>
            <b>
              Your Name
            </b>
          </label>

          <input
            value={playerName}
            onChange={(e) =>
              setPlayerName(
                e.target.value
              )
            }
            placeholder="Enter your name"
            style={{
              ...inputStyle,
              marginTop: 7
            }}
          />
        </section>

        {/* TICKET SELECTION */}

        <section
          style={cardStyle}
        >
          <h2
            style={{
              marginTop: 0
            }}
          >
            Select Tickets
          </h2>

          <p
            style={{
              color: "#64748b"
            }}
          >
            Select the ticket numbers
            you want to book.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill,minmax(65px,1fr))",
              gap: 8,
              maxHeight: 420,
              overflowY: "auto",
              padding: 3
            }}
          >
            {tickets.map(
              (ticketNumber) => {
                const selected =
                  selectedTickets.includes(
                    ticketNumber
                  );

                return (
                  <button
                    key={
                      ticketNumber
                    }
                    type="button"
                    onClick={() =>
                      toggleTicket(
                        ticketNumber
                      )
                    }
                    style={{
                      padding:
                        "12px 5px",
                      borderRadius:
                        8,
                      border:
                        selected
                          ? "2px solid #2563eb"
                          : "1px solid #cbd5e1",
                      background:
                        selected
                          ? "#dbeafe"
                          : "#fff",
                      color:
                        selected
                          ? "#1d4ed8"
                          : "#111827",
                      fontWeight:
                        "bold",
                      cursor:
                        "pointer"
                    }}
                  >
                    {ticketNumber}
                  </button>
                );
              }
            )}
          </div>
        </section>

        {/* SELECTED TICKETS */}

        <section
          style={cardStyle}
        >
          <h2
            style={{
              marginTop: 0
            }}
          >
            Your Selected Tickets
          </h2>

          {selectedTickets.length ===
          0 ? (
            <p
              style={{
                color: "#64748b"
              }}
            >
              No tickets selected yet.
            </p>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap"
                }}
              >
                {selectedTickets.map(
                  (ticketNumber) => (
                    <div
                      key={
                        ticketNumber
                      }
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: 7,
                        padding:
                          "8px 10px",
                        background:
                          "#eff6ff",
                        border:
                          "1px solid #93c5fd",
                        borderRadius:
                          8
                      }}
                    >
                      <b>
                        Ticket{" "}
                        {
                          ticketNumber
                        }
                      </b>

                      <button
                        type="button"
                        onClick={() =>
                          removeTicket(
                            ticketNumber
                          )
                        }
                        style={{
                          border:
                            "none",
                          background:
                            "transparent",
                          color:
                            "#dc2626",
                          fontWeight:
                            "bold",
                          cursor:
                            "pointer",
                          padding: 0
                        }}
                      >
                        ×
                      </button>
                    </div>
                  )
                )}
              </div>

              <div
                style={{
                  marginTop: 18,
                  paddingTop: 15,
                  borderTop:
                    "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent:
                    "space-between",
                  fontSize: 18
                }}
              >
                <b>
                  Total
                </b>

                <b>
                  ₹
                  {selectedTickets.length *
                    ticketPrice}
                </b>
              </div>
            </>
          )}
        </section>

        {/* ERROR */}

        {error && (
          <div
            style={{
              ...cardStyle,
              background:
                "#fef2f2",
              border:
                "1px solid #ef4444",
              color: "#b91c1c"
            }}
          >
            <b>
              {error}
            </b>
          </div>
        )}

        {/* SUCCESS */}

        {message && (
          <div
            style={{
              ...cardStyle,
              background:
                "#f0fdf4",
              border:
                "1px solid #22c55e",
              color: "#166534"
            }}
          >
            <b>
              ✓ {message}
            </b>
          </div>
        )}

        {/* BOOK BUTTON */}

        <form
          onSubmit={bookTickets}
        >
          <button
            type="submit"
            disabled={
              booking ||
              selectedTickets.length ===
                0
            }
            style={{
              ...primaryButton,
              width: "100%",
              fontSize: 17,
              padding: 15,
              opacity:
                booking ||
                selectedTickets.length ===
                  0
                  ? 0.6
                  : 1
            }}
          >
            {booking
              ? "Processing..."
              : `BOOK ${
                  selectedTickets.length
                } TICKET${
                  selectedTickets.length ===
                  1
                    ? ""
                    : "S"
                }`}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            color: "#64748b",
            fontSize: 13,
            marginTop: 15
          }}
        >
          Ticket booking closes
          automatically when the host
          starts the game.
        </p>
      </div>
    </main>
  );
}

/* =========================================================
   CREATE GAME PAGE
========================================================= */

function CreateGamePage({
  onGameCreated
}) {
  const [gameName, setGameName] =
    useState(DEFAULT_GAME_NAME);

  const [gameDate, setGameDate] =
    useState("");

  const [gameTime, setGameTime] =
    useState("");

  const [ticketLimit, setTicketLimit] =
    useState(100);

  const [ticketPrice, setTicketPrice] =
    useState(20);

  const [theme, setTheme] =
    useState("Classic");

  const [prizes, setPrizes] =
    useState(DEFAULT_PRIZES);

  const [customPrize, setCustomPrize] =
    useState("");

  const [creating, setCreating] =
    useState(false);

  const [error, setError] =
    useState("");

  function updatePrize(
    index,
    amount
  ) {
    setPrizes((current) =>
      current.map(
        (prize, i) =>
          i === index
            ? {
                ...prize,
                amount
              }
            : prize
      )
    );
  }

  function addCustomPrize() {
    const name =
      customPrize.trim();

    if (!name) return;

    setPrizes((current) => [
      ...current,
      {
        name,
        amount: ""
      }
    ]);

    setCustomPrize("");
  }

  function removePrize(index) {
    setPrizes((current) =>
      current.filter(
        (_, i) => i !== index
      )
    );
  }

  async function createGame(event) {
    event.preventDefault();

    if (creating) return;

    setCreating(true);
    setError("");

    try {
      let gameCode =
        generateGameCode();

      let available = false;

      while (!available) {
        const { data, error } =
          await supabase
            .from("games")
            .select("id")
            .eq(
              "game_code",
              gameCode
            )
            .limit(1);

        if (error) throw error;

        if (
          !data ||
          data.length === 0
        ) {
          available = true;
        } else {
          gameCode =
            generateGameCode();
        }
      }

      const selectedPrizes =
        prizes
          .filter(
            (p) =>
              p.amount !== "" &&
              p.amount !== null &&
              p.amount !==
                undefined
          )
          .map((p) => ({
            name: p.name,
            amount: Number(
              p.amount
            )
          }));

      const newGame = {
        host_name: "Host",
        game_name:
          gameName.trim() ||
          DEFAULT_GAME_NAME,
        status: "upcoming",
        ticket_limit:
          Number(ticketLimit),
        ticket_price:
          Number(ticketPrice),
        call_interval_seconds: 5,
        game_date:
          gameDate || null,
        game_time:
          gameTime || null,
        theme,
        game_code:
          gameCode,
        invite_enabled: true,
        selected_prizes:
          selectedPrizes,
        called_numbers: []
      };

      const { data, error } =
        await supabase
          .from("games")
          .insert(newGame)
          .select()
          .single();

      if (error) throw error;

      saveHostGame(data);

      onGameCreated(data);
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Could not create game."
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <main style={pageStyle}>
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto"
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: 25
          }}
        >
          <h1>
            TAMBOLA LIVE
          </h1>

          <p
            style={{
              color: "#64748b"
            }}
          >
            Host Dashboard
          </p>
        </div>

        <form
          onSubmit={createGame}
        >
          <section
            style={cardStyle}
          >
            <h2>
              Create New Game
            </h2>

            <label>
              <b>
                Game Name
              </b>
            </label>

            <input
              value={gameName}
              onChange={(e) =>
                setGameName(
                  e.target.value
                )
              }
              style={{
                ...inputStyle,
                marginTop: 7,
                marginBottom: 15
              }}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(220px,1fr))",
                gap: 15
              }}
            >
              <div>
                <label>
                  <b>
                    Date
                  </b>
                </label>

                <input
                  type="date"
                  required
                  value={gameDate}
                  onChange={(e) =>
                    setGameDate(
                      e.target.value
                    )
                  }
                  style={{
                    ...inputStyle,
                    marginTop: 7
                  }}
                />
              </div>

              <div>
                <label>
                  <b>
                    Time
                  </b>
                </label>

                <input
                  type="time"
                  required
                  value={gameTime}
                  onChange={(e) =>
                    setGameTime(
                      e.target.value
                    )
                  }
                  style={{
                    ...inputStyle,
                    marginTop: 7
                  }}
                />
              </div>

              <div>
                <label>
                  <b>
                    Ticket Limit
                  </b>
                </label>

                <input
                  type="number"
                  min="1"
                  required
                  value={
                    ticketLimit
                  }
                  onChange={(e) =>
                    setTicketLimit(
                      e.target.value
                    )
                  }
                  style={{
                    ...inputStyle,
                    marginTop: 7
                  }}
                />
              </div>

              <div>
                <label>
                  <b>
                    Ticket Price
                  </b>
                </label>

                <input
                  type="number"
                  min="0"
                  required
                  value={
                    ticketPrice
                  }
                  onChange={(e) =>
                    setTicketPrice(
                      e.target.value
                    )
                  }
                  style={{
                    ...inputStyle,
                    marginTop: 7
                  }}
                />
              </div>
            </div>

            <div
              style={{
                marginTop: 15
              }}
            >
              <label>
                <b>
                  Theme
                </b>
              </label>

              <select
                value={theme}
                onChange={(e) =>
                  setTheme(
                    e.target.value
                  )
                }
                style={{
                  ...inputStyle,
                  marginTop: 7
                }}
              >
                {THEMES.map(
                  (themeName) => (
                    <option
                      key={
                        themeName
                      }
                    >
                      {themeName}
                    </option>
                  )
                )}
              </select>
            </div>
          </section>

          <section
            style={cardStyle}
          >
            <h2>
              Prizes
            </h2>

            {prizes.map(
              (prize, index) => (
                <div
                  key={`${prize.name}-${index}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "1fr 130px auto",
                    gap: 8,
                    marginBottom: 10,
                    alignItems:
                      "center"
                  }}
                >
                  <b>
                    {prize.name}
                  </b>

                  <input
                    type="number"
                    min="0"
                    value={
                      prize.amount
                    }
                    onChange={(e) =>
                      updatePrize(
                        index,
                        e.target.value
                      )
                    }
                    placeholder="Amount"
                    style={
                      inputStyle
                    }
                  />

                  <button
                    type="button"
                    onClick={() =>
                      removePrize(
                        index
                      )
                    }
                    style={
                      secondaryButton
                    }
                  >
                    Remove
                  </button>
                </div>
              )
            )}

            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 15
              }}
            >
              <input
                value={
                  customPrize
                }
                onChange={(e) =>
                  setCustomPrize(
                    e.target.value
                  )
                }
                placeholder="Custom prize"
                style={{
                  ...inputStyle,
                  flex: 1
                }}
              />

              <button
                type="button"
                onClick={
                  addCustomPrize
                }
                style={
                  secondaryButton
                }
              >
                + Add
              </button>
            </div>
          </section>

          {error && (
            <div
              style={{
                ...cardStyle,
                color: "#b91c1c",
                background:
                  "#fef2f2",
                border:
                  "1px solid #ef4444"
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={creating}
            style={{
              ...primaryButton,
              width: "100%",
              fontSize: 17,
              padding: 15
            }}
          >
            {creating
              ? "Creating..."
              : "CREATE GAME"}
          </button>
        </form>
      </div>
    </main>
  );
}

/* =========================================================
   HOST PAGE
========================================================= */

function HostControlPage({
  game,
  onNewGame
}) {
  const [copied, setCopied] =
    useState(false);

  const inviteUrl =
    `${window.location.origin}/?game=${game.game_code}`;

  const prizes =
    Array.isArray(
      game.selected_prizes
    )
      ? game.selected_prizes
      : [];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        inviteUrl
      );

      setCopied(true);

      setTimeout(
        () => setCopied(false),
        2000
      );
    } catch {
      window.prompt(
        "Copy link:",
        inviteUrl
      );
    }
  }

  async function shareGame() {
    const message =
      `🎟️ ${game.game_name}\n\n` +
      `📅 ${game.game_date}\n` +
      `⏰ ${game.game_time}\n` +
      `🎫 ₹${game.ticket_price}\n\n` +
      `Join:\n${inviteUrl}`;

    if (
      navigator.share
    ) {
      try {
        await navigator.share({
          title:
            game.game_name,
          text: message,
          url: inviteUrl
        });
      } catch {}
    } else {
      await navigator.clipboard.writeText(
        message
      );

      alert(
        "Game details copied."
      );
    }
  }

  return (
    <main style={pageStyle}>
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto"
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: 20
          }}
        >
          <h1>
            {game.game_name}
          </h1>

          <p
            style={{
              color: "#64748b"
            }}
          >
            Host Control Page
          </p>
        </div>

        <section
          style={cardStyle}
        >
          <h2>
            Game Details
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(150px,1fr))",
              gap: 10
            }}
          >
            <InfoBox
              title="Game Code"
              value={
                game.game_code
              }
            />

            <InfoBox
              title="Date"
              value={
                game.game_date
              }
            />

            <InfoBox
              title="Time"
              value={
                game.game_time
              }
            />

            <InfoBox
              title="Ticket Price"
              value={`₹${game.ticket_price}`}
            />
          </div>
        </section>

        <section
          style={cardStyle}
        >
          <h2>
            Share Game
          </h2>

          <input
            readOnly
            value={inviteUrl}
            style={{
              ...inputStyle,
              marginBottom: 10
            }}
          />

          <div
            style={{
              display: "flex",
              gap: 8
            }}
          >
            <button
              onClick={
                copyLink
              }
              style={
                secondaryButton
              }
            >
              {copied
                ? "✓ Copied"
                : "Copy Link"}
            </button>

            <button
              onClick={
                shareGame
              }
              style={
                primaryButton
              }
            >
              Share Game
            </button>
          </div>
        </section>

        <section
          style={cardStyle}
        >
          <h2>
            Prizes
          </h2>

          {prizes.map(
            (prize, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  padding:
                    "10px 0",
                  borderBottom:
                    "1px solid #e5e7eb"
                }}
              >
                <b>
                  {prize.name}
                </b>

                <span>
                  ₹
                  {prize.amount}
                </span>
              </div>
            )
          )}
        </section>

        <section
          style={cardStyle}
        >
          <h2>
            Game Control
          </h2>

          <button
            disabled
            style={{
              ...primaryButton,
              opacity: 0.5
            }}
          >
            START GAME
          </button>
        </section>

        <button
          onClick={onNewGame}
          style={{
            ...secondaryButton,
            width: "100%"
          }}
        >
          Create Another Game
        </button>
      </div>
    </main>
  );
}

/* =========================================================
   SMALL COMPONENT
========================================================= */

function InfoBox({
  title,
  value
}) {
  return (
    <div
      style={{
        padding: 12,
        border:
          "1px solid #e5e7eb",
        borderRadius: 9,
        background:
          "#f8fafc"
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "#64748b",
          marginBottom: 4
        }}
      >
        {title}
      </div>

      <b>
        {value}
      </b>
    </div>
  );
}

/* =========================================================
   APP
========================================================= */

function App() {
  const [hostGame, setHostGame] =
    useState(null);

  const [playerGame, setPlayerGame] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    async function load() {
      const gameCode =
        getGameCodeFromUrl();

      /*
        IMPORTANT:
        ?game=CODE means PLAYER PAGE.

        We deliberately do NOT use the
        local host game here.
      */

      if (gameCode) {
        const { data, error } =
          await supabase
            .from("games")
            .select("*")
            .eq(
              "game_code",
              gameCode
            )
            .maybeSingle();

        if (
          !error &&
          data
        ) {
          setPlayerGame(data);
        }
      } else {
        const saved =
          loadHostGame();

        if (saved) {
          setHostGame(saved);
        }
      }

      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return (
      <main
        style={{
          ...pageStyle,
          display: "flex",
          justifyContent:
            "center",
          alignItems:
            "center"
        }}
      >
        <h2>
          Loading...
        </h2>
      </main>
    );
  }

  /*
    PLAYER ROUTE
  */

  if (playerGame) {
    return (
      <PlayerBookingPage
        game={
          playerGame
        }
      />
    );
  }

  /*
    INVALID GAME CODE
  */

  if (
    getGameCodeFromUrl()
  ) {
    return (
      <main
        style={pageStyle}
      >
        <div
          style={{
            maxWidth: 600,
            margin: "50px auto",
            textAlign:
              "center"
          }}
        >
          <section
            style={cardStyle}
          >
            <h2>
              Game Not Found
            </h2>

            <p>
              This game link is
              invalid or the game
              no longer exists.
            </p>
          </section>
        </div>
      </main>
    );
  }

  /*
    HOST ROUTE
  */

  if (hostGame) {
    return (
      <HostControlPage
        game={hostGame}
        onNewGame={() => {
          saveHostGame(null);
          setHostGame(null);

          window.history.replaceState(
            {},
            "",
            window.location.pathname
          );
        }}
      />
    );
  }

  return (
    <CreateGamePage
      onGameCreated={(game) =>
        setHostGame(game)
      }
    />
  );
}

/* =========================================================
   START APP
========================================================= */

createRoot(
  document.getElementById("root")
).render(
  <App />
);
