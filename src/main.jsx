import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { supabase } from "./lib/supabase";

/* =========================================================
   CONSTANTS
========================================================= */

const DEFAULT_GAME_NAME = "TambolaLive";

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

const GAME_KEY = "tambolalive_host_game";

/* =========================================================
   HELPERS
========================================================= */

function generateGameCode() {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  for (let i = 0; i < 6; i++) {
    code += chars[
      Math.floor(Math.random() * chars.length)
    ];
  }

  return code;
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

    const game = JSON.parse(saved);

    return game?.game_code ? game : null;
  } catch {
    return null;
  }
}

function getGameCodeFromUrl() {
  return new URLSearchParams(
    window.location.search
  ).get("game");
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

function isGameClosed(status) {
  return [
    "live",
    "started",
    "running",
    "ended",
    "completed",
    "finished"
  ].includes(
    String(status || "").toLowerCase()
  );
}

/* =========================================================
   STYLES
========================================================= */

const pageStyle = {
  minHeight: "100vh",
  background: "#f5f7fb",
  padding: 20,
  boxSizing: "border-box",
  fontFamily:
    "Arial, Helvetica, sans-serif"
};

const wrapStyle = {
  maxWidth: 800,
  margin: "0 auto"
};

const cardStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 20,
  marginBottom: 18,
  boxShadow:
    "0 2px 8px rgba(0,0,0,.05)"
};

const inputStyle = {
  width: "100%",
  padding: "11px 12px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  boxSizing: "border-box",
  fontSize: 15
};

const primaryButton = {
  padding: "12px 18px",
  border: 0,
  borderRadius: 8,
  background: "#2563eb",
  color: "#fff",
  fontWeight: "bold",
  fontSize: 15,
  cursor: "pointer"
};

const secondaryButton = {
  padding: "10px 16px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  background: "#fff",
  color: "#111827",
  fontWeight: "bold",
  cursor: "pointer"
};

/* =========================================================
   CREATE GAME
========================================================= */

function CreateGamePage({ onGameCreated }) {
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

  function updatePrize(index, amount) {
    setPrizes(current =>
      current.map((p, i) =>
        i === index
          ? { ...p, amount }
          : p
      )
    );
  }

  function addCustomPrize() {
    const name =
      customPrize.trim();

    if (!name) return;

    setPrizes(current => [
      ...current,
      { name, amount: "" }
    ]);

    setCustomPrize("");
  }

  function removePrize(index) {
    setPrizes(current =>
      current.filter(
        (_, i) => i !== index
      )
    );
  }

  async function createGame(e) {
    e.preventDefault();

    if (creating) return;

    setCreating(true);
    setError("");

    try {
      let gameCode =
        generateGameCode();

      while (true) {
        const { data, error } =
          await supabase
            .from("games")
            .select("id")
            .eq("game_code", gameCode)
            .limit(1);

        if (error) throw error;

        if (!data?.length) break;

        gameCode =
          generateGameCode();
      }

      const selectedPrizes =
        prizes
          .filter(
            p =>
              p.amount !== "" &&
              p.amount !== null &&
              p.amount !== undefined
          )
          .map(p => ({
            name: p.name,
            amount: Number(p.amount)
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
        game_code: gameCode,
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

      const game = {
        ...data,
        selected_prizes:
          normalizeArray(
            data.selected_prizes
          ),
        called_numbers:
          normalizeArray(
            data.called_numbers
          )
      };

      saveHostGame(game);

      onGameCreated(game);
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
      <div style={wrapStyle}>
        <header
          style={{
            textAlign: "center",
            marginBottom: 25
          }}
        >
          <h1>TAMBOLA LIVE</h1>
          <p style={{ color: "#64748b" }}>
            Host Dashboard
          </p>
        </header>

        <form onSubmit={createGame}>
          <section style={cardStyle}>
            <h2>Create New Game</h2>

            <label>
              <b>Game Name</b>
            </label>

            <input
              value={gameName}
              onChange={e =>
                setGameName(e.target.value)
              }
              style={{
                ...inputStyle,
                marginTop: 7
              }}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(200px,1fr))",
                gap: 14,
                marginTop: 16
              }}
            >
              <div>
                <b>Date</b>
                <input
                  type="date"
                  value={gameDate}
                  required
                  onChange={e =>
                    setGameDate(e.target.value)
                  }
                  style={{
                    ...inputStyle,
                    marginTop: 7
                  }}
                />
              </div>

              <div>
                <b>Time</b>
                <input
                  type="time"
                  value={gameTime}
                  required
                  onChange={e =>
                    setGameTime(e.target.value)
                  }
                  style={{
                    ...inputStyle,
                    marginTop: 7
                  }}
                />
              </div>

              <div>
                <b>Ticket Limit</b>
                <input
                  type="number"
                  min="1"
                  value={ticketLimit}
                  onChange={e =>
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
                <b>Ticket Price</b>
                <input
                  type="number"
                  min="0"
                  value={ticketPrice}
                  onChange={e =>
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

            <div style={{ marginTop: 16 }}>
              <b>Game Theme</b>

              <select
                value={theme}
                onChange={e =>
                  setTheme(e.target.value)
                }
                style={{
                  ...inputStyle,
                  marginTop: 7
                }}
              >
                {THEMES.map(t => (
                  <option key={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section style={cardStyle}>
            <h2>Prizes</h2>

            {prizes.map(
              (prize, index) => (
                <div
                  key={`${prize.name}-${index}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "1fr 140px auto",
                    gap: 8,
                    alignItems: "center",
                    marginBottom: 10
                  }}
                >
                  <b>{prize.name}</b>

                  <input
                    type="number"
                    min="0"
                    placeholder="Amount"
                    value={prize.amount}
                    onChange={e =>
                      updatePrize(
                        index,
                        e.target.value
                      )
                    }
                    style={inputStyle}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      removePrize(index)
                    }
                    style={secondaryButton}
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
                value={customPrize}
                onChange={e =>
                  setCustomPrize(
                    e.target.value
                  )
                }
                placeholder="Custom prize"
                style={inputStyle}
              />

              <button
                type="button"
                onClick={addCustomPrize}
                style={secondaryButton}
              >
                + Add
              </button>
            </div>
          </section>

          {error && (
            <section
              style={{
                ...cardStyle,
                color: "#b91c1c",
                background: "#fef2f2",
                borderColor: "#ef4444"
              }}
            >
              <b>Could not create game</b>
              <p>{error}</p>
            </section>
          )}

          <button
            disabled={creating}
            style={{
              ...primaryButton,
              width: "100%",
              padding: 15,
              fontSize: 17,
              opacity: creating ? .7 : 1
            }}
          >
            {creating
              ? "Creating Game..."
              : "CREATE GAME"}
          </button>
        </form>
      </div>
    </main>
  );
}

/* =========================================================
   HOST CONTROL CENTRE
========================================================= */

function HostControlPage({
  game,
  onNewGame
}) {
  const [copied, setCopied] =
    useState(false);

  const prizes =
    normalizeArray(
      game.selected_prizes
    );

  const called =
    normalizeArray(
      game.called_numbers
    );

  const inviteUrl =
    `${window.location.origin}/?game=${game.game_code}`;

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
        "Copy game link:",
        inviteUrl
      );
    }
  }

  async function shareGame() {
    const prizeText =
      prizes.length
        ? prizes
            .map(
              p =>
                `${p.name}: ₹${p.amount}`
            )
            .join("\n")
        : "Prize details coming soon";

    const message =
`🎟️ ${game.game_name}

📅 ${game.game_date || "-"}
⏰ ${game.game_time || "-"}
🎫 Ticket: ₹${game.ticket_price || 0}
🎟️ Limit: ${game.ticket_limit || 0}

🏆 PRIZES
${prizeText}

Join:
${inviteUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: game.game_name,
          text: message,
          url: inviteUrl
        });
      } catch {}
    } else {
      await navigator.clipboard?.writeText(
        message
      );

      alert(
        "Game details copied."
      );
    }
  }

  return (
    <main style={pageStyle}>
      <div style={wrapStyle}>
        <header
          style={{
            textAlign: "center",
            marginBottom: 20
          }}
        >
          <h1>
            {game.game_name}
          </h1>

          <p style={{ color: "#64748b" }}>
            Host Control Centre
          </p>

          <div
            style={{
              display: "inline-block",
              padding: "8px 16px",
              borderRadius: 20,
              background: "#eff6ff",
              color: "#1d4ed8",
              fontWeight: "bold"
            }}
          >
            GAME CODE: {game.game_code}
          </div>
        </header>

        <section style={cardStyle}>
          <h2>Game Information</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(180px,1fr))",
              gap: 12
            }}
          >
            <InfoBox
              title="Game Name"
              value={game.game_name}
            />

            <InfoBox
              title="Game Code"
              value={game.game_code}
            />

            <InfoBox
              title="Date"
              value={
                game.game_date || "-"
              }
            />

            <InfoBox
              title="Time"
              value={
                game.game_time || "-"
              }
            />

            <InfoBox
              title="Ticket Price"
              value={`₹${
                game.ticket_price || 0
              }`}
            />

            <InfoBox
              title="Ticket Limit"
              value={
                game.ticket_limit || 0
              }
            />

            <InfoBox
              title="Theme"
              value={
                game.theme || "-"
              }
            />

            <InfoBox
              title="Call Interval"
              value={`${game.call_interval_seconds || 5}s`}
            />
          </div>

          <div
            style={{
              marginTop: 16,
              padding: 15,
              borderRadius: 10,
              background: "#f8fafc",
              border:
                "1px solid #e5e7eb"
            }}
          >
            <b>STATUS</b>

            <div
              style={{
                fontSize: 22,
                fontWeight: "bold",
                marginTop: 5
              }}
            >
              {String(
                game.status ||
                  "upcoming"
              ).toUpperCase()}
            </div>
          </div>
        </section>

        <section style={cardStyle}>
          <h2>Share Game</h2>

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
              gap: 8,
              flexWrap: "wrap"
            }}
          >
            <button
              onClick={copyLink}
              style={secondaryButton}
            >
              {copied
                ? "✓ Copied"
                : "Copy Link"}
            </button>

            <button
              onClick={shareGame}
              style={primaryButton}
            >
              Share Game
            </button>
          </div>
        </section>

        <section style={cardStyle}>
          <h2>Ticket Bookings</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3,1fr)",
              gap: 8
            }}
          >
            <StatusBox
              title="Pending"
              value="0"
            />

            <StatusBox
              title="Approved"
              value="0"
            />

            <StatusBox
              title="Rejected"
              value="0"
            />
          </div>
        </section>

        <section style={cardStyle}>
          <h2>Prizes</h2>

          {prizes.length === 0 ? (
            <p>No prizes selected.</p>
          ) : (
            prizes.map(
              (p, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    padding: "11px 0",
                    borderBottom:
                      "1px solid #e5e7eb"
                  }}
                >
                  <b>{p.name}</b>
                  <span>
                    ₹{p.amount}
                  </span>
                </div>
              )
            )
          )}
        </section>

        <section style={cardStyle}>
          <h2>Game Control</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(180px,1fr))",
              gap: 10
            }}
          >
            <button
              disabled
              style={{
                ...primaryButton,
                opacity: .5
              }}
            >
              START GAME
            </button>

            <button
              disabled
              style={{
                ...secondaryButton,
                opacity: .5
              }}
            >
              END GAME
            </button>
          </div>

          <div style={{ marginTop: 15 }}>
            <b>
              Numbers Called: {called.length}
            </b>
          </div>
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
   PLAYER PAGE
========================================================= */

function PlayerBookingPage({
  gameCode
}) {
  const [game, setGame] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [selectedTicket, setSelectedTicket] =
    useState(1);

  const [playerName, setPlayerName] =
    useState("");

  const [booking, setBooking] =
    useState(false);

  const [booked, setBooked] =
    useState(false);

  useEffect(() => {
    loadGame();
  }, [gameCode]);

  async function loadGame() {
    setLoading(true);
    setError("");

    try {
      const { data, error } =
        await supabase
          .from("games")
          .select("*")
          .eq("game_code", gameCode)
          .limit(1)
          .single();

      if (error) throw error;

      setGame({
        ...data,
        selected_prizes:
          normalizeArray(
            data.selected_prizes
          ),
        called_numbers:
          normalizeArray(
            data.called_numbers
          )
      });
    } catch (err) {
      console.error(err);

      setError(
        "Game not found or the game link is invalid."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
    Temporary ticket generator.
    Each ticket contains 3 rows × 9 columns.
    Exactly 15 numbers are placed.
  */

  function generateTicket(seed) {
    const ticket = Array.from(
      { length: 3 },
      () => Array(9).fill("")
    );

    const numbers =
      Array.from(
        { length: 90 },
        (_, i) => i + 1
      );

    let randomSeed =
      seed * 7919;

    function random() {
      randomSeed =
        (randomSeed * 9301 + 49297) %
        233280;

      return randomSeed / 233280;
    }

    for (let row = 0; row < 3; row++) {
      const columns = [
        0,1,2,3,4,5,6,7,8
      ];

      for (
        let i = columns.length - 1;
        i > 0;
        i--
      ) {
        const j =
          Math.floor(
            random() * (i + 1)
          );

        [
          columns[i],
          columns[j]
        ] = [
          columns[j],
          columns[i]
        ];
      }

      const selected =
        columns.slice(0, 5);

      selected.forEach(col => {
        const min =
          col === 0
            ? 1
            : col * 10;

        const max =
          col === 0
            ? 9
            : col === 8
            ? 90
            : col * 10 + 9;

        const possible =
          numbers.filter(
            n =>
              n >= min &&
              n <= max
          );

        const number =
          possible[
            Math.floor(
              random() *
              possible.length
            )
          ];

        ticket[row][col] =
          number;
      });
    }

    return ticket;
  }

  if (loading) {
    return (
      <main
        style={{
          ...pageStyle,
          display: "flex",
          justifyContent: "center",
          alignItems: "center"
        }}
      >
        <h2>Loading game...</h2>
      </main>
    );
  }

  if (error) {
    return (
      <main style={pageStyle}>
        <div style={wrapStyle}>
          <section
            style={{
              ...cardStyle,
              textAlign: "center"
            }}
          >
            <h2>Unable to Open Game</h2>
            <p>{error}</p>
          </section>
        </div>
      </main>
    );
  }

  const closed =
    isGameClosed(
      game.status
    );

  return (
    <main style={pageStyle}>
      <div style={wrapStyle}>
        <header
          style={{
            textAlign: "center",
            marginBottom: 20
          }}
        >
          <h1>TAMBOLA LIVE</h1>

          <h2
            style={{
              marginBottom: 5
            }}
          >
            Player Booking
          </h2>

          <p
            style={{
              color: "#64748b"
            }}
          >
            {game.game_name}
          </p>
        </header>

        <section style={cardStyle}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(160px,1fr))",
              gap: 10
            }}
          >
            <InfoBox
              title="Game Code"
              value={game.game_code}
            />

            <InfoBox
              title="Date"
              value={
                game.game_date || "-"
              }
            />

            <InfoBox
              title="Time"
              value={
                game.game_time || "-"
              }
            />

            <InfoBox
              title="Ticket Price"
              value={`₹${
                game.ticket_price || 0
              }`}
            />
          </div>

          {closed && (
            <div
              style={{
                marginTop: 15,
                padding: 14,
                borderRadius: 10,
                background: "#fef2f2",
                color: "#b91c1c",
                border:
                  "1px solid #ef4444",
                textAlign: "center",
                fontWeight: "bold"
              }}
            >
              Ticket booking is closed.
              The game has already started
              or finished.
            </div>
          )}
        </section>

        <section style={cardStyle}>
          <h2>Select Ticket</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(5,1fr)",
              gap: 8
            }}
          >
            {[1,2,3,4,5].map(
              number => (
                <button
                  key={number}
                  disabled={closed}
                  onClick={() =>
                    setSelectedTicket(
                      number
                    )
                  }
                  style={{
                    ...secondaryButton,
                    padding: 13,
                    background:
                      selectedTicket ===
                      number
                        ? "#2563eb"
                        : "#fff",
                    color:
                      selectedTicket ===
                      number
                        ? "#fff"
                        : "#111827",
                    borderColor:
                      selectedTicket ===
                      number
                        ? "#2563eb"
                        : "#cbd5e1"
                  }}
                >
                  #{number}
                </button>
              )
            )}
          </div>
        </section>

        <section style={cardStyle}>
          <h2>
            Ticket #{selectedTicket}
          </h2>

          <TambolaTicket
            ticket={generateTicket(
              selectedTicket
            )}
          />

          <div
            style={{
              marginTop: 20
            }}
          >
            <label>
              <b>Player Name</b>
            </label>

            <input
              value={playerName}
              disabled={closed}
              onChange={e =>
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
          </div>

          <button
            disabled={
              closed ||
              booking ||
              booked ||
              !playerName.trim()
            }
            onClick={() => {
              setBooking(true);

              setTimeout(() => {
                setBooking(false);
                setBooked(true);
              }, 600);
            }}
            style={{
              ...primaryButton,
              width: "100%",
              marginTop: 14,
              opacity:
                closed ||
                booking ||
                booked ||
                !playerName.trim()
                  ? .5
                  : 1
            }}
          >
            {booked
              ? "BOOKING REQUESTED"
              : booking
              ? "PROCESSING..."
              : `BOOK TICKET #${selectedTicket}`}
          </button>

          {booked && (
            <p
              style={{
                textAlign: "center",
                color: "#15803d",
                fontWeight: "bold"
              }}
            >
              Your ticket booking request
              has been recorded on this
              device.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

/* =========================================================
   TAMBOLA TICKET
========================================================= */

function TambolaTicket({
  ticket
}) {
  return (
    <div
      style={{
        border:
          "3px solid #111827",
        borderRadius: 8,
        overflow: "hidden",
        background: "#fff"
      }}
    >
      {ticket.map(
        (row, rowIndex) => (
          <div
            key={rowIndex}
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(9,1fr)"
            }}
          >
            {row.map(
              (number, colIndex) => (
                <div
                  key={colIndex}
                  style={{
                    height: 52,
                    display: "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    borderRight:
                      colIndex === 8
                        ? "none"
                        : "1px solid #111827",
                    borderBottom:
                      rowIndex === 2
                        ? "none"
                        : "1px solid #111827",
                    fontSize: 17,
                    fontWeight: "bold",
                    background:
                      number
                        ? "#ffffff"
                        : "#f1f5f9"
                  }}
                >
                  {number}
                </div>
              )
            )}
          </div>
        )
      )}
    </div>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function InfoBox({
  title,
  value
}) {
  return (
    <div
      style={{
        padding: 13,
        border:
          "1px solid #e5e7eb",
        borderRadius: 10,
        background: "#f8fafc"
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: 12,
          marginBottom: 5
        }}
      >
        {title}
      </div>

      <b>{value}</b>
    </div>
  );
}

function StatusBox({
  title,
  value
}) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: 14,
        border:
          "1px solid #e5e7eb",
        borderRadius: 10,
        background: "#f8fafc"
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: 13
        }}
      >
        {title}
      </div>

      <strong
        style={{
          display: "block",
          fontSize: 24,
          marginTop: 4
        }}
      >
        {value}
      </strong>
    </div>
  );
}

/* =========================================================
   APP ROUTING
========================================================= */

function App() {
  const [hostGame, setHostGame] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  /*
    THIS IS THE IMPORTANT FIX.

    ?game=XXXXXX ALWAYS means
    PLAYER PAGE.

    It does NOT matter whether
    a host game is saved in
    localStorage.
  */

  const playerGameCode =
    getGameCodeFromUrl();

  useEffect(() => {
    const saved =
      loadHostGame();

    if (saved) {
      setHostGame(saved);
    }

    setLoading(false);
  }, []);

  function handleGameCreated(game) {
    setHostGame(game);

    /*
      Remove ?game if any and
      keep host on control centre.
    */
    window.history.replaceState(
      {},
      "",
      window.location.pathname
    );
  }

  function handleNewGame() {
    saveHostGame(null);
    setHostGame(null);

    window.history.replaceState(
      {},
      "",
      window.location.pathname
    );
  }

  if (loading) {
    return (
      <main
        style={{
          ...pageStyle,
          display: "flex",
          justifyContent: "center",
          alignItems: "center"
        }}
      >
        <h2>Loading...</h2>
      </main>
    );
  }

  /*
    PLAYER ROUTE
  */
  if (playerGameCode) {
    return (
      <PlayerBookingPage
        gameCode={
          playerGameCode
        }
      />
    );
  }

  /*
    HOST CONTROL ROUTE
  */
  if (hostGame) {
    return (
      <HostControlPage
        game={hostGame}
        onNewGame={
          handleNewGame
        }
      />
    );
  }

  /*
    NORMAL HOME PAGE
  */
  return (
    <CreateGamePage
      onGameCreated={
        handleGameCreated
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
